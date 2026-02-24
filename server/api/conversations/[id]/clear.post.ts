
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
    console.log(`[API] Iniciando limpeza da conversa ${id}...`)

    // 1. Excluir mensagens
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id)

    if (msgError) {
      console.error('[API] Erro ao limpar mensagens:', msgError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao limpar mensagens: ${msgError.message}`
      })
    }

    // 2. Excluir agendamentos
    const { error: regError } = await supabase
      .from('registrations')
      .delete()
      .eq('conversation_id', id)

    if (regError) {
      console.error('[API] Erro ao limpar agendamentos:', regError)
    }

    // 3. Resetar estado da conversa
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        flow_step: null, 
        flow_data: {},
        last_message: '', 
        last_message_at: new Date().toISOString() 
      })
      .eq('id', id)

    if (updateError) {
      console.error('[API] Erro ao resetar conversa:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao resetar conversa: ${updateError.message}`
      })
    }

    console.log(`[API] Conversa ${id} limpa com sucesso via Service Role.`)
    return { success: true }

  } catch (error: any) {
    console.error('[API] Erro fatal na limpeza:', error)
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Erro interno ao limpar conversa'
    })
  }
})
