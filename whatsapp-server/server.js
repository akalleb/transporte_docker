import 'dotenv/config'
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'
import QRCode from 'qrcode'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { handleMessage } from './src/bot/flowController.js'
import { formatJid } from './src/utils/phoneUtils.js'
import { Server } from 'socket.io'
import http from 'http'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Disponibilizar io globalmente para uso no flowController
global.io = io

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}))
app.use(express.json())

const PORT = process.env.PORT || 3001
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('COLE_SUA_CHAVE')) {
  console.warn('⚠️  ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY não configurada corretamente no .env!')
  console.warn('   Uploads de mídia podem falhar devido a restrições de RLS.')
}

// Cliente Supabase (Prioriza Service Role para operações de backend)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY ? { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } : {}
)

let sock
let qrCodeData = ''
let connectionStatus = 'disconnected'
let shouldReconnect = true
let isConnected = false

// Processar mensagem de saída (usado por Listener e Polling)
const processOutgoingMessage = async (message) => {
  // Evitar processar mensagens já entregues ou falhas
  if (message.status === 'delivered' || message.status === 'failed') {
    return
  }

  if (!sock || !isConnected) {
    // Apenas loga se for debug, para não spammar no polling
    // console.warn('Servidor WhatsApp desconectado. Mensagem na fila:', message.id)
    return
  }

  try {
    // Buscar o telefone do contato associado à conversa
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('contact_phone, contact_jid')
      .eq('id', message.conversation_id)
      .single()

    if (error || !conversation) {
      console.error('Conversa não encontrada para ID:', message.conversation_id)
      // Marcar como falha para evitar retry infinito
      await supabase.from('messages').update({ status: 'failed' }).eq('id', message.id)
      return
    }

    // Usar contact_jid se disponível (para suportar LIDs)
    // Se não, verifica se o próprio contact_phone já é um JID (tem @)
    // Último caso: formata como número brasileiro padrão
    let jid = conversation.contact_jid
    
    if (!jid) {
        if (conversation.contact_phone && conversation.contact_phone.includes('@')) {
            jid = conversation.contact_phone
        } else {
            jid = formatJid(conversation.contact_phone)
        }
    }
    
    console.log(`Enviando mensagem para ${conversation.contact_phone} (JID: ${jid}): ${message.content}`)

    // Enviar mensagem via Baileys
    await sock.sendMessage(jid, { text: message.content })

    // Atualizar status para delivered
    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('id', message.id)

    console.log('Mensagem enviada e status atualizado!')

  } catch (err) {
    console.error('Erro ao processar envio de mensagem:', err)
    
    // Incrementar tentativas e marcar falha se necessário
    const currentAttempts = (message.send_attempts || 0) + 1
    const newStatus = currentAttempts >= 3 ? 'failed' : 'sent' // Se falhar 3x, marca como failed
    
    await supabase
      .from('messages')
      .update({ 
        send_attempts: currentAttempts,
        status: newStatus
      })
      .eq('id', message.id)
      
    if (newStatus === 'failed') {
        console.error(`Mensagem ${message.id} falhou definitivamente após 3 tentativas.`)
    }
  }
}

// Monitorar novas mensagens enviadas pelo sistema (agent)
let messageChannel = null

const setupSupabaseListener = () => {
  if (messageChannel) {
    console.log('Listener já ativo, removendo anterior...')
    supabase.removeChannel(messageChannel)
  }

  console.log('Iniciando listener do Supabase...')

  messageChannel = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: "sender=eq.agent" }, async (payload) => {
      console.log('Nova mensagem do sistema detectada (Realtime):', payload.new)
      await processOutgoingMessage(payload.new)
    })
    .subscribe((status, err) => {
      console.log('Status da subscrição Supabase:', status)
      if (status === 'SUBSCRIBED') {
        console.log('Listener conectado e escutando novas mensagens!')
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('Erro no canal do Supabase:', err)
        // Tentar reconectar após 5 segundos
        setTimeout(setupSupabaseListener, 5000)
      }
      if (status === 'TIMED_OUT') {
        console.error('Timeout na conexão do listener Supabase.')
        // Tentar reconectar após 5 segundos
        setTimeout(setupSupabaseListener, 5000)
      }
    })
    
  return messageChannel
}

