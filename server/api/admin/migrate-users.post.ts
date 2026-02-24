import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  let user = await serverSupabaseUser(event)

  if (!user) {
       // Fallback: Tentar pegar o token do header Authorization
       try {
           const authHeader = getRequestHeader(event, 'Authorization')
           if (authHeader) {
                const client = await serverSupabaseServiceRole(event)
                const token = authHeader.replace('Bearer ', '')
                const { data: userData } = await client.auth.getUser(token)
                if (userData?.user) {
                    user = userData.user
                }
           }
       } catch (e) {
           console.error('Fallback auth failed:', e)
       }
   }

  if (!user || (!user.id && !user.sub)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = user.id || user.sub
  const client = await serverSupabaseServiceRole(event)

  // Verificar permissões: Apenas Super Admin pode migrar usuários
  const { data: requesterProfile } = await client
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  const { data: authUser } = await client.auth.admin.getUserById(userId)
  const isSuperAdmin = authUser?.user?.app_metadata?.role === 'super_admin' || requesterProfile?.role === 'super_admin'

  if (!isSuperAdmin) {
      throw createError({ statusCode: 403, message: 'Forbidden: Apenas Super Admin pode migrar usuários' })
  }

  const body = await readBody(event).catch(() => ({}))
  // Se não vier targetOrgId, usa o padrão hardcoded ou busca pelo slug 'default'
  let targetOrgId = body?.targetOrgId || 'default-org-1771733772954'

  // 1. Verificar se a organização alvo existe
  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id')
    .eq('id', targetOrgId)
    .single()

  if (orgError || !org) {
     // Tenta buscar pelo slug default se o ID falhar
     const { data: defaultOrg } = await client
        .from('organizations')
        .select('id')
        .eq('slug', 'default')
        .single()
        
     if (defaultOrg) {
        targetOrgId = defaultOrg.id
     } else {
        // Se ainda assim não achar, erro
        throw createError({ statusCode: 404, message: 'Organização alvo não encontrada' })
     }
  }

  // 2. Atualizar usuários sem organização
  const { data, error, count } = await client
    .from('profiles')
    .update({ organization_id: targetOrgId })
    .is('organization_id', null)
    .neq('id', user.id) // Não migrar o próprio usuário (Super Admin)
    .select('id', { count: 'exact' })
    
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return { success: true, count: count || data?.length || 0, targetOrgId }
})
