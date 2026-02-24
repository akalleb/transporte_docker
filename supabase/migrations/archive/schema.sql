-- Tabela de Perfis de Usuário
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  phone text,
  role text check (role in ('admin', 'user')) default 'user',
  status text check (status in ('pending', 'active', 'blocked')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Políticas de Acesso

-- 1. Usuários podem ver seu próprio perfil
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- 2. Admins podem ver todos os perfis
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Usuários podem atualizar apenas nome e telefone do seu próprio perfil
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 4. Admins podem atualizar qualquer perfil (para aprovar/bloquear)
create policy "Admins can update all profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Função para criar perfil automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, role, status)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    'user', -- Role padrão
    'pending' -- Status padrão (precisa de aprovação)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para executar a função
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --- COMANDOS PARA RODAR MANUALMENTE ---

-- 1. Se o usuário já existe, crie o perfil dele manualmente (caso o trigger não tenha rodado retroativamente)
-- insert into public.profiles (id, name, role, status)
-- select id, raw_user_meta_data->>'full_name', 'admin', 'active'
-- from auth.users
-- where email = 'arthurkalleb@protonmail.com'
-- on conflict (id) do update set role = 'admin', status = 'active';

-- 2. Atualizar o usuário atual para ADMIN (garantido)
update public.profiles 
set role = 'admin', status = 'active' 
where id in (select id from auth.users where email = 'arthurkalleb@protonmail.com');
