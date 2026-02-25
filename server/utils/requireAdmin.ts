import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

/**
 * Verifica se o usuário autenticado é admin.
 * Lança erro 401 se não autenticado, 403 se não for admin.
 * Retorna o user e o service role client para uso subsequente.
 */
export async function requireAdmin(event: H3Event) {
  try {
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({ statusCode: 401, message: 'Não autenticado' })
    }

    const client = await serverSupabaseServiceRole(event)
    const userId = user.id || (user as any).sub

    const { data: profile, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      // Log para debug
      console.warn(`[requireAdmin] Acesso negado para usuário ${userId}. Role: ${profile?.role || 'null'}`)
      throw createError({ statusCode: 403, message: 'Acesso negado: permissão de administrador necessária' })
    }

    return { user, client, userId, role: profile.role }
  } catch (err: any) {
    console.error('[requireAdmin] Erro interno:', err.message)
    // Repassa erro H3 ou cria genérico 500 se não for
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: 'Erro interno ao verificar permissões: ' + err.message })
  }
}
