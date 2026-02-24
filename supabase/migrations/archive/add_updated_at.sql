-- Adiciona a coluna updated_at à tabela profiles se não existir
alter table public.profiles 
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
