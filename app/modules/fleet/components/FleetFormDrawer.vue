<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XIcon, SaveIcon } from 'lucide-vue-next'
import type { Vehicle } from '../types/fleet.types'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseSelect from '~/components/BaseSelect.vue'

const props = defineProps<{
  modelValue: boolean
  vehicle: Vehicle | null // If null, it's create mode
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', vehicle: Partial<Vehicle>): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.vehicle)

const form = ref<Partial<Vehicle>>({
  name: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  plate: '',
  type: 'Carro',
  status: 'available',
  odometer: 0,
  fuel_level: 100,
  fuel_efficiency: 10
})

// Reset or populate form when opening
watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.vehicle) {
      form.value = { ...props.vehicle }
    } else {
      form.value = {
        name: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        plate: '',
        type: 'Carro',
        status: 'available',
        odometer: 0,
        fuel_level: 100,
        fuel_efficiency: 10
      }
    }
  }
})

const save = () => {
  // Basic validation could go here
  emit('save', form.value)
  close()
}

const close = () => {
  isOpen.value = false
}
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
      <div 
        v-if="isOpen" 
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end"
        @click="close"
      >
        <div 
            class="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col transition-colors"
            @click.stop
        >
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 text-slate-900 dark:text-white">
                <h2 class="text-lg font-bold">
                    {{ isEdit ? 'Editar Veículo' : 'Novo Veículo' }}
                </h2>
                <button @click="close" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                    <XIcon class="w-5 h-5" />
                </button>
            </div>

            <form @submit.prevent="save" class="p-6 space-y-6 flex-1">
                <div class="space-y-4">
                    <h3 class="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b dark:border-slate-800 pb-2">Identificação</h3>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome/Apelido *</label>
                        <input v-model="form.name" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none placeholder-slate-400 dark:placeholder-slate-500" placeholder="Ex: Ambulância 01" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Placa *</label>
                            <input v-model="form.plate" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg uppercase font-mono placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500" placeholder="ABC-1234" />
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ano</label>
                            <input v-model="form.year" type="number" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marca</label>
                            <input v-model="form.brand" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500" placeholder="Fiat" />
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Modelo</label>
                            <input v-model="form.model" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ducato" />
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <h3 class="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b dark:border-slate-800 pb-2">Detalhes Operacionais</h3>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                            <select v-model="form.type" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500">
                                <option>Carro</option>
                                <option>Moto</option>
                                <option>Van</option>
                                <option>Ambulância</option>
                                <option>Caminhão</option>
                            </select>
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                            <select v-model="form.status" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="available">Disponível</option>
                                <option value="out">Em Uso</option>
                                <option value="maintenance">Manutenção</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                         <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Odômetro (km)</label>
                            <input v-model="form.odometer" type="number" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Combustível (%)</label>
                            <input v-model="form.fuel_level" type="number" min="0" max="100" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>
                    
                     <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Consumo Médio (km/l)</label>
                        <input v-model="form.fuel_efficiency" type="number" step="0.1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                </div>
            </form>

            <div class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 sticky bottom-0">
                <BaseButton variant="secondary" @click="close">Cancelar</BaseButton>
                <BaseButton @click="save" :disabled="!form.name || !form.plate" class="flex items-center gap-2">
                    <SaveIcon class="w-4 h-4" />
                    Salvar
                </BaseButton>
            </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
