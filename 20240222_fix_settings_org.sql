
-- Execute este script no SQL Editor do Supabase para corrigir a falta da coluna e criar a função de migração

-- 1. Adicionar coluna organization_id na tabela system_settings
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_system_settings_org ON system_settings(organization_id);

-- 3. Habilitar função run_sql para futuras migrações automáticas (Opcional, mas recomendado para facilitar updates)
CREATE OR REPLACE FUNCTION run_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
