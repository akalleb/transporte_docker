import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'whatsapp-server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.storage.updateBucket('requisicoes', { public: true });
    console.log("Bucket updated to public:", data);
    if (error) console.error("Error updating bucket:", error);
}

check();
