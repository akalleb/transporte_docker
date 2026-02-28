import { createClient } from '@supabase/supabase-js'
import { cleanPhone, formatJid } from '../utils/phoneUtils.js'
import flowSteps from './flowSteps.js'
import { processStep } from './stepProcessor.js'
import { analyzeIntent } from './aiFallbackService.js'

// Inicializar cliente Supabase (usando variáveis de ambiente do server.js)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

const supabase = createClient(
    process.env.SUPABASE_URL,
    supabaseKey,
    SUPABASE_SERVICE_ROLE_KEY ? { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } : {}
)

// Helper: Buscar configurações do sistema
async function getSystemSettings() {
    const { data } = await supabase.from('system_settings').select('key, value')
    const settings = {
        service_hours: { start: '08:00', end: '18:00', active: true },
        welcome_message: '',
        bot_notices: '',
        ai_supervision_level: 'medium', // Default: medium
        ai_persona: 'Assistente prestativo'
    }
    if (data) {
        data.forEach(item => {
            if (item.key === 'service_hours') settings.service_hours = item.value
            if (item.key === 'welcome_message') settings.welcome_message = item.value
            if (item.key === 'bot_notices') settings.bot_notices = item.value
            if (item.key === 'ai_supervision_level') settings.ai_supervision_level = item.value
            if (item.key === 'ai_persona') settings.ai_persona = item.value
        })
    }
    return settings
}

// Helper: Verificar horário de atendimento
function checkServiceHours(serviceHours) {
    if (!serviceHours || !serviceHours.active) return { isOpen: true }

    // Obter hora atual em SP (UTC-3)
    const now = new Date()
    const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    const currentHour = spTime.getHours()
    const currentMinute = spTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const [startH, startM] = serviceHours.start.split(':').map(Number)
    const [endH, endM] = serviceHours.end.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM

    const isOpen = currentTime >= startTime && currentTime < endTime
    return { isOpen, start: serviceHours.start, end: serviceHours.end }
}

