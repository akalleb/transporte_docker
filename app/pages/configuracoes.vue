<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { 
  UsersIcon, 
  PlusIcon, 
  EditIcon, 
  Trash2Icon, 
  MessageCircleIcon, 
  RefreshCwIcon, 
  UnlinkIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  HistoryIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  MessageSquareIcon,
  AlertTriangleIcon,
  SaveIcon,
  SettingsIcon,
  XIcon
} from 'lucide-vue-next'
import BaseModal from '~/components/ui/BaseModal.vue'
import SuccessModal from '~/components/ui/SuccessModal.vue'
import ErrorModal from '~/components/ui/ErrorModal.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseButton from '~/components/BaseButton.vue'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const users = ref<any[]>([])
const loading = ref(false)

const boardingLocations = ref<any[]>([])
const newLocation = ref({ neighborhood: '', point_name: '', description: '' })
const isAddingNeighborhood = ref(false)
const addingPointTo = ref<string | null>(null)
const expandedNeighborhoods = ref<string[]>([])

const groupedLocations = computed(() => {
  const groups: Record<string, any[]> = {}
  boardingLocations.value.forEach(loc => {
    if (!groups[loc.neighborhood]) {
      groups[loc.neighborhood] = []
    }
    groups[loc.neighborhood].push(loc)
  })
  return groups
})

const toggleNeighborhood = (name: string) => {
  const index = expandedNeighborhoods.value.indexOf(name)
  if (index === -1) {
    expandedNeighborhoods.value.push(name)
  } else {
    expandedNeighborhoods.value.splice(index, 1)
  }
}

const runtimeConfig = useRuntimeConfig()
const WHATSAPP_API = runtimeConfig.public.whatsappApiUrl || 'http://localhost:3001'

// WhatsApp Connection State
const isConnected = ref(false)
const qrCodeValue = ref('')
const qrCodeImage = ref('')
const connectionStatus = ref('disconnected')
const pollingInterval = ref<any>(null)
const errorMsg = ref('')

const isAddingUser = ref(false)
const newUser = ref({ name: '', email: '', password: '', role: 'user', phone: '' })

// Edit User State
const isEditingUser = ref(false)
const editUserForm = ref({ id: '', name: '', email: '', role: 'user', phone: '', password: '' })

// Success/Error Modal State
const successModal = ref({
  show: false,
  title: '',
  description: ''
})

const errorModal = ref({
  show: false,
  title: '',
  description: ''
})

const showSuccess = (title: string, description: string) => {
  successModal.value = { show: true, title, description }
}

const showError = (title: string, description: string) => {
  errorModal.value = { show: true, title, description }
}

// Confirmation Modal State
const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  type: 'danger' as 'danger' | 'warning' | 'info',
  confirmText: 'Confirmar',
  onConfirm: () => {}
})

const openConfirmModal = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger', confirmText = 'Confirmar') => {
  confirmModal.value = {
    show: true,
    title,
    message,
    type,
    confirmText,
    onConfirm
  }
}

const handleConfirmAction = () => {
  confirmModal.value.onConfirm()
  confirmModal.value.show = false
}

const openEditUser = (user: any) => {
  editUserForm.value = { 
    id: user.id,
    name: user.name || '', 
    email: user.email || '', 
    role: user.role || 'user', 
    phone: user.phone || '',
    password: '' // Optional for update
  }
  isEditingUser.value = true
}

