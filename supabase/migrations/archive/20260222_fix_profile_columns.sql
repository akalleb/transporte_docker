
-- Adiciona colunas que podem estar faltando na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Garante que RLS permite update nessas colunas
-- (As políticas existentes "Users can update own profile" já devem cobrir, mas é bom verificar)

-- Se necessário, atualizar a função handle_new_user para incluir esses campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role, status, avatar_url, updated_at)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    'user',
    'pending',
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
