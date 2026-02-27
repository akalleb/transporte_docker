export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)
  const body = await readBody(event)

  const updates = [
    { key: 'service_hours', value: body.service_hours, updated_at: new Date() },
    { key: 'welcome_message', value: body.welcome_message, updated_at: new Date() },
    { key: 'bot_notices', value: body.bot_notices, updated_at: new Date() },
    { key: 'ai_persona', value: body.ai_persona, updated_at: new Date() },
    { key: 'ai_creativity', value: body.ai_creativity, updated_at: new Date() },
    { key: 'ai_supervision_level', value: body.ai_supervision_level, updated_at: new Date() },
    { key: 'ai_instructions', value: body.ai_instructions, updated_at: new Date() },
    { key: 'ai_knowledge_base', value: body.ai_knowledge_base, updated_at: new Date() }
  ]

  const { error } = await client
    .from('system_settings')
    .upsert(updates, { onConflict: 'key' })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return { success: true }
})
