<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { MoreHorizontalIcon, FuelIcon, GaugeIcon, PencilIcon, TrashIcon } from 'lucide-vue-next'
import type { Vehicle } from '../types/fleet.types'
import FleetStatusBadge from './FleetStatusBadge.vue'

const props = defineProps<{
  vehicle: Vehicle
}>()

const emit = defineEmits<{
  (e: 'select', vehicle: Vehicle): void
  (e: 'edit', vehicle: Vehicle): void
  (e: 'delete', vehicle: Vehicle): void
}>()
</script>

<template>
  <tr 
    class="group hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
    @click="emit('select', vehicle)"
  >
    <td class="py-4 px-6">
      <div class="flex flex-col">
        <span class="font-medium text-slate-900">{{ vehicle.name }}</span>
        <span class="text-xs text-slate-500">{{ vehicle.brand }} {{ vehicle.model }} • {{ vehicle.year }}</span>
      </div>
    </td>
    
    <td class="py-4 px-6">
      <div class="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-1 rounded inline-block">
        {{ vehicle.plate }}
      </div>
    </td>

    <td class="py-4 px-6">
      <FleetStatusBadge :status="vehicle.status" />
    </td>

    <td class="py-4 px-6 text-sm text-slate-600">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1" title="Hodômetro">
          <GaugeIcon class="w-4 h-4 text-slate-400" />
          <span>{{ vehicle.odometer.toLocaleString('pt-BR') }} km</span>
        </div>
        <div class="flex items-center gap-1" title="Nível de Combustível">
          <FuelIcon class="w-4 h-4 text-slate-400" />
          <span>{{ vehicle.fuel_level }}%</span>
        </div>
      </div>
    </td>

    <td class="py-4 px-6 text-right">
      <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          @click.stop="emit('edit', vehicle)"
          class="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
          title="Editar"
        >
          <PencilIcon class="w-4 h-4" />
        </button>
        <button 
          @click.stop="emit('delete', vehicle)"
          class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Excluir"
        >
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
</template>
