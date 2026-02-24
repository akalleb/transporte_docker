<template>
  <div class="flex h-screen bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
    
    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-all duration-300 lg:translate-x-0 lg:static lg:inset-0 shadow-lg lg:shadow-none flex flex-col"
      :class="[
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
      ]"
    >
      <!-- Collapse Toggle Button (Desktop Only) -->
      <button 
        @click="isSidebarCollapsed = !isSidebarCollapsed"
        class="absolute -right-3 top-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-1.5 shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 hidden lg:flex items-center justify-center z-50 text-gray-500 dark:text-gray-400"
        :title="isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'"
      >
        <ChevronRightIcon v-if="isSidebarCollapsed" class="w-3 h-3" />
        <ChevronLeftIcon v-else class="w-3 h-3" />
      </button>

      <div class="h-full flex flex-col" :class="isSidebarCollapsed ? 'overflow-visible' : 'overflow-hidden'">
        <!-- Logo -->
        <div 
          class="h-16 flex items-center border-b border-gray-100 dark:border-slate-800 transition-all duration-300"
          :class="isSidebarCollapsed ? 'justify-center px-0' : 'px-6'"
        >
          <MessageCircleIcon class="w-8 h-8 text-primary flex-shrink-0" />
          <span 
            class="ml-3 text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-all duration-300"
            :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >
            MultiChat
          </span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-6 space-y-2" :class="isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'">
          <NuxtLink 
            to="/" 
            class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative"
            active-class="bg-primary/10 text-primary font-medium shadow-sm"
            :class="[
              $route.path === '/' ? '' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white',
              isSidebarCollapsed ? 'justify-center' : ''
            ]"
          >
            <LayoutDashboardIcon class="w-5 h-5 flex-shrink-0" />
            
            <span 
              class="whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >
              Dashboard
            </span>

            <!-- Tooltip -->
            <div 
              v-if="isSidebarCollapsed"
              class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg"
            >
              Dashboard
            </div>
          </NuxtLink>

          <NuxtLink 
            to="/atendimento" 
            class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative"
            active-class="bg-primary/10 text-primary font-medium shadow-sm"
            :class="[
              $route.path.startsWith('/atendimento') ? '' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white',
              isSidebarCollapsed ? 'justify-center' : ''
            ]"
          >
            <MessageSquareIcon class="w-5 h-5 flex-shrink-0" />
            
            <span 
              class="whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >
              Atendimento
            </span>

            <!-- Tooltip -->
            <div 
              v-if="isSidebarCollapsed"
              class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg"
            >
              Atendimento
            </div>
          </NuxtLink>

          <NuxtLink 
            to="/agenda" 
            class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative"
            active-class="bg-primary/10 text-primary font-medium shadow-sm"
            :class="[
              $route.path.startsWith('/agenda') ? '' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white',
              isSidebarCollapsed ? 'justify-center' : ''
            ]"
          >
            <CalendarIcon class="w-5 h-5 flex-shrink-0" />
            
            <span 
              class="whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >
              Agenda
            </span>

            <!-- Tooltip -->
            <div 
              v-if="isSidebarCollapsed"
              class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg"
            >
              Agenda
            </div>
          </NuxtLink>

          <NuxtLink 
            to="/frota" 
            class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative"
            active-class="bg-primary/10 text-primary font-medium shadow-sm"
            :class="[
              $route.path.startsWith('/frota') ? '' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white',
              isSidebarCollapsed ? 'justify-center' : ''
            ]"
          >
            <TruckIcon class="w-5 h-5 flex-shrink-0" />
            
            <span 
              class="whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >
              Frota
            </span>

            <!-- Tooltip -->
            <div 
              v-if="isSidebarCollapsed"
              class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg"
            >
              Frota
            </div>
          </NuxtLink>

          <NuxtLink 
            to="/configuracoes" 
            class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative"
            active-class="bg-primary/10 text-primary font-medium shadow-sm"
            :class="[
              $route.path.startsWith('/configuracoes') ? '' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white',
              isSidebarCollapsed ? 'justify-center' : ''
            ]"
          >
            <SettingsIcon class="w-5 h-5 flex-shrink-0" />
            
            <span 
              class="whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >
              Configurações
            </span>

            <!-- Tooltip -->
            <div 
              v-if="isSidebarCollapsed"
              class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg"
            >
              Configurações
            </div>
          </NuxtLink>
        </nav>
      </div>
    </aside>

    <!-- Overlay for mobile sidebar -->
    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
    ></div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <header class="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shadow-sm z-30">
        <button 
          @click="isSidebarOpen = !isSidebarOpen"
          class="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <MenuIcon class="w-6 h-6" />
        </button>

        <!-- Page Title (Breadcrumb-ish) -->
        <h1 class="text-lg font-semibold text-gray-800 dark:text-white hidden sm:block">
          {{ pageTitle }}
        </h1>

        <!-- Right Actions -->
        <div class="flex items-center gap-4">
          <!-- Dark Mode Toggle -->
          <ClientOnly>
            <button 
              @click="toggleColorMode"
              class="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-300"
              :title="colorMode.value === 'dark' ? 'Modo Claro' : 'Modo Escuro'"
            >
              <SunIcon v-if="colorMode.value === 'dark'" class="w-5 h-5" />
              <MoonIcon v-else class="w-5 h-5" />
            </button>
          </ClientOnly>
          
          <div class="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

          <BaseDropdown title="Conta">
            <template #trigger>
              <button class="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors group">
                <div class="text-right hidden sm:block">
                  <p class="text-sm font-bold text-gray-900 dark:text-white leading-none group-hover:text-primary transition-colors">
                    {{ userProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuário' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[150px]">
                    {{ user?.email || 'Visitante' }}
                  </p>
                </div>
                
                <div class="relative">
                  <img 
                    v-if="userProfile?.avatar_url || user?.user_metadata?.avatar_url" 
                    :src="userProfile?.avatar_url || user?.user_metadata?.avatar_url" 
                    alt="Avatar" 
                    class="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-slate-700 group-hover:border-primary transition-colors"
                  />
                  <div 
                    v-else 
                    class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all"
                  >
                    {{ (userProfile?.name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase() }}
                  </div>
                  <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                </div>
                
                <ChevronDownIcon class="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
              </button>
            </template>
            
            <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 sm:hidden">
              <p class="text-sm font-bold text-gray-900 dark:text-white">
                {{ userProfile?.name || user?.user_metadata?.full_name || 'Usuário' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {{ user?.email || 'Visitante' }}
              </p>
            </div>
            
            <NuxtLink 
              to="/perfil" 
              class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <UserIcon class="w-4 h-4" />
              <span>Perfil</span>
            </NuxtLink>
            
            <button 
              @click="handleLogout" 
              class="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOutIcon class="w-4 h-4" />
              <span>Sair</span>
            </button>
          </BaseDropdown>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto scroll-smooth">
        <slot />
      </main>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  LayoutDashboardIcon, 
  UserIcon, 
  LogOutIcon, 
  MenuIcon, 
  MessageCircleIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SettingsIcon,
  MessageSquareIcon,
  CalendarIcon,
  TruckIcon
} from 'lucide-vue-next'

const route = useRoute()
const { userProfile, fetchProfile, logout } = useAuth()
const user = useSupabaseUser()
const colorMode = useColorMode()

const isSidebarOpen = ref(false)
const isSidebarCollapsed = ref(false)

onMounted(async () => {
  if (!userProfile.value) {
    await fetchProfile()
  }
})

const pageTitle = computed(() => {
  if (route.path === '/') return 'Dashboard'
  if (route.path.startsWith('/atendimento')) return 'Atendimento'
  if (route.path.startsWith('/agenda')) return 'Agenda Semanal'
  if (route.path.startsWith('/frota')) return 'Gestão de Frota'
  if (route.path.startsWith('/configuracoes')) return 'Configurações'
  if (route.path.startsWith('/perfil')) return 'Meu Perfil'
  return 'MultiChat'
})

const handleLogout = async () => {
  await logout()
  navigateTo('/login')
}

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
