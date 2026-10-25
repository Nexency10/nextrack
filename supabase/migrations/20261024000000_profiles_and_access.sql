create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  username text,
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'manager', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,24}$')
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username)) where username is not null;

-- If the project already has Auth users when this migration is applied, preserve
-- them and bootstrap the earliest account as administrator.
insert into public.profiles (id, full_name, username, email, role, status, created_at)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), ''),
  case
    when lower(nullif(trim(u.raw_user_meta_data ->> 'username'), '')) ~ '^[a-z0-9_]{3,24}$'
    then lower(nullif(trim(u.raw_user_meta_data ->> 'username'), ''))
    else null
  end,
  coalesce(u.email, ''),
  case when row_number() over (order by u.created_at, u.id) = 1 then 'admin' else 'viewer' end,
  case when row_number() over (order by u.created_at, u.id) = 1 then 'active' else 'pending' end,
  u.created_at
from auth.users as u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (role, status) on public.profiles to authenticated;

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;
revoke all on function private.is_active_admin() from public, anon;
grant execute on function private.is_active_admin() to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Active admins can read all profiles" on public.profiles;
create policy "Active admins can read all profiles"
  on public.profiles for select to authenticated
  using ((select private.is_active_admin()));

drop policy if exists "Admins can assign non-admin access" on public.profiles;
create policy "Admins can assign non-admin access"
  on public.profiles for update to authenticated
  using ((select private.is_active_admin()) and id <> (select auth.uid()))
  with check (
    (select private.is_active_admin())
    and id <> (select auth.uid())
    and role in ('manager', 'viewer')
  );

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
  requested_username text;
begin
  -- Serialize user creation so concurrent signups cannot both become admin.
  perform pg_advisory_xact_lock(hashtext('nextrack-first-admin'));
  select not exists (select 1 from public.profiles) into first_user;
  requested_username := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));

  insert into public.profiles (id, full_name, username, email, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    case when requested_username ~ '^[a-z0-9_]{3,24}$' then requested_username else null end,
    coalesce(new.email, ''),
    case when first_user then 'admin' else 'viewer' end,
    case when first_user then 'active' else 'pending' end
  );
  return new;
end;
$$;
revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();
