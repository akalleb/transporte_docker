<template>
  <div class="relative w-full">
    <div v-if="$slots.icon" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
      <slot name="icon"></slot>
    </div>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      v-bind="$attrs"
      :class="[
        'block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-4 pr-4 text-slate-900 dark:text-white focus:border-primary focus:ring-primary sm:text-sm transition-colors outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500',
        $slots.icon ? 'pl-12' : 'pl-4'
      ]"
    />
  </div>
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
