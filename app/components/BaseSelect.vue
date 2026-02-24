<template>
  <div class="relative w-full">
    <div v-if="$slots.icon" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
      <slot name="icon"></slot>
    </div>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      v-bind="$attrs"
      :class="[
        'block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-4 pr-10 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm transition-colors outline-none appearance-none',
        $slots.icon ? 'pl-12' : 'pl-4',
        modelValue === '' ? 'text-slate-400 dark:text-slate-500' : ''
      ]"
    >
      <slot></slot>
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
      <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
