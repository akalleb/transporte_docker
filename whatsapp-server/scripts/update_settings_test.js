
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Teste de Atualização de Configurações ---');
    
    const newSettings = {
        service_hours: { start: "06:00", end: "00:00", active: true },
        welcome_message: "Olá! Teste de atualização.",
        bot_notices: "Aviso de teste."
    };

    console.log('Tentando salvar:', JSON.stringify(newSettings, null, 2));

    const updates = [
        { key: 'service_hours', value: newSettings.service_hours, updated_at: new Date() },
        { key: 'welcome_message', value: newSettings.welcome_message, updated_at: new Date() },
        { key: 'bot_notices', value: newSettings.bot_notices, updated_at: new Date() }
    ];

    const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

    if (error) {
        console.error('Erro ao atualizar:', error);
    } else {
        console.log('Atualização bem sucedida!');
    }

    // Verificar leitura
    const { data: readBack } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'service_hours')
        .single();
        
    console.log('Lido do banco:', JSON.stringify(readBack.value, null, 2));
}

run();
