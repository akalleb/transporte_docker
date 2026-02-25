<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
onMounted(() => {
  console.log('App montado com sucesso!')
})

onErrorCaptured((err) => {
  console.error('Erro capturado no App:', err)
})
</script>