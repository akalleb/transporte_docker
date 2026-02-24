export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)
  const body = await readBody(event)
  const { id } = body

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID do usuário é obrigatório'
    })
  }

  // 1. Deletar usuário no Auth
  const { error: authError } = await client.auth.admin.deleteUser(id)

  if (authError) {
    throw createError({
      statusCode: 400,
      message: authError.message
    })
  }

  return { success: true }
})
