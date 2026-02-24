<script setup lang="ts">
/**
 * Estado Vazio (Empty State)
 * 
 * Componente reutilizável para listas, tabelas ou containers vazios.
 * 
 * Props:
 * - title: Título principal
 * - description: Texto explicativo
 * - icon: Nome do ícone Material Symbols (padrão: 'inbox')
 * - actionLabel: Texto do botão de ação (opcional)
 * - dashed: Se true, adiciona borda tracejada (padrão: true)
 * 
 * Emits:
 * - action: Emitido ao clicar no botão de ação
 */

withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  actionLabel?: string
  dashed?: boolean
  withBackground?: boolean
}>(), {
  title: 'Nada encontrado',
  description: 'Não há dados para exibir no momento.',
  icon: 'inbox',
  dashed: true,
  withBackground: false
})

defineEmits(['action'])
</script>

<template>
  <div 
    class="flex flex-col items-center justify-center p-12 text-center rounded-xl transition-all duration-200"
    :class="[
      dashed ? 'border-2 border-dashed border-slate-200 dark:border-slate-800' : '',
      withBackground ? 'bg-primary/5' : 'bg-slate-50/50 dark:bg-slate-900/50'
    ]"
  >
    <!-- Ícone -->
    <div 
      class="mb-4 p-4 rounded-full shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
      :class="withBackground ? 'bg-white dark:bg-slate-800 text-primary' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500'"
    >
      <span class="material-symbols-outlined text-4xl">
        {{ icon }}
      </span>
    </div>

    <!-- Texto -->
    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">
      {{ title }}
    </h3>
    
    <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
      {{ description }}
    </p>

    <!-- Ação -->
    <button 
      v-if="actionLabel"
      @click="$emit('action')"
      class="px-4 py-2 bg-primary hover:bg-primary/90 text-slate-900 font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm"
    >
      <span class="material-symbols-outlined text-lg">add</span>
      {{ actionLabel }}
    </button>
    
    <slot name="action" />
  </div>
</template>
