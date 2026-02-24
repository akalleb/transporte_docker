-- Script para Resetar Banco de Dados e Remover Estrutura de Organizações (Versão Corrigida)
-- ATENÇÃO: Este script APAGA DADOS e REMOVE a tabela organizations.

BEGIN;

-- 1. Desabilitar RLS temporariamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_locations DISABLE ROW LEVEL SECURITY;

-- 2. Remover Políticas RLS (Limpeza Profunda para evitar conflitos)
-- Profiles
DROP POLICY IF EXISTS "Strict Organization Isolation" ON public.organizations;
DROP POLICY IF EXISTS "Tenant View Policy" ON public.organizations;
DROP POLICY IF EXISTS "Strict Profile View" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; -- A política que causou erro
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Vehicles
DROP POLICY IF EXISTS "Strict Vehicle Isolation" ON public.vehicles;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users full access vehicles" ON public.vehicles;

-- Conversations
DROP POLICY IF EXISTS "Strict Conversation Isolation" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users full access conversations" ON public.conversations;

-- Messages
DROP POLICY IF EXISTS "Strict Message Isolation" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users full access messages" ON public.messages;

-- Registrations
DROP POLICY IF EXISTS "Strict Registration Isolation" ON public.registrations;
DROP POLICY IF EXISTS "Authenticated users full access registrations" ON public.registrations;

-- Boarding Locations
DROP POLICY IF EXISTS "Strict Boarding Location Isolation" ON public.boarding_locations;
DROP POLICY IF EXISTS "Authenticated users full access boarding_locations" ON public.boarding_locations;

-- Outras tabelas
DROP POLICY IF EXISTS "Authenticated users full access maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users full access audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users full access system_settings" ON public.system_settings;

-- 3. Remover Colunas organization_id de TODAS as tabelas
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.maintenance_records DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.system_settings DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.messages DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.registrations DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.boarding_locations DROP COLUMN IF EXISTS organization_id CASCADE;

-- 4. Remover Tabela Organizations e Funções
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_org_id();
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 5. Limpar Dados (Reset)
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.conversations CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.maintenance_records CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.boarding_locations CASCADE;
TRUNCATE TABLE public.vehicles CASCADE;

-- 6. Recriar Políticas Simplificadas
-- Profiles
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Vehicles
CREATE POLICY "Authenticated users full access vehicles" ON public.vehicles FOR ALL TO authenticated USING (true);

-- Conversations
CREATE POLICY "Authenticated users full access conversations" ON public.conversations FOR ALL TO authenticated USING (true);

-- Messages
CREATE POLICY "Authenticated users full access messages" ON public.messages FOR ALL TO authenticated USING (true);

-- Registrations
CREATE POLICY "Authenticated users full access registrations" ON public.registrations FOR ALL TO authenticated USING (true);

-- Boarding Locations
CREATE POLICY "Authenticated users full access boarding_locations" ON public.boarding_locations FOR ALL TO authenticated USING (true);

-- Maintenance
CREATE POLICY "Authenticated users full access maintenance" ON public.maintenance_records FOR ALL TO authenticated USING (true);

-- Audit Logs
CREATE POLICY "Authenticated users full access audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- System Settings
CREATE POLICY "Authenticated users full access system_settings" ON public.system_settings FOR ALL TO authenticated USING (true);

-- 7. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

COMMIT;
