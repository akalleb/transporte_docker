import './env-loader.js'
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
import { processarMensagemComIA } from './src/bot/agentController.js'
import { formatJid } from './src/utils/phoneUtils.js'
import { cleanupStorage } from './src/utils/cleanupStorage.js'
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

const PORT = process.env.WHATSAPP_PORT || process.env.PORT || 3001
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente Supabase
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY ? { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } : {}
)

let sock
let qrCodeData = ''
let connectionStatus = 'disconnected'
let isConnected = false
let retryCount = 0
const MAX_RETRIES = 5

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }), // Menos verboso
    browser: ['MultiChat', 'Chrome', '1.0.0'],
    syncFullHistory: false
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('QR Code gerado!')
      qrCodeData = qr
      connectionStatus = 'disconnected'
      isConnected = false
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
      
      console.log('Conexão fechada. Motivo:', lastDisconnect?.error)
      console.log('Deve reconectar?', shouldReconnect)

      connectionStatus = 'disconnected'
      isConnected = false
      qrCodeData = ''

      if (shouldReconnect) {
        if (retryCount < MAX_RETRIES) {
            retryCount++
            console.log(`Tentando reconectar... (${retryCount}/${MAX_RETRIES})`)
            setTimeout(connectToWhatsApp, 3000) // Espera 3s antes de reconectar
        } else {
            console.error('Muitas tentativas falhas. Parando reconexão automática.')
        }
      } else {
        console.log('Desconectado. Limpando credenciais...')
        fs.rmSync('./auth_info_baileys', { recursive: true, force: true })
        retryCount = 0
        connectToWhatsApp() // Reinicia limpo
      }
    } else if (connection === 'open') {
      console.log('Conexão aberta com sucesso!')
      connectionStatus = 'connected'
      isConnected = true
      qrCodeData = ''
      retryCount = 0
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const remoteJid = msg.key.remoteJid
    const pushName = msg.pushName
    let text = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || ''

    const isImage = !!msg.message?.imageMessage
    const isDocument = !!msg.message?.documentMessage

    if (!text && (isImage || isDocument)) {
        text = isImage ? '[IMAGEM]' : '[DOCUMENTO]'
        console.log('Mídia recebida sem legenda, processando...')
    }

    if (!text) return

    let phone = remoteJid.replace('@s.whatsapp.net', '')
    // Remover também @lid se estiver presente
    phone = phone.replace('@lid', '')

    if (msg.key.participant) {
        phone = msg.key.participant.replace('@s.whatsapp.net', '').replace('@lid', '')
    }

    console.log(`Nova mensagem de ${pushName} (${phone}): ${text}`)

    try {
        let publicUrl = null
        
        // Se for imagem, fazer upload
        if (isImage || isDocument) {
            try {
                console.log('Baixando mídia...')
                const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    { logger: pino({ level: 'silent' }) }
                )
                
                // Upload to Supabase Storage
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
                    console.log('Mídia salva:', publicUrl)
                } else {
                    console.error('Erro upload storage:', error)
                }
            } catch (e) {
                console.error('Erro ao baixar/salvar mídia:', e)
            }
        }

        // Webhook para Supabase
        const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-whatsapp`
        const response = await axios.post(webhookUrl, {
            phone,
            text,
            pushName,
            sender: 'contact',
            contact_jid: remoteJid,
            mediaUrl: publicUrl
        }, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (response.data && response.data.conversation_id) {
            // Notificar frontend via Socket.io
            io.emit('new_message', {
                phone: phone,
                content: text,
                sender: 'contact',
                type: isImage ? 'image' : (isDocument ? 'document' : 'text'),
                timestamp: new Date().toISOString(),
                pushName: pushName,
                mediaUrl: publicUrl,
                contact_jid: remoteJid
            })

            // NEW:
            try {
                const { data: conversa } = await supabase
                   .from("conversations")
                   .select("is_bot_active")
                   .eq("id", response.data.conversation_id)
                   .single();
                
                if (conversa?.is_bot_active) {
                    console.log(`Processando IA para ${phone}...`);
                    const { texto, transferido, motivo } = await processarMensagemComIA(phone, text);
                    
                    if (texto) {
                        await sock.sendMessage(remoteJid, { text: texto });
                    }
                    
                    if (transferido) {
                        io.emit("bot_transferiu", { telefone: phone, motivo });
                    }
                }
            } catch (err) {
                console.error("Erro ao processar IA:", err);
            }

            // OLD (Fallback):
            // await handleMessage({
            //     conversation_id: response.data.conversation_id,
            //     content: publicUrl || text, 
            //     sender: 'contact',
            //     type: isImage ? 'image' : (isDocument ? 'document' : 'text')
            // }, sock)
        }
    } catch (err) {
        console.error('Erro ao processar mensagem recebida:', err.message)
    }
  })
}

// Endpoints
app.get('/qr', async (req, res) => {
  if (connectionStatus === 'connected') {
    return res.status(400).json({ error: 'Already connected' })
  }
  if (!qrCodeData) {
    res.set('Retry-After', '2')
    return res.status(503).json({ error: 'QR Code not ready yet, retrying...' })
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
    if (sock) await sock.logout()
    fs.rmSync('./auth_info_baileys', { recursive: true, force: true })
    connectionStatus = 'disconnected'
    qrCodeData = ''
    connectToWhatsApp()
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout' })
  }
})

app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' })
  }

  if (!isConnected || !sock) {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }

  try {
    // Tenta formatar o JID se vier apenas número
    let jid = phone
    if (!jid.includes('@s.whatsapp.net') && !jid.includes('@lid')) {
        jid = formatJid(phone)
    }

    console.log(`[API] Enviando mensagem para ${jid}: ${message}`)
    const sentMsg = await sock.sendMessage(jid, { text: message })
    
    res.json({ success: true, messageId: sentMsg.key.id })
  } catch (err) {
    console.error('Erro ao enviar mensagem via API:', err)
    res.status(500).json({ error: 'Failed to send message', details: err.message })
  }
})

// Processamento de mensagens pendentes (Listener/Polling)
const processOutgoingMessage = async (message) => {
  if (message.status === 'delivered' || message.status === 'failed') return

  if (!sock || !isConnected) return

  try {
    // Buscar o telefone do contato associado à conversa
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('contact_phone, contact_jid')
      .eq('id', message.conversation_id)
      .single()

    if (error || !conversation) {
      console.error('Conversa não encontrada para ID:', message.conversation_id)
      await supabase.from('messages').update({ status: 'failed' }).eq('id', message.id)
      return
    }

    let jid = conversation.contact_jid
    if (!jid) {
        if (conversation.contact_phone && conversation.contact_phone.includes('@')) {
            jid = conversation.contact_phone
        } else {
            jid = formatJid(conversation.contact_phone)
        }
    }
    
    console.log(`[Listener] Enviando mensagem para ${jid}: ${message.content}`)

    await sock.sendMessage(jid, { text: message.content })

    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('id', message.id)

  } catch (err) {
    console.error('Erro ao processar envio de mensagem (Listener):', err)
  }
}

let messageChannel = null
const setupSupabaseListener = () => {
  if (messageChannel) {
    supabase.removeChannel(messageChannel)
  }

  console.log('Iniciando listener do Supabase...')
  messageChannel = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: "sender=eq.agent" }, async (payload) => {
      console.log('Nova mensagem do sistema detectada (Realtime):', payload.new)
      await processOutgoingMessage(payload.new)
    })
    .subscribe()
}

const startPolling = () => {
    setInterval(async () => {
        if (!isConnected) return
        
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('sender', 'agent')
            .eq('status', 'sent')
            .limit(10)
            
        if (messages && messages.length > 0) {
            console.log(`[Polling] Encontradas ${messages.length} mensagens pendentes.`)
            for (const msg of messages) {
                await processOutgoingMessage(msg)
            }
        }
    }, 10000)
}

server.listen(PORT, () => {
  console.log(`Servidor WhatsApp rodando na porta ${PORT}`)
  connectToWhatsApp()
  setupSupabaseListener()
  startPolling()
  
  // Agendar limpeza diária (executa uma vez na inicialização e depois a cada 24h)
  cleanupStorage()
  setInterval(cleanupStorage, 24 * 60 * 60 * 1000)
})
