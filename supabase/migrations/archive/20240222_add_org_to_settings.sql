-- Add organization_id to system_settings to support multi-tenancy
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Update primary key or unique constraint to include organization_id
-- Assuming current PK is 'key'
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE system_settings ADD PRIMARY KEY (key, organization_id);

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy for reading settings (users can read their org's settings)
CREATE POLICY "Users can view settings of their organization"
ON system_settings FOR SELECT
USING (
  organization_id::text = get_my_org_id() 
  OR 
  (organization_id IS NULL AND is_super_admin()) -- Super Admin can see global/null settings
);

-- Policy for modifying settings (only admins of the org)
CREATE POLICY "Admins can modify settings of their organization"
ON system_settings FOR ALL
USING (
  organization_id::text = get_my_org_id() 
  AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Super Admin policy
CREATE POLICY "Super Admin can manage all settings"
ON system_settings FOR ALL
USING (is_super_admin());
