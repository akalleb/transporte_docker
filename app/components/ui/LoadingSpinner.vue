<script setup lang="ts">
/**
 * Spinner de Carregamento (Loading)
 * 
 * Componente visual para indicar progresso ou espera.
 * 
 * Props:
 * - size: Tamanho ('sm', 'md', 'lg') (padrão: 'md')
 * - color: Cor do spinner (opcional, padrão: 'border-t-primary')
 */

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
}>(), {
  size: 'md',
  color: 'border-t-primary'
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4'
}
</script>

<template>
  <div 
    class="rounded-full animate-spin border-slate-200 dark:border-slate-700"
    :class="[sizeClasses[size], color]"
  ></div>
</template>
