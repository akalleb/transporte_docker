-- Create system_settings table for global configuration
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Policies
-- Allow read access to authenticated users (and service role)
create policy "Authenticated users can read system settings"
  on public.system_settings for select
  to authenticated
  using (true);

-- Allow write access only to authenticated users (admins ideally, but for now authenticated)
create policy "Authenticated users can update system settings"
  on public.system_settings for all
  to authenticated
  using (true)
  with check (true);

-- Insert default values
insert into public.system_settings (key, value, description)
values 
  ('service_hours', '{"start": "08:00", "end": "18:00", "active": true}'::jsonb, 'Horário de Atendimento'),
  ('welcome_message', '"Olá! Bem-vindo ao nosso atendimento via WhatsApp. Como posso ajudar?"'::jsonb, 'Mensagem de Boas Vindas'),
  ('bot_notices', '""'::jsonb, 'Avisos Gerais para a IA')
on conflict (key) do nothing;
