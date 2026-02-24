import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  if (!body.name || !body.slug) {
    throw createError({ statusCode: 400, message: 'Missing name or slug' })
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
  
  const { data, error } = await client
    .from('organizations')
    .insert(body)
    .select()
    .single()
    
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return data
})