// Função principal para processar mensagens recebidas
export async function handleMessage(message, sock) {
    const { conversation_id, content, sender, type } = message

    // Ignorar mensagens enviadas pelo próprio sistema/agent
    if (sender !== 'contact') return

    let contactPhone = null

    try {
        // 1. Buscar estado atual da conversa
        const { data: conversation, error } = await supabase
            .from('conversations')
            .select('id, flow_step, flow_data, is_bot_active, contact_phone')
            .eq('id', conversation_id)
            .single()

        if (error || !conversation) {
            console.error('Conversa não encontrada:', error)
            return
        }

        contactPhone = conversation.contact_phone

        // Se bot inativo, ignorar
        if (!conversation.is_bot_active) return

        // Auto-restart or Intelligent Handling if completed
        if (conversation.flow_step === 'completed' && content.toLowerCase() !== '#reiniciar') {

            // Verificar horário antes de qualquer interação IA
            const settings = await getSystemSettings()
            const { isOpen, start, end } = checkServiceHours(settings.service_hours)

            if (!isOpen) {
                let closedMessage = `⚠️ *Atendimento Encerrado*\n\nNosso horário de funcionamento é das *${start}* às *${end}*.\nPor favor, retorne contato dentro do horário comercial.`
                await sendMessage(conversation.contact_phone, closedMessage, sock)
                return
            }

            console.log('Mensagem em fluxo completado:', content)

            // Analisar intenção com IA para evitar restart desnecessário
            const analysis = await analyzeIntent(content)
            const { intent, field, value, reply } = analysis || {}

            console.log('Intenção detectada:', intent, field, value)

            if (intent === 'change_info' && field && value) {
                // Mapeamento de campos para nomes amigáveis
                const friendlyFields = {
                    procedure_time: 'o horário',
                    procedure_date: 'a data',
                    location: 'o local',
                    procedure_type: 'o tipo',
                    procedure_name: 'o nome do procedimento',
                    patient_name: 'o nome do paciente',
                    patient_phone: 'o telefone',
                    boarding_neighborhood: 'o bairro',
                    boarding_point: 'o ponto de embarque',
                    companion_reason: 'o motivo do acompanhante',
                    needs_companion: 'a necessidade de acompanhante'
                }

                const friendlyName = friendlyFields[field] || field

                // Atualizar registration
                const { data: reg, error } = await supabase
                    .from('registrations')
                    .update({ [field]: value })
                    .eq('conversation_id', conversation_id)
                    .select()

                if (!error) {
                    await sendMessage(conversation.contact_phone, `✅ Atualizei ${friendlyName} para "${value}".\n\nAlgo mais? Se quiser fazer um novo agendamento, digite *#reiniciar*.`, sock)
                    return
                } else {
                    console.error('Erro ao atualizar registration:', error)
                    await sendMessage(conversation.contact_phone, "Não consegui atualizar seu agendamento. Por favor, digite *#reiniciar* para fazer um novo.", sock)
                    return
                }
            }

            if (intent === 'greeting') {
                await sendMessage(conversation.contact_phone, reply || "Olá! 👋 Se precisar alterar algo no seu agendamento, é só pedir (ex: \"Mude o horário para 14h\").\nPara um novo agendamento, digite *#reiniciar*.", sock, conversation_id)
                return
            }

            if (intent !== 'restart') {
                // Unknown ou sem dados suficientes

                // Lógica baseada no nível de supervisão
                if (settings.ai_supervision_level !== 'high' && reply) {
                    // Se supervisão for média/baixa, usa a resposta da IA (Persona)
                    await sendMessage(conversation.contact_phone, reply, sock, conversation_id)
                } else {
                    // Se supervisão alta ou sem resposta IA, usa fallback seguro
                    await sendMessage(conversation.contact_phone, "Recebi sua mensagem. Se quiser alterar dados do agendamento, tente ser específico (ex: \"Mudar data para amanhã\").\nPara iniciar um novo agendamento, digite *#reiniciar*.", sock, conversation_id)
                }
                return
            }

            // Se a intenção for explicitamente 'restart', continua para o bloco abaixo
            console.log('Reiniciando fluxo completado (intencional).')
            await updateConversationState(conversation_id, 'start', {})
            await advanceStep(conversation_id, 'start', {}, sock, conversation.contact_phone)
            return
        }

        // Se não tem passo definido, começa do início
        let currentStep = conversation.flow_step
        let currentData = conversation.flow_data || {}

        // Lógica para NOVA conversa (primeira interação)
        if (!currentStep) {
            console.log('Iniciando novo fluxo para', conversation.contact_phone)

            const initialStep = 'start'
            const startConfig = flowSteps[initialStep]

            // 1. Enviar mensagem de saudação/pergunta inicial
            if (startConfig && startConfig.message) {
                const settings = await getSystemSettings()
                const { isOpen, start, end } = checkServiceHours(settings.service_hours)

                // Se estiver fechado, envia aviso e PARA o fluxo (não define estado inicial)
                if (!isOpen) {
                    let closedMessage = `⚠️ *Atendimento Encerrado*\n\nNosso horário de funcionamento é das *${start}* às *${end}*.\nPor favor, retorne contato dentro do horário comercial para realizar seu agendamento.`

                    // Se houver mensagem de boas vindas configurada, usa ela como base?
                    // O usuário pediu "mudar completamente a pergunta".
                    // Vamos usar apenas o aviso de fechado para garantir "não atendimento".

                    await sendMessage(conversation.contact_phone, closedMessage, sock)
                    return // INTERROMPE O FLUXO AQUI
                }

                let finalMessage = startConfig.message

                // Substituir saudação padrão se houver customizada
                if (settings.welcome_message && settings.welcome_message.trim() !== '') {
                    // Preserva a instrução de ação (última parte da mensagem original)
                    const actionInstruction = "\n\nPara começar, digite seu *nome completo*:"
                    finalMessage = `${settings.welcome_message}${actionInstruction}`
                }

                // Injetar Avisos (Contexto)
                if (settings.bot_notices && settings.bot_notices.trim() !== '') {
                    finalMessage = `⚠️ *Avisos Importantes:*\n${settings.bot_notices}\n\n${finalMessage}`
                }

                await sendMessage(conversation.contact_phone, finalMessage, sock, conversation_id)
            }

            // 2. Definir estado para esperar a resposta na próxima interação
            await updateConversationState(conversation_id, initialStep, {})

            // 3. NÃO processar a mensagem atual (ex: "Oi", "Boa noite") como dado
            return
        }

        // PROTEÇÃO: Se estiver no passo 'start' (pedindo nome) e receber uma saudação,
        // assume que o usuário está iniciando/reiniciando e não dando o nome.
        if (currentStep === 'start') {
            const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello', 'iniciar', 'começar']
            // Melhoria na detecção: evitar falso positivo com nomes (ex: "Eloi" contem "oi")
            const isGreeting = greetings.some(g => {
                const normalized = content.toLowerCase().trim()
                return normalized === g || normalized.startsWith(g + ' ')
            })

            if (isGreeting) {
                console.log('Saudação detectada no passo start. Reiniciando pergunta de nome.')

                // 4A: Pular coleta de dados já conhecidos
                // Se já tiver registro anterior, usar nome e telefone e pular para procedure_type
                const { data: lastReg } = await supabase
                    .from('registrations')
                    .select('patient_name, patient_phone')
                    .eq('conversation_id', conversation_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (lastReg && lastReg.patient_name) {
                    console.log('Registro anterior encontrado. Pulando etapa de nome.')
                    const nextData = {
                        patient_name: lastReg.patient_name,
                        patient_phone: lastReg.patient_phone || conversation.contact_phone
                    }

                    // Pular direto para procedure_type
                    const nextStep = 'procedure_type'
                    const reply = `Olá ${lastReg.patient_name}! Vamos fazer um novo agendamento.\n\nO transporte é para qual finalidade?\n1️⃣ Consulta\n2️⃣ Exame`

                    await updateConversationState(conversation_id, nextStep, nextData)
                    await sendMessage(conversation.contact_phone, reply, sock, conversation_id)
                    return
                }

                // Reutilizar lógica centralizada de envio de mensagem inicial
                await advanceStep(conversation_id, 'start', {}, sock, conversation.contact_phone)
                return
            }
        }

        // Comando para reiniciar fluxo
        if (content.toLowerCase() === '#reiniciar' || content.toLowerCase() === 'reiniciar') {
            currentStep = 'start'
            currentData = {}
            await updateConversationState(conversation_id, 'start', {})
            // Se reiniciar, já manda a mensagem de boas vindas e avança para o próximo passo (patient_name)
            await advanceStep(conversation_id, 'start', {}, sock, conversation.contact_phone)
            return
        }

        // Processar resposta atual
        const result = await processStep(currentStep, content, conversation, sock)

        // Se houve erro de validação (result.error), não avança e repete mensagem de erro
        if (result.error) {
            await sendMessage(conversation.contact_phone, result.error, sock, conversation_id)
            return
        }

        // Atualizar dados coletados
        if (result.dataToSave) {
            Object.assign(currentData, result.dataToSave)
            // Persistir dados parciais
            await updateConversationState(conversation_id, currentStep, currentData)
            // Também atualizar tabela registrations se necessário
            await updateRegistration(conversation_id, currentData, conversation.organization_id)
        }

        // Determinar próximo passo
        let nextStep = result.nextStep
        const currentConfig = flowSteps[currentStep]

        if (!nextStep && currentConfig && currentConfig.next) {
            let potentialNext = currentConfig.next

            // Se next for objeto (ramificação condicional)
            if (typeof potentialNext === 'object' && potentialNext !== null) {
                const mappedValue = result.mappedValue || currentData[currentConfig.saveField]
                // Procura chave exata (Ex: "Sim") ou default
                nextStep = potentialNext[mappedValue] || potentialNext['default']
            } else {
                nextStep = potentialNext
            }
        }

        // Avançar fluxo
        if (nextStep) {
            const nextConfig = flowSteps[nextStep]
            let messageToSend = nextConfig?.message

            // Tratamento para opções dinâmicas
            if (nextConfig && nextConfig.type === 'dynamic_option') {
                const { optionsMap, formattedText } = await getDynamicOptions(nextConfig.source, currentData)
                if (optionsMap && Object.keys(optionsMap).length > 0) {
                    currentData._temp_options = optionsMap
                    messageToSend += `\n\n${formattedText}`
                } else {
                    // Fallback se não houver opções (ex: nenhum ponto cadastrado)
                    // Poderíamos pular o passo ou pedir para digitar manual
                    // Por enquanto, vamos pedir manual removendo _temp_options
                    delete currentData._temp_options
                    messageToSend += "\n(Digite o nome manualmente)"
                }
            } else {
                // Limpar opções temporárias se não for passo dinâmico
                if (currentData._temp_options) delete currentData._temp_options
            }

            await updateConversationState(conversation_id, nextStep, currentData)

            if (messageToSend) {
                await sendMessage(conversation.contact_phone, messageToSend, sock, conversation_id)

                // Se o próximo passo também for info/action, processar em cadeia (opcional, mas cuidado com loop)
                if (nextConfig.type === 'info' && nextConfig.action === 'complete_registration') {
                    await updateRegistration(conversation_id, { status: 'pending' }, conversation.organization_id)

                    // Se tiver next (ex: completed), avança
                    if (nextConfig.next) {
                        await updateConversationState(conversation_id, nextConfig.next, currentData)
                    } else {
                        await updateConversationState(conversation_id, 'completed', currentData)
                    }
                }
            } else if (nextConfig && nextConfig.type === 'info' && nextConfig.next) {
                // Se não tem mensagem mas é info com next (passo intermediário silencioso? ou loop?)
                // Evitar loop infinito
            }
        } else {
            // Fim do fluxo
            await updateConversationState(conversation_id, 'completed', currentData)

            // Validação final e INSERT explícito
            const saveResult = await saveFinalRegistration(conversation_id, currentData, conversation.organization_id)

            if (saveResult.error) {
                console.error('[ERRO CRÍTICO] Falha ao salvar agendamento:', saveResult.error)
                await sendMessage(conversation.contact_phone, "❌ Ocorreu um erro técnico ao salvar seu agendamento. Nossa equipe foi notificada.", sock, conversation_id)
                return
            }

            console.log('[AGENDA] Agendamento salvo com sucesso! ID:', saveResult.data?.id)

            const completeConfig = flowSteps['completed']
            if (completeConfig && completeConfig.message) {
                await sendMessage(conversation.contact_phone, completeConfig.message, sock, conversation_id)
            }
        }

    } catch (err) {
        console.error('Erro no fluxo do bot:', err)
        if (contactPhone && sock) {
            try {
                await sendMessage(contactPhone, "Desculpe, ocorreu um erro técnico no meu processamento. Por favor, tente novamente em instantes ou digite *#reiniciar*.", sock, conversation_id)
            } catch (e) {
                console.error('Erro ao enviar mensagem de fallback:', e)
            }
        }
    }
}

// Helper: Atualizar estado no banco
async function updateConversationState(id, step, data) {
    const { error } = await supabase
        .from('conversations')
        .update({
            flow_step: step,
            flow_data: data,
            last_message_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) console.error('Erro ao atualizar estado da conversa:', error)
}

// Helper: Salvar registro final com validação
async function saveFinalRegistration(conversationId, flowData, organizationId) {
    // 1. Campos permitidos (Allow-list)
    const allowedFields = [
        'patient_name', 'patient_phone', 'procedure_type', 'procedure_name',
        'procedure_date', 'procedure_time', 'location', 'city',
        'boarding_neighborhood', 'boarding_point', 'needs_companion',
        'companion_reason', 'attachment_url'
    ]

    // 2. Filtrar dados
    const dataToSave = {}
    allowedFields.forEach(field => {
        if (flowData[field] !== undefined) {
            dataToSave[field] = flowData[field]
        }
    })

    // 3. Validação de campos obrigatórios
    const requiredFields = [
        'patient_name', 'patient_phone', 'procedure_type',
        'procedure_date', 'location'
    ]

    const missing = requiredFields.filter(f => !dataToSave[f])
    if (missing.length > 0) {
        return { error: `Campos obrigatórios faltando: ${missing.join(', ')}` }
    }

    // 4. Inserir novo registro (sempre cria um novo para manter histórico)
    const { data, error } = await supabase
        .from('registrations')
        .insert({
            organization_id: organizationId,
            conversation_id: conversationId,
            ...dataToSave,
            status: 'pending'
        })
        .select()
        .single()

    return { data, error }
}

// Helper: Atualizar/Criar Registration (Parcial durante o fluxo)
async function updateRegistration(conversationId, data, organizationId) {
    // Filtrar campos para evitar erro com propriedades extras (ex: _temp_options)
    const allowedFields = [
        'patient_name', 'patient_phone', 'procedure_type', 'procedure_name',
        'procedure_date', 'procedure_time', 'location', 'city',
        'boarding_neighborhood', 'boarding_point', 'needs_companion',
        'companion_reason', 'attachment_url', 'status'
    ]

    const cleanData = {}
    Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) cleanData[key] = data[key]
    })

    if (Object.keys(cleanData).length === 0) return

    // Verificar se já existe um rascunho (status != completed/cancelled)
    const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .maybeSingle()

    if (existing) {
        const { error } = await supabase
            .from('registrations')
            .update(cleanData)
            .eq('id', existing.id)

        if (error) console.error('Erro ao atualizar registration parcial:', error)
    } else {
        const { error } = await supabase
            .from('registrations')
            .insert({
                organization_id: organizationId,
                conversation_id: conversationId,
                ...cleanData,
                status: 'draft'
            })

        if (error) console.error('Erro ao criar registration parcial:', error)
    }
}

