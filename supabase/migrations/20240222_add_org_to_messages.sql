-- Add organization_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill organization_id from conversations
UPDATE messages
SET organization_id = conversations.organization_id
FROM conversations
WHERE messages.conversation_id = conversations.id
AND messages.organization_id IS NULL;

-- Drop old policy that uses join
DROP POLICY IF EXISTS "Users can view/edit messages in their own organization" ON messages;

-- Create new policy using organization_id directly
CREATE POLICY "Users can view/edit messages in their own organization"
ON messages
FOR ALL
USING (organization_id::text = get_my_org_id());

-- Super Admin policy (re-create to be safe or ensure it exists)
-- The previous one "Super Admin can do everything on messages" uses is_super_admin() which is fine.
-- But it's good practice to ensure it covers the new column if RLS relies on it? No, FOR ALL covers all rows.
