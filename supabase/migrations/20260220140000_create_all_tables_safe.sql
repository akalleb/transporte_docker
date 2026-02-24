-- Script seguro para criar todas as tabelas necessárias
-- Rode este script no SQL Editor do Supabase para corrigir o erro 42P01

-- 1. Tabela de Conversas (Base para o chat)
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  contact_name text,
  contact_phone text,
  status text default 'open', -- open, closed, archived
  last_message text,
  last_message_at timestamp with time zone default now(),
  unread_count integer default 0
);

-- 2. Tabela de Mensagens
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  content text,
  sender text, -- 'user' ou 'agent'
  type text default 'text' -- text, image, audio, file
);

-- 3. Tabela de Locais de Embarque (Bairros e Pontos)
create table if not exists public.boarding_locations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  neighborhood text not null, -- Bairro
  point_name text not null,   -- Nome do Ponto de Embarque
  description text            -- Descrição opcional
);

-- 4. Tabela de Cadastros/Agendamentos
create table if not exists public.registrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  conversation_id uuid, -- Referência opcional (sem FK estrita para evitar erros)
  patient_name text,
  patient_phone text,
  procedure_date date,
  procedure_time time,
  procedure_type text check (procedure_type in ('Exame', 'Consulta')),
  procedure_name text, -- Nome do procedimento/exame
  location text,       -- Local do procedimento
  city text,           -- Cidade do procedimento
  boarding_neighborhood text,
  boarding_point text,
  needs_companion boolean default false,
  companion_reason text,
  attachment_url text,
  status text default 'pending' -- pending, confirmed, cancelled
);

-- Habilitar RLS (Row Level Security)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.boarding_locations enable row level security;
alter table public.registrations enable row level security;

-- Políticas de acesso permissivas (ajuste conforme necessário para produção)
create policy "Public access to conversations" on public.conversations for all using (true);
create policy "Public access to messages" on public.messages for all using (true);
create policy "Public access to boarding_locations" on public.boarding_locations for all using (true);
create policy "Public access to registrations" on public.registrations for all using (true);

-- Configuração do Bucket 'attachments' para anexos
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Políticas de Storage para 'attachments'
drop policy if exists "Public Access to Attachments" on storage.objects;
create policy "Public Access to Attachments"
on storage.objects for select
to public
using ( bucket_id = 'attachments' );

drop policy if exists "Authenticated users can upload attachments" on storage.objects;
create policy "Authenticated users can upload attachments"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'attachments' and auth.role() = 'authenticated' );
