import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  console.log('[API] /api/admin/restore-admin called')
  
  let user = null
  try {
    user = await serverSupabaseUser(event)
  } catch (e) {
    console.warn('[API] serverSupabaseUser failed:', e.message)
  }
  
  if (!user) {
      console.warn('[API] serverSupabaseUser returned null, trying fallback...')
      // Fallback: Tentar pegar o token do header Authorization
      try {
          const authHeader = getRequestHeader(event, 'Authorization')
          if (authHeader) {
               console.log('[API] Found Authorization header')
               const client = await serverSupabaseServiceRole(event)
               const token = authHeader.replace('Bearer ', '')
               const { data: userData, error: userError } = await client.auth.getUser(token)
               
               if (userError) {
                   console.error('[API] Fallback auth error:', userError)
               }
               
               if (userData?.user) {
                   console.log('[API] User recovered via token:', userData.user.id)
                   user = userData.user
               }
          } else {
              console.warn('[API] No Authorization header found')
          }
      } catch (e) {
          console.error('[API] Fallback auth crashed:', e)
      }
  }

  if (!user || (!user.id && !user.sub)) {
    console.error('[API] Unauthorized: No user found or invalid user object', user)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const userId = user.id || user.sub
  const userEmail = user.email
  console.log('[API] Authenticated user:', userId, userEmail)

  if (userEmail !== 'akalleb@tutamail.com') {
      console.warn('[API] Unauthorized attempt to access Super Admin by:', userEmail)
      throw createError({ statusCode: 403, message: 'Unauthorized: Apenas o administrador mestre pode realizar esta ação.' })
  }

  let body
  try {
    body = await readBody(event)
  } catch (e) {
    console.error('[API] Failed to read body:', e)
    throw createError({ statusCode: 400, message: 'Invalid body' })
  }
  
  const { pin } = body

  if (pin !== '981173') {
    console.warn('[API] Invalid PIN used')
    throw createError({ statusCode: 403, message: 'PIN incorreto' })
  }

  const client = await serverSupabaseServiceRole(event)

  // 1. Atualizar metadata do usuário para marcar como super_admin
  console.log('[API] Updating user metadata for super_admin...', userId)
  
  // Validate UUID format manually just in case
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
      console.error('[API] Invalid UUID format:', userId)
      throw createError({ statusCode: 400, message: 'Invalid User ID format' })
  }

  const { error: authError } = await client.auth.admin.updateUserById(
    userId,
    { app_metadata: { role: 'super_admin' } }
  )

  if (authError) {
    console.error('[API] Auth update error:', authError)
    throw createError({ statusCode: 500, message: 'Erro ao atualizar permissões: ' + authError.message })
  }

  // 2. Restaurar status de Super Admin
  // Apenas atualizamos o role no app_metadata. O organization_id no profile pode ser mantido
  // para quando o usuário "bloquear" (sair do modo super admin), ele voltar para sua organização.
  console.log('[API] Super Admin mode activated via metadata update.')
  
  // Opcional: Garantir que o role no profile seja 'admin' se necessário, mas não mexer no organization_id
  /*
  const { error } = await client
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)
  */
  
  console.log('[API] Admin restored successfully')

  return { success: true }
})
