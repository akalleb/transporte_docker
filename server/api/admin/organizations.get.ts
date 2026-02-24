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
  
  // Verificar se o usuário logado é Super Admin (organization_id IS NULL e role='super_admin')
  const { data: profile } = await client
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .single()
    
  // Buscar usuário fresco do Auth Admin para garantir role atualizado (caso token esteja stale)
  const { data: authUser } = await client.auth.admin.getUserById(userId)
  const freshRole = authUser?.user?.app_metadata?.role

  console.log('[API] Organizations check:', { 
      userId, 
      profileOrg: profile?.organization_id, 
      profileRole: profile?.role,
      tokenRole: user.app_metadata?.role,
      freshRole
  })

  // Se não for super admin, bloqueia listagem de todas as orgs
  const isSuperAdmin = profile?.role === 'super_admin' || freshRole === 'super_admin' || user.app_metadata?.role === 'super_admin'

  if (!isSuperAdmin) {
     // Se o usuário tem uma organização, permitir ver apenas a SUA organização
     if (profile?.organization_id) {
         const { data, error } = await client
           .from('organizations')
           .select('*')
           .eq('id', profile.organization_id)
           .single()
         
         if (data) return [data]
         return []
     }
     return [] 
  }

  const { data, error } = await client
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return data
})