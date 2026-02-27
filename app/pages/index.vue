<template>
  <div class="space-y-8 p-4 lg:p-8 max-w-7xl mx-auto">
    <!-- Header -->
    <section class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Painel de Controle
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Visão geral do sistema de Transporte da Saúde.
        </p>
      </div>
      <div class="flex gap-3">
        <NuxtLink to="/atendimento" class="btn bg-primary hover:bg-primary/90 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
          <MessageCircleIcon class="w-5 h-5" />
          Atendimento
        </NuxtLink>
        <NuxtLink to="/agenda" class="btn bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
          <CalendarIcon class="w-5 h-5" />
          Ver Agenda
        </NuxtLink>
      </div>
    </section>

    <!-- Stats Grid -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Pendentes -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col gap-2 relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-warning/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div class="flex justify-between items-start">
          <div class="p-3 bg-warning/10 text-warning rounded-lg">
            <ClockIcon class="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Agendamentos Pendentes</h3>
          <p class="text-3xl font-black text-gray-900 dark:text-white mt-1">
            <span v-if="loading">...</span>
            <span v-else>{{ stats.pending }}</span>
          </p>
        </div>
      </div>

      <!-- Confirmados -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col gap-2 relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-success/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div class="flex justify-between items-start">
          <div class="p-3 bg-success/10 text-success rounded-lg">
            <CheckCircleIcon class="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Viagens Confirmadas</h3>
          <p class="text-3xl font-black text-gray-900 dark:text-white mt-1">
            <span v-if="loading">...</span>
            <span v-else>{{ stats.confirmed }}</span>
          </p>
        </div>
      </div>

      <!-- Conversas Ativas -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col gap-2 relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div class="flex justify-between items-start">
          <div class="p-3 bg-primary/10 text-primary rounded-lg">
            <MessageSquareIcon class="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Conversas WhatsApp</h3>
          <p class="text-3xl font-black text-gray-900 dark:text-white mt-1">
            <span v-if="loading">...</span>
            <span v-else>{{ stats.conversations }}</span>
          </p>
        </div>
      </div>

      <!-- Total Pacientes -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col gap-2 relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-action/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div class="flex justify-between items-start">
          <div class="p-3 bg-action/10 text-action rounded-lg">
            <UsersIcon class="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Total de Registros</h3>
          <p class="text-3xl font-black text-gray-900 dark:text-white mt-1">
            <span v-if="loading">...</span>
            <span v-else>{{ stats.totalRegistrations }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Recent Activity -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Conversas Recentes -->
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquareIcon class="w-5 h-5 text-primary" />
            Últimas Conversas
          </h2>
          <NuxtLink to="/atendimento" class="text-sm text-primary font-medium hover:underline">Ver todas</NuxtLink>
        </div>
        
        <div class="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
          <div v-if="loading" class="p-8 text-center text-slate-500">
            Carregando...
          </div>
          <div v-else-if="recentConversations.length === 0" class="p-8 text-center text-slate-500">
            Nenhuma conversa encontrada.
          </div>
          <div v-for="conv in recentConversations" :key="conv.id" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {{ conv.contact_name ? conv.contact_name.charAt(0).toUpperCase() : '#' }}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-bold text-gray-900 dark:text-white truncate">
                {{ conv.contact_name || conv.contact_phone || 'Desconhecido' }}
              </h4>
              <p class="text-xs text-slate-500 truncate mt-0.5">
                Status: <span class="capitalize font-medium">{{ conv.status || 'Novo' }}</span>
              </p>
            </div>
            <div class="text-xs text-slate-400">
              {{ new Date(conv.last_message_at).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Últimos Agendamentos -->
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon class="w-5 h-5 text-secondary" />
            Agendamentos Recentes
          </h2>
          <NuxtLink to="/agenda" class="text-sm text-primary font-medium hover:underline">Ver agenda completa</NuxtLink>
        </div>
        
        <div class="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
          <div v-if="loading" class="p-8 text-center text-slate-500">
            Carregando...
          </div>
          <div v-else-if="recentRegistrations.length === 0" class="p-8 text-center text-slate-500">
            Nenhum agendamento encontrado.
          </div>
          <div v-for="reg in recentRegistrations" :key="reg.id" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" 
                      :class="{
                        'bg-warning/10 text-warning': reg.status === 'pending',
                        'bg-success/10 text-success': reg.status === 'confirmed',
                        'bg-danger/10 text-danger': reg.status === 'cancelled'
                      }">
                  {{ reg.status === 'pending' ? 'Pendente' : reg.status === 'confirmed' ? 'Confirmado' : 'Cancelado' }}
                </span>
                <span class="text-xs text-slate-500">{{ reg.procedure_date ? new Date(reg.procedure_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-' }}</span>
              </div>
              <h4 class="text-sm font-bold text-gray-900 dark:text-white truncate">
                {{ reg.patient_name || 'Sem nome' }}
              </h4>
              <p class="text-xs text-slate-500 truncate mt-0.5">
                {{ reg.procedure_type }} - {{ reg.procedure_name }}
              </p>
            </div>
          </div>
        </div>
      </div>

    </section>
  </div>
</template>

<script setup>
import { 
  MessageCircleIcon, 
  UsersIcon, 
  ClockIcon, 
  CheckCircleIcon,
  MessageSquareIcon,
  CalendarIcon
} from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const loading = ref(true)

const stats = ref({
  pending: 0,
  confirmed: 0,
  conversations: 0,
  totalRegistrations: 0
})

const recentConversations = ref([])
const recentRegistrations = ref([])

const fetchDashboardData = async () => {
  loading.value = true
  try {
    // Buscar contagem de agendamentos
    const { data: regStats } = await supabase
      .from('registrations')
      .select('status', { count: 'exact' })

    if (regStats) {
      stats.value.totalRegistrations = regStats.length
      stats.value.pending = regStats.filter(r => r.status === 'pending').length
      stats.value.confirmed = regStats.filter(r => r.status === 'confirmed').length
    }

    // Buscar contagem de conversas
    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    stats.value.conversations = convCount || 0

    // Buscar últimas conversas
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, contact_name, contact_phone, status, last_message_at')
      .order('last_message_at', { ascending: false })
      .limit(5)
      
    recentConversations.value = convs || []

    // Buscar últimos agendamentos
    const { data: regs } = await supabase
      .from('registrations')
      .select('id, patient_name, procedure_type, procedure_name, procedure_date, status')
      .order('created_at', { ascending: false })
      .limit(5)
      
    recentRegistrations.value = regs || []

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>


