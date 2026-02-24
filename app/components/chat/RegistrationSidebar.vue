<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CheckCircleIcon, XIcon, UserPlusIcon, SparklesIcon, PaperclipIcon, MapPinIcon, BotIcon, ChevronRightIcon, ChevronLeftIcon } from 'lucide-vue-next'
import BaseInput from '~/components/BaseInput.vue'
import BaseButton from '~/components/BaseButton.vue'
import BaseSelect from '~/components/BaseSelect.vue'

import type { Database } from '~/types/database.types'
import type { Conversation, Message } from '~/types/chat'

const props = defineProps<{
  activeConversation: Conversation | null,
  messages: Message[]
}>()

const supabase = useSupabaseClient<Database>()
const isLoadingAI = ref(false)
const isSaving = ref(false)
const isBotActive = ref(false)
const originalFormData = ref<any>({})
const registrationStatus = ref('draft')
const registrationId = ref<string | null>(null) // ID do registro atual
const isCollapsed = ref(false) // Estado para controlar o colapso

interface FormData {
  patient_name: string
  patient_phone: string
  procedure_date: string
  procedure_time: string
  procedure_type: string
  procedure_name: string
  location: string
  city: string
  boarding_neighborhood: string
  boarding_point: string
  needs_companion: boolean
  companion_reason: string
  attachment_url: string
}

const formData = ref<FormData>({
  patient_name: '',
  patient_phone: '',
  procedure_date: '',
  procedure_time: '',
  procedure_type: 'Consulta',
  procedure_name: '',
  location: '',
  city: '',
  boarding_neighborhood: '',
  boarding_point: '',
  needs_companion: false,
  companion_reason: '',
  attachment_url: ''
})

const boardingLocations = ref<any[]>([])
const neighborhoods = computed(() => [...new Set(boardingLocations.value.map((l: any) => l.neighborhood))])

const availablePoints = computed(() => {
  let points: string[] = []
  if (formData.value.boarding_neighborhood) {
    points = boardingLocations.value
      .filter((l: any) => l.neighborhood === formData.value.boarding_neighborhood)
      .map((l: any) => l.point_name)
  }
  
  // Adicionar ponto personalizado se existir e não estiver na lista
  if (formData.value.boarding_point && !points.includes(formData.value.boarding_point)) {
    points.push(formData.value.boarding_point)
  }
  
  return points
})

const hasChanges = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
})

const companionReasons = [
  'Idoso',
  'Declaração médica',
  'Criança',
  'Cadeirante',
  'Paciente para cirurgia'
]

onMounted(async () => {
  await fetchBoardingLocations()
  if (props.activeConversation) {
    initializeForm()
    subscribeToRegistrationUpdates()
  }
})

watch(() => props.activeConversation, (newVal: Conversation | null, oldVal: Conversation | null) => {
  if (newVal?.id !== oldVal?.id) {
    initializeForm()
    subscribeToRegistrationUpdates()
    // Atualizar status do bot ao trocar de conversa
    if (newVal) {
      isBotActive.value = newVal.is_bot_active ?? true
    }
  } else {
    // Mesmo chat, apenas atualiza status do bot se mudou
    if (newVal) {
      const newStatus = newVal.is_bot_active ?? true
      if (newStatus !== isBotActive.value) {
        isBotActive.value = newStatus
      }
    }
  }
})

let realtimeChannel: any = null

