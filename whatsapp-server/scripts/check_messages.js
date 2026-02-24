
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkMessages() {
  console.log('Verificando mensagens...')

  // 1. Mensagens pendentes (sent)
  const { data: pending, error: pendingError } = await supabase
    .from('messages')
    .select('*')
    .eq('status', 'sent')
  
  if (pendingError) {
    console.error('Erro ao buscar mensagens pendentes:', pendingError)
  } else {
    console.log(`Mensagens pendentes (status='sent'): ${pending.length}`)
    if (pending.length > 0) {
      console.log('Exemplo de pendente:', pending[0])
    }
  }

  // 2. Mensagens recentes (últimas 10) com detalhes da conversa
  const { data: recent, error: recentError } = await supabase
    .from('messages')
    .select('*, conversations(contact_phone, contact_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentError) {
    console.error('Erro ao buscar mensagens recentes:', recentError)
  } else {
    console.log('Últimas 10 mensagens:')
    recent.forEach(msg => {
      console.log(`[${msg.created_at}] ID: ${msg.id} | Sender: ${msg.sender} | Status: ${msg.status}`)
      console.log(`   Content: ${msg.content.substring(0, 50)}`)
      if (msg.conversations) {
          console.log(`   Phone: ${msg.conversations.contact_phone} | Name: ${msg.conversations.contact_name}`)
      } else {
          console.log('   Conversa não encontrada!')
      }
      console.log('---')
    })
  }
}

checkMessages()
