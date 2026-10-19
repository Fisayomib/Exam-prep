-- Studyspace account foundation. Run this in the Supabase SQL editor.
-- RLS ensures each signed-in student can only access their own study data.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Students can read their own profile" on public.profiles;
create policy "Students can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Students can update their own profile" on public.profiles;
create policy "Students can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_studyspace on auth.users;
create trigger on_auth_user_created_studyspace
  after insert on auth.users
  for each row execute procedure public.create_student_profile();

create table if not exists public.student_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"subjects": [], "tests": {}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_data enable row level security;

drop policy if exists "Students can manage only their own data" on public.student_data;
create policy "Students can manage only their own data"
  on public.student_data for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.student_data to authenticated;

