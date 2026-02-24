import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const client = await serverSupabaseServiceRole(event)
  const body = await readBody(event)

  const userId = user.id || (user as any).sub

  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID missing from auth context' })
  }

  // Whitelist fields to prevent role escalation
   const allowedUpdates: any = {
     name: body.name,
     phone: body.phone,
     avatar_url: body.avatar_url,
     updated_at: new Date().toISOString()
   }
  
  // Remove undefined keys
  Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key])

  // Upsert profile bypassing RLS
  const { data, error } = await client
    .from('profiles')
    .upsert({
      id: userId,
      ...allowedUpdates
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting profile:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true, data }
})
