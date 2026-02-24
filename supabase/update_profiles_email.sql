-- Adicionar coluna email na tabela profiles se não existir
alter table public.profiles add column if not exists email text;

-- Atualizar a função handle_new_user para incluir o email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, phone, role, status)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    'user', -- Role padrão
    'pending' -- Status padrão
  );
  return new;
end;
$$ language plpgsql security definer;

-- Sincronizar emails para usuários existentes que ainda não têm email na tabela profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
