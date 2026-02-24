<script setup lang="ts">
/**
 * Overlay Global Reutilizável
 * 
 * Componente de fundo escuro com blur para modais e drawers.
 * Impede a interação com o conteúdo abaixo.
 * 
 * Uso:
 * <Overlay :show="isVisible" @click="closeModal">
 *   <slot />
 * </Overlay>
 */

defineProps<{
  show?: boolean
}>()

defineEmits(['click'])
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="show"
      class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click="$emit('click')"
    >
      <slot />
    </div>
  </Transition>
</template>
