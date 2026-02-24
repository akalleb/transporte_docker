<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-100 rounded-xl shadow-sm">
    <div class="p-4 bg-gray-50 rounded-full mb-4">
      <AlertCircleIcon class="w-8 h-8 text-gray-400" />
    </div>
    <h3 class="text-lg font-medium text-gray-900 mb-1">
      {{ title || 'Nenhum veículo encontrado' }}
    </h3>
    <p class="text-sm text-gray-500 max-w-sm">
      {{ description || 'Tente ajustar os filtros ou adicionar um novo veículo.' }}
    </p>
    <div class="mt-6" v-if="$slots.action">
      <slot name="action" />
    </div>
  </div>
</template>
