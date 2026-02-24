<template>
  <button
    class="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
    v-bind="$attrs"
  >
    <slot></slot>
  </button>
</template>

<script setup>
</script>
