<template>
  <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
      <UserIcon class="w-6 h-6 text-primary" />
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Informações do Perfil</h2>
    </div>

    <div class="p-6">
      <div v-if="loadingInit" class="flex justify-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Mensagem de Feedback -->
        <div v-if="message.text" :class="`col-span-1 md:col-span-2 p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`">
          {{ message.text }}
        </div>

        <!-- Avatar -->
        <div class="col-span-1 md:col-span-2 flex items-center gap-6 mb-4">
          <div class="relative group">
            <div class="size-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
              <img v-if="form.avatar_url" class="w-full h-full object-cover" :src="form.avatar_url" />
              <UserIcon v-else class="w-10 h-10 text-slate-400" />
              
              <!-- Spinner de loading -->
              <div v-if="uploadingAvatar" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                 <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            </div>
            
            <input 
              ref="fileInput" 
              type="file" 
              accept="image/png, image/jpeg" 
              class="hidden" 
              @change="handleAvatarChange"
            />
            
            <button 
              type="button"
              @click="triggerFileInput"
              :disabled="uploadingAvatar"
              class="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900 hover:scale-110 transition-transform disabled:opacity-50"
            >
              <CameraIcon class="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">Foto de Perfil</h3>
            <p class="text-xs text-slate-500 mt-1">PNG ou JPG até 5MB</p>
          </div>
        </div>

        <!-- Nome -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Nome Completo</label>
          <BaseInput v-model="form.name" type="text" placeholder="Seu nome completo" />
        </div>

        <!-- Email -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">E-mail Profissional</label>
          <BaseInput v-model="form.email" type="email" disabled class="cursor-not-allowed opacity-75" />
        </div>

        <!-- Telefone -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Telefone / WhatsApp</label>
          <BaseInput v-model="form.phone" type="tel" placeholder="(00) 00000-0000" />
        </div>

        <div class="col-span-1 md:col-span-2 flex justify-end mt-4">
          <BaseButton @click="handleSave" :loading="saving" class="w-full md:w-auto px-8">
            Salvar Alterações
          </BaseButton>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { UserIcon, CameraIcon } from 'lucide-vue-next'

const { user, fetchProfile, updateProfile, uploadAvatar, userProfile } = useAuth()

const loadingInit = ref(true)
const saving = ref(false)
const uploadingAvatar = ref(false)
const message = ref({ type: '', text: '' })
const fileInput = ref(null)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  avatar_url: ''
})

// Função auxiliar para garantir atualização do form
const updateForm = (data) => {
  if (data) {
      form.name = data.name || ''
      form.phone = data.phone || ''
      form.avatar_url = data.avatar_url || ''
      console.log('Form updated with:', data)
  }
}

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// Watch userProfile for external changes
watch(userProfile, (newProfile) => {
  if (newProfile) {
    updateForm(newProfile)
  }
}, { immediate: true })

// Watch user authentication state
watch(user, async (newUser) => {
  if (newUser) {
    console.log('UserProfileForm: Usuário detectado, recarregando perfil...')
    const profile = await fetchProfile()
    if (profile) updateForm(profile)
  }
}, { immediate: true })

onMounted(async () => {
  loadingInit.value = true
  
  // 1. Tenta carregar perfil existente no state
  if (userProfile && userProfile.value) {
      updateForm(userProfile.value)
  }

  // 2. Busca do servidor para garantir dados frescos
  const profile = await fetchProfile()
  if (profile) {
    updateForm(profile)
  } else if (userProfile && userProfile.value) {
    // Se falhar o fetch, mas tivermos algo no state, usa o state
    updateForm(userProfile.value)
  }

  // 3. Preencher email do Auth User (garantia)
  if (user.value) {
    form.email = user.value.email || ''
    // Fallback para nome se o perfil estiver vazio
    if (!form.name && user.value.user_metadata?.full_name) {
      form.name = user.value.user_metadata.full_name
    }
    // Fallback para avatar se o perfil estiver vazio
    if (!form.avatar_url && user.value.user_metadata?.avatar_url) {
      form.avatar_url = user.value.user_metadata.avatar_url
    }
  }

  loadingInit.value = false
})

const handleAvatarChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    message.value = { type: 'error', text: 'A imagem deve ter no máximo 5MB' }
    return
  }

  uploadingAvatar.value = true
  message.value = { type: '', text: '' }

  try {
    const { success, url, error } = await uploadAvatar(file)

    if (success && url) {
        form.avatar_url = url
        message.value = { type: 'success', text: 'Foto de perfil atualizada!' }
    } else {
        throw new Error(error || 'Erro desconhecido no upload')
    }
  } catch (err) {
      console.error(err)
      message.value = { type: 'error', text: err.message || 'Erro ao enviar foto' }
  } finally {
      uploadingAvatar.value = false
      if (fileInput.value) fileInput.value.value = ''
  }
}

const handleSave = async () => {
  saving.value = true
  message.value = { type: '', text: '' }
  
  const { success, error } = await updateProfile({
    name: form.name,
    phone: form.phone
  })
  
  if (success) {
    message.value = { type: 'success', text: 'Perfil atualizado com sucesso!' }
  } else {
    message.value = { type: 'error', text: error || 'Erro ao atualizar perfil' }
  }
  
  saving.value = false
}
</script>
