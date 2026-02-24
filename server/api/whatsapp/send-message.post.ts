
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { phone, message } = body

  if (!phone || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Phone and message are required'
    })
  }

  // URL do servidor WhatsApp Express (rodando localmente na porta 3001)
  const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001'

  try {
    const response = await $fetch(`${WHATSAPP_SERVER_URL}/send-message`, {
      method: 'POST',
      body: { phone, message }
    })
    
    return response
  } catch (error: any) {
    console.error('Erro ao comunicar com servidor WhatsApp:', error)
    
    // Retorna erro para que o frontend use o fallback (Supabase)
    throw createError({
      statusCode: 503,
      statusMessage: 'WhatsApp service unavailable',
      data: error.data
    })
  }
})
