import { ref, onMounted } from 'vue'
import type { Database } from '~/types/database.types'
import type { Conversation, Message } from '~/types/chat'
// import { io, Socket } from 'socket.io-client' // Removido import estático

export const useChat = () => {
  const supabase = useSupabaseClient<Database>()
  const conversations = ref<Conversation[]>([])
  const activeConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const socket = ref<any>(null) // Tipo any temporário para evitar erro de tipo sem import

  onMounted(() => {
    if (import.meta.client) {
      initSocket()
    }
  })


  // Inicializar Socket.io
  const initSocket = async () => {
    if (socket.value) return

    if (!import.meta.client) return

    try {
      // Importação dinâmica para evitar erro no SSR
      const { io } = await import('socket.io-client')

      // Conectar ao servidor WhatsApp (Porta 3001)
      const runtimeConfig = useRuntimeConfig()
      const socketUrl = runtimeConfig.public.whatsappApiUrl || 'http://localhost:3001'

      console.log('[useChat] Conectando ao Socket.io em:', socketUrl)

      const socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'], // Fallback para polling se websocket falhar
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socket.value = socketInstance

      socketInstance.on('connect', () => {
        console.log('[useChat] Socket.io conectado com sucesso! ID:', socketInstance.id)
      })

      socketInstance.on('connect_error', (err: any) => {
        console.error('[useChat] Erro de conexão Socket.io:', err.message)
      })

      socketInstance.on('new_message', (data: any) => {
        console.log('[useChat] Nova mensagem recebida:', data)

        // Se tiver activeConversation, verifica se é pra ela
        if (activeConversation.value) {
          const currentPhone = activeConversation.value.contact_phone.replace(/[^0-9]/g, '')
          const incomingPhone = (data.phone || '').replace(/[^0-9]/g, '')

          if (currentPhone && incomingPhone && currentPhone === incomingPhone) {
            const newMessage: Message = {
              id: data.id || 'socket_' + Date.now(),
              conversation_id: activeConversation.value.id,
              content: data.content,
              sender: data.sender || 'contact', // 'contact' ou 'agent'
              type: data.type || 'text',
              created_at: data.timestamp || new Date().toISOString(),
              status: 'delivered',
              media_url: data.mediaUrl || null
            }

            // Evita duplicidade simples (pelo ID ou conteúdo recente)
            const exists = messages.value.some(m => m.id === newMessage.id)
            if (!exists) {
              messages.value.push(newMessage)
              // Scroll to bottom (idealmente via evento ou ref no componente)
            }
          }
        }

        // Atualiza a lista de conversas (move pro topo ou atualiza preview)
        // Se não estiver na lista, recarrega tudo (simples)
        // Se estiver, move
        // TODO: Melhorar performance aqui
        loadConversations()
      })

      socketInstance.on('bot_transferiu', (data: any) => {
        console.log('[useChat] Atenção: Bot transferiu atendimento para humano!', data)

        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Atendimento Transferido (IA)', {
              body: `O bot solicitou ajuda humana.\nMotivo: ${data.motivo || 'N/A'}\nContato: ${data.telefone || ''}`
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Atendimento Transferido (IA)', { body: 'O bot solicitou ajuda humana.' })
              }
            });
          }
        } else {
          alert(`⚠️ ATENÇÃO: Bot transferiu um atendimento!\nTelefone: ${data.telefone}\nMotivo: ${data.motivo}`);
        }

        loadConversations();
      })

    } catch (e) {
      console.error('[useChat] Falha crítica ao inicializar socket:', e)
    }
  }

  // Helper para reordenar lista localmente
  const updateConversationListOrder = (id: string, lastMessage: string, timestamp: string) => {
    const index = conversations.value.findIndex(c => c.id === id)
    if (index !== -1) {
      const conv = conversations.value[index]
      if (conv) {
        conv.last_message = lastMessage
        conv.last_message_at = timestamp
        conversations.value.splice(index, 1)
        conversations.value.unshift(conv)
      }
    }
  }

  // Carrega lista de conversas
  async function loadConversations() {
    loading.value = true
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar conversas:', error)
    } else {
      conversations.value = (data as any[]) || []

      // Atualiza activeConversation com dados novos se existir
      if (activeConversation.value) {
        const updated = conversations.value.find(c => c.id === activeConversation.value?.id)
        if (updated) {
          activeConversation.value = updated as Conversation
        }
      }
    }
    loading.value = false
  }

  // Carrega mensagens de uma conversa
  async function loadMessages(conversationId: string) {
    loading.value = true
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao carregar mensagens:', error)
    } else {
      messages.value = (data as any[]) || []
    }
    loading.value = false
  }

  // Envia mensagem
  async function sendMessage(text: string, type: 'text' | 'image' | 'file' = 'text') {
    if (!activeConversation.value) return

    // 1. Atualização Otimista da UI
    const tempId = 'temp_' + Date.now()
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: activeConversation.value.id,
      sender: 'agent',
      content: text,
      type: type,
      created_at: new Date().toISOString(),
      status: 'sending'
    }
    messages.value.push(optimisticMessage)

    try {
      // 2. Tentar enviar via API Direta (mais confiável que Socket para envio)
      const runtimeConfig = useRuntimeConfig()
      const apiUrl = runtimeConfig.public.whatsappApiUrl || 'http://localhost:3001'

      // Primeiro salvamos no banco com status 'sent' (para garantir persistência)
      const { data: savedMsg, error: saveError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.value.id,
          sender: 'agent',
          content: text,
          type: type,
          status: 'sent'
        })
        .select()
        .single()

      if (saveError || !savedMsg) {
        console.error('Erro ao salvar mensagem no banco:', saveError)
        // Atualizar otimista para erro
        const msgIndex = messages.value.findIndex(m => m.id === tempId)
        if (msgIndex !== -1 && messages.value[msgIndex]) messages.value[msgIndex].status = 'failed'
        return
      }

      // Substituir ID temporário pelo real
      const msgIndex2 = messages.value.findIndex(m => m.id === tempId)
      if (msgIndex2 !== -1 && messages.value[msgIndex2]) {
        messages.value[msgIndex2] = savedMsg as any
        if (messages.value[msgIndex2]) messages.value[msgIndex2].status = 'sending'
      }

      // 3. Chamar API de envio
      const response = await fetch(`${apiUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeConversation.value.contact_phone,
          message: text,
          conversationId: activeConversation.value.id
        })
      })

      if (response.ok) {
        // Sucesso! Atualizar status no banco e localmente
        await supabase.from('messages').update({ status: 'delivered' }).eq('id', savedMsg.id)

        const finalIndex = messages.value.findIndex(m => m.id === savedMsg.id)
        if (finalIndex !== -1 && messages.value[finalIndex]) messages.value[finalIndex].status = 'delivered'
      } else {
        console.error('Erro na API de envio:', response.statusText)
        // Atualização falhou, atualiza apenas o estado local pois o Supabase não aceita ENUM 'failed'
        const finalIndexFailed = messages.value.findIndex(m => m.id === savedMsg.id)
        if (finalIndexFailed !== -1 && messages.value[finalIndexFailed]) messages.value[finalIndexFailed].status = 'failed'
      }

    } catch (e) {
      console.error('Exceção ao enviar mensagem:', e)
      const msgIndexErr = messages.value.findIndex(m => m.id === tempId)
      if (msgIndexErr !== -1 && messages.value[msgIndexErr]) messages.value[msgIndexErr].status = 'failed'
    }
  }

  // Inscreve no Realtime
  function subscribeToMessages() {
    // Canal para Mensagens (INSERT)
    const messagesChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('Nova mensagem recebida:', payload)
          const newMessage = payload.new as Message

          // Se a mensagem for da conversa ativa e não tiver sido adicionada ainda (evitar duplicatas do otimista)
          if (activeConversation.value && newMessage.conversation_id === activeConversation.value.id) {
            const exists = messages.value.find(m => m.id === newMessage.id)
            if (!exists) {
              messages.value.push(newMessage)
              // Scroll to bottom (feito no componente via watch messages ou nextTick)
            }
          }
          // Se não for da ativa, incrementar contador? (Fica para depois)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as Message
          if (activeConversation.value && updatedMessage.conversation_id === activeConversation.value.id) {
            const index = messages.value.findIndex(m => m.id === updatedMessage.id)
            if (index !== -1) {
              messages.value[index] = updatedMessage
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Status subscrição mensagens:', status)
      })

    // Canal para Conversas (UPDATE/INSERT) para atualizar lista lateral
    const conversationsChannel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          console.log('Conversa atualizada:', payload)
          // Recarrega lista completa para reordenar
          loadConversations()
        }
      )
      .subscribe((status) => {
        console.log('Status subscrição conversas:', status)
      })

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(conversationsChannel)
    }
  }

  // Função auxiliar para deletar arquivos do Storage vinculados à conversa
  async function deleteConversationFiles(conversationId: string) {
    const filesToDelete: string[] = []

    // 1. Buscar mensagens com mídia (imagem/documento)
    const { data: mediaMessages } = await supabase
      .from('messages')
      .select('content, type')
      .eq('conversation_id', conversationId)
      .in('type', ['image', 'document'])

    if (mediaMessages) {
      mediaMessages.forEach(msg => {
        if (msg.content && msg.content.includes('/requisicoes/')) {
          // Extrair path: .../requisicoes/whatsapp/arquivo.jpg -> whatsapp/arquivo.jpg
          const parts = msg.content.split('/requisicoes/')
          if (parts.length > 1) {
            filesToDelete.push(parts[1])
          }
        }
      })
    }

    // 2. Buscar anexos em registrations
    const { data: registrations } = await supabase
      .from('registrations')
      .select('attachment_url')
      .eq('conversation_id', conversationId)
      .not('attachment_url', 'is', null)

    if (registrations) {
      registrations.forEach(reg => {
        if (reg.attachment_url && reg.attachment_url.includes('/requisicoes/')) {
          const parts = reg.attachment_url.split('/requisicoes/')
          if (parts.length > 1) {
            filesToDelete.push(parts[1])
          }
        }
      })
    }

    // 3. Deletar arquivos do Storage
    if (filesToDelete.length > 0) {
      console.log('Deletando arquivos do Storage:', filesToDelete)
      const { error } = await supabase.storage
        .from('requisicoes')
        .remove(filesToDelete)

      if (error) {
        console.error('Erro ao deletar arquivos do Storage:', error)
      } else {
        console.log('Arquivos deletados com sucesso')
      }
    }
  }

  // Deleta toda a conversa e suas mensagens
  async function deleteConversation(conversationId: string) {
    // Confirmação removida daqui para ser tratada na UI via Modal

    // Deletar arquivos do Storage antes de remover registros
    await deleteConversationFiles(conversationId)

    // Deleta registros vinculados
    const { error: regError } = await supabase
      .from('registrations')
      .delete()
      .eq('conversation_id', conversationId)

    if (regError) {
      console.error('Erro ao excluir registros:', regError)
    }

    // Deleta as mensagens
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (msgError) {
      console.error('Erro ao excluir mensagens da conversa:', msgError)
      throw new Error('Erro ao excluir mensagens da conversa')
      return
    }

    // Deleta a conversa
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      console.error('Erro ao excluir conversa:', error)
      throw new Error('Erro ao excluir conversa')
      return
    }

    // Atualiza estado local
    conversations.value = conversations.value.filter(c => c.id !== conversationId)
    if (activeConversation.value?.id === conversationId) {
      activeConversation.value = null
      messages.value = []
    }
  }

  // Limpa histórico de mensagens mas mantém a conversa
  async function clearConversation(conversationId: string) {

    // Deletar arquivos do Storage antes de limpar mensagens
    await deleteConversationFiles(conversationId)

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) {
      console.error('Erro ao limpar conversa:', error)
      throw new Error('Erro ao limpar conversa')
      return
    }

    // Resetar estado do fluxo do bot
    await supabase
      .from('conversations')
      .update({
        flow_step: 'start',
        flow_data: {},
        last_message: '',
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    // Limpar registro associado (resetar status e remover anexo)
    await supabase
      .from('registrations')
      .update({
        status: 'draft',
        attachment_url: null
      } as any)
      .eq('conversation_id', conversationId)

    // Atualiza estado local
    if (activeConversation.value?.id === conversationId) {
      messages.value = []
      // Atualizar o objeto activeConversation localmente também
      activeConversation.value.flow_step = 'start'
      activeConversation.value.flow_data = {}
    }
  }

  // Reenvia mensagem
  async function retryMessage(messageId: string) {
    if (!activeConversation.value) return

    const msgIndex = messages.value.findIndex(m => m.id === messageId)
    if (msgIndex === -1) return
    const msg = messages.value[msgIndex]
    if (!msg || msg.status !== 'failed') return

    // 1. Atualizar UI otimista
    if (messages.value[msgIndex]) messages.value[msgIndex].status = 'sending'

    try {
      const runtimeConfig = useRuntimeConfig()
      const apiUrl = runtimeConfig.public.whatsappApiUrl || 'http://localhost:3001'

      // Atualiza banco para sent
      await supabase.from('messages').update({ status: 'sent' }).eq('id', messageId)

      // Tentar enviar via API Direta
      const response = await fetch(`${apiUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeConversation.value.contact_phone,
          message: msg.content
        })
      })

      if (response.ok) {
        await supabase.from('messages').update({ status: 'delivered' }).eq('id', messageId)
        const finalIndex = messages.value.findIndex(m => m.id === messageId)
        if (finalIndex !== -1 && messages.value[finalIndex]) messages.value[finalIndex].status = 'delivered'
      } else {
        console.error('Erro na API de reenvio:', response.statusText)
        const finalIndexFailed = messages.value.findIndex(m => m.id === messageId)
        if (finalIndexFailed !== -1 && messages.value[finalIndexFailed]) messages.value[finalIndexFailed].status = 'failed'
      }
    } catch (e) {
      console.error('Exceção ao reenviar mensagem:', e)
      const finalIndexErr = messages.value.findIndex(m => m.id === messageId)
      if (finalIndexErr !== -1 && messages.value[finalIndexErr]) messages.value[finalIndexErr].status = 'failed'
    }
  }

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    loadConversations,
    loadMessages,
    sendMessage,
    retryMessage,
    subscribeToMessages,
    deleteConversation,
    clearConversation
  }
}
