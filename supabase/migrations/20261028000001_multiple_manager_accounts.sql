-- Allow each linked sales-manager user to work across multiple accounts.
create table if not exists public.sales_manager_accounts (
  manager_id uuid not null references public.sales_managers (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (manager_id, account_id)
);

create index if not exists sales_manager_accounts_account_id_idx
  on public.sales_manager_accounts (account_id);

-- Preserve every existing manager's current account assignment.
insert into public.sales_manager_accounts (manager_id, account_id)
select id, account_id from public.sales_managers
on conflict do nothing;

alter table public.sales_manager_accounts enable row level security;
revoke all on public.sales_manager_accounts from anon, authenticated;
grant select, insert, update, delete on public.sales_manager_accounts to authenticated;

create policy "Active members read manager account assignments"
  on public.sales_manager_accounts for select to authenticated
  using ((select private.is_active_member()));

create policy "Admins and managers manage account assignments"
  on public.sales_manager_accounts for all to authenticated
  using ((select private.can_manage_workspace()))
  with check ((select private.can_manage_workspace()));

-- A linked manager may create orders for any assigned account. Standalone
-- manager records continue to use their legacy account_id.
drop policy if exists "Authorized members create orders" on public.orders;
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
          and own_manager.active
          and exists (
            select 1 from public.sales_manager_accounts assignment
            where assignment.manager_id = own_manager.id
              and assignment.account_id = orders.account_id
          )
      )
    )
  );
