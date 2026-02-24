import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  console.log('[API] /api/admin/lock-admin called')
  
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
               
               if (userData?.user) {
                   console.log('[API] User recovered via token:', userData.user.id)
                   user = userData.user
               }
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
  console.log('[API] Locking admin for user:', userId, userEmail)

  if (userEmail !== 'akalleb@tutamail.com') {
    // If not the master admin, they shouldn't be in this state anyway, but just in case
    console.warn('[API] Lock admin attempted by non-master:', userEmail)
    // We can allow it if they somehow got the role, or just block it. 
    // Blocking it is safer to prevent confusion.
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const client = await serverSupabaseServiceRole(event)
  
  // Update app_metadata to remove super_admin role (downgrade to admin)
  const { error } = await client.auth.admin.updateUserById(
    userId,
    { app_metadata: { role: 'admin' } }
  )

  if (error) {
    console.error('[API] Lock admin error:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
