export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)
  const body = await readBody(event)
  const { id, email, password, name, phone, role } = body

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID do usuário é obrigatório'
    })
  }

  // 1. Atualizar usuário no Auth (se tiver password ou email)
  const updates: any = { user_metadata: { name, phone } }
  if (email) updates.email = email
  if (password && password.trim() !== '') updates.password = password

  const { data: authData, error: authError } = await client.auth.admin.updateUserById(
    id,
    updates
  )

  if (authError) {
    throw createError({
      statusCode: 400,
      message: authError.message
    })
  }

  // 2. Atualizar perfil na tabela profiles
  const { error: profileError } = await client
    .from('profiles')
    .update({
      name: name,
      phone: phone,
      role: role
    })
    .eq('id', id)

  if (profileError) {
    console.error('Erro ao atualizar perfil:', profileError)
    throw createError({
      statusCode: 500,
      message: profileError.message
    })
  }

  return { success: true }
})
