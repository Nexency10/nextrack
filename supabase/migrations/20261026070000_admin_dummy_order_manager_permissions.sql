-- Let active admins authorize one or more linked sales managers to create
-- dummy orders. The database policy remains the final authorization boundary.
create table if not exists public.dummy_order_manager_permissions (
  manager_id uuid primary key references public.sales_managers (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists dummy_order_manager_permissions_granted_by_idx
  on public.dummy_order_manager_permissions (granted_by);

alter table public.dummy_order_manager_permissions enable row level security;
revoke all on public.dummy_order_manager_permissions from anon, authenticated;
grant select, insert, update, delete on public.dummy_order_manager_permissions to authenticated;

drop policy if exists "Admins and assigned managers read dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins and assigned managers read dummy permissions"
  on public.dummy_order_manager_permissions for select to authenticated
  using (
    (select private.is_active_admin())
    or exists (
      select 1 from public.sales_managers sm
      join public.profiles p on p.id = sm.profile_id
      where sm.id = manager_id
        and p.id = (select auth.uid())
        and p.role = 'manager'
        and p.status = 'active'
    )
  );

drop policy if exists "Admins manage dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins manage dummy permissions"
  on public.dummy_order_manager_permissions for insert to authenticated
  with check (
    (select private.is_active_admin())
    and exists (
      select 1 from public.sales_managers sm
      join public.profiles p on p.id = sm.profile_id
      where sm.id = manager_id
        and sm.active
        and p.role = 'manager'
        and p.status = 'active'
    )
  );

drop policy if exists "Admins update dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins update dummy permissions"
  on public.dummy_order_manager_permissions for update to authenticated
  using ((select private.is_active_admin()))
  with check (
    (select private.is_active_admin())
    and exists (
      select 1 from public.sales_managers sm
      join public.profiles p on p.id = sm.profile_id
      where sm.id = manager_id and sm.active and p.role = 'manager' and p.status = 'active'
    )
  );

drop policy if exists "Admins revoke dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins revoke dummy permissions"
  on public.dummy_order_manager_permissions for delete to authenticated
  using ((select private.is_active_admin()));

create or replace function private.can_create_dummy_order()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role = 'admin'
  ) or exists (
    select 1
    from public.profiles p
    join public.sales_managers sm on sm.profile_id = p.id
    join public.dummy_order_manager_permissions permission on permission.manager_id = sm.id
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role = 'manager'
      and sm.active
  );
$$;
revoke all on function private.can_create_dummy_order() from public, anon;
grant execute on function private.can_create_dummy_order() to authenticated;

drop policy if exists "Managers create orders" on public.orders;
create policy "Authorized members create orders"
  on public.orders for insert to authenticated
  with check (
    (select private.can_manage_workspace())
    and (order_type = 'real' or (select private.can_create_dummy_order()))
    and (
      (select private.is_active_admin())
      or exists (
        select 1 from public.sales_managers own_manager
        where own_manager.id = manager_id
          and own_manager.profile_id = (select auth.uid())
          and own_manager.account_id = orders.account_id
          and own_manager.active
      )
    )
  );
