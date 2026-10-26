-- Dashboard calculations and reports contain workspace-wide financial data.
-- Keep dashboard aggregates and their cached total order count admin-only.
drop policy if exists "Active members read dashboard counts" on public.dashboard_counts;
drop policy if exists "Admins read dashboard counts" on public.dashboard_counts;
create policy "Admins read dashboard counts"
  on public.dashboard_counts for select to authenticated
  using ((select private.is_active_admin()));

-- The RPC is callable by authenticated clients, so enforce the role inside the
-- function as well as in the dashboard UI and route guards.
create or replace function public.get_dashboard_metrics()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  admin_access boolean;
  result jsonb;
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  admin_access := exists (
    select 1 from public.profiles
    where id = current_user_id and role = 'admin' and status = 'active'
  );
  if not admin_access then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalSales', coalesce(sum(amount) filter (where order_type = 'real'), 0),
    'netRevenue', coalesce(sum(seller_receives) filter (where order_type = 'real'), 0),
    'realOrderCount', count(*) filter (where order_type = 'real'),
    'totalOrderCount', coalesce((select total_order_count from public.dashboard_counts where id = 1), 0),
    'privateMetrics', jsonb_build_object(
      'dummyOrderCount', count(*) filter (where order_type = 'dummy'),
      'investment', coalesce(sum(buyer_paid) filter (where order_type = 'dummy'), 0),
      'sellerReceives', coalesce(sum(seller_receives) filter (where order_type = 'dummy'), 0),
      'loss', coalesce(sum(abs(profit_loss)) filter (where order_type = 'dummy'), 0)
    )
  )
  into result
  from public.orders
  where status <> 'Cancelled';

  return result || jsonb_build_object(
    'salesByPlatform', coalesce((
      select jsonb_agg(jsonb_build_object('label', platform, 'value', sales) order by sales desc, platform)
      from (
        select platform, sum(amount) as sales
        from public.orders
        where status <> 'Cancelled' and order_type = 'real'
        group by platform
      ) as platform_totals
    ), '[]'::jsonb),
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'active', a.active,
        'realOrderCount', coalesce(s.real_order_count, 0),
        'sales', coalesce(s.sales, 0),
        'netRevenue', coalesce(s.net_revenue, 0)
      ) order by a.name)
      from public.accounts as a
      left join lateral (
        select count(*) as real_order_count,
               coalesce(sum(o.amount), 0) as sales,
               coalesce(sum(o.seller_receives), 0) as net_revenue
        from public.orders as o
        where o.account_id = a.id
          and o.status <> 'Cancelled'
          and o.order_type = 'real'
      ) as s on true
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_dashboard_metrics() from public, anon;
grant execute on function public.get_dashboard_metrics() to authenticated;

notify pgrst, 'reload schema';
