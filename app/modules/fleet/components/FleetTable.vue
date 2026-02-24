<script setup lang="ts">
import { ref, watch } from 'vue'
import { SearchIcon, PlusIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'
import type { Vehicle } from '../types/fleet.types'
import FleetRow from './FleetRow.vue'
import FleetEmptyState from './FleetEmptyState.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseButton from '~/components/BaseButton.vue'
import SkeletonLoader from '~/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  vehicles: Vehicle[]
  loading: boolean
  searchModel: string
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}>()

const emit = defineEmits<{
  (e: 'update:searchModel', value: string): void
  (e: 'select', vehicle: Vehicle): void
  (e: 'create'): void
  (e: 'edit', vehicle: Vehicle): void
  (e: 'delete', vehicle: Vehicle): void
  (e: 'page-change', page: number): void
}>()

// Local search state for v-model binding
const localSearch = ref(props.searchModel)

watch(() => props.searchModel, (val) => {
  localSearch.value = val
})

watch(localSearch, (val) => {
  emit('update:searchModel', val)
})
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
    <!-- Toolbar / Search -->
    <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
      <div class="relative w-full sm:w-72">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon class="h-4 w-4 text-slate-400" />
        </div>
        <input 
          v-model="localSearch"
          type="text"
          placeholder="Buscar veículo, placa..."
          class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow"
        />
      </div>
      
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button class="p-2 text-slate-500 hover:bg-white hover:text-slate-700 rounded-lg border border-transparent hover:border-slate-200 transition-all" title="Filtros">
            <FilterIcon class="w-5 h-5" />
        </button>
        <BaseButton @click="$emit('create')" class="w-full sm:w-auto flex items-center justify-center gap-2">
          <PlusIcon class="w-4 h-4" />
          Novo Veículo
        </BaseButton>
      </div>
    </div>

    <!-- Table Content -->
    <div class="flex-1 overflow-auto relative min-h-[400px]">
      <!-- Loading State -->
      <div v-if="loading" class="p-6 space-y-4">
        <div v-for="i in 5" :key="i" class="flex gap-4 animate-pulse">
           <div class="h-12 w-full bg-slate-100 rounded-lg"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="vehicles.length === 0" class="h-full flex items-center justify-center p-8">
        <FleetEmptyState 
            title="Nenhum veículo encontrado" 
            :description="localSearch ? `Não encontramos resultados para '${localSearch}'` : 'Sua frota está vazia.'"
        >
            <template #action v-if="!localSearch">
                <BaseButton @click="$emit('create')">Cadastrar Veículo</BaseButton>
            </template>
        </FleetEmptyState>
      </div>

      <!-- Table -->
      <table v-else class="w-full text-left border-collapse">
        <thead class="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th class="px-6 py-3">Veículo</th>
            <th class="px-6 py-3">Placa</th>
            <th class="px-6 py-3">Status</th>
            <th class="px-6 py-3">Métricas</th>
            <th class="px-6 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <FleetRow 
            v-for="vehicle in vehicles" 
            :key="vehicle.id" 
            :vehicle="vehicle" 
            @select="$emit('select', $event)"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
          />
        </tbody>
      </table>
    </div>
    
    <!-- Footer / Pagination -->
    <div class="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center" v-if="pagination.total > 0">
        <span>Mostrando {{ vehicles.length }} de {{ pagination.total }} resultados</span>
        <div class="flex gap-2">
            <button 
              @click="$emit('page-change', pagination.page - 1)" 
              :disabled="pagination.page <= 1"
              class="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeftIcon class="w-3 h-3" />
              Anterior
            </button>
            <span class="px-3 py-1 bg-slate-100 rounded text-slate-700 font-medium">
              {{ pagination.page }} de {{ pagination.totalPages }}
            </span>
            <button 
              @click="$emit('page-change', pagination.page + 1)" 
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Próxima
              <ChevronRightIcon class="w-3 h-3" />
            </button>
        </div>
    </div>
  </div>
</template>
