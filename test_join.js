import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'whatsapp-server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('registrations')
        .select(`*, conversations(contact_phone, contact_jid)`)
        .limit(1);

    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("Error:", error);
}

check();