const subscribeToRegistrationUpdates = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }

  if (!props.activeConversation) return

  realtimeChannel = supabase
    .channel(`public:registrations:${props.activeConversation.id}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'registrations',
      filter: `conversation_id=eq.${props.activeConversation.id}`
    }, (payload: any) => {
      console.log('Realtime update:', payload)
      if (payload.new) {
        // Atualizar form se não estiver editando ou se for status
        if (!hasChanges.value || payload.new.status !== registrationStatus.value) {
           Object.assign(formData.value, payload.new)
           if (payload.new.id) registrationId.value = payload.new.id
           originalFormData.value = { ...payload.new }
           registrationStatus.value = payload.new.status
        }
      }
    })
    .subscribe()
}

const initializeForm = async () => {
  if (!props.activeConversation) return

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('conversation_id', props.activeConversation.id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar dados:', error)
      return
    }

    if (data) {
      // Mapear dados do banco para o form
      const loadedData: any = data
      
      registrationId.value = loadedData.id
      
      formData.value = {
        patient_name: loadedData.patient_name || '',
        patient_phone: loadedData.patient_phone || '',
        procedure_date: loadedData.procedure_date || '',
        procedure_time: loadedData.procedure_time || '',
        procedure_type: loadedData.procedure_type || 'Consulta',
        procedure_name: loadedData.procedure_name || '',
        location: loadedData.location || '',
        city: loadedData.city || '',
        boarding_neighborhood: loadedData.boarding_neighborhood || '',
        boarding_point: loadedData.boarding_point || '',
        needs_companion: loadedData.needs_companion || false,
        companion_reason: loadedData.companion_reason || '',
        attachment_url: loadedData.attachment_url || ''
      }
      
      registrationStatus.value = loadedData.status || 'draft'
      originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    } else {
      // Resetar form se não existir
      registrationId.value = null
      formData.value = {
        patient_name: '',
        patient_phone: '',
        procedure_date: '',
        procedure_time: '',
        procedure_type: 'Consulta',
        procedure_name: '',
        location: '',
        city: '',
        boarding_neighborhood: '',
        boarding_point: '',
        needs_companion: false,
        companion_reason: '',
        attachment_url: ''
      }
      registrationStatus.value = 'draft'
      originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    }
  } catch (err) {
    console.error('Erro inesperado:', err)
  }
}

const toggleBot = async () => {
  if (!props.activeConversation) return
  
  const newValue = !isBotActive.value
  isBotActive.value = newValue
  
  const { error } = await supabase
    .from('conversations')
    .update({ is_bot_active: newValue })
    .eq('id', props.activeConversation.id)
    
  if (error) {
    console.error('Erro ao atualizar status do bot:', error)
    isBotActive.value = !newValue // Revert on error
  }
}

const fetchBoardingLocations = async () => {
  const { data, error } = await supabase
    .from('boarding_locations')
    .select('neighborhood, point_name')
    .order('neighborhood')

  if (!error && data) {
    boardingLocations.value = data
  }
}

const handleAutoFill = async () => {
  if (!props.activeConversation || !props.messages.length) return
  
  isLoadingAI.value = true
  try {
    const result = await $fetch<any>('/api/ai/parse-chat', {
      method: 'POST',
      body: {
        conversationId: props.activeConversation.id,
        messages: props.messages
      }
    })

    if (result && !result.error) {
      // Merge AI result with current form data
      formData.value = { ...formData.value, ...result }
      // Ensure specific fields match options
      if (result.procedure_type) formData.value.procedure_type = result.procedure_type
      if (result.companion_reason) formData.value.companion_reason = result.companion_reason
    }
  } catch (error) {
    console.error('Erro ao preencher com IA:', error)
  } finally {
    isLoadingAI.value = false
  }
}

const handleRegister = async () => {
  if (!props.activeConversation) return
  isSaving.value = true
  try {
    let error;
    
    if (registrationId.value) {
      // Atualizar existente
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ ...formData.value })
        .eq('id', registrationId.value)
      error = updateError
    } else {
      // Criar novo
      const { data, error: insertError } = await supabase
        .from('registrations')
        .insert({
          conversation_id: props.activeConversation.id,
          ...formData.value
        })
        .select()
        .single()
      
      if (data) registrationId.value = data.id
      error = insertError
    }

    if (error) throw error
    alert('Cadastro salvo com sucesso!')
  } catch (error: any) {
    alert('Erro ao salvar cadastro: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

const openAttachment = async () => {
  if (!formData.value.attachment_url) return

  let urlToOpen = formData.value.attachment_url

  // Se for URL do bucket privado 'requisicoes', gerar signed url
  if (urlToOpen.includes('/requisicoes/')) {
    try {
      const path = urlToOpen.split('/requisicoes/')[1]
      if (path) {
        const { data, error } = await supabase.storage
          .from('requisicoes')
          .createSignedUrl(path, 3600) // 1 hora

        if (!error && data?.signedUrl) {
          urlToOpen = data.signedUrl
        }
      }
    } catch (e) {
      console.error('Erro ao gerar signed URL', e)
    }
  }

  window.open(urlToOpen, '_blank')
}

const handleDiscard = () => {
  initializeForm()
}

const handleFileUpload = async (event: any) => {
  const file = event.target.files[0]
  if (!file) return

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `attachments/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file)

  if (uploadError) {
    alert('Erro ao fazer upload do arquivo')
    return
  }

  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath)
  formData.value.attachment_url = data.publicUrl
}
</script>

