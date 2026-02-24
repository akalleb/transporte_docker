<template>
  <div class="space-y-12 p-4 lg:p-8 max-w-7xl mx-auto">
    <!-- Hero Section -->
    <section class="text-center space-y-6 py-12">
      <div class="flex justify-center mb-6">
        <div class="p-4 bg-primary/10 rounded-full animate-pulse">
          <MessageCircleIcon class="w-16 h-16 text-primary" />
        </div>
      </div>
      <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        Central de <span class="text-primary">Multi-Atendimento</span>
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
        Gerencie múltiplos canais de WhatsApp em uma interface unificada, minimalista e eficiente.
      </p>
      
      <!-- Primary & Secondary Buttons -->
      <div class="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <button class="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-3 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all transform hover:-translate-y-1">
          <PlayCircleIcon class="w-5 h-5" />
          Começar Agora
        </button>
        <button class="btn-secondary-outline flex items-center justify-center gap-2 text-lg px-8 py-3 border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-all rounded-lg">
          <BookOpenIcon class="w-5 h-5" />
          Documentação
        </button>
      </div>
    </section>

    <!-- Stats Grid -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(stat, index) in stats" :key="index" 
           class="bg-white dark:bg-background-card-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary/50 hover:shadow-md transition-all group">
        <div class="flex items-center justify-between mb-4">
          <div :class="`p-3 rounded-lg ${stat.bgClass} ${stat.textClass} group-hover:scale-110 transition-transform`">
            <component :is="stat.icon" class="w-6 h-6" />
          </div>
          <div class="flex items-center gap-1 text-sm font-medium" :class="stat.trend > 0 ? 'text-success' : 'text-danger'">
            <TrendingUpIcon v-if="stat.trend > 0" class="w-4 h-4" />
            <TrendingDownIcon v-else class="w-4 h-4" />
            {{ Math.abs(stat.trend) }}%
          </div>
        </div>
        <h3 class="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{{ stat.label }}</h3>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2 group-hover:text-primary transition-colors">
          {{ stat.value }}
        </p>
      </div>
    </section>

    <!-- Components Showcase Section -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Buttons Showcase -->
      <div class="bg-white dark:bg-background-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        <div class="flex items-center gap-3 mb-6">
          <MousePointerClickIcon class="w-6 h-6 text-primary" />
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Botões & Ações</h2>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <button class="btn bg-primary hover:bg-primary-600 text-white shadow-md">
              Primário
            </button>
            <button class="btn bg-secondary hover:bg-secondary-600 text-white shadow-md">
              Secundário
            </button>
            <button class="btn border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
              Outline / Ghost
            </button>
            <button class="btn bg-danger hover:bg-danger-dark text-white shadow-md">
              Danger / Erro
            </button>
          </div>
          
          <div class="flex gap-2">
            <button class="btn bg-success hover:bg-success-dark text-white flex-1 flex items-center justify-center gap-2">
              <CheckCircleIcon class="w-4 h-4" /> Confirmar
            </button>
            <button class="btn bg-action hover:bg-action-dark text-white flex-1 flex items-center justify-center gap-2">
              <DownloadIcon class="w-4 h-4" /> Exportar
            </button>
          </div>
        </div>
      </div>

      <!-- Alerts System -->
      <div class="bg-white dark:bg-background-card-dark p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        <div class="flex items-center gap-3 mb-6">
          <BellIcon class="w-6 h-6 text-warning" />
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Sistema de Alertas</h2>
        </div>

        <div class="space-y-4">
          <!-- Success Alert -->
          <div class="flex items-start gap-4 p-4 rounded-lg bg-success/10 border border-success/20 text-success-dark dark:text-success-light">
            <CheckCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-bold text-sm">Operação realizada com sucesso!</h4>
              <p class="text-sm opacity-90">Os dados foram salvos e sincronizados.</p>
            </div>
          </div>

          <!-- Warning Alert -->
          <div class="flex items-start gap-4 p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning-dark dark:text-warning-light">
            <AlertTriangleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-bold text-sm">Atenção Necessária</h4>
              <p class="text-sm opacity-90">Sua sessão irá expirar em 5 minutos.</p>
            </div>
          </div>

          <!-- Error Alert -->
          <div class="flex items-start gap-4 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger-dark dark:text-danger-light">
            <XCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-bold text-sm">Erro de Conexão</h4>
              <p class="text-sm opacity-90">Não foi possível conectar ao servidor WhatsApp.</p>
            </div>
          </div>
        </div>
      </div>

    </section>

    <!-- Recent Activity (Minimalist) -->
    <section class="bg-white dark:bg-background-card-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <MessageSquareIcon class="w-5 h-5 text-gray-400" />
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Conversas Recentes</h2>
        </div>
        <button class="text-sm text-primary hover:underline font-medium">Ver todas</button>
      </div>
      
      <div class="divide-y divide-gray-100 dark:divide-gray-700">
        <div v-for="chat in recentChats" :key="chat.id" 
             class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group flex items-center gap-4">
          
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm border-2 border-transparent group-hover:border-primary transition-colors">
              {{ chat.initials }}
            </div>
            <div v-if="chat.online" class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-white dark:border-background-card-dark"></div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-1">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ chat.name }}</h4>
              <span class="text-xs text-gray-400">{{ chat.time }}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <span v-if="chat.status === 'read'" class="text-primary">
                <CheckCheckIcon class="w-3 h-3" />
              </span>
              {{ chat.lastMessage }}
            </p>
          </div>
          
          <div v-if="chat.unread > 0" class="flex-shrink-0">
            <span class="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              {{ chat.unread }}
            </span>
          </div>
          <div v-else class="opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRightIcon class="w-4 h-4 text-gray-400" />
          </div>

        </div>
      </div>
    </section>

    <!-- Base Components Showcase -->
    <section class="bg-white dark:bg-background-card-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-6">
      <div class="flex items-center gap-3 mb-6">
        <LayoutTemplateIcon class="w-6 h-6 text-primary" />
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Componentes Base (Novos)</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Inputs -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inputs</h3>
          <BaseInput placeholder="Digite seu email..." type="email">
            <template #icon>
              <MailIcon class="w-5 h-5" />
            </template>
          </BaseInput>
          <BaseInput placeholder="Buscar conversas..." type="text">
            <template #icon>
              <SearchIcon class="w-5 h-5" />
            </template>
          </BaseInput>
        </div>

        <!-- Buttons -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buttons</h3>
          <BaseButton>
            Entrar no Sistema
          </BaseButton>
          <BaseButton class="bg-secondary shadow-secondary/20 hover:bg-secondary/90 focus:ring-secondary">
            <PlusIcon class="w-5 h-5 mr-2" />
            Nova Conversa
          </BaseButton>
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
  AlertOctagonIcon, 
  PlayCircleIcon, 
  BookOpenIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  MousePointerClickIcon,
  CheckCircleIcon,
  DownloadIcon,
  BellIcon,
  AlertTriangleIcon,
  XCircleIcon,
  MessageSquareIcon,
  CheckCheckIcon,
  ChevronRightIcon,
  LayoutTemplateIcon,
  MailIcon,
  SearchIcon,
  PlusIcon
} from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const stats = [
  { label: 'Mensagens Hoje', value: '1,284', trend: 12, icon: MessageCircleIcon, bgClass: 'bg-primary/10', textClass: 'text-primary' },
  { label: 'Atendimentos', value: '42', trend: 5, icon: UsersIcon, bgClass: 'bg-secondary/10', textClass: 'text-secondary' },
  { label: 'Tempo Médio', value: '2m 15s', trend: -8, icon: ClockIcon, bgClass: 'bg-action/10', textClass: 'text-action' },
  { label: 'Reclamações', value: '3', trend: -2, icon: AlertOctagonIcon, bgClass: 'bg-danger/10', textClass: 'text-danger' },
]

const recentChats = [
  { id: 1, name: 'João Silva', initials: 'JS', lastMessage: 'Gostaria de saber o preço do plano...', time: '5 min', unread: 2, online: true, status: 'sent' },
  { id: 2, name: 'Maria Oliveira', initials: 'MO', lastMessage: 'Obrigado pelo atendimento!', time: '12 min', unread: 0, online: false, status: 'read' },
  { id: 3, name: 'Suporte Técnico', initials: 'ST', lastMessage: 'Seu ticket #1234 foi atualizado', time: '1h', unread: 1, online: true, status: 'received' },
  { id: 4, name: 'Carlos Santos', initials: 'CS', lastMessage: 'Pode me enviar o boleto?', time: '3h', unread: 0, online: false, status: 'read' },
]
</script>


