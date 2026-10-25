-- Recovery for projects where Auth users existed before the profile trigger was
-- installed, or where an earlier setup left profiles without an active admin.
-- Keep the earliest profile as the one-time administrator only when none exists.
do $$
declare
  first_profile_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('nextrack-first-admin'));

  if not exists (
    select 1 from public.profiles where role = 'admin' and status = 'active'
  ) then
    select id
      into first_profile_id
      from public.profiles
      order by created_at, id
      limit 1
      for update;

    if first_profile_id is not null then
      update public.profiles
         set role = 'admin', status = 'active'
       where id = first_profile_id;
    end if;
  end if;
end;
$$;
