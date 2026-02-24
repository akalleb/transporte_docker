export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)
  const body = await readBody(event)
  const { userId, role } = body

  if (!userId || !role) {
    throw createError({
      statusCode: 400,
      message: 'ID e cargo são obrigatórios'
    })
  }

  // Atualizar apenas o cargo na tabela profiles
  const { data, error } = await client
    .from('profiles')
    .update({ role: role })
    .eq('id', userId)
    .select()

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return { success: true, user: data }
})
