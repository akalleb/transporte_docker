import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phone, text, sender, pushName, contact_jid } = await req.json()

    if (!phone || !text) {
      throw new Error('Phone and text are required')
    }

    console.log(`Recebendo mensagem de ${pushName || 'Desconhecido'} (${phone}): ${text}`)

    // 0. Obter organization_id padrão (assumindo single-tenant ou primeira org)
    // Isso garante que os registros sejam visíveis pelo frontend (RLS)
    const { data: orgData } = await supabaseClient
      .from('organizations')
      .select('id')
      .limit(1)
      .single()
    
    const organizationId = orgData?.id

    if (!organizationId) {
        console.warn('ATENÇÃO: Nenhuma organização encontrada. Registros podem ficar órfãos.')
    }

    // 1. Tentar encontrar conversa existente pelo JID (prioridade máxima para LIDs)
    let conversation = null
    
    if (contact_jid) {
        const { data } = await supabaseClient
            .from('conversations')
            .select('id, status, contact_name, contact_jid')
            .eq('contact_jid', contact_jid)
            .neq('status', 'completed')
            .neq('status', 'closed')
            .maybeSingle()
        conversation = data
    }

    // Fallback: busca por telefone se não achou por JID
    if (!conversation) {
        const { data } = await supabaseClient
          .from('conversations')
          .select('id, status, contact_name, contact_jid')
          .eq('contact_phone', phone)
          .neq('status', 'completed')
          .neq('status', 'closed')
          .maybeSingle()
        conversation = data
    }

    let conversationId = conversation?.id

    if (!conversationId) {
      console.log('Criando nova conversa...')
      const { data: newConv, error: createError } = await supabaseClient
        .from('conversations')
        .insert({
          organization_id: organizationId,
          contact_phone: phone,
          contact_name: pushName || phone, // Usa pushName se disponível
          contact_jid: contact_jid, // Salva o JID original (importante para LIDs)
          status: 'pending',
          last_message: text,
          last_message_at: new Date().toISOString(),
          is_bot_active: true
        })
        .select()
        .single()
      
      if (createError) {
          console.error('Erro ao criar conversa:', createError)
          throw createError
      }
      conversationId = newConv.id
    } else {
      console.log('Atualizando conversa existente:', conversationId)
      
      const updates: any = {
        last_message: text,
        last_message_at: new Date().toISOString()
      }

      // Atualiza nome se disponível e se estiver diferente
      if (pushName && conversation.contact_name !== pushName) {
          updates.contact_name = pushName
      }

      // Atualiza JID se não existir ou for diferente
      if (contact_jid && conversation.contact_jid !== contact_jid) {
          updates.contact_jid = contact_jid
      }

      await supabaseClient
        .from('conversations')
        .update(updates)
        .eq('id', conversationId)
    }

    // 2. Inserir a mensagem
    console.log('Inserindo mensagem...')
    const { error: msgError } = await supabaseClient
      .from('messages')
      .insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        sender: sender || 'contact', // 'contact' se vier do webhook, 'agent' se vier do app (mas app usa client direto geralmente)
        content: text,
        type: 'text',
        status: 'delivered'
      })

    if (msgError) {
        console.error('Erro ao inserir mensagem:', msgError)
        throw msgError
    }

    return new Response(JSON.stringify({ success: true, conversation_id: conversationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro geral:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
