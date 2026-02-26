<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { XIcon, TruckIcon, UserIcon, MapPinIcon, PlusIcon, PencilIcon, TrashIcon, WrenchIcon } from 'lucide-vue-next'
import type { Vehicle, MaintenanceRecord } from '../types/fleet.types'
import FleetStatusBadge from './FleetStatusBadge.vue'
import BaseButton from '~/components/BaseButton.vue'

const props = defineProps<{
  modelValue: boolean
  vehicle: Vehicle | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', vehicle: Vehicle): void
  (e: 'add-maintenance'): void
  (e: 'edit-maintenance', record: MaintenanceRecord): void
  (e: 'delete-maintenance', record: MaintenanceRecord): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const close = () => {
  isOpen.value = false
}

// Lock scroll when open
watch(isOpen, (val) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = val ? 'hidden' : ''
  }
})

// Close on escape
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <!-- Backdrop -->
      <div 
        v-if="isOpen" 
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
        @click="close"
      ></div>
    </Transition>

    <Transition
      enter-active-class="transform transition duration-300 ease-in-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition duration-300 ease-in-out"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <!-- Drawer Panel -->
      <div 
        v-if="isOpen" 
        class="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-slate-100 dark:border-slate-800 transition-colors"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg text-primary-600 dark:text-primary-400">
                <TruckIcon class="w-6 h-6" />
            </div>
            <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">Detalhes do Veículo</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-mono" v-if="vehicle">{{ vehicle.plate }}</p>
            </div>
          </div>
          <button 
            @click="close"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <XIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8" v-if="vehicle">
          <!-- Status Section -->
          <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="text-sm font-medium text-slate-600 dark:text-slate-300">Status Atual</div>
            <FleetStatusBadge :status="vehicle.status" />
          </div>

          <!-- Main Info -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Marca/Modelo</div>
                <div class="font-medium text-slate-900 dark:text-white">{{ vehicle.brand }} {{ vehicle.model }}</div>
                <div class="text-xs text-slate-400 mt-1">{{ vehicle.year }}</div>
            </div>
            <div class="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Combustível</div>
                <div class="font-medium text-slate-900 dark:text-white">{{ vehicle.fuel_level }}%</div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                    <div class="bg-primary-500 h-1.5 rounded-full" :style="{ width: vehicle.fuel_level + '%' }"></div>
                </div>
            </div>
          </div>

          <!-- Maintenance History -->
          <div>
            <div class="flex items-center justify-between mb-4 border-b dark:border-slate-800 pb-2">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Histórico de Manutenção</h3>
                <button 
                    @click="$emit('add-maintenance')"
                    class="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/40 rounded-full transition-colors"
                    title="Adicionar Manutenção"
                >
                    <PlusIcon class="w-5 h-5" />
                </button>
            </div>
            
            <div v-if="!vehicle.maintenance_records || vehicle.maintenance_records.length === 0" class="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                <p class="text-sm text-slate-400 dark:text-slate-500">Nenhum registro encontrado.</p>
                <button 
                    @click="$emit('add-maintenance')"
                    class="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
                >
                    Registrar primeira manutenção
                </button>
            </div>

            <div v-else class="space-y-6 relative pl-2">
                <div class="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                
                <div 
                    v-for="record in vehicle.maintenance_records" 
                    :key="record.id"
                    class="relative pl-8 group"
                >
                    <div class="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center z-10 group-hover:border-primary-500 dark:group-hover:border-primary-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                        <WrenchIcon class="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
                    </div>
                    
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700 group-hover:border-slate-200 dark:group-hover:border-slate-600 transition-colors">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <div class="text-xs text-slate-500 dark:text-slate-400 font-mono mb-0.5">{{ new Date(record.date).toLocaleDateString() }}</div>
                                <h4 class="font-medium text-slate-900 dark:text-white">{{ record.description }}</h4>
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    @click="$emit('edit-maintenance', record)" 
                                    class="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                    title="Editar"
                                >
                                    <PencilIcon class="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    @click="$emit('delete-maintenance', record)" 
                                    class="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <TrashIcon class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        
                        <div class="flex flex-wrap gap-3 text-xs items-center">
                            <span 
                                class="px-2 py-1 rounded-md font-medium"
                                :class="record.type === 'preventive' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'"
                            >
                                {{ record.type === 'preventive' ? 'Preventiva' : 'Corretiva' }}
                            </span>
                            <span class="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 font-mono font-bold">
                                R$ {{ Number(record.cost).toFixed(2) }}
                            </span>
                            <span v-if="record.mechanic" class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-2 py-1">
                                <UserIcon class="w-3 h-3" />
                                {{ record.mechanic }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3" v-if="vehicle">
            <BaseButton variant="secondary" @click="close">Fechar</BaseButton>
            <BaseButton variant="primary" @click="$emit('edit', vehicle)">Editar Veículo</BaseButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
