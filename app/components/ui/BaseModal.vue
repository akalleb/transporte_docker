<script setup lang="ts">
/**
 * Componente Base de Modal
 * 
 * Estrutura padrão para modais com overlay e animação.
 * 
 * Props:
 * - show: Controla a visibilidade
 * - clickOutsideToClose: Se true, fecha ao clicar no overlay (padrão: true)
 * - maxWidth: Largura máxima do modal (padrão: 'max-w-md')
 * 
 * Emits:
 * - close: Emitido ao fechar
 */

import Overlay from './Overlay.vue'

withDefaults(defineProps<{
  show: boolean
  clickOutsideToClose?: boolean
  maxWidth?: string
}>(), {
  clickOutsideToClose: true,
  maxWidth: 'max-w-md'
})

defineEmits(['close'])
</script>

<template>
  <Overlay :show="show" @click="clickOutsideToClose ? $emit('close') : null">
    <div 
      class="w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-8 relative transform transition-all"
      :class="[maxWidth]"
      @click.stop
    >
      <!-- Botão de Fechar (Opcional, pode ser adicionado via slot se necessário, mas geralmente modais de feedback não têm X no canto superior) -->
      <slot />
    </div>
  </Overlay>
</template>
