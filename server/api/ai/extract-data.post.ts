import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, context } = body

  if (!text) return { error: 'Text required' }

  try {
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('key, value')
    
    let aiSupervisionLevel = 'medium'
    
    if (settingsData) {
      settingsData.forEach(s => {
        if (s.key === 'ai_supervision_level') aiSupervisionLevel = s.value
      })
    }

    const systemPrompt = `
    Você é um assistente especialista em extração de dados de texto informal em português.
    Seu objetivo é identificar e formatar a informação solicitada no contexto.
    
    Contexto da extração: ${context || 'Dados gerais'}

    === NÍVEL DE SUPERVISÃO (${aiSupervisionLevel}) ===
    ${aiSupervisionLevel === 'high' ? '- Seja estrito. Se a informação não estiver clara, retorne null.' : ''}
    ${aiSupervisionLevel === 'low' ? '- Tente inferir a informação mesmo com erros de digitação ou ambiguidades.' : ''}
    
    Regras de Formatação:
    - Data: Formato YYYY-MM-DD (ex: "amanhã" -> calcular data, "25/12" -> "2023-12-25")
    - Hora: Formato HH:MM
    - Opção: Se o contexto for uma escolha, retorne a opção normalizada.
    
    Retorne APENAS um objeto JSON. Nada mais.
    Formato: { "value": "valor_extraido", "confidence": 0.9 }
    Se não encontrar, retorne { "value": null }
    `

    const userPrompt = `Texto do usuário: "${text}"`

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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', // Usando a mesma chave do projeto
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transport-app.com',
        'X-Title': 'Transport App Extraction'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free', // Modelo rápido e gratuito
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1 // Baixa temperatura para precisão
      })
    })

    const aiData = await openRouterResponse.json()
    const content = aiData.choices?.[0]?.message?.content || '{}'
    
    // Tentar limpar markdown se houver (```json ... ```)
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
    
    try {
        const result = JSON.parse(jsonStr)
        return result
    } catch (e) {
        console.error('Erro ao parsear JSON da IA:', content)
        return { value: null, error: 'Parse error' }
    }

  } catch (error: any) {
    console.error('Error in extract-data:', error)
    return { error: error.message }
  }
})
