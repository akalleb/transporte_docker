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
        socket.value = io(socketUrl, {
          transports: ['websocket'],
          reconnection: true
        })
    
        socket.value.on('connect', () => {
          console.log('Socket.io conectado!')
        })
    
        socket.value.on('new_message', (data: any) => {
          console.log('Nova mensagem via Socket:', data)
          // Se a mensagem for da conversa ativa, adiciona na lista
          if (activeConversation.value) {
            // Verifica se é desta conversa (pelo telefone)
            const cleanContactPhone = activeConversation.value.contact_phone.replace(/[^0-9]/g, '')
            const cleanMsgPhone = data.phone.replace(/[^0-9]/g, '')
            
            if (cleanContactPhone === cleanMsgPhone) {
                const newMessage: Message = {
                    id: 'socket_' + Date.now(), // ID temporário
                    conversation_id: activeConversation.value.id,
                    content: data.content,
                    sender: data.sender || 'contact',
                    type: data.type || 'text',
                    created_at: data.timestamp || new Date().toISOString(),
                    status: 'delivered'
                }
                
                // Evitar duplicidade
                const exists = messages.value.some(m => 
                    (m.content === newMessage.content && Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 2000)
                )
    
                if (!exists) {
                    messages.value.push(newMessage)
                }
                
                // Move conversa para o topo
                updateConversationListOrder(activeConversation.value.id, data.content, data.timestamp)
            } else {
                 // Atualiza lista de conversas se for de outro contato
                 const convIndex = conversations.value.findIndex(c => c.contact_phone.replace(/[^0-9]/g, '') === cleanMsgPhone)
                 if (convIndex !== -1) {
                     const conv = conversations.value[convIndex]
                     conv.last_message = data.content
                     conv.last_message_at = data.timestamp || new Date().toISOString()
                     conversations.value.splice(convIndex, 1)
                     conversations.value.unshift(conv)
                 }
            }
          }
        })
        
        socket.value.on('message_status', (data: any) => {
            // Atualiza status da mensagem (envio, falha)
            // data: { tempId, status, messageId, error }
            const { tempId, status, messageId, error } = data
            console.log('Atualização de status via Socket:', data)
            
            const msgIndex = messages.value.findIndex(m => m.id === tempId)
            if (msgIndex !== -1) {
                const msg = messages.value[msgIndex]
                msg.status = status
                if (messageId) msg.id = messageId // Atualiza ID temporário para permanente
                if (error) console.error('Erro no envio da mensagem:', error)
            }
        })

        socket.value.on('message_sent', (data: any) => {
            console.log('Confirmação de envio via Socket (Legacy):', data)
        })
    } catch (e) {
        console.error('Erro ao carregar socket.io-client:', e)
    }
  }

  // Helper para reordenar lista localmente
  const updateConversationListOrder = (id: string, lastMessage: string, timestamp: string) => {
      const index = conversations.value.findIndex(c => c.id === id)
      if (index !== -1) {
          const conv = conversations.value[index]
          conv.last_message = lastMessage
          conv.last_message_at = timestamp
          conversations.value.splice(index, 1)
          conversations.value.unshift(conv)
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
          activeConversation.value = updated
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

    // 1. Tentar enviar via Socket.io (Mais rápido que API e Supabase)
    if (socket.value && socket.value.connected) {
        socket.value.emit('send_message', {
            phone: activeConversation.value.contact_phone,
            conversation_id: activeConversation.value.id, // Adicionado para backend buscar JID correto
            message: text
        })
        // Feedback visual imediato
        messages.value.push({
            id: 'temp_' + Date.now(),
            conversation_id: activeConversation.value.id,
            sender: 'agent',
            content: text,
            type: type,
            created_at: new Date().toISOString(),
            status: 'sent' // Será atualizado pelo listener do Supabase depois
        } as Message)
        
        // Não precisamos fazer fetch ou insert aqui se o socket funcionar, 
        // MAS precisamos garantir persistência.
        // O servidor WhatsApp deveria salvar no banco ao receber via Socket?
        // Atualmente o server.js APENAS envia para o WhatsApp Web.
        // Então PRECISAMOS salvar no banco aqui também para garantir histórico.
    }

    // 2. Inserir no Supabase (com status 'delivered' se já foi enviado, ou 'sent' para a fila pegar)
    let status = 'sent'
    if (socket.value && socket.value.connected) status = 'delivered'

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation.value.id,
        sender: 'agent',
        content: text,
        type: type,
        status: status
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar mensagem:', error)
      return
    }

    // Atualização Otimista da UI
    // Se enviamos via socket, já adicionamos um temp. Se o ID for diferente, poderíamos ter duplicidade.
    // Mas o temp ID não vem do banco.
    // Vamos apenas adicionar se não existir.
    if (data) {
        const exists = messages.value.find(m => m.id === data.id)
        if (!exists) {
            // Se tiver mensagem temporária recente (enviada via socket), substituir ou remover
            // Simplificação: apenas adicionar. O socket push usa 'temp_' id.
            // O ideal seria substituir o temp pelo real.
            
            // Remove temp messages older than 5 seconds? No.
            // Replace logic:
            const tempIndex = messages.value.findIndex(m => m.id.startsWith('temp_') && m.content === text)
            if (tempIndex !== -1) {
                messages.value[tempIndex] = data as any
            } else {
                messages.value.push(data as any)
            }
        }
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

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    loadConversations,
    loadMessages,
    sendMessage,
    subscribeToMessages,
    deleteConversation,
    clearConversation
  }
}
