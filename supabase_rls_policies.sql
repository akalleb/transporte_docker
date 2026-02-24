-- Script SQL para Habilitar Multi-Tenancy (Isolamento por Organização)
-- Execute este script no SQL Editor do Supabase Dashboard.

-- 1. Adicionar coluna organization_id em tabelas que faltam (Frota)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- 2. Habilitar RLS (Row Level Security) em todas as tabelas sensíveis
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Criar Funções Auxiliares para simplificar as policies
-- Retorna o ID da organização do usuário atual
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- 4. Criar Políticas de Segurança (Policies)

-- PROFILES
-- Usuário vê seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
FOR SELECT USING (auth.uid() = id);

-- Usuário vê outros membros da mesma organização
DROP POLICY IF EXISTS "Users can view org members" ON profiles;
CREATE POLICY "Users can view org members" ON profiles 
FOR SELECT USING (organization_id = get_user_org_id());

-- Usuário pode atualizar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATIONS
-- Usuário vê apenas sua organização
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
CREATE POLICY "Users can view own organization" ON organizations 
FOR SELECT USING (id = get_user_org_id());

-- CONVERSATIONS
-- Isolamento de conversas por organização
DROP POLICY IF EXISTS "Org isolation for conversations" ON conversations;
CREATE POLICY "Org isolation for conversations" ON conversations
FOR ALL USING (organization_id = get_user_org_id());

-- REGISTRATIONS (Agenda)
-- Isolamento de agendamentos por organização
DROP POLICY IF EXISTS "Org isolation for registrations" ON registrations;
CREATE POLICY "Org isolation for registrations" ON registrations
FOR ALL USING (organization_id = get_user_org_id());

-- VEHICLES (Frota)
-- Isolamento de veículos por organização
DROP POLICY IF EXISTS "Org isolation for vehicles" ON vehicles;
CREATE POLICY "Org isolation for vehicles" ON vehicles
FOR ALL USING (organization_id = get_user_org_id());

-- MAINTENANCE_RECORDS
-- Isolamento via veículo (join)
DROP POLICY IF EXISTS "Org isolation for maintenance" ON maintenance_records;
CREATE POLICY "Org isolation for maintenance" ON maintenance_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM vehicles 
    WHERE vehicles.id = maintenance_records.vehicle_id 
    AND vehicles.organization_id = get_user_org_id()
  )
);

-- MESSAGES
-- Isolamento via conversa (join)
DROP POLICY IF EXISTS "Org isolation for messages" ON messages;
CREATE POLICY "Org isolation for messages" ON messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.organization_id = get_user_org_id()
  )
);

-- BOARDING_LOCATIONS
-- (Opcional) Se for compartilhado, permitir leitura pública para autenticados
DROP POLICY IF EXISTS "Public read for boarding locations" ON boarding_locations;
CREATE POLICY "Public read for boarding locations" ON boarding_locations
FOR SELECT TO authenticated USING (true);

-- (Opcional) Apenas admins globais ou da org podem editar (aqui deixo aberto para auth users da org se adicionar coluna futuramente)
-- Por enquanto, leitura para todos os autenticados.
