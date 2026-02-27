import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { registrationId, status } = body

  if (!registrationId || !status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Registration ID and Status are required'
    })
  }

  const client = await serverSupabaseClient(event)

  // 1. Buscar dados do agendamento
  const { data: registration, error: regError } = await client
    .from('registrations')
    .select('*, conversations(contact_phone, contact_jid)')
    .eq('id', registrationId)
    .single()

  if (regError || !registration) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Registration not found'
    })
  }

  if (!registration.conversation_id) {
    return { success: false, message: 'No conversation linked' }
  }

  // 2. Montar mensagem
  const dateParts = registration.procedure_date?.split('-')
  const dateStr = dateParts ? `${dateParts[2]}/${dateParts[1]}` : ''
  const timeStr = registration.procedure_time?.substring(0, 5) || ''
  const name = registration.patient_name?.split(' ')[0] || ''

  let messageText = ''

  if (status === 'approved') {
    messageText = `✅ *Agendamento Confirmado!*\n\nOlá ${name}, seu transporte para o dia *${dateStr}* às *${timeStr}* foi confirmado.\n\n📍 Esteja no ponto de embarque com antecedência.\nBom procedimento!`
  } else if (status === 'rejected') {
    messageText = `❌ *Atualização do Agendamento*\n\nOlá ${name}, infelizmente seu transporte para o dia *${dateStr}* não pôde ser agendado ou foi cancelado.\n\nPara mais informações, entre em contato conosco.`
  }

  if (!messageText) return { success: false, message: 'Invalid status' }

  // 3. Tentar enviar via API direta (WhatsApp Server) com Retry
  let sentDirectly = false
  const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001'
  const MAX_RETRIES = 3

  try {
    const contactPhone = registration.conversations?.contact_phone
    let contactJid = registration.conversations?.contact_jid

    // Assegura que o JID tenha um servidor de provedor de mensageria válido WhatsApp
    if (contactPhone && !contactJid) {
      const digits = contactPhone.replace(/[^0-9]/g, '')
      contactJid = `${digits}@s.whatsapp.net`
    } else if (contactJid && !contactJid.includes('@s.whatsapp.net') && !contactJid.includes('@g.us') && !contactJid.includes('@lid')) {
      const digits = contactJid.replace(/[^0-9]/g, '')
      contactJid = `${digits}@s.whatsapp.net`
    }

    const targetPhone = contactJid || contactPhone

    if (targetPhone) {
      console.log(`[Notification] Tentando enviar mensagem para ${targetPhone} via ${WHATSAPP_SERVER_URL}...`)

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const response = await fetch(`${WHATSAPP_SERVER_URL}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: targetPhone,
              message: messageText,
              conversationId: registration.conversation_id
            }),
            signal: AbortSignal.timeout(5000) // Timeout de 5s por tentativa
          })

          if (response.ok) {
            sentDirectly = true
            console.log('[Notification] Mensagem enviada via API direta com sucesso.')
            break // Sucesso, sai do loop
          } else {
            console.warn(`[Notification] Falha ao enviar via API direta (Tentativa ${i + 1}/${MAX_RETRIES}): ${response.status} ${response.statusText}`)
          }
        } catch (fetchErr) {
          console.warn(`[Notification] Erro de conexão (Tentativa ${i + 1}/${MAX_RETRIES}):`, (fetchErr as Error).message)
          // Se não for a última tentativa, espera um pouco (backoff simples)
          if (i < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        }
      }
    }
  } catch (e) {
    console.warn('[Notification] Erro fatal ao conectar com WhatsApp Server:', e)
  }

  // 4. Salvar no histórico (Supabase)
  // Se enviou direto, salva como 'delivered' (para não duplicar envio).
  // Se falhou, salva como 'sent' (para o Polling tentar depois).
  const { error: msgError } = await client
    .from('messages')
    .insert({
      conversation_id: registration.conversation_id,
      sender: 'agent',
      content: messageText,
      type: 'text',
      status: sentDirectly ? 'delivered' : 'sent'
    })

  if (msgError) {
    console.error('Erro ao salvar mensagem no histórico:', msgError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save message history'
    })
  }

  return {
    success: true,
    method: sentDirectly ? 'direct_api' : 'database_queue'
  }
})
