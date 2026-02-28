import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('registrations')
        .select('*, conversations(contact_phone, contact_jid)')
        .limit(1);

    console.log('Query result:', JSON.stringify({ data, error }, null, 2));
}

run();