const updateUser = async () => {
  if (!editUserForm.value.name || !editUserForm.value.email) {
    showError('Erro', 'Preencha nome e email')
    return
  }

  loading.value = true
  try {
    const response = await $fetch('/api/admin/update-user', {
      method: 'POST',
      body: editUserForm.value
    })

    showSuccess('Sucesso', 'Usuário atualizado com sucesso!')
    isEditingUser.value = false
    fetchUsers()
  } catch (err: any) {
    console.error('Erro ao atualizar usuário:', err)
    showError('Erro', 'Erro ao atualizar usuário: ' + (err.data?.message || err.message))
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  if (!newUser.value.name || !newUser.value.email || !newUser.value.password) {
    showError('Erro', 'Preencha todos os campos obrigatórios')
    return
  }

  loading.value = true
  try {
    const response = await $fetch('/api/admin/create-user', {
      method: 'POST',
      body: newUser.value
    })

    showSuccess('Sucesso', 'Usuário criado com sucesso!')
    newUser.value = { name: '', email: '', password: '', role: 'user', phone: '' }
    isAddingUser.value = false
    fetchUsers()
  } catch (err: any) {
    console.error('Erro ao criar usuário:', err)
    showError('Erro', 'Erro ao criar usuário: ' + (err.data?.message || err.message))
  } finally {
    loading.value = false
  }
}

const deleteUser = async (id: string) => {
  loading.value = true
  try {
    const response = await $fetch('/api/admin/delete-user', {
      method: 'POST',
      body: { id }
    })

    showSuccess('Sucesso', 'Usuário excluído com sucesso!')
    fetchUsers()
  } catch (err: any) {
    console.error('Erro ao excluir usuário:', err)
    showError('Erro', 'Erro ao excluir usuário: ' + (err.data?.message || err.message))
  } finally {
    loading.value = false
  }
}

const toggleRole = (user: any) => {
  const newRole = user.role === 'admin' ? 'user' : 'admin'
  
  openConfirmModal(
    'Alterar Cargo',
    `Deseja alterar o cargo de "${user.name}" para "${newRole}"?`,
    async () => {
      try {
        const response = await $fetch('/api/admin/update-role', {
          method: 'POST',
          body: { userId: user.id, role: newRole }
        })

        // Atualizar localmente
        user.role = newRole
        showSuccess('Sucesso', `Cargo alterado para ${newRole} com sucesso!`)
      } catch (err: any) {
        console.error('Erro ao alterar cargo:', err)
        showError('Erro', 'Erro ao alterar cargo')
      }
    },
    'warning',
    'Alterar Cargo'
  )
}

const fetchUsers = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name')

  if (error) {
    console.error('Erro ao buscar usuários:', error)
  } else {
    users.value = data || []
  }
  loading.value = false
}

const fetchBoardingLocations = async () => {
  const { data, error } = await supabase
    .from('boarding_locations')
    .select('*')
    .order('neighborhood')

  if (error) {
    console.error('Erro ao buscar locais:', error)
  } else {
    boardingLocations.value = data || []
  }
}

const addBoardingLocation = async (neighborhood?: string) => {
  const locationData = { ...newLocation.value }
  
  // Se for adição em bairro existente
  if (neighborhood) {
    locationData.neighborhood = neighborhood
  }

  if (!locationData.neighborhood || !locationData.point_name) return
  
  const { error } = await supabase.from('boarding_locations').insert(locationData)
  
  if (error) {
    console.error('Erro ao adicionar local:', error)
    showError('Erro', 'Erro ao adicionar local')
  } else {
    newLocation.value = { neighborhood: '', point_name: '', description: '' }
    isAddingNeighborhood.value = false
    addingPointTo.value = null
    
    // Expandir o bairro recém criado/editado
    if (!expandedNeighborhoods.value.includes(locationData.neighborhood)) {
        expandedNeighborhoods.value.push(locationData.neighborhood)
    }
    
    fetchBoardingLocations()
  }
}

const deleteNeighborhood = (neighborhood: string) => {
    openConfirmModal(
        'Excluir Bairro',
        `Tem certeza que deseja excluir o bairro "${neighborhood}" e todos os seus pontos de embarque?`,
        async () => {
            const { error } = await supabase
                .from('boarding_locations')
                .delete()
                .eq('neighborhood', neighborhood)

            if (error) {
                console.error('Erro ao excluir bairro:', error)
                showError('Erro', 'Erro ao excluir bairro')
            } else {
                fetchBoardingLocations()
            }
        },
        'danger',
        'Excluir Bairro'
    )
}

