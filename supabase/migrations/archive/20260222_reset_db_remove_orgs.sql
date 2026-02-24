-- Script para Resetar Banco de Dados e Remover Estrutura de Organizações
-- ATENÇÃO: Este script APAGA DADOS e REMOVE a tabela organizations e colunas relacionadas.

BEGIN;

-- 1. Remover Políticas RLS vinculadas a Organizations (para evitar erros ao dropar colunas)
DROP POLICY IF EXISTS "Strict Organization Isolation" ON public.organizations;
DROP POLICY IF EXISTS "Strict Vehicle Isolation" ON public.vehicles;
DROP POLICY IF EXISTS "Strict Conversation Isolation" ON public.conversations;
DROP POLICY IF EXISTS "Strict Message Isolation" ON public.messages;
DROP POLICY IF EXISTS "Strict Registration Isolation" ON public.registrations;
DROP POLICY IF EXISTS "Strict Boarding Location Isolation" ON public.boarding_locations;
DROP POLICY IF EXISTS "Strict Profile View" ON public.profiles;
DROP POLICY IF EXISTS "Tenant View Policy" ON public.organizations;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. Remover Colunas organization_id de TODAS as tabelas
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.maintenance_records DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.system_settings DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.messages DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.registrations DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.boarding_locations DROP COLUMN IF EXISTS organization_id CASCADE;

-- 3. Remover Tabela Organizations e Funções
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_org_id();
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 4. Limpar Dados (Reset) - Mantendo a estrutura das tabelas restantes
-- Usamos TRUNCATE para limpar rapidamente os dados
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.conversations CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.maintenance_records CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.boarding_locations CASCADE;
TRUNCATE TABLE public.vehicles CASCADE;
-- Nota: Não truncamos 'profiles' para não quebrar integridade com auth.users se houver usuários logados.
-- Se desejar limpar profiles também, descomente a linha abaixo (mas exigirá recriar usuários no Auth):
-- TRUNCATE TABLE public.profiles CASCADE;

-- 5. Recriar Políticas Simplificadas (Permissivas para Desenvolvimento)
-- Como removemos as políticas estritas, criamos políticas básicas para permitir acesso a usuários autenticados.

-- Profiles: Todos autenticados podem ver perfis (colaboração simples)
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Vehicles: Acesso total para autenticados
CREATE POLICY "Authenticated users full access vehicles" ON public.vehicles FOR ALL TO authenticated USING (true);

-- Conversations: Acesso total para autenticados
CREATE POLICY "Authenticated users full access conversations" ON public.conversations FOR ALL TO authenticated USING (true);

-- Messages: Acesso total para autenticados
CREATE POLICY "Authenticated users full access messages" ON public.messages FOR ALL TO authenticated USING (true);

-- Registrations: Acesso total para autenticados
CREATE POLICY "Authenticated users full access registrations" ON public.registrations FOR ALL TO authenticated USING (true);

-- Boarding Locations: Acesso total para autenticados
CREATE POLICY "Authenticated users full access boarding_locations" ON public.boarding_locations FOR ALL TO authenticated USING (true);

-- Maintenance: Acesso total para autenticados
CREATE POLICY "Authenticated users full access maintenance" ON public.maintenance_records FOR ALL TO authenticated USING (true);

-- Audit Logs: Acesso total para autenticados
CREATE POLICY "Authenticated users full access audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- System Settings: Acesso total para autenticados
CREATE POLICY "Authenticated users full access system_settings" ON public.system_settings FOR ALL TO authenticated USING (true);

COMMIT;
