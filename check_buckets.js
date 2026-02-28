import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'whatsapp-server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.storage.listBuckets();
    console.log("Buckets:", data?.map(b => b.name));
    if (error) console.error("Error listing buckets:", error);
}

check();
