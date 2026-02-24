-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
-- Returns NULL if user has no organization (Super Admin)
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS TEXT AS $$
  SELECT organization_id::text FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to check if user is Super Admin
-- Super Admin is defined as a user with NO organization_id
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND organization_id IS NULL
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ORGANIZATIONS Policies
CREATE POLICY "Super Admin can do everything on organizations"
ON organizations
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view their own organization"
ON organizations
FOR SELECT
USING (id::text = get_my_org_id());

-- PROFILES Policies
CREATE POLICY "Super Admin can do everything on profiles"
ON profiles
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view profiles in their own organization"
ON profiles
FOR SELECT
USING (organization_id::text = get_my_org_id());

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (id = auth.uid());

-- VEHICLES Policies
CREATE POLICY "Super Admin can do everything on vehicles"
ON vehicles
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view/edit vehicles in their own organization"
ON vehicles
FOR ALL
USING (organization_id::text = get_my_org_id());

-- MAINTENANCE_RECORDS Policies
CREATE POLICY "Super Admin can do everything on maintenance_records"
ON maintenance_records
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view/edit maintenance_records in their own organization"
ON maintenance_records
FOR ALL
USING (
  vehicle_id IN (
    SELECT id FROM vehicles WHERE organization_id::text = get_my_org_id()
  )
);

-- CONVERSATIONS Policies
CREATE POLICY "Super Admin can do everything on conversations"
ON conversations
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view/edit conversations in their own organization"
ON conversations
FOR ALL
USING (organization_id::text = get_my_org_id());

-- MESSAGES Policies
CREATE POLICY "Super Admin can do everything on messages"
ON messages
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view/edit messages in their own organization"
ON messages
FOR ALL
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE organization_id::text = get_my_org_id()
  )
);

-- REGISTRATIONS Policies
CREATE POLICY "Super Admin can do everything on registrations"
ON registrations
FOR ALL
USING (is_super_admin());

CREATE POLICY "Users can view/edit registrations in their own organization"
ON registrations
FOR ALL
USING (organization_id::text = get_my_org_id());
