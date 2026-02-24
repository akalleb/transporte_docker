-- FIX: Corrigir recursão infinita nas políticas RLS

-- A política "Admins can view all profiles" estava causando recursão porque ela consultava a própria tabela 'profiles' para verificar se o usuário é admin.
-- Solução: Usar a função auth.jwt() para verificar metadados ou criar uma função SECURITY DEFINER para checar admin sem disparar RLS novamente.
-- No entanto, como a role está na tabela profiles, a melhor abordagem é ajustar a query para não ser recursiva ou separar a lógica.

-- Vamos simplificar: Permitir leitura pública ou autenticada básica, e restringir apenas UPDATE/DELETE.
-- Mas como queremos privacidade, vamos ajustar a política de Admin para evitar o SELECT na mesma tabela que dispara a política.

-- WORKAROUND: Para evitar recursão, podemos usar uma função auxiliar ou confiar nos metadados do auth.users se sincronizarmos a role lá.
-- MAS, como a role está em profiles, a checagem "exists (select 1 from profiles where id = auth.uid() and role = 'admin')" dentro de uma política da tabela "profiles" causa o loop.

-- SOLUÇÃO ROBUSTA:
-- 1. Dropar políticas antigas.
-- 2. Recriar políticas.
-- A política de admin deve ser cuidadosa.

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

-- Nova Estratégia:
-- Leitura: Usuário vê o próprio perfil.
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Para admins verem tudo, precisamos quebrar o ciclo.
-- Uma forma é criar uma VIEW ou FUNÇÃO segura, mas o jeito mais simples no Supabase é
-- criar uma função que verifica se é admin com SECURITY DEFINER (bypassing RLS).

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Agora usamos a função na política. Como ela é SECURITY DEFINER, ela roda com permissões do dono do banco (bypass RLS), evitando a recursão da política do usuário.
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

-- Manter a de update do próprio usuário
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
