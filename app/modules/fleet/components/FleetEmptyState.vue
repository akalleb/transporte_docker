<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
    <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
      <AlertCircleIcon class="w-8 h-8 text-slate-400 dark:text-slate-500" />
    </div>
    <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-1">
      {{ title || 'Nenhum veículo encontrado' }}
    </h3>
    <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
      {{ description || 'Tente ajustar os filtros ou adicionar um novo veículo.' }}
    </p>
    <div class="mt-6" v-if="$slots.action">
      <slot name="action" />
    </div>
  </div>
</template>
