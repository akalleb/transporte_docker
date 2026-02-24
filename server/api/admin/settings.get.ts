export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)

  // Tentar buscar configurações. Se a tabela não existir, retorna erro silencioso ou defaults.
  const { data, error } = await client
    .from('system_settings')
    .select('key, value')

  // Default values
  const settings = {
    service_hours: { start: '08:00', end: '18:00', active: true },
    welcome_message: 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudar?',
    bot_notices: '',
    ai_persona: 'Assistente prestativo e profissional',
    ai_creativity: 0.7,
    ai_supervision_level: 'medium',
    ai_instructions: 'Seja conciso e foque em agendar o transporte.'
  }

  if (error) {
    // Se erro for tabela inexistente, retornamos defaults sem erro (primeiro acesso antes da migration)
    // Mas idealmente o usuário deve rodar a migration.
    console.warn('Erro ao buscar settings (pode ser falta da tabela):', error.message)
    return settings
  }

  if (data) {
    data.forEach(item => {
      if (item.key === 'service_hours') settings.service_hours = item.value
      if (item.key === 'welcome_message') settings.welcome_message = item.value
      if (item.key === 'bot_notices') settings.bot_notices = item.value
      if (item.key === 'ai_persona') settings.ai_persona = item.value
      if (item.key === 'ai_creativity') settings.ai_creativity = item.value
      if (item.key === 'ai_supervision_level') settings.ai_supervision_level = item.value
      if (item.key === 'ai_instructions') settings.ai_instructions = item.value
    })
  }

  return settings
})