// Helper: Enviar mensagem via WhatsApp (usando sock)
async function sendMessage(phone, text, sock, conversationId = null) {
    if (!sock || !text) return

    // Limpar telefone usando a função importada
    const phoneCleaned = cleanPhone(phone)
    let jid = formatJid(phone)

    // Tentar recuperar JID correto da conversa (suporte a LID)
    if (conversationId) {
        const { data: conv } = await supabase
            .from('conversations')
            .select('contact_jid, contact_phone')
            .eq('id', conversationId)
            .single()

        if (conv) {
            if (conv.contact_jid) {
                jid = conv.contact_jid
            } else if (conv.contact_phone && conv.contact_phone.includes('@')) {
                // Fallback: se o telefone salvo já for um JID (ex: user@lid)
                jid = conv.contact_phone
            }
        }
    }

    try {
        console.log(`[Bot] Enviando mensagem para ${jid}: ${text.substring(0, 50)}...`)

        // Adicionar delay aleatório para parecer humano (e evitar bloqueio)
        await new Promise(r => setTimeout(r, Math.random() * 1000 + 500))

        // Enviar via Baileys
        const sentMsg = await sock.sendMessage(jid, { text })

        // Se não tiver ID da conversa, tenta buscar
        let convId = conversationId
        let orgId = null

        if (!convId) {
            // Tenta buscar pelo telefone limpo
            const { data } = await supabase
                .from('conversations')
                .select('id')
                .or(`contact_phone.eq.${phoneCleaned},contact_phone.eq.+${phoneCleaned}`)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                convId = data.id
            }
        }

        if (convId) {
            // Registrar mensagem enviada pelo bot no histórico
            const { data: savedMsg, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: convId,
                    sender: 'agent', // Usando 'agent' conforme constraint
                    content: text,
                    type: 'text',
                    status: 'delivered', // Marca como entregue para o listener do server.js ignorar envio duplicado
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('Erro ao salvar mensagem do bot:', error)
            } else {
                // Emitir evento Socket.io para o frontend (se disponível)
                if (global.io) {
                    try {
                        // Buscar dados da conversa para o evento (precisamos do contact_phone correto)
                        const { data: conv } = await supabase
                            .from('conversations')
                            .select('contact_phone, contact_name')
                            .eq('id', convId)
                            .single()

                        if (conv) {
                            global.io.emit('new_message', {
                                conversation_id: convId,
                                phone: conv.contact_phone,
                                content: text,
                                sender: 'agent',
                                type: 'text',
                                status: 'delivered',
                                timestamp: savedMsg.created_at,
                                message: {
                                    id: savedMsg.id,
                                    content: text,
                                    sender: 'agent',
                                    type: 'text',
                                    status: 'delivered',
                                    created_at: savedMsg.created_at,
                                    contact_phone: conv.contact_phone
                                }
                            })
                            console.log('[Socket.io] Evento new_message emitido para frontend.')
                        }
                    } catch (ioErr) {
                        console.error('Erro ao emitir socket event:', ioErr)
                    }
                } else {
                    console.warn('[Aviso] global.io não disponível. Mensagem salva mas não emitida via socket.')
                }
            }
        } else {
            console.warn(`Aviso: Mensagem enviada para ${phoneCleaned} mas não salva (sem conversation_id)`)
        }
    } catch (error) {
        console.error(`Erro crítico ao enviar mensagem para ${phone} (${jid}):`, error)
    }
}

