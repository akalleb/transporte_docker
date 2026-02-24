-- Sincronizar usuários existentes da tabela auth.users para public.profiles
-- Isso é necessário porque o trigger só roda para novos usuários cadastrados.

insert into public.profiles (id, name, phone, role, status, created_at)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Usuário'),
  raw_user_meta_data->>'phone',
  case when email = 'arthurkalleb@protonmail.com' then 'admin' else 'user' end, -- Define admin pelo email se necessário
  'active',
  created_at
from auth.users
where id not in (select id from public.profiles);
