-- Revert Organization Schema
BEGIN;

-- 1. Drop Policies that depend on organization_id or are too strict
DROP POLICY IF EXISTS "Strict Profile View" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Tenant View Policy" ON public.organizations;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS public.get_auth_org_id();
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 3. Drop Columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.maintenance_records DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.system_settings DROP COLUMN IF EXISTS organization_id;

-- 4. Drop Table
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 5. Recreate Simplified Policies
-- Profiles: Everyone authenticated can view all profiles (simple collaboration)
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());

-- Vehicles: Open to all authenticated users
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- Maintenance: Open to all
CREATE POLICY "Authenticated users can view maintenance" ON public.maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert maintenance" ON public.maintenance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update maintenance" ON public.maintenance_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete maintenance" ON public.maintenance_records FOR DELETE TO authenticated USING (true);

COMMIT;
