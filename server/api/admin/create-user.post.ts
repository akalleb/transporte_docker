export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)
  const body = await readBody(event)
  const { email, password, name, phone, role } = body

  // 1. Criar usuário no Auth (sem logar)
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, phone },
    email_confirm: true
  })

  if (authError) {
    throw createError({
      statusCode: 400,
      message: authError.message
    })
  }

  // 2. Criar/Atualizar perfil na tabela profiles
  // Nota: Trigger 'handle_new_user' normalmente cuida disso, mas para garantir o 'role' correto
  // e dados extras, podemos fazer um update logo após.
  if (authData.user) {
    const { error: profileError } = await client
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name: name,
        phone: phone,
        role: role || 'user',
        status: 'active'
      })

    if (profileError) {
      // Se falhar o perfil, deletar o usuário para não ficar inconsistente?
      // Por ora, apenas logamos o erro.
      console.error('Erro ao criar perfil:', profileError)
    }
  }

  return { success: true, user: authData.user }
})
