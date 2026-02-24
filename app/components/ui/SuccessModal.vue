<script setup lang="ts">
/**
 * Modal de Sucesso
 * 
 * Usado para confirmar operações bem-sucedidas.
 * 
 * Props:
 * - show: Controla a visibilidade
 * - title: Título do modal (padrão: 'Operação realizada com sucesso!')
 * - description: Descrição da operação
 * - actionText: Texto do botão de ação (padrão: 'Continuar')
 * 
 * Emits:
 * - close: Emitido ao fechar
 * - action: Emitido ao clicar no botão de ação
 */

import BaseModal from './BaseModal.vue'

defineProps<{
  show: boolean
  title?: string
  description?: string
  actionText?: string
}>()

defineEmits(['close', 'action'])
</script>

<template>
  <BaseModal :show="show" @close="$emit('close')">
    <div class="flex flex-col items-center text-center">
      <!-- Ícone -->
      <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative border-4 border-white dark:border-slate-800 shadow-xl">
        <div class="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-50"></div>
        <span class="material-symbols-outlined text-primary text-3xl relative z-10">check_circle</span>
      </div>

      <!-- Conteúdo -->
      <h3 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {{ title || 'Sucesso!' }}
      </h3>
      
      <p v-if="description" class="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
        {{ description }}
      </p>

      <!-- Ações -->
      <div class="w-full">
        <button 
          @click="$emit('action')"
          class="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-slate-900 font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          {{ actionText || 'Continuar' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>
