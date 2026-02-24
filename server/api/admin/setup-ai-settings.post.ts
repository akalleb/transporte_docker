
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event)

  const sql = `
    INSERT INTO public.system_settings (key, value, description)
    VALUES 
      ('ai_persona', '"Assistente prestativo e profissional"', 'Personalidade do Agente de IA'),
      ('ai_creativity', '0.7', 'Nível de criatividade (Temperatura) de 0.0 a 1.0'),
      ('ai_supervision_level', '"medium"', 'Nível de intervenção no fluxo (low, medium, high)'),
      ('ai_instructions', '"Seja conciso e foque em agendar o transporte."', 'Instruções adicionais para o comportamento do Agente')
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      description = EXCLUDED.description;
  `

  const { error } = await client.rpc('run_sql', { sql })
  
  if (error) {
    // Fallback: Tentar inserção direta se RPC falhar (embora RPC seja o padrão aqui)
    // Mas como system_settings é uma tabela, podemos tentar insert direto
    const { error: insertError } = await client
      .from('system_settings')
      .upsert([
        { key: 'ai_persona', value: 'Assistente prestativo e profissional', description: 'Personalidade do Agente de IA' },
        { key: 'ai_creativity', value: 0.7, description: 'Nível de criatividade (Temperatura) de 0.0 a 1.0' },
        { key: 'ai_supervision_level', value: 'medium', description: 'Nível de intervenção no fluxo (low, medium, high)' },
        { key: 'ai_instructions', value: 'Seja conciso e foque em agendar o transporte.', description: 'Instruções adicionais para o comportamento do Agente' }
      ], { onConflict: 'key' })
      
    if (insertError) return { success: false, error: insertError.message }
  }

  return { success: true, message: 'AI settings configured' }
})
