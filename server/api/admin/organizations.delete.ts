import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { id } = body

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing organization ID' })
  }

  const client = await serverSupabaseServiceRole(event)
  
  // Verificar se é Super Admin
  const { data: profile } = await client
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
    
  if (profile?.organization_id) {
    throw createError({ statusCode: 403, message: 'Apenas Super Admin pode realizar esta ação' })
  }
  
  const { error } = await client
    .from('organizations')
    .delete()
    .eq('id', id)
    
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return { success: true }
})
