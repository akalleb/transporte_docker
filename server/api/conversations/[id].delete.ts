
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da conversa é obrigatório'
    })
  }

  // Inicializa cliente Supabase com Service Role Key (bypass RLS)
  const supabase = await serverSupabaseServiceRole(event)

  // 1. Verificação de Segurança e Isolamento
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Buscar perfil do usuário para saber a organização
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Buscar organização da conversa
  const { data: conversation } = await supabase
    .from('conversations')
    .select('organization_id')
    .eq('id', id)
    .single()

  if (!conversation) {
     throw createError({ statusCode: 404, message: 'Conversa não encontrada' })
  }

  // Se usuário tem organização (não é super admin) e tenta acessar conversa de outra org
  if (userProfile?.organization_id && conversation.organization_id !== userProfile.organization_id) {
     throw createError({ statusCode: 403, message: 'Acesso negado a esta conversa' })
  }

  try {
    console.log(`[API] Iniciando exclusão da conversa ${id}...`)

    // 1. Excluir mensagens (Service Role bypass RLS)
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id)

    if (msgError) {
      console.error('[API] Erro ao excluir mensagens:', msgError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao excluir mensagens: ${msgError.message}`
      })
    }

    // 2. Excluir agendamentos (Service Role bypass RLS)
    const { error: regError } = await supabase
      .from('registrations')
      .delete()
      .eq('conversation_id', id)

    if (regError) {
      console.error('[API] Erro ao excluir agendamentos:', regError)
      // Não interrompe, pois pode não ter agendamentos
    }

    // 3. Excluir a conversa (Service Role bypass RLS)
    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (convError) {
      console.error('[API] Erro ao excluir conversa:', convError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao excluir conversa: ${convError.message}`
      })
    }

    console.log(`[API] Conversa ${id} excluída com sucesso via Service Role.`)
    return { success: true }

  } catch (error: any) {
    console.error('[API] Erro fatal na exclusão:', error)
    // Propaga o erro original se já for H3Error, senão cria novo
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Erro interno ao excluir conversa'
    })
  }
})
