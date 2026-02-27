<script setup lang="ts">
import { UsersIcon, PlusIcon, SearchIcon } from 'lucide-vue-next'
import BaseInput from '~/components/BaseInput.vue'
import BaseButton from '~/components/BaseButton.vue'
import type { Conversation } from '~/types/chat'

const props = defineProps<{
  conversations: Conversation[]
  activeConversation: Conversation | null
}>()

const emit = defineEmits(['select'])

const searchQuery = ref('')
const selectedTab = ref<'active' | 'completed'>('active')

const filteredConversations = computed(() => {
  let filtered = props.conversations

  // Filtro por abas
  if (selectedTab.value === 'active') {
    // Em Atendimento: status não for closed e não cancelado
    filtered = props.conversations.filter((c: Conversation) => 
      c.flow_step !== 'completed' && c.status !== 'closed'
    )
  } else if (selectedTab.value === 'completed') {
    // Finalizadas: fluxo completado, cancelado ou status closed
    filtered = props.conversations.filter((c: Conversation) => 
      c.flow_step === 'completed' || c.status === 'closed'
    )
  }

  // Filtro por busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((c: Conversation) => 
      (c.contact_name && c.contact_name.toLowerCase().includes(query)) ||
      (c.contact_phone && c.contact_phone.includes(query))
    )
  }
  
  return filtered
})

const formatTime = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getAvatarUrl = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`
}
</script>

<template>
  <aside class="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 h-full">
    <div class="p-4 space-y-4 shrink-0">
      <div class="relative">
        <BaseInput 
          v-model="searchQuery"
          placeholder="Buscar conversa..." 
          class="!py-2 !text-sm"
        >
          <template #icon>
            <SearchIcon class="text-slate-400 w-4 h-4" />
          </template>
        </BaseInput>
      </div>
      
      <div class="flex items-center justify-between text-xs font-bold uppercase text-slate-400 tracking-widest px-1">
        <span>Conversas Ativas</span>
        <span class="bg-primary/20 text-primary px-2 py-0.5 rounded-full">{{ conversations.length }}</span>
      </div>
      
      <div class="flex gap-1">
        <BaseButton 
          @click="selectedTab = 'active'"
          class="flex-1 !py-1.5 !px-3 !rounded-md !text-xs !font-bold !shadow-none transition-colors"
          :class="selectedTab === 'active' ? '!bg-primary !text-slate-900' : '!bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-400 hover:!bg-slate-200 dark:hover:!bg-slate-700'"
        >
          Em Atendimento
        </BaseButton>
        <BaseButton 
          @click="selectedTab = 'completed'"
          class="flex-1 !py-1.5 !px-3 !rounded-md !text-xs !font-bold !shadow-none transition-colors"
          :class="selectedTab === 'completed' ? '!bg-primary !text-slate-900' : '!bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-400 hover:!bg-slate-200 dark:hover:!bg-slate-700'"
        >
          Finalizadas
        </BaseButton>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto">
      <div 
        v-for="conversation in filteredConversations" 
        :key="conversation.id"
        @click="emit('select', conversation)"
        class="flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800"
        :class="activeConversation?.id === conversation.id ? 'bg-primary/10 border-r-4 border-r-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        <img 
          class="size-12 rounded-full border-2 border-transparent" 
          :src="getAvatarUrl(conversation.contact_name || conversation.contact_phone)" 
          :alt="conversation.contact_name || ''"
        />
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {{ conversation.contact_name || conversation.contact_phone }}
            </h3>
            <span class="text-[10px] text-slate-500">{{ formatTime(conversation.last_message_at) }}</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {{ conversation.last_message }}
          </p>
        </div>
        <div v-if="conversation.unread_count > 0" class="size-2.5 bg-primary rounded-full"></div>
      </div>
    </div>
  </aside>
</template>
