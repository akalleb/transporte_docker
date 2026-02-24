<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XIcon, WrenchIcon, CalendarIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-vue-next'
import type { MaintenanceRecord } from '../types/fleet.types'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'

const props = defineProps<{
  modelValue: boolean
  maintenance: MaintenanceRecord | null // If null, create mode
  vehicleId: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', maintenance: Partial<MaintenanceRecord>): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.maintenance)

const form = ref<Partial<MaintenanceRecord>>({
  type: 'preventive',
  date: new Date().toISOString().split('T')[0],
  cost: 0,
  description: '',
  mechanic: ''
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.maintenance) {
      form.value = { ...props.maintenance }
    } else {
      form.value = {
        vehicle_id: props.vehicleId,
        type: 'preventive',
        date: new Date().toISOString().split('T')[0],
        cost: 0,
        description: '',
        mechanic: ''
      }
    }
  }
})

const save = () => {
  if (!form.value.description) {
    alert('Descrição é obrigatória')
    return
  }
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
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-end"
        style="z-index: 60;"
        @click="close"
      >
        <div 
            class="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col"
            @click.stop
        >
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <WrenchIcon class="w-5 h-5" />
                    </div>
                    <h2 class="text-lg font-bold text-slate-900">
                        {{ isEdit ? 'Editar Manutenção' : 'Nova Manutenção' }}
                    </h2>
                </div>
                <button @click="close" class="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                    <XIcon class="w-5 h-5" />
                </button>
            </div>

            <form @submit.prevent="save" class="p-6 space-y-8 flex-1">
                
                <!-- Tipo de Manutenção -->
                <div class="space-y-3">
                    <label class="block text-sm font-bold text-slate-700 uppercase tracking-wide">Tipo de Serviço</label>
                    <div class="grid grid-cols-1 gap-3">
                        <div 
                            @click="form.type = 'preventive'"
                            class="cursor-pointer border-2 rounded-xl p-4 flex items-start gap-4 transition-all hover:bg-green-50"
                            :class="form.type === 'preventive' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-slate-200 hover:border-green-200'"
                        >
                            <div class="p-2 bg-green-100 rounded-full text-green-600 mt-1">
                                <CheckCircleIcon class="w-5 h-5" />
                            </div>
                            <div>
                                <div class="font-bold text-slate-900">Preventiva / Revisão</div>
                                <div class="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Manutenções programadas, trocas de óleo, revisões periódicas para evitar problemas.
                                </div>
                            </div>
                        </div>

                        <div 
                            @click="form.type = 'corrective'"
                            class="cursor-pointer border-2 rounded-xl p-4 flex items-start gap-4 transition-all hover:bg-amber-50"
                            :class="form.type === 'corrective' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-200'"
                        >
                            <div class="p-2 bg-amber-100 rounded-full text-amber-600 mt-1">
                                <AlertTriangleIcon class="w-5 h-5" />
                            </div>
                            <div>
                                <div class="font-bold text-slate-900">Corretiva / Conserto</div>
                                <div class="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Reparos de defeitos, quebras inesperadas, consertos de peças danificadas.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <label class="block text-sm font-bold text-slate-700 uppercase tracking-wide border-b pb-2">Detalhes da Execução</label>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Data do Serviço</label>
                            <BaseInput 
                                v-model="form.date" 
                                type="date" 
                                required 
                            />
                        </div>

                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Custo Total (R$)</label>
                            <BaseInput 
                                v-model="form.cost" 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0,00"
                            />
                        </div>

                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Oficina / Mecânico Responsável</label>
                            <BaseInput 
                                v-model="form.mechanic" 
                                placeholder="Ex: Auto Center Silva, Mecânico João..."
                            />
                        </div>

                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Descrição do Serviço</label>
                            <textarea 
                                v-model="form.description"
                                rows="6"
                                class="w-full rounded-lg border-slate-200 bg-slate-50 p-3 text-slate-900 focus:border-primary-500 focus:ring-primary-500 shadow-sm resize-y outline-none transition-all placeholder:text-slate-400"
                                placeholder="Descreva detalhadamente o que foi feito (peças trocadas, serviços realizados)..."
                                required
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                    <BaseButton type="button" variant="outline" @click="close">
                        Cancelar
                    </BaseButton>
                    <BaseButton type="submit" variant="primary">
                        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Manutenção' }}
                    </BaseButton>
                </div>
            </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
