<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useChat } from '~/composables/useChat'
import ConversationList from '~/components/chat/ConversationList.vue'
import ChatWindow from '~/components/chat/ChatWindow.vue'
import RegistrationSidebar from '~/components/chat/RegistrationSidebar.vue'
import type { Conversation } from '~/types/chat'

definePageMeta({
  middleware: 'auth'
})

const {
  conversations,
  activeConversation,
  messages,
  loadConversations,
  loadMessages,
  sendMessage,
  subscribeToMessages,
  deleteConversation,
  clearConversation
} = useChat()

const user = useSupabaseUser()
let unsubscribe: (() => void) | null = null

onMounted(() => {
  loadConversations()
  unsubscribe = subscribeToMessages()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

const handleSelectConversation = async (conversation: Conversation) => {
  activeConversation.value = conversation
  await loadMessages(conversation.id)
}

const handleSendMessage = async (text: string, type: 'text' | 'image' | 'file' = 'text') => {
  await sendMessage(text, type)
}

// Controle do Modal de Exclusão
const showDeleteModal = ref(false)
const conversationToDeleteId = ref<string | null>(null)
const isDeleting = ref(false)

const handleDeleteRequest = (id: string) => {
  conversationToDeleteId.value = id
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!conversationToDeleteId.value) return
  
  isDeleting.value = true
  try {
    await deleteConversation(conversationToDeleteId.value)
    showDeleteModal.value = false
    conversationToDeleteId.value = null
  } catch (error) {
    console.error('Erro ao excluir conversa:', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="flex h-full overflow-hidden bg-white dark:bg-slate-950">
    <!-- Lista de Conversas (Esquerda) -->
    <ConversationList 
      :conversations="conversations" 
      :active-conversation="activeConversation"
      @select="handleSelectConversation" 
    />

    <!-- Janela de Chat (Centro) -->
    <ChatWindow 
      :active-conversation="activeConversation"
      :messages="messages"
      :current-user-id="user?.id || ''"
      @send-message="handleSendMessage"
      @delete-conversation="handleDeleteRequest"
      @clear-conversation="clearConversation"
    />

    <!-- Formulário de Cadastro (Direita) -->
    <RegistrationSidebar 
      v-if="activeConversation"
      :active-conversation="activeConversation"
      :messages="messages"
    />

    <!-- Modal de Confirmação de Exclusão -->
    <UiConfirmModal 
      :show="showDeleteModal"
      title="Excluir Conversa"
      description="Tem certeza que deseja excluir esta conversa permanentemente? Isso apagará todas as mensagens, arquivos e cadastros vinculados. Esta ação não pode ser desfeita."
      confirm-text="Sim, excluir conversa"
      :loading="isDeleting"
      @close="showDeleteModal = false"
      @confirm="confirmDelete"
    />
  </div>
</template>
