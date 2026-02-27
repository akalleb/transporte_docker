export default defineEventHandler(async (event) => {
  // Configurações Padrão (Fallback Seguro)
  const defaultSettings = {
    service_hours: { start: '08:00', end: '18:00', active: true },
    welcome_message: 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudar?',
    bot_notices: '',
    ai_persona: 'Assistente prestativo e profissional',
    ai_creativity: 0.7,
    ai_supervision_level: 'medium',
    ai_instructions: 'Seja conciso e foque em agendar o transporte.',
    ai_knowledge_base: ''
  }

  try {
    // Tenta obter acesso seguro, mas se falhar, retorna default em vez de erro 500
    // Isso é crucial para não quebrar a tela de configurações se o DB estiver inacessível
    let client
    try {
      const adminAuth = await requireAdmin(event)
      client = adminAuth.client
    } catch (authErr: any) {
      console.warn('Aviso: Falha na autenticação admin ao buscar settings. Retornando padrão.', authErr.message)
      // Se for erro de auth (401/403), talvez devêssemos lançar, mas para "refazer conexão", vamos ser permissivos na leitura
      // Se o usuário não for admin, o frontend vai redirecionar ou mostrar erro de outra forma
      if (authErr.statusCode === 401 || authErr.statusCode === 403) throw authErr
      return defaultSettings
    }

    // Tentar buscar configurações no Supabase
    const { data, error } = await client
      .from('system_settings')
      .select('key, value')

    if (error) {
      console.warn('Erro ao buscar settings no DB (usando padrão):', error.message)
      return defaultSettings
    }

    // Merge das configurações do banco com as padrão
    const settings: Record<string, any> = { ...defaultSettings }

    if (data) {
      data.forEach(item => {
        if (settings[item.key] !== undefined) {
          settings[item.key] = item.value
        }
      })
    }

    return settings

  } catch (err: any) {
    console.error('Erro CRÍTICO na API settings.get:', err)

    // Se for erro de permissão, repassa
    if (err.statusCode === 401 || err.statusCode === 403) {
      throw createError({ statusCode: err.statusCode, message: err.message })
    }

    // Para outros erros (500), retorna default para não travar a UI
    return defaultSettings
  }
})
