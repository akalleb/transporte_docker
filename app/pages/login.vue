<template>
  <!-- Componente da Esquerda (Sidebar / Branding) -->
  <LoginSidebar />

  <!-- Componente da Direita (Formulário) -->
  <LoginForm />
</template>

<script setup>
import LoginSidebar from '~/components/login/LoginSidebar.vue'
import LoginForm from '~/components/login/LoginForm.vue'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})
</script>
