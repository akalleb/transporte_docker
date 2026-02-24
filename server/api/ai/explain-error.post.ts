import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { input, context, errorType } = body

  if (!input || !context) return { error: 'Input and context required' }

  try {
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('key, value')
    
    let aiPersona = 'Assistente prestativo e profissional'
    let aiSupervisionLevel = 'medium'
    
    if (settingsData) {
      settingsData.forEach(s => {
        if (s.key === 'ai_persona') aiPersona = s.value
        if (s.key === 'ai_supervision_level') aiSupervisionLevel = s.value
      })
    }

    const systemPrompt = `
    Você é ${aiPersona}.
    O usuário forneceu uma resposta inválida ou não compreendida.
    Seu objetivo é explicar educadamente o erro e pedir a informação novamente, dando um exemplo claro.
    
    Contexto esperado: ${context}
    Erro específico: ${errorType || 'Formato inválido'}

    === NÍVEL DE SUPERVISÃO (${aiSupervisionLevel}) ===
    ${aiSupervisionLevel === 'high' ? '- Seja formal e direto. Não faça piadas.' : ''}
    ${aiSupervisionLevel === 'low' ? '- Seja mais descontraído se a persona permitir, mas ainda claro sobre o erro.' : ''}
    
    Regras:
    - Seja curto e direto (máximo 2 frases).
    - Use tom amigável e prestativo (conforme sua persona).
    - Dê um exemplo do formato correto.
    - Não invente dados, apenas oriente.
    `

    const userPrompt = `O usuário digitou: "${input}". Como devo responder para ajudá-lo a corrigir?`

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transport-app.com',
        'X-Title': 'Transport App Error Explanation'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    })

    const aiData = await openRouterResponse.json()
    const content = aiData.choices?.[0]?.message?.content || ''
    
    return { reply: content.trim() }

  } catch (error: any) {
    console.error('Error in explain-error:', error)
    return { error: error.message }
  }
})
