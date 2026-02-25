
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

console.log('Testing connection to:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('Fetching data...')
  const { data, error } = await supabase.from('users').select('*').limit(1) // Assuming 'users' table or similar exists, or just check auth
  if (error) console.error('Error:', error)
  else console.log('Success:', data)
}

test()
