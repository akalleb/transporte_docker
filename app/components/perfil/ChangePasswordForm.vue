<template>
  <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
      <LockIcon class="w-6 h-6 text-primary" />
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Alterar Senha</h2>
    </div>

    <div class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Mensagem de Feedback -->
        <div v-if="message.text" :class="`col-span-1 md:col-span-2 p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`">
          {{ message.text }}
        </div>

        <!-- Nova senha -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Nova Senha</label>
          <div class="relative">
            <BaseInput 
              v-model="form.newPassword"
              :type="showNewPassword ? 'text' : 'password'" 
              placeholder="Digite sua nova senha"
            >
              <template #icon>
                <LockIcon class="w-5 h-5" />
              </template>
            </BaseInput>
            <button 
              type="button" 
              @click="showNewPassword = !showNewPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
            >
              <EyeIcon v-if="!showNewPassword" class="w-5 h-5" />
              <EyeOffIcon v-else class="w-5 h-5" />
            </button>
          </div>
          <p class="text-[10px] text-slate-400">Mínimo de 8 caracteres, com letras e números.</p>
        </div>

        <!-- Confirmar senha -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirmar Nova Senha</label>
          <div class="relative">
            <BaseInput 
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'" 
              placeholder="Confirme a nova senha"
            >
              <template #icon>
                <CheckCircleIcon class="w-5 h-5" />
              </template>
            </BaseInput>
            <button 
              type="button" 
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
            >
              <EyeIcon v-if="!showConfirmPassword" class="w-5 h-5" />
              <EyeOffIcon v-else class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="col-span-1 md:col-span-2 flex justify-end mt-4">
          <BaseButton @click="handlePasswordChange" :loading="loading" class="w-full md:w-auto px-8">
            Atualizar Senha
          </BaseButton>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { LockIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const message = ref({ type: '', text: '' })

const form = reactive({
  newPassword: '',
  confirmPassword: ''
})

const handlePasswordChange = async () => {
  message.value = { type: '', text: '' }
  
  if (form.newPassword !== form.confirmPassword) {
    message.value = { type: 'error', text: 'As senhas não coincidem' }
    return
  }

  if (form.newPassword.length < 6) {
    message.value = { type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' }
    return
  }

  loading.value = true
  
  try {
    const { error } = await supabase.auth.updateUser({
      password: form.newPassword
    })

    if (error) throw error

    message.value = { type: 'success', text: 'Senha atualizada com sucesso!' }
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (error) {
    message.value = { type: 'error', text: error.message || 'Erro ao atualizar senha' }
  } finally {
    loading.value = false
  }
}
</script>
