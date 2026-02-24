<template>
  <div class="relative" ref="dropdownRef">
    <div @click="toggle" class="cursor-pointer">
      <slot name="trigger"></slot>
    </div>
    <div 
      v-if="isOpen" 
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-1 z-50 border border-gray-100 dark:border-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none"
    >
      <div v-if="title" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 dark:border-slate-700/50 mb-1">
        {{ title }}
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  }
})

const isOpen = ref(false)
const dropdownRef = ref(null)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Expose close method to parent if needed, though not strictly required by current spec
defineExpose({ close })
</script>