import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('registrations')
        .select('id, patient_name, conversations(contact_phone, contact_jid, organization_id)')
        .limit(1);

    console.log('Test joined fetch:', JSON.stringify({ data, error }, null, 2));

    const { data: data2, error: err2 } = await supabase
        .from('registrations')
        .select('*')
        .limit(1);

    console.log('Plain fetch:', JSON.stringify({ data: data2, error: err2 }, null, 2));
}

run();
