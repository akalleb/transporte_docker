
-- Inserir configurações padrão de IA se não existirem
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('ai_persona', '"Assistente prestativo e profissional"', 'Personalidade do Agente de IA'),
  ('ai_creativity', '0.7', 'Nível de criatividade (Temperatura) de 0.0 a 1.0'),
  ('ai_supervision_level', '"medium"', 'Nível de intervenção no fluxo (low, medium, high)'),
  ('ai_instructions', '"Seja conciso e foque em agendar o transporte."', 'Instruções adicionais para o comportamento do Agente')
ON CONFLICT (key) DO NOTHING;
