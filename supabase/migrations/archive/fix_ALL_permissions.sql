-- FIX ALL PERMISSIONS (Profiles & Storage)

-- 1. PROFILES TABLE
-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies to ensure clean state
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Enable read access for all users" on public.profiles;
drop policy if exists "Enable insert for authenticated users only" on public.profiles;
drop policy if exists "Enable update for users based on email" on public.profiles;

-- Create Simplified & Robust Policies for Profiles

-- Allow everyone to read profiles (needed for public pages or checking user existence)
create policy "Public profiles are viewable by everyone"
on public.profiles for select
using ( true );

-- Allow users to insert their own profile
create policy "Users can insert their own profile"
on public.profiles for insert
with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );


-- 2. STORAGE (Avatar Uploads)
-- Create bucket if not exists
insert into storage.buckets (id, name, public)
values ('perfil', 'perfil', true)
on conflict (id) do nothing;

-- Drop all existing storage policies for this bucket
drop policy if exists "Public Access to Profile Images" on storage.objects;
drop policy if exists "Authenticated users can upload profile images" on storage.objects;
drop policy if exists "Users can update own profile images" on storage.objects;
drop policy if exists "Users can delete own profile images" on storage.objects;
drop policy if exists "Give users access to own folder 1" on storage.objects;
drop policy if exists "Give users access to own folder 2" on storage.objects;

-- Create Simplified Policies for Storage

-- 1. VIEW: Everyone can view files in 'perfil' bucket
create policy "Public Access to Profile Images"
on storage.objects for select
to public
using ( bucket_id = 'perfil' );

-- 2. UPLOAD: Authenticated users can upload to 'perfil' bucket
-- We allow them to upload any file as long as they are authenticated.
-- The file naming convention (ID-timestamp) is handled by the frontend/backend logic,
-- but we can enforce that the owner matches auth.uid() implicitly by Supabase.
create policy "Authenticated users can upload profile images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'perfil' AND auth.role() = 'authenticated' );

-- 3. UPDATE: Users can update their own files
create policy "Users can update own profile images"
on storage.objects for update
to authenticated
using ( bucket_id = 'perfil' AND owner = auth.uid() );

-- 4. DELETE: Users can delete their own files
create policy "Users can delete own profile images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'perfil' AND owner = auth.uid() );

-- 3. GRANTS
-- Ensure authenticated users have usage on schemas
grant usage on schema public to postgres, anon, authenticated;
grant usage on schema storage to postgres, anon, authenticated;
grant all on all tables in schema public to postgres, anon, authenticated;
grant all on all sequences in schema public to postgres, anon, authenticated;
grant all on all routines in schema public to postgres, anon, authenticated;

