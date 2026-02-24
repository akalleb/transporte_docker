-- Adicionar coluna para controlar o status do robô de autoatendimento
alter table public.conversations 
add column if not exists is_bot_active boolean default false;

-- Permitir update nesta coluna (já coberto pelas políticas gerais, mas bom garantir)
-- A política existente "Users can update assigned conversations" cobre isso se o usuário estiver logado.
