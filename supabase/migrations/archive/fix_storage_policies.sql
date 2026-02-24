-- Script to configure Storage Policies for 'perfil' bucket

-- 1. Ensure the bucket exists (idempotent)
insert into storage.buckets (id, name, public)
values ('perfil', 'perfil', true)
on conflict (id) do nothing;

-- 2. Enable RLS on objects if not already
alter table storage.objects enable row level security;

-- 3. Drop existing policies to avoid conflicts and ensure clean state
drop policy if exists "Public Access to Profile Images" on storage.objects;
drop policy if exists "Authenticated users can upload profile images" on storage.objects;
drop policy if exists "Users can update own profile images" on storage.objects;
drop policy if exists "Users can delete own profile images" on storage.objects;

-- 4. Create policies

-- Allow public read access to all files in 'perfil' bucket
create policy "Public Access to Profile Images"
on storage.objects for select
to public
using ( bucket_id = 'perfil' );

-- Allow authenticated users to upload files to 'perfil' bucket
-- Must be their own file (checked by filename convention or just auth role)
-- Simplest robust policy for now: Authenticated users can insert into 'perfil' bucket
-- Adding a check that the filename starts with their user ID is a good practice but 
-- for now we will just allow authenticated inserts to the bucket.
create policy "Authenticated users can upload profile images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'perfil' and auth.role() = 'authenticated' );

-- Allow users to update their own files
create policy "Users can update own profile images"
on storage.objects for update
to authenticated
using ( bucket_id = 'perfil' and owner = auth.uid() );

-- Allow users to delete their own files
create policy "Users can delete own profile images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'perfil' and owner = auth.uid() );