<template>
  <aside 
    class="border-l border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 h-full transition-all duration-300 ease-in-out relative"
    :class="isCollapsed ? 'w-12' : 'w-96'"
  >
    <!-- Botão de Expandir/Colapsar (Aba Lateral) -->
    <button 
        @click="isCollapsed = !isCollapsed"
        class="absolute -left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-md z-10 text-slate-500 hover:text-primary transition-colors"
        :title="isCollapsed ? 'Expandir Formulário' : 'Colapsar Formulário'"
    >
        <ChevronLeftIcon v-if="isCollapsed" class="w-4 h-4" />
        <ChevronRightIcon v-else class="w-4 h-4" />
    </button>

    <!-- Conteúdo Colapsado (Ícones verticais) -->
    <div v-if="isCollapsed" class="flex flex-col items-center py-6 gap-4 h-full">
        <div class="bg-primary/20 p-2 rounded-lg text-primary" title="Novo Cadastro">
            <UserPlusIcon class="w-5 h-5" />
        </div>
        <div class="flex-1"></div>
        <!-- Status do Bot (Mini) removido -->
    </div>

    <!-- Conteúdo Expandido -->
    <div v-else class="p-6 h-full flex flex-col overflow-hidden">
      <div class="flex items-center justify-between mb-8 shrink-0">
        <div class="flex items-center gap-3">
          <div class="bg-primary/20 p-2.5 rounded-xl text-primary">
            <UserPlusIcon class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">Novo Cadastro</h2>
            <p class="text-xs text-slate-400 font-medium">Preencha os dados do paciente</p>
          </div>
        </div>
        <!-- Botão de Colapsar no topo -->
        <button @click="isCollapsed = true" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Bot Switch -->
      <div class="flex items-center justify-between mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
        <div class="flex items-center gap-2">
          <div 
            class="p-2 rounded-lg transition-colors"
            :class="isBotActive ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'"
          >
            <BotIcon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Autoatendimento</h3>
            <p class="text-[10px] text-slate-500">{{ isBotActive ? 'Robô respondendo' : 'Manual' }}</p>
          </div>
        </div>
        
        <button 
          @click="toggleBot"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          :class="isBotActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'"
          title="Ativar/Desativar Robô"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
            :class="isBotActive ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        
        <!-- Dados Pessoais -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              Dados Pessoais
            </h3>
            <!-- Botão de preenchimento manual com IA mantido como auxiliar -->
            <button 
              @click="handleAutoFill"
              :disabled="isLoadingAI"
              class="text-purple-600 hover:text-purple-700 p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold disabled:opacity-50"
              title="Extrair dados da conversa agora"
            >
              <SparklesIcon class="w-3 h-3" :class="{'animate-spin': isLoadingAI}" />
              Extrair Dados
            </button>
            <button 
              @click="handleDiscard"
              class="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
              title="Limpar todos os campos"
            >
              <XIcon class="w-3 h-3" />
              Limpar
            </button>
          </div>
        <!-- Nome Completo -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Nome Completo</label>
          <BaseInput 
            v-model="formData.patient_name"
            placeholder="Nome do Paciente"
            class="!py-3 !bg-slate-50 dark:!bg-slate-800 !font-medium"
          />
        </div>

        <!-- Telefone (Antes CPF) -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Telefone</label>
          <BaseInput 
            v-model="formData.patient_phone"
            placeholder="(00) 00000-0000" 
            type="tel"
            class="!py-3 !bg-white dark:!bg-slate-800"
          />
        </div>

        <!-- Data do Procedimento -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Data Proc.</label>
            <BaseInput 
              v-model="formData.procedure_date"
              type="date"
              class="!py-3 !bg-white dark:!bg-slate-800"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Horário</label>
            <BaseInput 
              v-model="formData.procedure_time"
              type="time"
              class="!py-3 !bg-white dark:!bg-slate-800"
            />
          </div>
        </div>

        <!-- Tipo de Procedimento -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Tipo</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" v-model="formData.procedure_type" value="Consulta" class="text-primary focus:ring-primary" />
              <span class="text-sm text-slate-700 dark:text-slate-300">Consulta</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" v-model="formData.procedure_type" value="Exame" class="text-primary focus:ring-primary" />
              <span class="text-sm text-slate-700 dark:text-slate-300">Exame</span>
            </label>
          </div>
        </div>

        <!-- Procedimento (Nome) -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Procedimento / Especialidade</label>
          <BaseInput 
            v-model="formData.procedure_name"
            type="text"
            placeholder="Ex: Cardiologista, Raio-X"
            class="!py-3 !bg-white dark:!bg-slate-800"
          />
        </div>

        <!-- Anexo -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Anexo (Comprovante)</label>
          <div class="relative">
            <input 
              type="file" 
              @change="handleFileUpload"
              class="hidden" 
              id="file-upload"
            />
            <label 
              for="file-upload" 
              class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 relative overflow-hidden group"
              :class="{'border-primary bg-primary/5': formData.attachment_url}"
            >
              <PaperclipIcon class="w-4 h-4" :class="{'text-primary': formData.attachment_url}" />
              <span v-if="formData.attachment_url" class="text-primary truncate max-w-[150px] font-medium">Comprovante Anexado</span>
              <span v-else>Anexar Requisição/Encaminhamento</span>
              
              <!-- Preview ou Link -->
              <a 
                v-if="formData.attachment_url"
                href="#"
                @click.prevent="openAttachment"
                class="absolute right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-1 rounded hover:text-primary z-10"
              >
                VER
              </a>
            </label>
          </div>
        </div>

        <!-- Local e Cidade -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Local do Procedimento</label>
          <BaseInput 
            v-model="formData.location"
            type="text" 
            placeholder="Nome da Clínica/Hospital"
            class="!py-3 !bg-white dark:!bg-slate-800"
          />
        </div>
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Cidade</label>
          <BaseInput 
            v-model="formData.city"
            type="text" 
            placeholder="Cidade"
            class="!py-3 !bg-white dark:!bg-slate-800"
          />
        </div>

        <!-- Local de Embarque -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <MapPinIcon class="w-3 h-3" /> Local de Embarque
          </label>
          <div class="grid grid-cols-1 gap-2">
            <BaseSelect 
              v-model="formData.boarding_neighborhood"
              class="!bg-white dark:!bg-slate-800"
            >
              <option value="" disabled selected>Selecione o Bairro</option>
              <option v-for="bairro in neighborhoods" :key="bairro" :value="bairro">{{ bairro }}</option>
            </BaseSelect>

            <BaseSelect 
              v-model="formData.boarding_point"
              :disabled="!formData.boarding_neighborhood"
              class="!bg-white dark:!bg-slate-800 disabled:opacity-50"
            >
              <option value="" disabled selected>Selecione o Ponto</option>
              <option v-for="ponto in availablePoints" :key="ponto" :value="ponto">{{ ponto }}</option>
            </BaseSelect>
            <p v-if="neighborhoods.length === 0" class="text-xs text-red-400">Nenhum local configurado.</p>
          </div>
        </div>

        <!-- Acompanhante -->
        <div class="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Precisa de Acompanhante?</label>
            <div class="flex items-center gap-2">
              <BaseButton 
                @click="formData.needs_companion = true"
                class="!px-3 !py-1 !rounded-md !text-xs !font-bold !shadow-none transition-colors"
                :class="formData.needs_companion ? '!bg-primary !text-white' : '!bg-slate-100 dark:!bg-slate-800 !text-slate-500'"
              >
                SIM
              </BaseButton>
              <BaseButton 
                @click="formData.needs_companion = false"
                class="!px-3 !py-1 !rounded-md !text-xs !font-bold !shadow-none transition-colors"
                :class="!formData.needs_companion ? '!bg-slate-800 !text-white' : '!bg-slate-100 dark:!bg-slate-800 !text-slate-500'"
              >
                NÃO
              </BaseButton>
            </div>
          </div>

          <div v-if="formData.needs_companion" class="space-y-2 animate-in fade-in slide-in-from-top-2">
            <label class="text-xs font-bold uppercase text-slate-400 tracking-wider">Motivo</label>
            <BaseSelect 
              v-model="formData.companion_reason"
              class="!bg-white dark:!bg-slate-800"
            >
              <option value="" disabled selected>Selecione o Motivo</option>
              <option v-for="reason in companionReasons" :key="reason" :value="reason">{{ reason }}</option>
            </BaseSelect>
          </div>
        </div>
        </div>
      </div>

      <div class="mt-8 space-y-3 shrink-0">
        <BaseButton 
          @click="handleRegister"
          :disabled="isSaving || (registrationStatus === 'pending' && !hasChanges)"
          class="!text-slate-900 !rounded-xl !shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <CheckCircleIcon class="w-5 h-5" />
          {{ isSaving ? 'Salvando...' : (registrationStatus === 'pending' && !hasChanges ? 'Finalizado' : 'Confirmar Cadastro') }}
        </BaseButton>
      </div>
    </div>
  </aside>
</template>