const deleteBoardingLocation = (id: string) => {
  openConfirmModal(
    'Excluir Ponto',
    'Tem certeza que deseja excluir este ponto?',
    async () => {
      const { error } = await supabase.from('boarding_locations').delete().eq('id', id)
      
      if (error) {
        console.error('Erro ao excluir local:', error)
        showError('Erro', 'Erro ao excluir local')
      } else {
        fetchBoardingLocations()
      }
    },
    'danger',
    'Excluir'
  )
}

const checkStatus = async () => {
  try {
    const res = await fetch(`${WHATSAPP_API}/status`)
    const data = await res.json()
    connectionStatus.value = data.status
    isConnected.value = data.status === 'connected'
    errorMsg.value = ''
    
    if (!isConnected.value) {
        fetchQrCode()
    }
  } catch (err) {
    console.error('Erro ao conectar com servidor WhatsApp:', err)
    connectionStatus.value = 'error'
    errorMsg.value = 'Servidor WhatsApp indisponível'
  }
}

const fetchQrCode = async () => {
  try {
    const res = await fetch(`${WHATSAPP_API}/qr`)
    if (res.ok) {
        const data = await res.json()
        qrCodeValue.value = data.code
        qrCodeImage.value = data.qr
    }
  } catch (err) {
      console.error('Erro ao buscar QR:', err)
  }
}

const handleRefreshQR = () => {
  fetchQrCode()
}

const handleDisconnect = () => {
  openConfirmModal(
    'Desconectar WhatsApp',
    'Tem certeza que deseja desconectar o dispositivo?',
    async () => {
      try {
          await fetch(`${WHATSAPP_API}/logout`, { method: 'POST' })
          isConnected.value = false
          connectionStatus.value = 'disconnected'
          checkStatus()
      } catch (err) {
          console.error('Erro ao desconectar:', err)
      }
    },
    'warning',
    'Desconectar'
  )
}

const settings = ref({
  service_hours: { start: '08:00', end: '18:00', active: true },
  welcome_message: '',
  bot_notices: '',
  ai_persona: 'Assistente prestativo e profissional',
  ai_creativity: 0.7,
  ai_supervision_level: 'medium',
  ai_instructions: 'Seja conciso e foque em agendar o transporte.'
})
const loadingSettings = ref(false)

const fetchSettings = async () => {
  try {
    const data = await $fetch('/api/admin/settings')
    if (data) settings.value = data
  } catch (err) {
    console.error('Erro ao buscar configurações:', err)
  }
}

const saveSettings = async () => {
  loadingSettings.value = true
  try {
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: settings.value
    })
    showSuccess('Sucesso', 'Configurações salvas com sucesso!')
  } catch (err) {
    console.error('Erro ao salvar configurações:', err)
    showError('Erro', 'Erro ao salvar configurações.')
  } finally {
    loadingSettings.value = false
  }
}

onMounted(() => {
  fetchUsers()
  fetchBoardingLocations()
  fetchSettings()
  checkStatus()
  pollingInterval.value = setInterval(checkStatus, 5000)
})

onUnmounted(() => {
    if (pollingInterval.value) clearInterval(pollingInterval.value)
})
</script>

