<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  SearchIcon, 
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
  TruckIcon,
  XIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  InfoIcon,
  PrinterIcon,
  TrashIcon
} from 'lucide-vue-next'
import type { Database } from '~/types/database.types'

// Tipos (Estendendo para aceitar a nova relação de frota)
type Registration = Database['public']['Tables']['registrations']['Row'] & {
  vehicle_id?: string | null
  driver_id?: string | null
}

// Supabase
const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()
const router = useRouter()

// Estado
const currentDate = ref(new Date())
const searchQuery = ref('')
const isLoading = ref(false)
const registrations = ref<Registration[]>([])
const selectedRegistration = ref<Registration | null>(null)
const signedImageUrl = ref('')
const isLoadingImage = ref(false)

// Novo Agendamento
const showNewRegistrationModal = ref(false)
const isSaving = ref(false)
const newRegistration = ref({
  patient_name: '',
  patient_phone: '',
  procedure_date: new Date().toISOString().split('T')[0],
  procedure_time: '',
  procedure_type: 'Consulta',
  procedure_name: '',
  location: '',
  city: '',
  boarding_neighborhood: '',
  boarding_point: '',
  needs_companion: false,
  companion_reason: '',
  status: 'approved' as 'approved' | 'pending' | 'draft' | 'rejected'
})

const resetNewRegistration = () => {
  newRegistration.value = {
    patient_name: '',
    patient_phone: '',
    procedure_date: new Date().toISOString().split('T')[0],
    procedure_time: '',
    procedure_type: 'Consulta',
    procedure_name: '',
    location: '',
    city: '',
    boarding_neighborhood: '',
    boarding_point: '',
    needs_companion: false,
    companion_reason: '',
    status: 'approved'
  }
}

const saveNewRegistration = async () => {
  if (!newRegistration.value.patient_name || !newRegistration.value.procedure_date || !newRegistration.value.procedure_time) {
    errorMessage.value = 'Por favor, preencha pelo menos Nome, Data e Horário.'
    showErrorModal.value = true
    return
  }

  if (!newRegistration.value.patient_phone) {
    errorMessage.value = 'Telefone é obrigatório para vincular o agendamento.'
    showErrorModal.value = true
    return
  }

  isSaving.value = true

  try {
    // Buscar ou criar conversa
    let conversationId = ''
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_phone', newRegistration.value.patient_phone)
      .single()
    
    if (existing) {
      conversationId = existing.id
    } else {
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
            contact_phone: newRegistration.value.patient_phone,
            contact_name: newRegistration.value.patient_name,
            status: 'active',
            is_bot_active: true
        })
        .select()
        .single()
      
      if (createError || !created) throw createError || new Error('Erro ao criar conversa')
      conversationId = created.id
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert([{
          ...newRegistration.value,
          conversation_id: conversationId
      }])
      .select()

    if (error) throw error

    // Adicionar à lista local se estiver na data visível
    if (data) {
      // Recarregar agendamentos para garantir ordem
      await fetchRegistrations()
      showNewRegistrationModal.value = false
      resetNewRegistration()
      
      successMessage.value = 'Agendamento criado com sucesso!'
      showSuccessModal.value = true
    }
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error)
    errorMessage.value = 'Erro ao criar: ' + (error.message || 'Erro desconhecido')
    showErrorModal.value = true
  } finally {
    isSaving.value = false
  }
}

// Computados para Navegação de Data
const startOfWeek = computed(() => {
  const date = new Date(currentDate.value)
  const day = date.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  
  // Se for Domingo (0) ou Sábado (6), e o usuário considerar que a semana "útil" já acabou, 
  // pode ser confuso ver a semana passada.
  // Mas a definição padrão ISO-8601 é que a semana começa na Segunda.
  // Domingo (0) é o SÉTIMO dia da semana ISO.
  // Então, se hoje é Domingo dia 22, a Segunda-feira dessa semana foi dia 16 (22 - 6).
  // A lógica anterior estava: diff = 22 - 0 + (-6) = 16. Correto.
  
  // O usuário diz que "aparece colunas de dias da semana passada".
  // Se hoje for Sábado ou Domingo, ele pode estar esperando ver a PRÓXIMA semana (dias 23 a 27).
  // Ou talvez o fuso horário esteja jogando a data para o dia anterior?
  
  // Ajuste: Se for Sábado (6) ou Domingo (0), vamos pular para a próxima Segunda.
  // Sábado (6) -> +2 dias = Segunda
  // Domingo (0) -> +1 dia = Segunda
  
  // Lógica Revisada:
  // Se Segunda a Sexta: Mostra a semana atual (Segunda-feira anterior ou igual).
  // Se Sábado ou Domingo: Mostra a PRÓXIMA semana.
  
  let diff;
  if (day === 0) { // Domingo
      diff = date.getDate() + 1; // Próxima Segunda
  } else if (day === 6) { // Sábado
      diff = date.getDate() + 2; // Próxima Segunda
  } else {
      // Segunda (1) a Sexta (5)
      // Segunda (1): date - 1 + 1 = date
      // Terça (2): date - 2 + 1 = date - 1
      diff = date.getDate() - day + 1;
  }
  
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
})

