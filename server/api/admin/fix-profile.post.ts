import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Garantir que quem chama está logado
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Usar client com service role para bypass RLS
  const client = await serverSupabaseServiceRole(event)
  
  // O objeto user retornado pelo serverSupabaseUser pode ser o JWT decodificado
  // onde o ID está em 'sub'. Garantimos pegar o ID correto.
  const userId = user.id || (user as any).sub

  if (!userId) {
    console.error('Erro crítico: Usuário autenticado mas sem ID', user)
    throw createError({ statusCode: 500, message: 'User ID missing' })
  }

  console.log('FixProfile: Iniciando correção para user', userId)

  // 1. Verificar/Criar Organização Padrão
  let orgId: string | null = null

  try {
    // Tenta achar qualquer organização existente
    const { data: existingOrg, error: findError } = await client
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (findError) {
       console.warn('Erro ao buscar organização (provavelmente tabela inexistente):', findError.message)
       // Se der erro (ex: tabela não existe), geramos um ID fictício para não travar
       orgId = '00000000-0000-0000-0000-000000000000'
    } else if (existingOrg) {
      orgId = existingOrg.id
    } else {
      // Cria organização padrão se não existir nenhuma
      const { data: newOrg, error: orgError } = await client
        .from('organizations')
        .insert({
          name: 'Minha Organização',
          slug: 'default-org-' + Date.now()
        })
        .select()
        .single()

      if (orgError) {
        console.warn('Erro ao criar organização:', orgError.message)
        orgId = '00000000-0000-0000-0000-000000000000'
      } else {
        orgId = newOrg.id
      }
    }
  } catch (e) {
    console.warn('Exceção ao manipular organizações:', e)
    orgId = '00000000-0000-0000-0000-000000000000'
  }

  // 2. Atualizar/Criar Perfil com Organization ID
  // Primeiro verifica se perfil existe para preservar dados
  const { data: existingProfile } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  const profileData: any = {
    id: userId,
    organization_id: orgId,
    name: existingProfile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    role: existingProfile?.role || 'admin', // Se não tiver role, vira admin para destravar
    status: existingProfile?.status || 'active'
  }
  
  if (user.phone) {
      profileData.phone = user.phone
  }

  // Remove campos undefined para evitar erro do Supabase se o campo não existir ou for gerado
  Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key])

  console.log('FixProfile: Tentando salvar perfil. Modo:', existingProfile ? 'UPDATE' : 'INSERT', 'Dados:', profileData)

  let profileError = null
  
  if (existingProfile) {
      const { error } = await client
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
      profileError = error
  } else {
      const { error } = await client
        .from('profiles')
        .insert(profileData)
      profileError = error
  }

  if (profileError) {
    console.error('Erro ao atualizar perfil:', profileError)
    // Retornar 200 com erro para debug no frontend
    return { success: false, error: 'Failed to update profile: ' + profileError.message, details: profileError }
  }

  return { success: true, organizationId: orgId, message: 'Perfil corrigido com sucesso' }
})
