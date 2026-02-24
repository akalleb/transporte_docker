<template>
  <div class="flex w-full lg:w-1/2 flex-col justify-center px-8 md:px-16 xl:px-24 py-12 bg-white dark:bg-background-dark transition-colors">
    <div class="mb-10 lg:hidden">
      <div class="flex items-center gap-2 mb-4">
        <div class="bg-primary/10 p-2 rounded-lg">
          <MessageCircleIcon class="text-primary w-6 h-6" />
        </div>
        <span class="text-gray-900 dark:text-white text-lg font-bold">MultiChat</span>
      </div>
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Bem-vindo de volta</h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">Acesse sua conta para gerenciar seus atendimentos.</p>
    </div>

    <div class="hidden lg:block mb-10">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Login</h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        Entre com suas credenciais para continuar.
      </p>
    </div>

    <div v-if="errorMsg" class="p-4 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
      <AlertTriangleIcon class="w-4 h-4" />
      {{ errorMsg }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      
      <!-- Usuário / Email -->
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          E-mail
        </label>
        <BaseInput 
          v-model="form.email"
          type="email" 
          placeholder="exemplo@saude.com.br" 
          required
        >
          <template #icon>
            <MailIcon class="w-5 h-5" />
          </template>
        </BaseInput>
      </div>

      <!-- Senha -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Senha
          </label>
          <a href="#" class="text-xs font-semibold text-primary hover:underline hover:text-primary-600 transition-colors">
            Esqueceu a senha?
          </a>
        </div>
        <div class="relative">
          <BaseInput 
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'" 
            placeholder="Digite sua senha" 
            required
            class="pr-12"
          >
            <template #icon>
              <LockIcon class="w-5 h-5" />
            </template>
          </BaseInput>
          <button 
            type="button" 
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
          >
            <EyeIcon v-if="!showPassword" class="w-5 h-5" />
            <EyeOffIcon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Lembrar (Apenas Login) -->
      <div class="flex items-center">
        <input 
          id="remember-me"
          v-model="form.rememberMe"
          type="checkbox" 
          class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
        >
        <label for="remember-me" class="ml-3 block text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
          Lembrar de mim
        </label>
      </div>

      <!-- Botão -->
      <BaseButton type="submit" :disabled="loading">
        <span v-if="!loading">Entrar na Plataforma</span>
        <span v-else class="flex items-center gap-2">
          <Loader2Icon class="w-4 h-4 animate-spin" />
          Processando...
        </span>
      </BaseButton>

    </form>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  Loader2Icon,
  AlertTriangleIcon,
  MessageCircleIcon // Corrected import
} from 'lucide-vue-next'
import BaseInput from '~/components/BaseInput.vue'
import BaseButton from '~/components/BaseButton.vue'

const showPassword = ref(false)
const loading = ref(false)

const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

const { login } = useAuth()
const errorMsg = ref('')

const handleSubmit = async () => {
  loading.value = true
  errorMsg.value = ''
  
  // Login Logic
  const { success, error } = await login(form.email, form.password)
  
  if (!success) {
    errorMsg.value = error || 'Falha no login'
  }
  
  loading.value = false
}
</script>
