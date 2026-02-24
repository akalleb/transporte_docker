<script setup lang="ts">
/**
 * Modal de Erro
 * 
 * Usado para notificar falhas ou erros de operação.
 * 
 * Props:
 * - show: Controla a visibilidade
 * - title: Título do modal (padrão: 'Ocorreu um erro')
 * - description: Descrição do erro
 * - actionText: Texto do botão de ação (padrão: 'Tentar Novamente')
 * 
 * Emits:
 * - close: Emitido ao fechar
 * - action: Emitido ao clicar no botão de ação (opcional, pode ser usado para fechar)
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
      <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 relative">
        <span class="material-symbols-outlined text-red-500 text-3xl">error</span>
      </div>

      <!-- Conteúdo -->
      <h3 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {{ title || 'Ocorreu um erro' }}
      </h3>
      
      <p v-if="description" class="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
        {{ description }}
      </p>

      <!-- Ações -->
      <div class="w-full">
        <button 
          @click="$emit('action')"
          class="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          {{ actionText || 'Tentar Novamente' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>
