-- Adiciona a coluna avatar_url à tabela profiles se não existir
alter table public.profiles 
add column if not exists avatar_url text;
