-- Alterar o padrão da coluna is_bot_active para TRUE
alter table public.conversations 
alter column is_bot_active set default true;

-- Opcional: Ativar o bot para todas as conversas que estão pendentes ou ativas
-- Isso garante que o bot comece a responder conversas em andamento se o usuário desejar
update public.conversations
set is_bot_active = true
where status in ('active', 'pending') and (is_bot_active is null or is_bot_active = false);
