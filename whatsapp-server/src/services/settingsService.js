import { createClient } from '@supabase/supabase-js'

// Inicializar cliente Supabase (usando variáveis de ambiente do server.js)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

const supabase = createClient(
    process.env.SUPABASE_URL, 
    supabaseKey,
    SUPABASE_SERVICE_ROLE_KEY ? { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } : {}
)

// Cache em memória
let settingsCache = null
let lastFetchTime = 0
const CACHE_TTL = 0 // Cache desativado para garantir dados frescos (conforme solicitado)

// Defaults
const DEFAULT_SETTINGS = {
    service_hours: { start: '08:00', end: '18:00', active: true },
    welcome_message: 'Olá! Sou o assistente virtual do Transporte da Saúde.',
    closed_message: 'Estamos fechados no momento. Nosso horário é das {start} às {end}.',
    bot_notices: '',
    ai_supervision_level: 'medium',
    ai_persona: 'Assistente prestativo',
    company_name: 'Transporte da Saúde',
    max_attempts: 3,
    inactivity_timeout: 30 // minutos
}

export async function loadSettings(forceRefresh = false) {
    const now = Date.now()
    
    if (!forceRefresh && settingsCache && (now - lastFetchTime < CACHE_TTL)) {
        return settingsCache
    }

    try {
        const { data, error } = await supabase.from('system_settings').select('key, value')
        
        if (error) {
            console.error('Erro ao carregar configurações:', error)
            return settingsCache || DEFAULT_SETTINGS
        }

        const newSettings = { ...DEFAULT_SETTINGS }
        
        if (data) {
            data.forEach(item => {
                // Tenta fazer parse se for string JSON, ou usa direto se for objeto/string simples
                // O banco define value como JSONB, então o driver já deve entregar parseado
                newSettings[item.key] = item.value
            })
        }

        settingsCache = newSettings
        lastFetchTime = now
        console.log('[SETTINGS] Configurações atualizadas do banco.')
        return newSettings
    } catch (err) {
        console.error('Erro crítico no settingsService:', err)
        return settingsCache || DEFAULT_SETTINGS
    }
}

export function clearSettingsCache() {
    settingsCache = null
    lastFetchTime = 0
}
