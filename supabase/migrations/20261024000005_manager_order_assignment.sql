-- A sales manager can only create orders attached to their own active manager
-- profile and its assigned account. Administrators can still assign any manager
-- or leave an order unassigned.

drop policy if exists "Managers create orders" on public.orders;
create policy "Managers create orders"
  on public.orders for insert to authenticated
  with check (
    (select private.can_manage_workspace())
    and (order_type = 'real' or (select private.is_active_admin()))
    and (
      (select private.is_active_admin())
      or exists (
        select 1 from public.sales_managers as own_manager
        where own_manager.id = manager_id
          and own_manager.profile_id = (select auth.uid())
          and own_manager.account_id = orders.account_id
          and own_manager.active
      )
    )
  );
