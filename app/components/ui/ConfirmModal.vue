<script setup lang="ts">
/**
 * Modal de Confirmação (Danger)
 * 
 * Usado para ações destrutivas ou que requerem atenção do usuário.
 * 
 * Props:
 * - show: Controla a visibilidade
 * - title: Título do modal
 * - description: Descrição da ação
 * - confirmText: Texto do botão de confirmação (padrão: 'Confirmar')
 * - cancelText: Texto do botão de cancelar (padrão: 'Cancelar')
 * - loading: Estado de carregamento do botão de confirmação
 * 
 * Emits:
 * - close: Emitido ao cancelar ou fechar
 * - confirm: Emitido ao confirmar
 */

import BaseModal from './BaseModal.vue'

defineProps<{
  show: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}>()

defineEmits(['close', 'confirm'])
</script>

<template>
  <BaseModal :show="show" @close="$emit('close')">
    <div class="flex flex-col items-center text-center">
      <!-- Ícone -->
      <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 relative">
        <div class="absolute inset-0 bg-red-500/20 blur-xl rounded-full opacity-50"></div>
        <span class="material-symbols-outlined text-red-500 text-3xl relative z-10">warning</span>
      </div>

      <!-- Conteúdo -->
      <h3 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {{ title }}
      </h3>
      
      <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
        {{ description }}
      </p>

      <!-- Ações -->
      <div class="flex items-center gap-3 w-full">
        <button 
          @click="$emit('close')"
          class="flex-1 px-4 py-3 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          :disabled="loading"
        >
          {{ cancelText || 'Cancelar' }}
        </button>
        
        <button 
          @click="$emit('confirm')"
          class="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          :disabled="loading"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span v-else>{{ confirmText || 'Excluir' }}</span>
        </button>
      </div>
    </div>
  </BaseModal>
</template>
