import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, content, status, sender, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('Recent messages:', JSON.stringify(data, null, 2));
    if (error) console.log('Error:', error);
}

run();
