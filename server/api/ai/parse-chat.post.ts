import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { conversationId, messages } = body

  if (!conversationId && !messages) {
    return { error: 'Conversation ID or messages required' }
  }

  // If messages are not provided, fetch them from DB (optional, but easier if passed from frontend)
  // Assuming frontend passes messages array for simplicity and context window management
  
  const conversationText = messages.map((m: any) => `${m.sender === 'me' ? 'Atendente' : 'Paciente'}: ${m.content}`).join('\n')

  const prompt = `
  Você é um assistente de agendamento de transporte médico. Analise a conversa abaixo e extraia as informações para preencher o formulário de cadastro.
  Retorne APENAS um objeto JSON com as seguintes chaves (se a informação não estiver clara, deixe como null ou string vazia):

  {
    "patient_name": "Nome completo do paciente",
    "patient_phone": "Telefone do paciente (formato (XX) XXXXX-XXXX)",
    "procedure_date": "Data do procedimento (YYYY-MM-DD)",
    "procedure_time": "Horário do procedimento (HH:MM)",
    "procedure_type": "Tipo ('Exame' ou 'Consulta')",
    "procedure_name": "Nome do procedimento ou especialidade",
    "location": "Local/Clínica/Hospital do procedimento",
    "city": "Cidade do procedimento",
    "boarding_neighborhood": "Bairro de embarque",
    "boarding_point": "Ponto de referência ou endereço de embarque",
    "needs_companion": true/false (se precisa de acompanhante),
    "companion_reason": "Motivo ('Idoso', 'Declaração médica', 'Criança', 'Cadeirante', 'Paciente para cirurgia')"
  }

  Histórico da Conversa:
  ${conversationText}
  `

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transport-app.com', // Optional
        'X-Title': 'Transport App' // Optional
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { role: 'system', content: 'Você é um assistente útil que extrai dados de conversas para JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    })

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content
      // Tentar extrair o JSON do texto (caso venha com markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(content)
    }

    return { error: 'Failed to parse AI response', raw: data }
  } catch (error: any) {
    console.error('Error calling OpenRouter:', error)
    return { error: error.message }
  }
})
