-- Enable RLS on profiles table (should be already enabled)
alter table public.profiles enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Create comprehensive policies
-- 1. SELECT: Users can view their own profile
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ( auth.uid() = id );

-- 2. UPDATE: Users can update their own profile
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ( auth.uid() = id );

-- 3. INSERT: Users can insert their own profile (Critical for upsert/first login)
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ( auth.uid() = id );

-- 4. Admins can view all profiles (Optional, but good for admin panel)
create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using ( is_admin() );
