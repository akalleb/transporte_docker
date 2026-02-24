<template>
  <div class="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Meu Perfil</h1>
    
    <UserProfileForm />
    
    <ChangePasswordForm />
  </div>
</template>

<script setup>
import UserProfileForm from '~/components/perfil/UserProfileForm.vue'
import ChangePasswordForm from '~/components/perfil/ChangePasswordForm.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})
</script>
