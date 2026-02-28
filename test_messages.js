import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'whatsapp-server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('messages').select('content, status, created_at, sender, recipient_jid').order('created_at', { ascending: false }).limit(5);
    console.log("Last messages:", JSON.stringify(data, null, 2));
}

check();