// Helper rápido para pegar ID (cachear seria ideal)
async function getConversationIdByPhone(phone) {
    const { data } = await supabase.from('conversations').select('id').eq('contact_phone', phone).single()
    return data?.id
}


// Helper para avançar (usado no start/restart)
async function advanceStep(conversationId, step, currentData, sock, phone) {
    const stepConfig = flowSteps[step]
    let messageToSend = stepConfig?.message

    // Injetar configurações dinâmicas no passo inicial
    if (step === 'start' && messageToSend) {
        const settings = await getSystemSettings()
        const { isOpen, start, end } = checkServiceHours(settings.service_hours)

        if (!isOpen) {
            // Se fechado, substitui mensagem por aviso de fechamento
            messageToSend = `⚠️ *Atendimento Encerrado*\n\nNosso horário de funcionamento é das *${start}* às *${end}*.\nPor favor, retorne contato dentro do horário comercial.`
        } else {
            // Se aberto, constrói mensagem de boas vindas
            if (settings.welcome_message && settings.welcome_message.trim() !== '') {
                const actionInstruction = "\n\nPara começar, digite seu *nome completo*:"
                messageToSend = `${settings.welcome_message}${actionInstruction}`
            }

            // Injetar Avisos (Contexto)
            if (settings.bot_notices && settings.bot_notices.trim() !== '') {
                messageToSend = `⚠️ *Avisos Importantes:*\n${settings.bot_notices}\n\n${messageToSend}`
            }
        }
    }

    // Tratamento para opções dinâmicas
    if (stepConfig && stepConfig.type === 'dynamic_option') {
        const { optionsMap, formattedText } = await getDynamicOptions(stepConfig.source, currentData)
        if (optionsMap && Object.keys(optionsMap).length > 0) {
            currentData._temp_options = optionsMap
            messageToSend += `\n\n${formattedText}`
        } else {
            delete currentData._temp_options
            messageToSend += "\n(Digite o nome manualmente)"
        }
    } else {
        if (currentData._temp_options) delete currentData._temp_options
    }

    // Salva estado (agora incluindo opções temporárias se houver)
    await updateConversationState(conversationId, step, currentData)

    // Envia mensagem do passo atual
    if (messageToSend) {
        await sendMessage(phone, messageToSend, sock, conversationId)
    }

    // Se for passo informativo (sem input), processa e avança automaticamente
    if (stepConfig && stepConfig.type === 'info') {
        // Processa o passo 'info' para pegar o next
        const result = await processStep(step, '', { flow_step: step }, supabase)

        // Se tiver próximo passo (next), avança para ele
        if (result.nextStep) {
            await advanceStep(conversationId, result.nextStep, currentData, sock, phone)
        }
    }
    // Se for interativo (text, option, etc), PARA AQUI e espera input do usuário
}

// Helper para buscar opções dinâmicas
async function getDynamicOptions(source, currentData) {
    let options = []

    if (source === 'neighborhoods') {
        const { data } = await supabase
            .from('boarding_locations')
            .select('neighborhood')
            .order('neighborhood')

        // Filtrar únicos (caso haja múltiplos pontos no mesmo bairro)
        if (data) {
            const unique = [...new Set(data.map(item => item.neighborhood))]
            options = unique
        }
    } else if (source === 'points') {
        const neighborhood = currentData.boarding_neighborhood
        if (neighborhood) {
            const { data } = await supabase
                .from('boarding_locations')
                .select('point_name')
                .eq('neighborhood', neighborhood)
                .order('point_name')

            if (data) {
                options = data.map(item => item.point_name)
            }
        }
    }

    if (options.length === 0) return { optionsMap: {}, formattedText: '' }

    const optionsMap = {}
    let formattedText = ''

    options.forEach((opt, index) => {
        const num = index + 1
        optionsMap[String(num)] = opt
        formattedText += `${num}️⃣ ${opt}\n`
    })

    return { optionsMap, formattedText: formattedText.trim() }
}
