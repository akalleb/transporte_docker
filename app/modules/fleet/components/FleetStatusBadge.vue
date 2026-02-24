<script setup lang="ts">
import { computed } from 'vue'
import type { VehicleStatus } from '../types/fleet.types'
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from '../constants/fleetStatus'

const props = defineProps<{
  status: VehicleStatus
}>()

const label = computed(() => VEHICLE_STATUS_LABELS[props.status] || props.status)
const colorClass = computed(() => VEHICLE_STATUS_COLORS[props.status] || 'bg-gray-100 text-gray-800')
</script>

<template>
  <span 
    class="px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1.5"
    :class="colorClass"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
    {{ label }}
  </span>
</template>
