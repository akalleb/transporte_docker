-- Create conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  contact_name text,
  contact_phone text not null,
  status text check (status in ('active', 'pending', 'closed')) default 'pending',
  last_message text,
  last_message_at timestamp with time zone default now(),
  assigned_to uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender text check (sender in ('agent', 'contact', 'system')) not null,
  content text,
  type text check (type in ('text', 'image', 'audio', 'file')) default 'text',
  status text check (status in ('sent', 'delivered', 'read')) default 'sent',
  external_id text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies for conversations
create policy "Users can view all conversations"
  on public.conversations for select
  using (true); -- Adjust as needed based on role

create policy "Users can update assigned conversations"
  on public.conversations for update
  using (auth.uid() = assigned_to or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Policies for messages
create policy "Users can view all messages"
  on public.messages for select
  using (true);

create policy "Users can insert messages"
  on public.messages for insert
  with check (true);

-- Indexes for performance
create index if not exists idx_conversations_last_message_at on public.conversations(last_message_at desc);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_conversations_contact_phone on public.conversations(contact_phone);

-- Realtime publication
-- Note: You need to enable replication for these tables in the dashboard or via SQL
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
