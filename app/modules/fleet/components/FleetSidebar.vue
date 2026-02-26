<script setup lang="ts">
import { TruckIcon, SettingsIcon, PieChartIcon } from 'lucide-vue-next'

const props = defineProps<{
  stats?: {
    total: number
    available: number
    maintenance: number
    out: number
  }
}>()

const menuItems = [
  { label: 'Visão Geral', icon: PieChartIcon, active: false },
  { label: 'Veículos', icon: TruckIcon, active: true },
  { label: 'Configurações', icon: SettingsIcon, active: false },
]
</script>

<template>
  <aside class="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col h-full sticky top-0 transition-colors">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800">
      <h1 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <TruckIcon class="w-6 h-6 text-primary-600 dark:text-primary-400" />
        Gestão de Frota
      </h1>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Secretaria de Saúde</p>
    </div>

    <nav class="flex-1 p-4 space-y-1">
      <a 
        v-for="item in menuItems" 
        :key="item.label"
        href="#"
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
        :class="item.active ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </a>
    </nav>

    <div class="p-4 border-t border-slate-100 dark:border-slate-800" v-if="stats">
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Resumo da Frota</div>
        
        <div class="flex justify-between items-center text-sm">
            <span class="text-slate-600 dark:text-slate-300">Total</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ stats.total }} Veículos</span>
        </div>
        
        <div class="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div class="bg-green-500 h-full" :style="{ width: (stats.total ? (stats.available / stats.total) * 100 : 0) + '%' }"></div>
            <div class="bg-amber-500 h-full" :style="{ width: (stats.total ? (stats.maintenance / stats.total) * 100 : 0) + '%' }"></div>
            <div class="bg-red-500 h-full" :style="{ width: (stats.total ? (stats.out / stats.total) * 100 : 0) + '%' }"></div>
        </div>

        <div class="grid grid-cols-3 gap-1 text-[10px] text-center pt-1">
            <div class="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded py-1 px-1">
                <div class="font-bold">{{ stats.available }}</div>
                <div>Disp</div>
            </div>
            <div class="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded py-1 px-1">
                <div class="font-bold">{{ stats.maintenance }}</div>
                <div>Manut</div>
            </div>
            <div class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded py-1 px-1">
                <div class="font-bold">{{ stats.out }}</div>
                <div>Em Uso</div>
            </div>
        </div>
      </div>
    </div>
  </aside>
</template>
