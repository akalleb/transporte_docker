
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Configurar dotenv
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    console.log('--- Checking system_settings ---')
    const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
    
    if (settingsError) console.error('Error fetching settings:', settingsError)
    else console.log('Settings:', JSON.stringify(settings, null, 2))

    console.log('\n--- Checking constraint messages_sender_check ---')
    // We can't easily run raw SQL without a function, but we can try to insert a dummy message with a wrong sender to see the error message which often contains the constraint values, or we can look for a specific function if it exists.
    // Alternatively, since the user asked to run a specific query, I can try to create a postgres function via rpc if I had permissions, but I likely don't.
    // However, I can try to fetch the constraint info from `information_schema` if Supabase exposes it via the API, but `pg_get_constraintdef` is a PG function.
    // Let's try to fetch from information_schema.check_constraints
    
    const { data: constraints, error: constraintsError } = await supabase
        .from('information_schema.check_constraints')
        .select('*')
        .eq('constraint_name', 'messages_sender_check')
        
    // Note: accessing information_schema via supabase client might not work due to permissions.
    // A better approach to find valid values is to try to insert a message with a random sender and catch the error.
    
    try {
        const { error: insertError } = await supabase.from('messages').insert({
            conversation_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            content: 'test',
            sender: 'INVALID_SENDER_TEST',
            type: 'text'
        })
        
        if (insertError) {
            console.log('Insert error (expected):', insertError.message)
            console.log('Details:', insertError.details)
        }
    } catch (e) {
        console.log('Exception during insert:', e)
    }
}

debug()