// Polling de segurança (Fallback para quando o Realtime falhar)
const startPolling = () => {
  console.log('Iniciando polling de mensagens pendentes...')
  setInterval(async () => {
    if (!isConnected) {
        // console.log('[POLLING] Aguardando conexão estável...')
        return
    }

    try {
      // Busca mensagens que o frontend marcou como enviadas OU pendentes (se falhou no envio direto)
      // E que foram criadas há mais de 30 segundos (janela de segurança para não concorrer com Realtime)
      const safetyWindow = new Date(Date.now() - 30000).toISOString()
      
      const { data: pendingMessages, error: pollingError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender', 'agent')
        .in('status', ['sent', 'pending'])
        .lt('created_at', safetyWindow) // Só pega mensagens antigas
        .lt('send_attempts', 3) // Ignora mensagens que já falharam 3x
        .limit(5) // Lote pequeno para evitar gargalos

      if (pollingError) {
          // Se der erro (ex: coluna não existe), apenas loga e tenta sem filtro de attempts na próxima (mas ideal é rodar migration)
          console.error('Erro no polling ao buscar mensagens:', pollingError)
          return
      }

      if (pendingMessages && pendingMessages.length > 0) {
        console.log(`Polling: Encontradas ${pendingMessages.length} mensagens pendentes. Processando...`)
        for (const msg of pendingMessages) {
          await processOutgoingMessage(msg)
        }
      }
    } catch (e) {
      console.error('Erro no polling:', e)
    }
  }, 10000) // Verifica a cada 10 segundos
}
// Listener para mensagens recebidas (Auto-Reply Bot)
// DESATIVADO: O fluxo principal é controlado pelo flowController.js para evitar duplicação
// Código legado removido para limpeza.

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Transporte 2.0', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    emitOwnEvents: true,
    retryRequestDelayMs: 250
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrCodeData = qr
      console.log('Novo QR Code gerado')
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Conexão fechada. Reconectando...', shouldReconnect)

      connectionStatus = 'disconnected'
      isConnected = false

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000) // Delay para evitar loop rápido
      } else {
        console.log('Desconectado. Aguardando nova conexão manual.')
        // Limpa credenciais para permitir novo login
        fs.rmSync('./auth_info_baileys', { recursive: true, force: true })
        connectToWhatsApp()
      }
    } else if (connection === 'open') {
      console.log('Conexão aberta com sucesso!')
      connectionStatus = 'connected'
      isConnected = true
      qrCodeData = ''
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]

    if (!msg.message || msg.key.fromMe) return

    const remoteJid = msg.key.remoteJid
    const pushName = msg.pushName
    // Prioriza conversation (texto simples) ou extendedTextMessage (texto com formatação/link)
    // Se for imagem/vídeo, tenta pegar caption
    let text = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || ''

    // Se não tiver texto, mas for imagem, vamos considerar como "imagem_recebida"
    const isImage = !!msg.message?.imageMessage
    const isDocument = !!msg.message?.documentMessage

    // Se for imagem e não tiver legenda, text é vazio, mas não devemos ignorar se for parte do fluxo
    if (!text && (isImage || isDocument)) {
      text = isImage ? '[IMAGEM]' : '[DOCUMENTO]'
      console.log('Mídia recebida sem legenda, processando...')
    }

    if (!text) {
      console.log('Mensagem sem texto ignorada (provavelmente mídia sem legenda ou status)')
      return
    }

    // Limpar sufixos do WhatsApp
    let phone = remoteJid.replace('@s.whatsapp.net', '')

    // Debug detalhado para entender estrutura de mensagens LID
    if (remoteJid.includes('@lid')) {
      console.log('⚠️ MENSAGEM RECEBIDA DE UM LID (Linked Device ID)!')
      console.log('RemoteJid:', remoteJid)
      console.log('PushName:', pushName)
      console.log('Msg Key:', JSON.stringify(msg.key, null, 2))
      console.log('Msg Content:', JSON.stringify(msg.message, null, 2))
      // Tentar encontrar o JID real se disponível no objeto
      if (msg.key.participant) {
        console.log('Participant:', msg.key.participant)
        // Se tiver participant, usa ele como phone (removendo sufixo)
        phone = msg.key.participant.replace('@s.whatsapp.net', '')
      }
    }

    // Se for LID e não tiver participant, mantém o remoteJid como phone por enquanto
    // Mas o importante é salvar o contact_jid correto para resposta
    if (remoteJid.includes('@lid') && !phone.includes('@lid')) {
       // Se phone já foi ajustado pelo participant, ok. Se não, mantém.
    }

    console.log(`Nova mensagem de ${pushName} (${phone}): ${text}`)

    // Enviar para Supabase
    try {
      // Notificar via Socket.io (Instantâneo)
      io.emit('new_message', {
        phone: phone,
        content: text,
        sender: 'contact',
        type: isImage ? 'image' : (isDocument ? 'document' : 'text'),
        timestamp: new Date().toISOString(),
        pushName: pushName,
        mediaUrl: null,
        contact_jid: remoteJid // Passando o JID original para o frontend saber
      })

      // Ajuste na URL para apontar para a função correta
      const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-whatsapp`

      console.log(`Enviando para: ${webhookUrl}`)

      // Se for imagem, fazer upload (SIMPLIFICADO)
      let publicUrl = null
      if (isImage || isDocument) {
        try {
          // Download buffer
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {}
          )

          // Upload to Supabase Storage
          // Nome do arquivo: timestamp_phone.jpg
          const fileName = `whatsapp/${Date.now()}_${phone.replace(/[^0-9]/g, '')}.${isDocument ? 'pdf' : 'jpg'}`
          const { data, error } = await supabase.storage
            .from('requisicoes') // Bucket correto
            .upload(fileName, buffer, {
              contentType: isDocument ? 'application/pdf' : 'image/jpeg',
              upsert: false
            })

          if (!error && data) {
            const { data: publicData } = supabase.storage
              .from('requisicoes')
              .getPublicUrl(fileName)
            publicUrl = publicData.publicUrl
            console.log('Imagem salva:', publicUrl)
          } else {
            console.error('Erro upload storage:', error)
          }
        } catch (e) {
          console.error('Erro ao baixar/salvar mídia:', e)
        }
      }

      const response = await axios.post(webhookUrl, {
        phone: phone,
        text: text, // Se for imagem sem legenda, manda [IMAGEM]
        pushName: pushName,
        sender: 'contact',
        mediaUrl: publicUrl, // Passa URL se tiver
        contact_jid: remoteJid // JID original (importante para LIDs)
      }, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('Enviado para Supabase com sucesso:', response.data)

      // Chamar controlador de fluxo do bot (Instantâneo)
      if (response.data && response.data.conversation_id) {
        // Identificar tipo de mensagem (simplificado)
        let msgType = 'text'
        if (isImage) msgType = 'image'
        if (isDocument) msgType = 'document'

        // Se tiver URL, passar como conteúdo para o bot salvar
        const contentForBot = publicUrl || text

        await handleMessage({
          conversation_id: response.data.conversation_id,
          content: contentForBot,
          sender: 'contact',
          type: msgType
        }, sock)
      }

    } catch (err) {
      console.error('Erro ao enviar para Supabase:', err.message)
      if (err.response) {
        console.error('Status:', err.response.status)
        console.error('Detalhes:', err.response.data)
      }
    }
  })
}

// Endpoints da API
app.get('/qr', async (req, res) => {
  if (connectionStatus === 'connected') {
    return res.status(400).json({ error: 'Already connected' })
  }
  if (!qrCodeData) {
    return res.status(503).json({ error: 'QR Code not ready yet' })
  }

  try {
    const qrImage = await QRCode.toDataURL(qrCodeData)
    res.json({ qr: qrImage, code: qrCodeData })
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR image' })
  }
})

app.get('/status', (req, res) => {
  res.json({ status: connectionStatus })
})

app.post('/logout', async (req, res) => {
  try {
    await sock.logout()
    fs.rmSync('./auth_info_baileys', { recursive: true, force: true })
    connectionStatus = 'disconnected'
    qrCodeData = ''
    connectToWhatsApp() // Reinicia para gerar novo QR
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout' })
  }
})

// Endpoint para envio direto de mensagens (API Interna)
app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' })
  }

  if (!sock || connectionStatus !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp disconnected' })
  }

  try {
    // Limpar formatação usando formatJid
    const jid = formatJid(phone)
    
    console.log(`API /send-message: Enviando para ${phone} (JID: ${jid})`)
    await sock.sendMessage(jid, { text: message })
    
    res.json({ success: true })
  } catch (err) {
    console.error('Erro ao enviar mensagem via API:', err)
    res.status(500).json({ error: err.message })
  }
})

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Cliente Socket.io conectado:', socket.id)

  socket.on('disconnect', () => {
    console.log('Cliente Socket.io desconectado:', socket.id)
  })

  // Permite que o frontend envie mensagens via socket (mais rápido que API HTTP)
  socket.on('send_message', async (data) => {
    const { phone, message, conversation_id, tempId } = data
    if (!phone || !message) return

    if (!sock || connectionStatus !== 'connected') {
      socket.emit('message_status', { tempId, status: 'failed', error: 'WhatsApp desconectado' })
      return
    }

    try {
      let jid = formatJid(phone)

      // Se tiver conversation_id, tentar buscar o JID correto no banco (suporte a LID)
      if (conversation_id) {
          const { data: conv } = await supabase
             .from('conversations')
             .select('contact_jid')
             .eq('id', conversation_id)
             .single()
          
          if (conv && conv.contact_jid) {
              jid = conv.contact_jid
          }
      }
    
      console.log(`Socket.io: Enviando para ${phone} (${jid})`)
      const sentMsg = await sock.sendMessage(jid, { text: message })
      
      // Sucesso!
      socket.emit('message_status', { 
        tempId,
        status: 'sent', // Confirmado pelo socket
        messageId: sentMsg.key.id,
        phone: phone
      })
      
      socket.emit('message_sent', { 
        success: true, 
        id: sentMsg.key.id,
        phone: phone,
        content: message
      })
    } catch (err) {
      console.error('Erro ao enviar mensagem via Socket:', err)
      socket.emit('message_status', { tempId, status: 'failed', error: err.message })
      socket.emit('message_error', { error: 'Falha ao enviar mensagem', details: err.message })
    }
  })
})

server.listen(PORT, () => {
  console.log(`Servidor WhatsApp rodando na porta ${PORT}`)
  connectToWhatsApp()
  setupSupabaseListener()
  startPolling()
})
