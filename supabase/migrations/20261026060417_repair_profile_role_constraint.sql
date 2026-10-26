-- Repair legacy role checks that can reject the viewer role assigned by the
-- auth.users profile trigger. Remove every check involving role before mapping
-- legacy values so the normalization itself cannot be rejected by that check.
begin;

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

  if role_attnum is null then
    raise exception 'public.profiles.role does not exist';
  end if;

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

-- NexTrack only supports these roles. Legacy or unknown roles become read-only
-- viewers; preserve admin and manager assignments.
update public.profiles
   set role = 'viewer'
 where role not in ('admin', 'manager', 'viewer');

alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column role set not null;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'viewer'));

-- Ensure the live signup trigger writes the same canonical roles allowed above.
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

commit;
