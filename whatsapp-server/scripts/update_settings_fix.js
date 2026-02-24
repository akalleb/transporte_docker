
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

async function updateSettings() {
    console.log('Updating system_settings...')
    
    const newHours = {
        start: '06:00',
        end: '01:59',
        active: true
    }

    const { data, error } = await supabase
        .from('system_settings')
        .update({ value: newHours })
        .eq('key', 'service_hours')
        .select()

    if (error) {
        console.error('Error updating settings:', error)
    } else {
        console.log('Settings updated:', data)
    }
}

updateSettings()