const endOfWeek = computed(() => {
  const date = new Date(startOfWeek.value)
  date.setDate(date.getDate() + 4) // Sexta-feira
  return date
})

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 5; i++) {
    const date = new Date(startOfWeek.value)
    date.setDate(date.getDate() + i)
    days.push(date)
  }
  return days
})

const formattedWeekRange = computed(() => {
  const start = startOfWeek.value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const end = endOfWeek.value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${start} - ${end}`
})

// Formatação de Data/Hora
const formatDayName = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0]
}

const formatDayDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const formatDateISO = (date: Date) => {
  return date.toISOString().split('T')[0]
}

// Carregar Dados
const fetchRegistrations = async () => {
  isLoading.value = true
  
  const startDate = formatDateISO(startOfWeek.value)
  const endDate = formatDateISO(endOfWeek.value)

  let query = supabase
    .from('registrations')
    .select('*')
    .gte('procedure_date', startDate)
    .lte('procedure_date', endDate)
    .neq('status', 'draft') // Ignorar rascunhos
    .order('procedure_time', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar agendamentos:', error)
  } else {
    registrations.value = data || []
  }
  
  isLoading.value = false
}

// Agrupamento e Filtro
const getRegistrationsForDay = (date: Date) => {
  const dateStr = formatDateISO(date)
  return registrations.value.filter((reg: Registration) => {
    // Filtro por data
    if (reg.procedure_date !== dateStr) return false
    
    // Filtro por busca (nome ou procedimento)
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      return (
        (reg.patient_name?.toLowerCase().includes(query)) ||
        (reg.procedure_name?.toLowerCase().includes(query)) ||
        (reg.procedure_type?.toLowerCase().includes(query))
      )
    }
    
    return true
  })
}

// Ações
const sendStatusMessage = async (registration: Registration, status: 'approved' | 'rejected') => {
  if (!registration.conversation_id) return

  try {
    console.log(`Enviando notificação para ${registration.patient_name} (${status})...`)
    const { data, error } = await useFetch('/api/whatsapp/send-notification', {
      method: 'POST',
      body: {
        registrationId: registration.id,
        status: status
      }
    })
    
    if (error.value) {
      console.error('Erro ao enviar notificação:', error.value)
    } else {
      console.log('Notificação enviada com sucesso:', data.value)
    }
  } catch (e) {
    console.error('Erro na chamada da API de notificação:', e)
  }
}

const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
  const { error } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar status:', error)
    errorMessage.value = 'Erro ao atualizar status'
    showErrorModal.value = true
  } else {
    // Atualização otimista local
    const index = registrations.value.findIndex((r: Registration) => r.id === id)
  if (index !== -1) {
    const reg = registrations.value[index]
    if (reg) {
      const oldStatus = reg.status
      reg.status = status
      
      // Enviar mensagem apenas se o status mudou
      if (oldStatus !== status) {
        await sendStatusMessage(reg, status)
      }
    }
  }
  }
}

const showDeleteModal = ref(false)
const registrationToDelete = ref<{id: string, attachmentUrl: string | null} | null>(null)
const isDeletingRegistration = ref(false)

const showSuccessModal = ref(false)
const successMessage = ref('')

const showErrorModal = ref(false)
const errorMessage = ref('')

const requestDeleteRegistration = (id: string, attachmentUrl: string | null) => {
  registrationToDelete.value = { id, attachmentUrl }
  showDeleteModal.value = true
}

const confirmDeleteRegistration = async () => {
  if (!registrationToDelete.value) return
  
  isDeletingRegistration.value = true
  const { id, attachmentUrl } = registrationToDelete.value

  try {
    // 1. Excluir imagem do storage se existir
    if (attachmentUrl) {
      let path: string | undefined = attachmentUrl
      // Tenta extrair o caminho relativo se for URL completa
      if (attachmentUrl && attachmentUrl.includes('/requisicoes/')) {
        path = attachmentUrl.split('/requisicoes/')[1]
      }
      
      // Se tiver caminho válido, tenta deletar
      if (path) {
        const { error: storageError } = await supabase.storage
          .from('requisicoes')
          .remove([path])
          
        if (storageError) {
          console.warn('Aviso: Erro ao excluir imagem do storage (pode já ter sido excluída):', storageError)
        }
      }
    }

    // 2. Excluir registro do banco de dados
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Sucesso: Atualizar estado local e fechar modal
    registrations.value = registrations.value.filter((r: Registration) => r.id !== id)
    closeDetails()
    showDeleteModal.value = false
    
    successMessage.value = 'Agendamento excluído com sucesso!'
    showSuccessModal.value = true

  } catch (error: any) {
    console.error('Erro ao excluir agendamento:', error)
    errorMessage.value = 'Erro ao excluir: ' + (error.message || 'Erro desconhecido')
    showErrorModal.value = true
  } finally {
    isDeletingRegistration.value = false
    registrationToDelete.value = null
  }
}

// Navegação
const previousWeek = () => {
  const newDate = new Date(currentDate.value)
  newDate.setDate(newDate.getDate() - 7)
  currentDate.value = newDate
}

const nextWeek = () => {
  const newDate = new Date(currentDate.value)
  newDate.setDate(newDate.getDate() + 7)
  currentDate.value = newDate
}

const printDailyReport = (date: Date) => {
  const dateStr = formatDateISO(date)
  const confirmedRegistrations = registrations.value
    .filter((r: Registration) => r.procedure_date === dateStr && r.status === 'approved')
    .sort((a: Registration, b: Registration) => (a.procedure_time || '').localeCompare(b.procedure_time || ''))

  if (confirmedRegistrations.length === 0) return

  const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita popups para imprimir o relatório')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Transporte - ${formattedDate}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; }
          p.subtitle { text-align: center; margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .badge { 
            display: inline-block; padding: 2px 4px; border-radius: 3px; 
            font-size: 9px; font-weight: bold; text-transform: uppercase;
          }
          .badge-companion { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
            h1 { font-size: 16px; }
            table { font-size: 10px; }
            th, td { padding: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">🖨️ Imprimir</button>
        </div>

        <h1>Relatório Diário de Transporte</h1>
        <p class="subtitle">${formattedDate} • ${confirmedRegistrations.length} Pacientes Confirmados</p>

        <table>
          <thead>
            <tr>
              <th width="60">Horário</th>
              <th>Paciente</th>
              <th>Contato</th>
              <th>Procedimento</th>
              <th>Local Destino / Cidade</th>
              <th>Local de Embarque</th>
              <th width="80">Acomp.</th>
            </tr>
          </thead>
          <tbody>
            ${confirmedRegistrations.map(reg => `
              <tr>
                <td style="font-weight: bold;">${reg.procedure_time?.substring(0, 5) || '--:--'}</td>
                <td>
                  <strong>${reg.patient_name || 'Não informado'}</strong>
                </td>
                <td>${reg.patient_phone || '-'}</td>
                <td>
                  ${reg.procedure_name || '-'}
                  <div style="font-size: 9px; color: #666; margin-top: 2px;">${reg.procedure_type || ''}</div>
                </td>
                <td>
                  <strong>${reg.location || '-'}</strong>
                  <div style="color: #555;">${reg.city || ''}</div>
                </td>
                <td>
                  <strong>${reg.boarding_point || '-'}</strong>
                  <div style="color: #555;">${reg.boarding_neighborhood || ''}</div>
                </td>
                <td>
                  ${reg.needs_companion 
                    ? `<span class="badge badge-companion">SIM</span>${reg.companion_reason ? `<br><span style="font-size:9px; font-style:italic;">${reg.companion_reason}</span>` : ''}` 
                    : 'Não'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #999; text-align: center;">
          Gerado em ${new Date().toLocaleString('pt-BR')}
        </div>
      </body>
    </html>
  `
  
  printWindow.document.write(html)
  printWindow.document.close()
}

const openDetails = async (reg: Registration) => {
  selectedRegistration.value = reg
  signedImageUrl.value = ''
  isLoadingImage.value = false

  if (reg.attachment_url) {
    isLoadingImage.value = true
    try {
      // Extrair o caminho do arquivo da URL pública
      // Exemplo: https://.../storage/v1/object/public/requisicoes/whatsapp/123.jpg
      // Caminho no bucket: whatsapp/123.jpg
      let path: string | undefined = reg.attachment_url
      
      if (reg.attachment_url && reg.attachment_url.includes('/requisicoes/')) {
        path = reg.attachment_url.split('/requisicoes/')[1]
      }

      if (path) {
        console.log('Gerando URL assinada para:', path)
        const { data, error } = await supabase.storage
          .from('requisicoes')
          .createSignedUrl(path, 3600) // 1 hora

        if (error) {
          console.warn('Erro ao gerar URL assinada:', error)
          signedImageUrl.value = reg.attachment_url // Fallback
        } else if (data?.signedUrl) {
          signedImageUrl.value = data.signedUrl
        }
      } else {
        signedImageUrl.value = reg.attachment_url
      }
    } catch (e) {
      console.error('Erro ao processar imagem:', e)
      signedImageUrl.value = reg.attachment_url
    } finally {
      isLoadingImage.value = false
    }
  }
}

const closeDetails = () => {
  selectedRegistration.value = null
  signedImageUrl.value = ''
}

const goToConversation = () => {
  if (selectedRegistration.value?.conversation_id) {
    router.push(`/chat?id=${selectedRegistration.value.conversation_id}`)
  }
}

// Watchers e Hooks
watch(currentDate, () => {
  fetchRegistrations()
})

const vehicles = ref<any[]>([])
const isAssigningVehicle = ref(false)

const fetchVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    
  if (data) {
    vehicles.value = data
  }
}

const assignVehicle = async (vehicleId: string | null) => {
    if (!selectedRegistration.value) return
    isAssigningVehicle.value = true
    try {
        const { error } = await supabase
            .from('registrations')
            .update({ vehicle_id: vehicleId } as any)
            .eq('id', selectedRegistration.value.id)
        
        if (error) throw error

        // Sucesso local otimista
        const index = registrations.value.findIndex((r: Registration) => r.id === selectedRegistration.value?.id)
        if (index !== -1) {
            const reg = registrations.value[index]
            if (reg) reg.vehicle_id = vehicleId
        }
    } catch (err: any) {
        console.error('Erro ao designar veiculo:', err)
        errorMessage.value = 'A coluna vehicle_id ainda não existe no Banco! ' + err.message
        showErrorModal.value = true
        // Reverter local
        selectedRegistration.value.vehicle_id = null
    } finally {
        isAssigningVehicle.value = false
    }
}

onMounted(() => {
  fetchRegistrations()
  fetchVehicles()
})

// Utilitários de UI
const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
    case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
    case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Confirmado'
    case 'rejected': return 'Cancelado'
    case 'pending': return 'Pendente'
    default: return status
  }
}

// Estatísticas
const stats = computed(() => {
  const total = registrations.value.length
  const approved = registrations.value.filter(r => r.status === 'approved').length
  const pending = registrations.value.filter(r => r.status === 'pending').length
  const rejected = registrations.value.filter(r => r.status === 'rejected').length
  
  return { total, approved, pending, rejected }
})

</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Agenda Semanal</h1>
        
        <!-- Navegação de Data -->
        <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button @click="previousWeek" class="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-primary">
            <ChevronLeftIcon class="w-5 h-5" />
          </button>
          <span class="px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[180px] text-center">
            {{ formattedWeekRange }}
          </span>
          <button @click="nextWeek" class="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-primary">
            <ChevronRightIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4 w-full md:w-auto">
        <!-- Busca -->
        <div class="relative flex-1 md:w-64">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar paciente ou médico..." 
            class="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none text-slate-900 dark:text-slate-100 transition-shadow"
          />
        </div>

        <!-- Botão Novo -->
        <button 
          @click="showNewRegistrationModal = true; resetNewRegistration()"
          class="bg-primary hover:bg-primary/90 text-slate-900 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
        >
          <PlusIcon class="w-5 h-5" />
          <span class="hidden sm:inline">Novo Agendamento</span>
        </button>
      </div>
    </header>

    <!-- Conteúdo Principal (Scroll Horizontal) -->
    <main class="flex-1 overflow-x-auto overflow-y-hidden p-6">
      <div class="min-w-[1000px] h-full grid grid-cols-5 gap-6">
        
        <!-- Coluna do Dia -->
        <div 
          v-for="day in weekDays" 
          :key="day.toISOString()" 
          class="flex flex-col h-full min-w-[200px]"
        >
          <!-- Cabeçalho da Coluna -->
          <div class="mb-4 pb-2 border-b-2 flex justify-between items-end" :class="day.toDateString() === new Date().toDateString() ? 'border-primary' : 'border-transparent'">
            <div>
              <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {{ formatDayName(day) }}
              </span>
              <span class="text-2xl font-black text-slate-800 dark:text-slate-100" :class="{'text-primary': day.toDateString() === new Date().toDateString()}">
                {{ formatDayDate(day) }}
              </span>
            </div>
            
            <!-- Botão de Impressão (Apenas se houver confirmados) -->
            <button 
              v-if="registrations.some(r => r.procedure_date === formatDateISO(day) && r.status === 'approved')"
              @click="printDailyReport(day)"
              class="mb-1 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors group"
              title="Imprimir Lista de Confirmados"
            >
              <PrinterIcon class="w-5 h-5 group-hover:text-primary transition-colors" />
            </button>
          </div>

          <!-- Lista de Cards -->
          <div class="flex-1 space-y-4 overflow-y-auto pr-2 pb-20 custom-scrollbar">
            
            <!-- Card de Agendamento -->
            <div 
              v-for="reg in getRegistrationsForDay(day)" 
              :key="reg.id"
              @click="openDetails(reg)"
              class="group bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 relative cursor-pointer"
            >
              <!-- Cabeçalho do Card -->
              <div class="flex justify-between items-start mb-3">
                <span class="font-bold text-lg text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                   <ClockIcon class="w-4 h-4 text-slate-400" />
                   {{ reg.procedure_time?.substring(0, 5) || '--:--' }}
                </span>
                <span 
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border"
                  :class="getStatusColor(reg.status)"
                >
                  {{ getStatusLabel(reg.status) }}
                </span>
              </div>

              <!-- Informações Principais -->
              <div class="mb-3">
                <h3 class="font-bold text-slate-900 dark:text-white text-base leading-tight mb-1 truncate" :title="reg.patient_name || ''">
                  {{ reg.patient_name || 'Sem nome' }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <FileTextIcon class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ reg.procedure_name || reg.procedure_type || 'Procedimento' }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <TruckIcon class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ reg.boarding_neighborhood || 'Local n/d' }}</span>
                </div>
              </div>

              <!-- Rodapé do Card (Ações) -->
              <div class="pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="text-[10px] text-slate-400 truncate max-w-[80px]" :title="reg.location || ''">
                  {{ reg.location || 'Local n/d' }}
                </div>
                
                <div class="flex gap-1" v-if="reg.status === 'pending'">
                  <button 
                    @click.stop="updateStatus(reg.id, 'approved')"
                    class="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Aprovar"
                  >
                    <CheckCircleIcon class="w-4 h-4" />
                  </button>
                  <button 
                    @click.stop="updateStatus(reg.id, 'rejected')"
                    class="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Rejeitar"
                  >
                    <XCircleIcon class="w-4 h-4" />
                  </button>
                </div>
                <div v-else class="text-[10px] font-medium text-slate-400 italic">
                    {{ reg.status === 'approved' ? 'Aprovado' : 'Rejeitado' }}
                </div>
              </div>
            </div>

            <!-- Estado Vazio -->
            <div 
              v-if="getRegistrationsForDay(day).length === 0" 
              class="h-full min-h-[200px] border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer"
            >
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-full group-hover:scale-110 transition-transform">
                <CalendarIcon class="w-6 h-6 text-slate-300" />
              </div>
              <span class="text-sm font-medium">Sem agendamentos</span>
              <button class="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <PlusIcon class="w-3 h-3" /> Adicionar
              </button>
            </div>

          </div>
        </div>

      </div>
    </main>

    <!-- Footer Estatísticas -->
    <footer class="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center text-xs font-medium sticky bottom-0 z-20">
      <div class="flex gap-6">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          <span class="text-slate-600 dark:text-slate-300">{{ stats.approved }} Confirmados</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-slate-600 dark:text-slate-300">{{ stats.pending }} Pendentes</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-400"></span>
          <span class="text-slate-600 dark:text-slate-300">{{ stats.rejected }} Cancelados</span>
        </div>
      </div>
      
      <div class="text-slate-400">
        Última atualização: hoje às {{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
      </div>
    </footer>

    <!-- Modal de Detalhes -->
    <div v-if="selectedRegistration" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="closeDetails">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {{ selectedRegistration.patient_name || 'Paciente sem nome' }}
                <span v-if="selectedRegistration.status" :class="['text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide border', getStatusColor(selectedRegistration.status)]">
                  {{ getStatusLabel(selectedRegistration.status) }}
                </span>
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Detalhes da Solicitação #{{ selectedRegistration.id.substring(0, 8) }}</p>
          </div>
          <button @click="closeDetails" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          
          <!-- Grid Principal -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Info Paciente -->
              <div class="space-y-3">
                <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <UserIcon class="w-4 h-4" /> Paciente
                </h3>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                    <div>
                        <span class="text-xs text-slate-500 block">Nome Completo</span>
                        <div class="text-sm font-medium text-slate-900 dark:text-white">{{ selectedRegistration.patient_name || 'Não informado' }}</div>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Telefone / WhatsApp</span>
                        <div class="text-sm font-medium text-slate-900 dark:text-white font-mono">{{ selectedRegistration.patient_phone || 'Sem telefone' }}</div>
                    </div>
                </div>
              </div>

              <!-- Info Procedimento -->
              <div class="space-y-3">
                <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <FileTextIcon class="w-4 h-4" /> Procedimento
                </h3>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <span class="text-xs text-slate-500 block">Tipo</span>
                            <span class="text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-100 dark:border-slate-600 inline-block">
                                {{ selectedRegistration.procedure_type || '-' }}
                            </span>
                        </div>
                        <div>
                             <span class="text-xs text-slate-500 block">Horário</span>
                             <span class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                <ClockIcon class="w-3 h-3" />
                                {{ selectedRegistration.procedure_time?.substring(0, 5) || '--:--' }}
                             </span>
                        </div>
                    </div>
                    <div>
                      <span class="text-xs text-slate-500 block">Descrição / Especialidade</span>
                      <span class="text-sm font-medium text-slate-900 dark:text-white">{{ selectedRegistration.procedure_name || '-' }}</span>
                    </div>
                    <div class="border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                      <span class="text-xs text-slate-500 block">Data do Procedimento</span>
                      <span class="text-sm font-bold text-slate-900 dark:text-white">
                          {{ selectedRegistration.procedure_date ? new Date(selectedRegistration.procedure_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '--/--/----' }}
                      </span>
                    </div>
                </div>
              </div>
          </div>

          <!-- Grid Logística -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Info Destino -->
              <div class="space-y-3">
                <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <MapPinIcon class="w-4 h-4" /> Destino (Clínica/Hospital)
                </h3>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                    <div>
                        <span class="text-xs text-slate-500 block">Local</span>
                        <div class="text-sm font-medium text-slate-900 dark:text-white">{{ selectedRegistration.location || 'Não informado' }}</div>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Cidade</span>
                        <div class="text-sm text-slate-700 dark:text-slate-300">{{ selectedRegistration.city || 'Cidade não informada' }}</div>
                    </div>
                </div>
              </div>

              <!-- Info Embarque -->
              <div class="space-y-3">
                <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <TruckIcon class="w-4 h-4" /> Local de Embarque
                </h3>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                    <div>
                        <span class="text-xs text-slate-500 block">Ponto de Referência</span>
                        <div class="text-sm font-medium text-slate-900 dark:text-white">{{ selectedRegistration.boarding_point || 'Ponto não informado' }}</div>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Bairro</span>
                        <div class="text-sm text-slate-700 dark:text-slate-300">{{ selectedRegistration.boarding_neighborhood || 'Bairro não informado' }}</div>
                    </div>
                </div>
              </div>
          </div>
          
          <!-- Acompanhante -->
          <div v-if="selectedRegistration.needs_companion" class="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 relative overflow-hidden">
              <div class="absolute top-0 right-0 p-4 opacity-10">
                  <UserIcon class="w-24 h-24 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 class="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-2 flex items-center gap-2 relative z-10">
                <UserIcon class="w-4 h-4" /> Necessita Acompanhante
              </h3>
              <p class="text-sm text-slate-700 dark:text-slate-300 italic relative z-10">
                  <span class="font-bold">Motivo:</span> "{{ selectedRegistration.companion_reason || 'Motivo não especificado' }}"
              </p>
          </div>

          <!-- Anexo -->
          <div v-if="selectedRegistration.attachment_url" class="space-y-3">
              <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <FileTextIcon class="w-4 h-4" /> Comprovante / Anexo
              </h3>
              
              <!-- Preview de Imagem -->
              <div v-if="isLoadingImage" class="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center animate-pulse border border-slate-200 dark:border-slate-700">
                  <span class="text-xs text-slate-400 flex items-center gap-2">
                      <ClockIcon class="w-4 h-4 animate-spin" /> Carregando imagem segura...
                  </span>
              </div>
              <div v-else-if="signedImageUrl && (selectedRegistration.attachment_url.match(/\.(jpg|jpeg|png|webp)$/i))" class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex justify-center p-2">
                  <img :src="signedImageUrl" alt="Comprovante" class="w-auto h-auto max-h-[400px] object-contain rounded-lg shadow-sm" />
              </div>
              <div v-else-if="!signedImageUrl && !isLoadingImage" class="p-4 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100">
                  Não foi possível carregar a pré-visualização da imagem. Tente abrir o link direto abaixo.
              </div>

              <!-- Link de Download/Visualização -->
              <a :href="signedImageUrl || selectedRegistration.attachment_url" target="_blank" class="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-primary/20">
                <div class="bg-white dark:bg-slate-700 p-2 rounded-lg text-primary shadow-sm">
                    <ExternalLinkIcon class="w-5 h-5" />
                </div>
                <div class="flex-1 overflow-hidden">
                    <div class="text-sm font-medium text-slate-900 dark:text-white truncate">Abrir Arquivo Original</div>
                    <div class="text-xs text-slate-500 truncate font-mono">{{ selectedRegistration.attachment_url.split('/').pop() }}</div>
                </div>
              </a>
          </div>

          <!-- Alocação de Veículo -->
          <div v-if="selectedRegistration.status === 'approved'" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
             <h3 class="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-3 flex items-center gap-2">
                <TruckIcon class="w-4 h-4" /> Alocação de Veículo e Motorista
             </h3>
             <div class="flex flex-col sm:flex-row gap-3 items-end">
                <div class="flex-1 w-full relative">
                   <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Veículo Designado para a Viagem</label>
                   <select 
                      v-model="selectedRegistration.vehicle_id" 
                      @change="assignVehicle(selectedRegistration.vehicle_id || null)"
                      :disabled="isAssigningVehicle"
                      class="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm text-slate-900 dark:text-slate-100 font-medium appearance-none"
                   >
                     <option :value="null">Nenhum veículo designado</option>
                     <option v-for="v in vehicles" :key="v.id" :value="v.id">
                        {{v.name || v.modelo || 'Veículo'}} - {{v.plate || v.placa || 'Sem placa'}} ({{ v.type || 'N/A' }})
                     </option>
                   </select>
                </div>
                <div v-if="isAssigningVehicle" class="pb-2">
                   <ClockIcon class="w-5 h-5 text-blue-500 animate-spin" />
                </div>
             </div>
          </div>
          
          <!-- Metadados do Sistema -->
          <div class="border-t border-slate-100 dark:border-slate-800 pt-6 mt-2">
            <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-2">
                <InfoIcon class="w-4 h-4" /> Metadados do Sistema
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="space-y-1">
                    <span class="text-slate-500 block uppercase text-[10px] tracking-wide">ID do Registro</span>
                    <span class="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded select-all block truncate border border-slate-200 dark:border-slate-700">{{ selectedRegistration.id }}</span>
                </div>
                <div class="space-y-1">
                    <span class="text-slate-500 block uppercase text-[10px] tracking-wide">Criado em</span>
                    <span class="text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded block border border-slate-100 dark:border-slate-700/50">
                        {{ selectedRegistration.created_at ? new Date(selectedRegistration.created_at).toLocaleString('pt-BR') : 'Data desconhecida' }}
                    </span>
                </div>
                <div class="col-span-1 sm:col-span-2 space-y-1" v-if="selectedRegistration.conversation_id">
                    <span class="text-slate-500 block uppercase text-[10px] tracking-wide">Origem da Conversa</span>
                    <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded border border-slate-100 dark:border-slate-700/50">
                        <span class="font-mono text-slate-500 dark:text-slate-400 px-1 truncate flex-1 text-[10px]">{{ selectedRegistration.conversation_id }}</span>
                        <button @click="goToConversation" class="bg-primary/10 hover:bg-primary/20 text-primary text-xs px-3 py-1 rounded-md font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap">
                            <MessageSquareIcon class="w-3.5 h-3.5" /> 
                            Ir para Chat
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-3">
          <!-- Botão Excluir (Esquerda) -->
          <button 
            @click="requestDeleteRegistration(selectedRegistration.id, selectedRegistration.attachment_url)"
            class="px-4 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
            title="Excluir permanentemente"
          >
            <TrashIcon class="w-4 h-4" /> <span class="hidden sm:inline">Excluir</span>
          </button>

          <div class="flex items-center gap-3">
            <button @click="closeDetails" class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors shadow-sm text-sm">
              Fechar
            </button>
            
            <template v-if="selectedRegistration.status === 'pending'">
                <button @click="updateStatus(selectedRegistration.id, 'rejected'); closeDetails()" class="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold rounded-xl transition-colors shadow-sm text-sm flex items-center gap-2">
                  <XCircleIcon class="w-4 h-4" /> Rejeitar
                </button>
                <button @click="updateStatus(selectedRegistration.id, 'approved'); closeDetails()" class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-slate-900 font-bold rounded-xl transition-colors shadow-lg shadow-primary/20 text-sm flex items-center gap-2">
                  <CheckCircleIcon class="w-4 h-4" /> Aprovar
                </button>
            </template>
            
            <template v-else-if="selectedRegistration.status === 'approved'">
                <button @click="updateStatus(selectedRegistration.id, 'rejected'); closeDetails()" class="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold rounded-xl transition-colors shadow-sm text-sm flex items-center gap-2">
                  <XCircleIcon class="w-4 h-4" /> Cancelar Agendamento
                </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Novo Agendamento -->
    <div v-if="showNewRegistrationModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="showNewRegistrationModal = false">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusIcon class="w-5 h-5 text-primary" /> Novo Agendamento
          </h2>
          <button @click="showNewRegistrationModal = false" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          <!-- Seção Paciente -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Dados do Paciente</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                <input v-model="newRegistration.patient_name" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone (WhatsApp)</label>
                <input v-model="newRegistration.patient_phone" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: (11) 99999-9999" />
              </div>
            </div>
          </div>

          <!-- Seção Procedimento -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Dados do Procedimento</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data *</label>
                <input v-model="newRegistration.procedure_date" type="date" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Horário *</label>
                <input v-model="newRegistration.procedure_time" type="time" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                <select v-model="newRegistration.procedure_type" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                  <option value="Consulta">Consulta</option>
                  <option value="Exame">Exame</option>
                  <option value="Cirurgia">Cirurgia</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div class="md:col-span-3">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Procedimento / Especialidade</label>
                <input v-model="newRegistration.procedure_name" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: Cardiologista, Raio-X, Hemodiálise..." />
              </div>
            </div>
          </div>

          <!-- Seção Localização -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Localização</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Local de Destino (Clínica/Hospital)</label>
                <input v-model="newRegistration.location" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: Santa Casa" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cidade do Destino</label>
                <input v-model="newRegistration.city" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: São Paulo" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ponto de Embarque</label>
                <input v-model="newRegistration.boarding_point" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: Posto de Saúde Central" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bairro de Embarque</label>
                <input v-model="newRegistration.boarding_neighborhood" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: Centro" />
              </div>
            </div>
          </div>

          <!-- Seção Acompanhante -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Acompanhante</h3>
            <div class="flex items-start gap-3">
              <div class="flex items-center h-5">
                <input v-model="newRegistration.needs_companion" id="companion" type="checkbox" class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
              </div>
              <div class="flex-1">
                <label for="companion" class="font-medium text-slate-700 dark:text-slate-300 text-sm">Necessita de Acompanhante?</label>
                <p class="text-xs text-slate-500">Marque apenas se for estritamente necessário.</p>
                
                <div v-if="newRegistration.needs_companion" class="mt-2 animate-fade-in-up">
                   <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo do Acompanhante</label>
                   <input v-model="newRegistration.companion_reason" type="text" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Ex: Idoso, Menor de idade, Cadeirante..." />
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end items-center gap-3">
          <button @click="showNewRegistrationModal = false" class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors shadow-sm text-sm">
            Cancelar
          </button>
          <button 
            @click="saveNewRegistration" 
            :disabled="isSaving"
            class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-slate-900 font-bold rounded-xl transition-colors shadow-lg shadow-primary/20 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSaving" class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
            <span v-else>Salvar Agendamento</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modais de Feedback -->
    <UiConfirmModal 
      :show="showDeleteModal"
      title="Excluir Agendamento"
      description="ATENÇÃO: Tem certeza que deseja excluir este agendamento permanentemente? Esta ação não pode ser desfeita e irá remover todas as informações e fotos associadas."
      confirm-text="Sim, excluir"
      :loading="isDeletingRegistration"
      @close="showDeleteModal = false"
      @confirm="confirmDeleteRegistration"
    />

    <UiSuccessModal
      :show="showSuccessModal"
      :description="successMessage"
      @close="showSuccessModal = false"
      @action="showSuccessModal = false"
    />

    <UiErrorModal
      :show="showErrorModal"
      :description="errorMessage"
      @close="showErrorModal = false"
      @action="showErrorModal = false"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #334155;
}
</style>