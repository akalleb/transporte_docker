-- Add flow_step and flow_data columns to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS flow_step text,
ADD COLUMN IF NOT EXISTS flow_data jsonb DEFAULT '{}'::jsonb;

-- Optional: Create a separate table for flow history if needed (as per user suggestion, but keeping it simple for now)
-- We will stick to the conversation columns for the active state.
