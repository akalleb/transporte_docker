-- Garantir que o valor padrão de is_bot_active seja TRUE
ALTER TABLE conversations 
ALTER COLUMN is_bot_active SET DEFAULT true;

-- Atualizar conversas existentes que possam estar com valor nulo para TRUE (opcional, mas recomendado)
UPDATE conversations 
SET is_bot_active = true 
WHERE is_bot_active IS NULL;