<template>
  <div class="space-y-8 p-4 lg:p-8 max-w-7xl mx-auto">
    <header class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Configurações</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2 font-light">Gerencie usuários, integrações e preferências da plataforma.</p>
      </div>
      <div class="flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 px-4 py-2 rounded-lg">
        <span class="size-2 rounded-full bg-primary animate-pulse"></span>
        Sistema Online
      </div>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <!-- User Management Section -->
      <section class="xl:col-span-2 flex flex-col gap-6">
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-3">
              <UsersIcon class="text-primary w-6 h-6" />
              <h2 class="font-bold uppercase tracking-wider text-xs text-slate-400">Gerenciamento de Usuários</h2>
            </div>
            <button 
              @click="isAddingUser = !isAddingUser"
              class="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <PlusIcon class="w-5 h-5" />
              {{ isAddingUser ? 'Cancelar' : 'Adicionar Novo Usuário' }}
            </button>
          </div>
          
          <!-- Add User Modal -->
          <BaseModal :show="isAddingUser" @close="isAddingUser = false" maxWidth="max-w-2xl">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Adicionar Novo Usuário</h2>
                <button @click="isAddingUser = false" class="text-slate-400 hover:text-slate-600 transition-colors">
                  <XIcon class="w-6 h-6" />
                </button>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Nome</label>
                   <BaseInput v-model="newUser.name" placeholder="Nome completo" />
                 </div>
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Email</label>
                   <BaseInput v-model="newUser.email" placeholder="email@exemplo.com" type="email" />
                 </div>
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Telefone</label>
                   <BaseInput v-model="newUser.phone" placeholder="(00) 00000-0000" type="tel" />
                 </div>
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Senha</label>
                   <BaseInput v-model="newUser.password" placeholder="Senha segura" type="password" />
                 </div>
                 <div class="space-y-2 md:col-span-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Cargo</label>
                   <div class="relative">
                     <select v-model="newUser.role" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-4 px-4 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm transition-colors outline-none appearance-none cursor-pointer">
                        <option value="user">Usuário (Agente)</option>
                        <option value="admin">Administrador</option>
                     </select>
                     <ChevronDownIcon class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                   </div>
                 </div>
              </div>

              <div class="flex gap-4 pt-4">
                <BaseButton @click="isAddingUser = false" class="bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  Cancelar
                </BaseButton>
                <BaseButton @click="createUser" :disabled="loading">
                  <span v-if="loading">Criando...</span>
                  <span v-else class="flex items-center gap-2"><PlusIcon class="w-5 h-5" /> Criar Usuário</span>
                </BaseButton>
              </div>
            </div>
          </BaseModal>

          <!-- Edit User Modal -->
          <BaseModal :show="isEditingUser" @close="isEditingUser = false" maxWidth="max-w-2xl">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Editar Usuário</h2>
                <button @click="isEditingUser = false" class="text-slate-400 hover:text-slate-600 transition-colors">
                  <XIcon class="w-6 h-6" />
                </button>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Nome</label>
                   <BaseInput v-model="editUserForm.name" placeholder="Nome completo" />
                 </div>
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Email</label>
                   <BaseInput v-model="editUserForm.email" placeholder="email@exemplo.com" type="email" />
                 </div>
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Telefone</label>
                   <BaseInput v-model="editUserForm.phone" placeholder="(00) 00000-0000" type="tel" />
                 </div>
                 <div class="space-y-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Nova Senha (Opcional)</label>
                   <BaseInput v-model="editUserForm.password" placeholder="Deixe em branco para manter" type="password" />
                 </div>
                 <div class="space-y-2 md:col-span-2">
                   <label class="text-sm font-bold uppercase text-slate-400">Cargo</label>
                   <div class="relative">
                     <select v-model="editUserForm.role" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-4 px-4 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm transition-colors outline-none appearance-none cursor-pointer">
                        <option value="user">Usuário (Agente)</option>
                        <option value="admin">Administrador</option>
                     </select>
                     <ChevronDownIcon class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                   </div>
                 </div>
              </div>

              <div class="flex gap-4 pt-4">
                <BaseButton @click="isEditingUser = false" class="bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  Cancelar
                </BaseButton>
                <BaseButton @click="updateUser" :disabled="loading">
                  <span v-if="loading">Salvando...</span>
                  <span v-else class="flex items-center gap-2"><SaveIcon class="w-5 h-5" /> Salvar Alterações</span>
                </BaseButton>
              </div>
            </div>
          </BaseModal>

          <!-- Confirmation Modal -->
          <BaseModal :show="confirmModal.show" @close="confirmModal.show = false" maxWidth="max-w-md">
            <div class="space-y-6">
              <div class="flex items-center gap-4">
                <div class="flex-shrink-0 size-12 rounded-full flex items-center justify-center" 
                  :class="confirmModal.type === 'danger' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'">
                  <AlertTriangleIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ confirmModal.title }}</h3>
                  <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ confirmModal.message }}</p>
                </div>
              </div>

              <div class="flex gap-4 pt-2">
                <BaseButton @click="confirmModal.show = false" class="bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  Cancelar
                </BaseButton>
                <BaseButton @click="handleConfirmAction" 
                  :class="confirmModal.type === 'danger' ? '!bg-red-500 hover:!bg-red-600' : '!bg-amber-500 hover:!bg-amber-600'">
                  {{ confirmModal.confirmText }}
                </BaseButton>
              </div>
            </div>
          </BaseModal>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm">
                <tr>
                  <th class="px-6 py-4 font-medium">Nome</th>
                  <th class="px-6 py-4 font-medium">Email</th> <!-- Note: Email is not in profiles table by default, might need join with auth.users or store in profiles -->
                  <th class="px-6 py-4 font-medium">Cargo</th>
                  <th class="px-6 py-4 font-medium text-center">Status</th>
                  <th class="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-if="loading" class="text-center py-8">
                    <td colspan="5" class="px-6 py-8 text-slate-500">Carregando usuários...</td>
                </tr>
                <tr v-else v-for="user in users" :key="user.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-5 font-medium text-gray-900 dark:text-gray-100">{{ user.name || 'Sem nome' }}</td>
                  <td class="px-6 py-5 text-slate-500 dark:text-slate-400 text-sm">{{ user.email || '-' }}</td>
                  <td class="px-6 py-5">
                    <span class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300 uppercase font-semibold">
                      {{ user.role || 'user' }}
                    </span>
                  </td>
                  <td class="px-6 py-5 text-center">
                    <span 
                      class="text-[10px] font-bold px-2 py-1 rounded-full uppercase"
                      :class="user.status === 'active' ? 'bg-primary/15 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'"
                    >
                      {{ user.status || 'Pendente' }}
                    </span>
                  </td>
                  <td class="px-6 py-5 text-right space-x-2 flex justify-end">
                    <button 
                      @click="toggleRole(user)" 
                      class="p-2 transition-colors"
                      :class="user.role === 'admin' ? 'text-green-500 hover:text-green-600' : 'text-slate-400 hover:text-green-500'"
                      title="Alternar Cargo (Admin/User)"
                    >
                      <ShieldCheckIcon class="w-4 h-4" />
                    </button>
                    <button 
                      @click="openEditUser(user)"
                      class="p-2 text-slate-400 hover:text-primary transition-colors"
                      title="Editar Usuário"
                    >
                      <EditIcon class="w-4 h-4" />
                    </button>
                    <button 
                      @click="openConfirmModal('Excluir Usuário', 'Tem certeza que deseja excluir este usuário?', () => deleteUser(user.id))"
                      class="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Excluir Usuário"
                    >
                      <Trash2Icon class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!loading && users.length === 0">
                    <td colspan="5" class="px-6 py-8 text-center text-slate-500">Nenhum usuário encontrado.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- System Configuration -->
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <SettingsIcon class="text-primary w-6 h-6" />
            <h2 class="font-bold uppercase tracking-wider text-xs text-slate-400">Configuração do Atendimento IA</h2>
          </div>
          
          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Service Hours -->
            <div class="space-y-4">
              <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ClockIcon class="w-4 h-4 text-slate-400" />
                Horário de Atendimento
              </h3>
              <div class="flex gap-4 items-center">
                <div class="space-y-1 flex-1">
                  <label class="text-xs font-bold uppercase text-slate-400">Início</label>
                  <input v-model="settings.service_hours.start" type="time" class="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                </div>
                <div class="space-y-1 flex-1">
                  <label class="text-xs font-bold uppercase text-slate-400">Fim</label>
                  <input v-model="settings.service_hours.end" type="time" class="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                </div>
              </div>
               <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="settings.service_hours.active" id="active_hours" class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                  <label for="active_hours" class="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">Ativar restrição de horário</label>
               </div>
            </div>

            <!-- Welcome Message -->
            <div class="space-y-4 md:col-span-2">
               <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquareIcon class="w-4 h-4 text-slate-400" />
                Frase de Boas Vindas
              </h3>
              <textarea v-model="settings.welcome_message" rows="2" class="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" placeholder="Mensagem enviada ao iniciar conversa..."></textarea>
            </div>

            <!-- Bot Notices -->
            <div class="space-y-4 md:col-span-2">
               <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangleIcon class="w-4 h-4 text-slate-400" />
                Avisos para a IA (Contexto)
              </h3>
              <p class="text-xs text-slate-500">Instruções extras para a IA considerar (ex: "Estamos sem sistema de raio-x hoje").</p>
              <textarea v-model="settings.bot_notices" rows="2" class="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" placeholder="Avisos gerais..."></textarea>
            </div>

            <!-- AI Configuration -->
            <div class="space-y-4 md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <SettingsIcon class="w-4 h-4 text-slate-400" />
                Personalidade e Comportamento
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                   <label class="text-xs font-bold uppercase text-slate-400">Persona (Quem é o Agente?)</label>
                   <BaseInput v-model="settings.ai_persona" placeholder="Ex: Assistente prestativo e profissional" />
                </div>
                
                <div class="space-y-2">
                   <label class="text-xs font-bold uppercase text-slate-400">Nível de Supervisão</label>
                   <div class="relative">
                     <select v-model="settings.ai_supervision_level" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 px-4 text-sm text-slate-900 dark:text-white focus:border-primary focus:ring-primary appearance-none cursor-pointer outline-none">
                        <option value="low">Baixo (Mais Autônomo)</option>
                        <option value="medium">Médio (Equilibrado)</option>
                        <option value="high">Alto (Mais Conservador)</option>
                     </select>
                     <ChevronDownIcon class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                </div>

                <div class="space-y-2 md:col-span-2">
                   <div class="flex justify-between">
                     <label class="text-xs font-bold uppercase text-slate-400">Criatividade (Temperatura)</label>
                     <span class="text-xs font-bold text-primary">{{ settings.ai_creativity }}</span>
                   </div>
                   <input type="range" v-model.number="settings.ai_creativity" min="0" max="1" step="0.1" class="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
                   <div class="flex justify-between text-[10px] text-slate-400">
                     <span>Preciso (0.0)</span>
                     <span>Criativo (1.0)</span>
                   </div>
                </div>

                <div class="space-y-2 md:col-span-2">
                   <label class="text-xs font-bold uppercase text-slate-400">Instruções do Sistema (System Prompt)</label>
                   <textarea v-model="settings.ai_instructions" rows="4" class="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:border-primary focus:ring-primary outline-none transition-colors" placeholder="Instruções detalhadas sobre como o agente deve se comportar..."></textarea>
                   <p class="text-[10px] text-slate-500">Estas instruções serão adicionadas ao prompt do sistema e têm alta prioridade.</p>
                </div>
              </div>
            </div>

            <div class="md:col-span-2 flex justify-end">
               <button @click="saveSettings" :disabled="loadingSettings" class="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50">
                 <SaveIcon class="w-4 h-4" />
                 {{ loadingSettings ? 'Salvando...' : 'Salvar Configurações' }}
               </button>
            </div>
          </div>
        </div>

        <!-- Boarding Locations Management -->
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-3">
              <MapPinIcon class="text-primary w-6 h-6" />
              <h2 class="font-bold uppercase tracking-wider text-xs text-slate-400">Locais de Embarque</h2>
            </div>
            <button 
              @click="isAddingNeighborhood = !isAddingNeighborhood"
              class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2"
            >
              <PlusIcon class="w-5 h-5" />
              {{ isAddingNeighborhood ? 'Cancelar' : 'Novo Bairro' }}
            </button>
          </div>
          
          <!-- Add New Neighborhood Modal -->
          <BaseModal :show="isAddingNeighborhood" @close="isAddingNeighborhood = false" maxWidth="max-w-2xl">
             <div class="space-y-6">
               <div class="flex items-center justify-between">
                 <h2 class="text-xl font-bold text-gray-900 dark:text-white">Adicionar Novo Bairro</h2>
                 <button @click="isAddingNeighborhood = false" class="text-slate-400 hover:text-slate-600 transition-colors">
                   <XIcon class="w-6 h-6" />
                 </button>
               </div>
               
               <div class="grid grid-cols-1 gap-6">
                  <div class="space-y-2">
                    <label class="text-sm font-bold uppercase text-slate-400">Nome do Bairro</label>
                    <BaseInput v-model="newLocation.neighborhood" placeholder="Ex: Centro" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold uppercase text-slate-400">Primeiro Ponto de Embarque</label>
                    <BaseInput v-model="newLocation.point_name" placeholder="Ex: Praça Matriz" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold uppercase text-slate-400">Descrição (Opcional)</label>
                    <BaseInput v-model="newLocation.description" placeholder="Ref: Em frente ao banco" />
                  </div>
               </div>

               <div class="flex gap-4 pt-4">
                 <BaseButton @click="isAddingNeighborhood = false" class="bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                   Cancelar
                 </BaseButton>
                 <BaseButton @click="addBoardingLocation()">
                   Salvar
                 </BaseButton>
               </div>
             </div>
          </BaseModal>

          <!-- Add Point to Existing Neighborhood Modal -->
          <BaseModal :show="!!addingPointTo" @close="addingPointTo = null" maxWidth="max-w-2xl">
             <div class="space-y-6">
               <div class="flex items-center justify-between">
                 <h2 class="text-xl font-bold text-gray-900 dark:text-white">Adicionar Ponto em <span class="text-primary">{{ addingPointTo }}</span></h2>
                 <button @click="addingPointTo = null" class="text-slate-400 hover:text-slate-600 transition-colors">
                   <XIcon class="w-6 h-6" />
                 </button>
               </div>
               
               <div class="grid grid-cols-1 gap-6">
                  <div class="space-y-2">
                    <label class="text-sm font-bold uppercase text-slate-400">Nome do Ponto</label>
                    <BaseInput v-model="newLocation.point_name" placeholder="Nome do ponto" autofocus />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold uppercase text-slate-400">Descrição (Opcional)</label>
                    <BaseInput v-model="newLocation.description" placeholder="Referência" />
                  </div>
               </div>

               <div class="flex gap-4 pt-4">
                 <BaseButton @click="addingPointTo = null" class="bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                   Cancelar
                 </BaseButton>
                 <BaseButton @click="addBoardingLocation(addingPointTo!)">
                   Salvar
                 </BaseButton>
               </div>
             </div>
          </BaseModal>
 
           <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="(points, neighborhood) in groupedLocations" :key="neighborhood" class="group">
                <!-- Neighborhood Header -->
                <div class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none" @click="toggleNeighborhood(String(neighborhood))">
                    <div class="flex items-center gap-3">
                        <button class="text-slate-400">
                            <ChevronDownIcon v-if="expandedNeighborhoods.includes(String(neighborhood))" class="w-5 h-5" />
                            <ChevronRightIcon v-else class="w-5 h-5" />
                        </button>
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-gray-100">{{ neighborhood }}</h3>
                            <p class="text-xs text-slate-500">{{ points.length }} pontos cadastrados</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2" @click.stop>
                        <button 
                            @click="addingPointTo = (addingPointTo === neighborhood ? null : String(neighborhood))"
                            class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                        >
                            <PlusIcon class="w-4 h-4" />
                            Add Ponto
                        </button>
                        <button @click="deleteNeighborhood(String(neighborhood))" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2Icon class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Points List & Add Form -->
                <div v-if="expandedNeighborhoods.includes(String(neighborhood))" class="pl-12 pr-4 pb-4 space-y-2">


                    <!-- Points Table -->
                    <div class="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 dark:bg-slate-800/30 text-slate-500">
                                <tr>
                                    <th class="px-4 py-2 font-medium">Ponto</th>
                                    <th class="px-4 py-2 font-medium">Referência</th>
                                    <th class="px-4 py-2 text-right"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr v-for="point in points" :key="point.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td class="px-4 py-2 text-slate-700 dark:text-slate-300">{{ point.point_name }}</td>
                                    <td class="px-4 py-2 text-slate-500">{{ point.description || '-' }}</td>
                                    <td class="px-4 py-2 text-right">
                                        <button @click="deleteBoardingLocation(point.id)" class="text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2Icon class="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div v-if="Object.keys(groupedLocations).length === 0" class="p-8 text-center text-slate-500">
                Nenhum local configurado. Adicione um bairro para começar.
            </div>
          </div>
        </div>
      </section>

      <!-- WhatsApp Connection Section -->
      <section class="flex flex-col gap-6">
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-full">
          <div class="flex items-center gap-3 mb-6">
            <MessageCircleIcon class="text-[#25D366] w-6 h-6" />
            <h2 class="font-bold uppercase tracking-wider text-xs text-slate-400">Conexão WhatsApp</h2>
          </div>
          
          <div class="flex-1 flex flex-col items-center justify-center text-center">
            <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <span 
                class="size-3 rounded-full transition-colors duration-300"
                :class="isConnected ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'"
              ></span>
              {{ isConnected ? 'Conectado' : 'Desconectado' }}
            </div>
            
            <div class="relative group cursor-pointer mb-6" v-if="!isConnected">
              <div class="p-4 bg-white dark:bg-white rounded-lg border-4 border-primary/20 group-hover:border-primary transition-all shadow-xl">
                <QrcodeVue :value="qrCodeValue" :size="200" level="H" class="opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] rounded-lg transition-all pointer-events-none">
                <RefreshCwIcon class="w-10 h-10 text-background-dark dark:text-white" />
              </div>
            </div>

             <div v-else class="mb-6 flex flex-col items-center justify-center h-48 w-full bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <ShieldCheckIcon class="w-16 h-16 text-green-500 mb-2" />
                <p class="text-green-700 dark:text-green-400 font-medium">Sessão Ativa</p>
            </div>

            <p class="text-sm text-slate-500 dark:text-slate-400 px-4 mb-8" v-if="!isConnected">
              Abra o WhatsApp no seu celular, vá em <b>Aparelhos Conectados</b> e escaneie o código acima.
            </p>

            <div class="w-full flex flex-col gap-3">
              <button 
                @click="handleRefreshQR"
                v-if="!isConnected"
                class="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors text-gray-700 dark:text-gray-300"
              >
                <RefreshCwIcon class="w-4 h-4" />
                Atualizar QR Code
              </button>
              
              <button 
                @click="handleDisconnect"
                v-if="isConnected"
                class="w-full py-3 px-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <UnlinkIcon class="w-4 h-4" />
                Desconectar Dispositivo
              </button>
            </div>
          </div>
          
          <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
            <div class="flex justify-between">
              <span>Versão do Client:</span>
              <span class="font-mono">v2.4.12-stable</span>
            </div>
            <div class="flex justify-between">
              <span>Última Atividade:</span>
              <span>{{ new Date().toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Footer / Integration Stats -->
    <footer class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-primary/5 border border-primary/10 p-4 rounded-xl flex items-center gap-4">
        <div class="size-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
          <DatabaseIcon class="w-5 h-5" />
        </div>
        <div>
          <p class="text-[10px] uppercase font-bold text-slate-400">Armazenamento</p>
          <p class="text-sm font-bold text-gray-900 dark:text-gray-100">12.4 GB / 100 GB</p>
        </div>
      </div>
      
      <div class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4">
        <div class="size-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
          <ShieldCheckIcon class="w-5 h-5" />
        </div>
        <div>
          <p class="text-[10px] uppercase font-bold text-slate-400">Certificado SSL</p>
          <p class="text-sm font-bold text-primary">Ativo & Seguro</p>
        </div>
      </div>
      
      <div class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4">
        <div class="size-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
          <HistoryIcon class="w-5 h-5" />
        </div>
        <div>
          <p class="text-[10px] uppercase font-bold text-slate-400">Logs de Acesso</p>
          <p class="text-sm font-bold text-gray-900 dark:text-gray-100">Ver Histórico Completo</p>
        </div>
      </div>
    </footer>

    <!-- Global Feedback Modals -->
    <SuccessModal 
      :show="successModal.show" 
      :title="successModal.title" 
      :description="successModal.description"
      @close="successModal.show = false"
      @action="successModal.show = false"
    />
    
    <ErrorModal 
      :show="errorModal.show" 
      :title="errorModal.title" 
      :description="errorModal.description"
      @close="errorModal.show = false"
      @action="errorModal.show = false"
    />
  </div>
</template>
