import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { id, name, slug } = body

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
  
  const updates: any = {}
  if (name) updates.name = name
  if (slug) updates.slug = slug

  const { data, error } = await client
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
    
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  
  return data
})
