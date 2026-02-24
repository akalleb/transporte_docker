-- Tabela de Locais de Embarque (Bairros e Pontos)
create table public.boarding_locations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  neighborhood text not null, -- Bairro
  point_name text not null,   -- Nome do Ponto de Embarque
  description text            -- Descrição opcional (ex: Ponto de referência)
);

-- Tabela de Cadastros/Agendamentos
create table public.registrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  conversation_id uuid, -- Referência opcional, sem FK estrita para evitar erros se a tabela não existir
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

-- Políticas de acesso (RLS)
alter table public.boarding_locations enable row level security;
alter table public.registrations enable row level security;

create policy "Users can view boarding locations"
  on public.boarding_locations for select
  using (true);

create policy "Users can insert boarding locations"
  on public.boarding_locations for insert
  with check (true);

create policy "Users can update boarding locations"
  on public.boarding_locations for update
  using (true);

create policy "Users can delete boarding locations"
  on public.boarding_locations for delete
  using (true);

create policy "Users can view registrations"
  on public.registrations for select
  using (true);

create policy "Users can insert registrations"
  on public.registrations for insert
  with check (true);

create policy "Users can update registrations"
  on public.registrations for update
  using (true);

-- Permissões para Realtime (se necessário)
alter publication supabase_realtime add table public.boarding_locations;
alter publication supabase_realtime add table public.registrations;

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

drop policy if exists "Users can update own attachments" on storage.objects;
create policy "Users can update own attachments"
on storage.objects for update
to authenticated
using ( bucket_id = 'attachments' and owner = auth.uid() );

drop policy if exists "Users can delete own attachments" on storage.objects;
create policy "Users can delete own attachments"
on storage.objects for delete
to authenticated
using ( bucket_id = 'attachments' and owner = auth.uid() );
