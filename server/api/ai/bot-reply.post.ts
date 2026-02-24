import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

// Configurar cliente Supabase (Server-side)
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { conversationId, lastMessageContent, senderPhone } = body

  if (!conversationId) {
    return { error: 'Conversation ID required' }
  }

  try {
    // 1. Buscar histórico recente da conversa
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (msgError) throw msgError

    // 1.5 Buscar configurações do sistema
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('key, value')
    
    let serviceHours = { start: '08:00', end: '18:00', active: true }
    let botNotices = ''
    let welcomeMessage = ''
    let aiPersona = 'Assistente prestativo e profissional'
    let aiCreativity = 0.7
    let aiSupervisionLevel = 'medium'
    let aiInstructions = 'Seja conciso e foque em agendar o transporte.'
    
    if (settingsData) {
      settingsData.forEach(s => {
        if (s.key === 'service_hours') serviceHours = s.value
        if (s.key === 'bot_notices') botNotices = s.value
        if (s.key === 'welcome_message') welcomeMessage = s.value
        if (s.key === 'ai_persona') aiPersona = s.value
        if (s.key === 'ai_creativity') aiCreativity = s.value
        if (s.key === 'ai_supervision_level') aiSupervisionLevel = s.value
        if (s.key === 'ai_instructions') aiInstructions = s.value
      })
    }

    // Obter data e hora atual (Brasília - UTC-3)
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { 
        timeZone: 'America/Sao_Paulo', 
        hour: '2-digit', 
        minute: '2-digit',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    const currentDateStr = now.toLocaleDateString('pt-BR', options)

    // Ordenar cronologicamente para o prompt
    const history = messages?.reverse().map(m => 
      `${m.sender === 'agent' ? 'Atendente (Você)' : 'Paciente'}: ${m.content}`
    ).join('\n') || ''

    // 2. Construir Prompt
    const systemPrompt = `
    Você é ${aiPersona}.
    
    === CONFIGURAÇÕES OBRIGATÓRIAS ===
    ${welcomeMessage ? `
    1. SAUDAÇÃO INICIAL:
    - Ao iniciar a conversa, você DEVE usar EXATAMENTE esta frase (ou muito próxima): "${welcomeMessage}"
    - Se o usuário apenas disser "oi", "olá", ou similar, responda com essa frase.
    ` : ''}

    2. CONTEXTO TEMPORAL:
    - Data/Hora Atual: ${currentDateStr} às ${currentTimeStr}
    
    ${botNotices ? `
    3. AVISOS IMPORTANTES:
    - Considere estes avisos em TODAS as respostas: ${botNotices}
    ` : ''}
    
    ${serviceHours.active ? `
    4. REGRA DE HORÁRIO DE ATENDIMENTO (CRÍTICO):
    - Horário de funcionamento: Das ${serviceHours.start} às ${serviceHours.end}.
    - Hora atual: ${currentTimeStr}.
    - LÓGICA DE BLOQUEIO:
      - Compare a hora atual (${currentTimeStr}) com o horário de funcionamento.
      - SE ESTIVER FORA DO HORÁRIO (antes das ${serviceHours.start} ou depois das ${serviceHours.end}):
        - Você DEVE INICIAR sua resposta avisando CLARAMENTE que o atendimento humano está encerrado.
        - Exemplo: "Olá! Nosso atendimento humano funciona das ${serviceHours.start} às ${serviceHours.end}. No momento estamos fechados, mas posso adiantar seu cadastro."
        - NUNCA aja como se o atendimento estivesse normal sem dar esse aviso.
    ` : ''}

    === INSTRUÇÕES GERAIS ===
    ${aiInstructions}

    === NÍVEL DE SUPERVISÃO (${aiSupervisionLevel}) ===
    ${aiSupervisionLevel === 'low' ? '- Seja proativo e tome decisões autônomas para agilizar o atendimento.' : ''}
    ${aiSupervisionLevel === 'medium' ? '- Siga o fluxo padrão, mas adapte-se ao contexto do usuário. Peça confirmação apenas se houver ambiguidade.' : ''}
    ${aiSupervisionLevel === 'high' ? '- Siga estritamente o roteiro. Peça confirmação para cada dado importante. Não assuma informações não ditas explicitamente.' : ''}

    === OBJETIVO ===
    Seu objetivo é coletar TODOS os dados para o cadastro de transporte.
    Dados necessários:
    - patient_name: Nome completo
    - patient_phone: Telefone (confirmar se é o atual: ${senderPhone})
    - procedure_date: Data do procedimento (YYYY-MM-DD)
    - procedure_time: Horário do procedimento (HH:MM)
    - procedure_type: Tipo ('Exame' ou 'Consulta')
    - procedure_name: Nome do procedimento/especialidade
    - location: Local do procedimento (Clínica/Hospital)
    - city: Cidade do procedimento
    - boarding_neighborhood: Bairro de embarque
    - boarding_point: Ponto de referência ou endereço de embarque
    - needs_companion: boolean (se precisa de acompanhante)
    - companion_reason: Motivo ('Idoso', 'Declaração médica', 'Criança', 'Cadeirante', 'Paciente para cirurgia')

    === INSTRUÇÕES DE RESPOSTA ===
    - Fale em português natural e empático.
    - Se faltar dados, pergunte um por vez ou em pequenos grupos.
    - Se o paciente enviou uma imagem/comprovante, agradeça.
    - Se já tiver todos os dados, confirme com o paciente.
    
    IMPORTANTE: Retorne sua resposta no seguinte formato EXATO:
    RESPOSTA: [Sua mensagem de resposta para o paciente aqui]
    JSON_DATA: { "patient_name": "...", "patient_phone": "...", ... } (Preencha apenas o que conseguir extrair, use null se não tiver)
    `

    const prompt = `
    Histórico da conversa:
    ${history}

    Nova mensagem do Paciente: "${lastMessageContent}"

    Responda como o Atendente seguindo o formato solicitado.
    `

    // 3. Chamar OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transport-app.com',
        'X-Title': 'Transport App'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: aiCreativity
      })
    })

    const aiData = await openRouterResponse.json()
    const aiContent = aiData.choices?.[0]?.message?.content || ''

    // 4. Parsear resposta
    const replyMatch = aiContent.match(/RESPOSTA:\s*([\s\S]*?)(?=JSON_DATA:|$)/i)
    const jsonMatch = aiContent.match(/JSON_DATA:\s*(\{[\s\S]*\})/i)

    let replyText = replyMatch ? replyMatch[1].trim() : aiContent
    // Fallback se o modelo não seguir o formato e mandar só texto
    if (!replyMatch && !jsonMatch) {
        replyText = aiContent
    } else if (!replyText && jsonMatch) {
        // Se mandou só JSON (raro com este prompt), gerar msg genérica
        replyText = "Recebi seus dados, obrigado."
    }

    // Remover JSON residual se vazou no replyText
    replyText = replyText.replace(/JSON_DATA:[\s\S]*/i, '').trim()

    // Helper para normalizar data (DD/MM ou DD/MM/AAAA -> YYYY-MM-DD)
    const normalizeDate = (dateStr: string): string | null => {
        if (!dateStr) return null
        
        // Se já for YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

        // Tentar extrair DD, MM, AAAA
        const match = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})([\/\-\.]\d{2,4})?$/)
        if (!match) return dateStr // Retorna original se não entender

        let day = match[1].padStart(2, '0')
        let month = match[2].padStart(2, '0')
        let year = match[3] ? match[3].replace(/[\/\-\.]/, '') : null

        // Se ano vier com 2 dígitos
        if (year && year.length === 2) year = '20' + year

        if (!year) {
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth() + 1
            
            // Se a data for muito no passado (ex: usuário diz 01/01 e estamos em 20/02),
            // assumimos que é para o PRÓXIMO ano? 
            // Para agendamento de transporte, geralmente é futuro próximo.
            // Mas se for 20/02 e usuário diz 23/02, é este ano.
            // Se for 20/12 e usuário diz 02/01, é próximo ano.
            
            year = String(currentYear)
            
            // Lógica simples: se mês < mês atual, talvez seja ano que vem?
            // Mas transporte de saúde geralmente é curto prazo. Vamos manter ano atual por segurança
            // a menos que seja muito óbvio.
            if (parseInt(month) < currentMonth && (currentMonth - parseInt(month) > 6)) {
                 year = String(currentYear + 1)
            }
        }

        return `${year}-${month}-${day}`
    }

    // 5. Salvar resposta do Bot
    if (replyText) {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'agent',
          content: replyText,
          status: 'sent'
        })
      
      if (insertError) throw insertError
    }

    // 6. Processar dados extraídos (Auto-fill)
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1])
        
        // Normalizar data se existir
        if (jsonData.procedure_date) {
            // Tenta normalizar usando a função helper
            const normalized = normalizeDate(jsonData.procedure_date)
            // Se retornou algo válido (YYYY-MM-DD), usa. Se não, mantém o original (pode ser null ou inválido)
            if (normalized) jsonData.procedure_date = normalized
        }

        // Limpar campos nulos ou vazios para não apagar dados existentes
        Object.keys(jsonData).forEach(key => {
            if (jsonData[key] === null || jsonData[key] === '' || jsonData[key] === 'null') {
                delete jsonData[key]
            }
        })

        if (Object.keys(jsonData).length > 0) {
            // Verificar se já existe cadastro
            const { data: existingReg } = await supabase
                .from('registrations')
                .select('id')
                .eq('conversation_id', conversationId)
                .single()

            if (existingReg) {
                await supabase
                    .from('registrations')
                    .update(jsonData)
                    .eq('id', existingReg.id)
            } else {
                await supabase
                    .from('registrations')
                    .insert({
                        conversation_id: conversationId,
                        ...jsonData,
                        status: 'pending'
                    })
            }
        }
      } catch (e) {
        console.error('Erro ao processar JSON do bot:', e)
      }
    }

    return { success: true, reply: replyText }

  } catch (error: any) {
    console.error('Error in bot-reply:', error)
    return { error: error.message }
  }
})
