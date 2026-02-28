import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'whatsapp-server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testApi() {
    const { data: reg, error } = await supabase.from('registrations').select('id').limit(1);
    if (!reg || reg.length === 0) return console.log("No registrations");

    const id = reg[0].id;
    console.log("Testing with ID:", id);

    try {
        const response = await fetch('http://localhost:3000/api/whatsapp/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                registrationId: id,
                status: 'approved'
            })
        });

        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testApi();
