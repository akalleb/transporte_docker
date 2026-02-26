<script setup lang="ts">
import { ref, onUpdated, nextTick, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { SendIcon, SmileIcon, MoreVerticalIcon, CheckCheckIcon, Trash2Icon, EraserIcon, XIcon, ClockIcon, AlertCircleIcon, FileTextIcon } from 'lucide-vue-next'
import type { Conversation, Message } from '~/types/chat'
// import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'
import ImageMessage from './ImageMessage.vue'
import BaseButton from '~/components/BaseButton.vue'
import BaseDropdown from '~/components/BaseDropdown.vue'

const EmojiPicker = defineAsyncComponent(() => import('vue3-emoji-picker'))

const props = defineProps<{
  activeConversation: Conversation | null
  messages: Message[]
  currentUserId: string
}>()

const emit = defineEmits(['sendMessage', 'deleteConversation', 'clearConversation', 'retryMessage'])
const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const showEmojiPicker = ref(false)
const menuDropdown = ref<InstanceType<typeof BaseDropdown> | null>(null)
const supabase = useSupabaseClient()

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

onUpdated(() => {
  scrollToBottom()
})

// Close menu/picker when clicking outside
const closePopups = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (showEmojiPicker.value && !target.closest('.emoji-trigger') && !target.closest('.emoji-picker')) {
        showEmojiPicker.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', closePopups)
})

onUnmounted(() => {
    document.removeEventListener('click', closePopups)
})

const toggleEmojiPicker = (e: MouseEvent) => {
    e.stopPropagation()
    showEmojiPicker.value = !showEmojiPicker.value
    menuDropdown.value?.close()
}

const onSelectEmoji = (emoji: any) => {
  messageInput.value += emoji.i
}

const handleDelete = () => {
    if (props.activeConversation) {
        emit('deleteConversation', props.activeConversation.id)
    }
}

const handleClear = () => {
    if (props.activeConversation) {
        emit('clearConversation', props.activeConversation.id)
    }
}

const handleSend = () => {
  if (!messageInput.value.trim()) return
  emit('sendMessage', messageInput.value, 'text')
  messageInput.value = ''
  nextTick(scrollToBottom)
}

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
  <section class="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-full relative">
    <div v-if="!activeConversation" class="flex-1 flex flex-col items-center justify-center text-slate-400">
      <div class="p-6 bg-slate-100 dark:bg-slate-900 rounded-full mb-4">
        <SendIcon class="w-12 h-12 text-slate-300" />
      </div>
      <p>Selecione uma conversa para iniciar o atendimento</p>
    </div>

    <template v-else>
      <!-- Chat Header -->
      <div class="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 z-10">
        <div class="flex items-center gap-3">
          <div class="relative">
            <img 
              class="size-10 rounded-full" 
              :src="getAvatarUrl(activeConversation.contact_name || activeConversation.contact_phone)" 
              alt="Avatar"
            />
            <span class="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">
              {{ activeConversation.contact_name || activeConversation.contact_phone }}
            </h2>
            <span 
              class="text-[10px] font-medium uppercase tracking-widest"
              :class="activeConversation.flow_step === 'completed' || activeConversation.status === 'closed' ? 'text-slate-500' : 'text-green-500'"
            >
              {{ activeConversation.flow_step === 'completed' || activeConversation.status === 'closed' ? 'Finalizado' : 'Em Atendimento' }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 relative">
          <BaseDropdown ref="menuDropdown">
            <template #trigger>
              <button 
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg menu-trigger transition-colors"
              >
                <MoreVerticalIcon class="w-5 h-5" />
              </button>
            </template>
            
            <button 
                @click="handleClear" 
                class="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
                <EraserIcon class="w-4 h-4" />
                Limpar conversa
            </button>
            <button 
                @click="handleDelete" 
                class="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
            >
                <Trash2Icon class="w-4 h-4" />
                Excluir conversa
            </button>
          </BaseDropdown>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 space-y-6 bg-[#efeae2] dark:bg-slate-950">
        <div class="flex justify-center mb-4">
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-3 py-1 rounded-full">Hoje</span>
        </div>

        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          class="flex flex-col gap-1 max-w-[80%]"
          :class="msg.sender === 'agent' ? 'items-end ml-auto' : 'items-start'"
        >
          <div 
            class="p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"
            :class="msg.sender === 'agent' ? 'bg-primary rounded-tr-none' : 'bg-white dark:bg-slate-800 rounded-tl-none'"
          >
            <ImageMessage 
                v-if="msg.type === 'image' || (msg.media_url && !msg.media_url.endsWith('.pdf'))" 
                :src="msg.media_url || msg.content" 
                class="rounded-lg max-w-[250px]"
            />
            <div v-else-if="msg.type === 'document' || (msg.media_url && msg.media_url.endsWith('.pdf'))" class="p-2 flex items-center gap-2">
                <FileTextIcon class="w-8 h-8 text-slate-500" />
                <a :href="msg.media_url || msg.content" target="_blank" class="text-sm underline text-blue-600 dark:text-blue-400">Ver Documento</a>
            </div>
            <p 
              v-else
              class="text-sm px-3 py-2"
              :class="msg.sender === 'agent' ? 'text-slate-900 font-medium' : 'text-slate-700 dark:text-slate-200'"
            >
              {{ msg.content }}
            </p>
          </div>
          <div class="flex items-center gap-1" :class="msg.sender === 'agent' ? 'mr-1' : 'ml-1'">
            <span class="text-[10px] text-slate-400">{{ formatTime(msg.created_at) }}</span>
            
            <!-- Status Icons -->
            <template v-if="msg.sender === 'agent'">
               <div v-if="msg.status === 'sending'" class="animate-pulse" title="Enviando...">
                  <ClockIcon class="w-3 h-3 text-slate-400" />
               </div>
               <button v-else-if="msg.status === 'failed'" 
                       @click="emit('retryMessage', msg.id)"
                       class="flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                       title="Falha no envio. Clique para tentar novamente">
                  <AlertCircleIcon class="w-3 h-3 text-red-500" />
               </button>
               <div v-else title="Enviado">
                  <CheckCheckIcon class="w-3 h-3 text-primary" />
               </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20">
        <div class="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex items-end gap-2 shadow-inner relative">
          <!-- Emoji Button -->
          <BaseButton 
            @click="toggleEmojiPicker"
            class="!size-10 !p-0 flex items-center justify-center !text-slate-400 hover:!text-slate-600 hover:!bg-slate-200 dark:hover:!bg-slate-700 !rounded-lg transition-colors emoji-trigger !shadow-none !bg-transparent"
            :class="{ '!text-primary !bg-slate-200 dark:!bg-slate-700': showEmojiPicker }"
          >
            <SmileIcon class="w-5 h-5" />
          </BaseButton>

          <!-- Text Input -->
          <textarea 
            v-model="messageInput"
            @keydown.enter.prevent="handleSend"
            class="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-32 min-h-[40px] outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400" 
            placeholder="Digite sua mensagem..."
          ></textarea>

          <!-- Send Button -->
          <BaseButton 
            @click="handleSend"
            class="!size-10 !p-0 !bg-primary !rounded-lg flex items-center justify-center !text-slate-900 !shadow-lg hover:!scale-105 transition-transform shrink-0"
          >
            <SendIcon class="w-5 h-5" />
          </BaseButton>

          <!-- Emoji Picker Popover -->
          <div v-if="showEmojiPicker" class="absolute bottom-16 left-0 z-50 emoji-picker">
             <EmojiPicker :native="true" @select="onSelectEmoji" class="shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
