import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text } = body

  if (!text) return { error: 'Text required' }

  try {
    // 1. Buscar configurações do sistema
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('key, value')
    
    let aiPersona = 'Assistente prestativo e profissional'
    let aiSupervisionLevel = 'medium'
    let aiCreativity = 0.1 // Default baixo para análise
    
    if (settingsData) {
      settingsData.forEach(s => {
        if (s.key === 'ai_persona') aiPersona = s.value
        if (s.key === 'ai_supervision_level') aiSupervisionLevel = s.value
        // Para análise de intenção, preferimos temperatura baixa, mas podemos ajustar levemente
        if (s.key === 'ai_creativity') aiCreativity = Math.min(parseFloat(s.value) * 0.5, 0.4) 
      })
    }

    const systemPrompt = `
    Você é ${aiPersona}.
    O usuário já completou um agendamento. Analise a mensagem dele para entender o que ele deseja.

    === NÍVEL DE SUPERVISÃO (${aiSupervisionLevel}) ===
    ${aiSupervisionLevel === 'high' ? '- Seja conservador. Se a intenção não for óbvia, marque como "unknown".' : ''}
    ${aiSupervisionLevel === 'low' ? '- Tente inferir a intenção mesmo com informações parciais.' : ''}

    Intenções possíveis:
    - change_info: O usuário quer alterar uma informação do agendamento (ex: mudar horário, data, local, etc).
    - greeting: O usuário está cumprimentando, agradecendo ou encerrando a conversa (ex: "Obrigado", "Boa noite", "Valeu").
    - restart: O usuário quer explicitamente começar um novo agendamento (ex: "Quero agendar outro", "#reiniciar").
    - unknown: Não ficou claro o que o usuário quer.

    Se for 'change_info', identifique qual campo deve ser alterado e o novo valor.
    Campos: procedure_time (hora), procedure_date (data), location (local), procedure_type (tipo), procedure_name (especialidade), patient_name (nome), patient_phone (telefone), boarding_neighborhood (bairro), boarding_point (ponto), companion_reason (acompanhante).

    Regras de formatação de valor:
    - Horário: HH:MM
    - Data: YYYY-MM-DD (se for relativo como "amanhã", calcule com base na data atual).
    
    Retorne APENAS um JSON no formato:
    {
      "intent": "change_info" | "greeting" | "restart" | "unknown",
      "field": "nome_do_campo_se_houver",
      "value": "novo_valor_se_houver",
      "reply": "Uma resposta curta e amigável sugerida para o usuário (em português, seguindo sua persona)"
    }
    `

    const userPrompt = `Mensagem do usuário: "${text}"`

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transport-app.com',
        'X-Title': 'Transport App Intent Analysis'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiCreativity
      })
    })

    const aiData = await openRouterResponse.json()
    const content = aiData.choices?.[0]?.message?.content || '{}'
    
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
    
    try {
        const result = JSON.parse(jsonStr)
        return result
    } catch (e) {
        console.error('Erro ao parsear JSON da IA:', content)
        return { intent: 'unknown', error: 'Parse error' }
    }

  } catch (error: any) {
    console.error('Error in analyze-intent:', error)
    return { error: error.message }
  }
})
