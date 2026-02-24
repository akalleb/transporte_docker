
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
    console.log('--- Verificando Configurações do Sistema ---');
    
    const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*');

    if (error) {
        console.error('Erro ao ler settings:', error);
        return;
    }

    console.log('Configurações encontradas:', settings.length);
    
    let serviceHours = null;
    let welcomeMessage = null;
    let botNotices = null;

    settings.forEach(s => {
        console.log(`\nKey: ${s.key}`);
        console.log(`Value Type: ${typeof s.value}`);
        console.log(`Value:`, JSON.stringify(s.value, null, 2));

        if (s.key === 'service_hours') serviceHours = s.value;
        if (s.key === 'welcome_message') welcomeMessage = s.value;
        if (s.key === 'bot_notices') botNotices = s.value;
    });

    console.log('\n--- Teste de Lógica de Horário ---');
    if (serviceHours) {
        // Simular checkServiceHours
        const now = new Date();
        const spTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        const currentHour = spTime.getHours();
        const currentMinute = spTime.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        console.log(`Hora atual (SP): ${currentHour}:${currentMinute} (${currentTime} min)`);
        
        const startStr = serviceHours.start || "08:00";
        const endStr = serviceHours.end || "18:00";
        const active = serviceHours.active;
        
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        const startTime = startH * 60 + startM;
        let endTime = endH * 60 + endM;
        if (endTime === 0) endTime = 24 * 60; // 1440 logic

        console.log(`Configurado: ${startStr} (${startTime}) até ${endStr} (${endTime}) | Ativo: ${active}`);

        let isOpen;
        if (!active) {
            isOpen = true;
            console.log('Resultado: ABERTO (Restrição inativa)');
        } else {
            if (endTime < startTime) {
                isOpen = currentTime >= startTime || currentTime < endTime;
                console.log('Lógica: Cruzamento de meia-noite');
            } else {
                isOpen = currentTime >= startTime && currentTime < endTime;
                console.log('Lógica: Dia normal');
            }
            console.log(`Resultado: ${isOpen ? 'ABERTO' : 'FECHADO'}`);
        }
    } else {
        console.error('service_hours não encontrado no banco!');
    }
}

run();
