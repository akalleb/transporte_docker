<script setup lang="ts">
/**
 * Skeleton Loader
 * 
 * Componente placeholder para indicar carregamento de conteúdo.
 * 
 * Props:
 * - width: Largura (opcional, padrão: 'w-full')
 * - height: Altura (opcional, padrão: 'h-4')
 * - rounded: Arredondamento (opcional, padrão: 'rounded-xl')
 * - count: Número de linhas (opcional, padrão: 1)
 */

withDefaults(defineProps<{
  width?: string
  height?: string
  rounded?: string
  count?: number
}>(), {
  width: 'w-full',
  height: 'h-4',
  rounded: 'rounded-xl',
  count: 1
})
</script>

<template>
  <div class="space-y-2 w-full animate-pulse">
    <div 
      v-for="i in count" 
      :key="i"
      class="bg-slate-200 dark:bg-slate-800"
      :class="[width, height, rounded]"
    ></div>
  </div>
</template>
