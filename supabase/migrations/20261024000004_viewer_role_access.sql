-- Approved users without an assigned workspace role remain read-only viewers.
-- Existing staff profiles represented the same unassigned/view-only state.

alter table public.profiles alter column role set default 'viewer';
do $$
declare
  role_attnum smallint;
  role_constraint record;
begin
  select attnum
    into role_attnum
    from pg_attribute
   where attrelid = 'public.profiles'::regclass
     and attname = 'role'
     and not attisdropped;

  for role_constraint in
    select conname
      from pg_constraint
     where conrelid = 'public.profiles'::regclass
       and contype = 'c'
       and role_attnum = any (conkey)
  loop
    execute format(
      'alter table public.profiles drop constraint %I',
      role_constraint.conname
    );
  end loop;
end;
$$;

update public.profiles
set role = 'viewer'
where role not in ('admin', 'manager', 'viewer');

alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'viewer'));

drop policy if exists "Admins can assign non-admin access" on public.profiles;
create policy "Admins can assign non-admin access"
  on public.profiles for update to authenticated
  using ((select private.is_active_admin()) and id <> (select auth.uid()))
  with check (
    (select private.is_active_admin())
    and id <> (select auth.uid())
    and role in ('manager', 'viewer')
  );

-- Keep all application writes limited to active admins and sales managers.
-- Viewers can select active workspace data through the existing read policies,
-- but cannot satisfy these write policies, even when calling Supabase directly.
create or replace function private.can_manage_workspace()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and role in ('admin', 'manager')
  );
$$;
revoke all on function private.can_manage_workspace() from public, anon;
grant execute on function private.can_manage_workspace() to authenticated;
