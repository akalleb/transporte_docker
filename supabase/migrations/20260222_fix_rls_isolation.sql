-- MIGRATION: 20260222_fix_rls_isolation.sql
-- DESCRIPTION: Enforce strict organization isolation and Super Admin access via RLS.

BEGIN;

-- 1. Helper Function: Check for Super Admin Role in JWT
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Checks the app_metadata inside the JWT for 'super_admin' role
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure organization_id exists on all relevant tables
DO $$ 
BEGIN
    -- Conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'organization_id') THEN
        ALTER TABLE public.conversations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        CREATE INDEX idx_conversations_org ON public.conversations(organization_id);
    END IF;

    -- Messages (Usually inherits from conversation, but good to have denormalized for RLS performance)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'organization_id') THEN
        ALTER TABLE public.messages ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        CREATE INDEX idx_messages_org ON public.messages(organization_id);
    END IF;

    -- Registrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'organization_id') THEN
        ALTER TABLE public.registrations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        CREATE INDEX idx_registrations_org ON public.registrations(organization_id);
    END IF;

    -- Boarding Locations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boarding_locations' AND column_name = 'organization_id') THEN
        ALTER TABLE public.boarding_locations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        CREATE INDEX idx_boarding_locations_org ON public.boarding_locations(organization_id);
    END IF;
END $$;

-- 3. Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Users can view boarding locations" ON public.boarding_locations;

-- Drop generic policies to replace with strict ones
DROP POLICY IF EXISTS "Tenant View Policy" ON public.organizations;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.vehicles;

-- 4. Create Strict RLS Policies

-- 4.1 Organizations
-- Super Admin: View All
-- Users: View Own
CREATE POLICY "Strict Organization Isolation" ON public.organizations
FOR SELECT USING (
    id = public.get_auth_org_id() 
    OR public.is_super_admin()
);

-- 4.2 Vehicles
CREATE POLICY "Strict Vehicle Isolation" ON public.vehicles
FOR ALL USING (
    organization_id = public.get_auth_org_id() 
    OR public.is_super_admin()
);

-- 4.3 Conversations
CREATE POLICY "Strict Conversation Isolation" ON public.conversations
FOR ALL USING (
    organization_id = public.get_auth_org_id() 
    OR public.is_super_admin()
);

-- 4.4 Messages
CREATE POLICY "Strict Message Isolation" ON public.messages
FOR ALL USING (
    organization_id = public.get_auth_org_id() 
    OR public.is_super_admin()
);

-- 4.5 Registrations
CREATE POLICY "Strict Registration Isolation" ON public.registrations
FOR ALL USING (
    organization_id = public.get_auth_org_id() 
    OR public.is_super_admin()
);

-- 4.6 Boarding Locations
CREATE POLICY "Strict Boarding Location Isolation" ON public.boarding_locations
FOR ALL USING (
    organization_id = public.get_auth_org_id() 
    OR public.is_super_admin()
);

-- 4.7 Profiles (Update existing)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Strict Profile View" ON public.profiles
FOR SELECT USING (
    (organization_id = public.get_auth_org_id()) -- Users see profiles in their org
    OR (auth.uid() = id)                       -- Users see themselves (orphan safe)
    OR public.is_super_admin()                 -- Super Admin see all
);

COMMIT;
