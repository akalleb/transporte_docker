<template>
  <div class="p-8 w-full text-center">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">Redefinir Senha</h1>
    <p class="text-gray-600 dark:text-gray-300">
      Digite sua nova senha.
    </p>
    <!-- TODO: Adicionar formulário de redefinição -->
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})
</script>
