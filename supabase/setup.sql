-- Source: supabase/migrations/20261024000000_profiles_and_access.sql
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  username text,
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'manager', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'banned')),
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,24}$')
);

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
alter table public.profiles alter column role set not null;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'viewer'));

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username)) where username is not null;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'active', 'banned'));

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

-- Source: supabase/migrations/20261024000001_bootstrap_admin_if_missing.sql
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

-- Source: supabase/migrations/20261024000002_dashboard_data.sql
-- Core persisted data for the Tracking Hub dashboard and order calculations.
create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  real_fee_percent numeric(5, 2) not null default 20 check (real_fee_percent between 0 and 100),
  dummy_payout_percent numeric(5, 2) not null default 80 check (dummy_payout_percent between 0 and 100),
  default_discount_percent numeric(5, 2) not null default 10 check (default_discount_percent between 0 and 100),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_managers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  account_id uuid not null references public.accounts (id) on delete cascade,
  target numeric(14, 2) not null default 0 check (target >= 0),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_managers
  add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
create unique index if not exists sales_managers_profile_id_unique
  on public.sales_managers (profile_id);

create table if not exists public.dummy_order_manager_permissions (
  manager_id uuid primary key references public.sales_managers (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists dummy_order_manager_permissions_granted_by_idx
  on public.dummy_order_manager_permissions (granted_by);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_date date not null default current_date,
  account_id uuid not null references public.accounts (id) on delete restrict,
  platform text not null check (platform in ('WordPress', 'Squarespace', 'Wix', 'Shopify', 'Webflow')),
  order_type text not null check (order_type in ('real', 'dummy')),
  amount numeric(14, 2) not null check (amount > 0),
  service_fee numeric(14, 2) not null default 0 check (service_fee >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  platform_fee_percent numeric(5, 2) check (platform_fee_percent between 0 and 100),
  dummy_payout_percent numeric(5, 2) check (dummy_payout_percent between 0 and 100),
  platform_fee_amount numeric(14, 2) not null default 0,
  buyer_paid numeric(14, 2) not null default 0,
  seller_receives numeric(14, 2) not null default 0,
  profit_loss numeric(14, 2) not null default 0,
  manager_id uuid references public.sales_managers (id) on delete set null,
  status text not null default 'Completed' check (status in ('Completed', 'Pending', 'Cancelled')),
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_dashboard_status_type_date_idx
  on public.orders (status, order_type, order_date desc);
create index if not exists orders_account_status_type_idx
  on public.orders (account_id, status, order_type);
create index if not exists orders_platform_status_type_idx
  on public.orders (platform, status, order_type);
create index if not exists sales_managers_account_id_idx
  on public.sales_managers (account_id);

-- A safe aggregate count lets non-admins see the legacy all-order KPI without
-- granting them SELECT access to private dummy-order rows.
create table if not exists public.dashboard_counts (
  id smallint primary key default 1 check (id = 1),
  total_order_count bigint not null default 0 check (total_order_count >= 0),
  updated_at timestamptz not null default now()
);

insert into public.dashboard_counts (id, total_order_count)
select 1, count(*) from public.orders where status <> 'Cancelled'
on conflict (id) do update
set total_order_count = excluded.total_order_count, updated_at = now();

create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;
revoke all on function private.is_active_member() from public, anon;
grant execute on function private.is_active_member() to authenticated;

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

create or replace function private.can_create_dummy_order()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active' and p.role = 'admin'
  ) or exists (
    select 1
    from public.profiles p
    join public.sales_managers sm on sm.profile_id = p.id
    join public.dummy_order_manager_permissions permission on permission.manager_id = sm.id
    where p.id = (select auth.uid()) and p.status = 'active' and p.role = 'manager' and sm.active
  );
$$;
revoke all on function private.can_create_dummy_order() from public, anon;
grant execute on function private.can_create_dummy_order() to authenticated;

create or replace function private.adjust_dashboard_order_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  count_delta integer;
begin
  if tg_op = 'INSERT' then
    count_delta := case when new.status <> 'Cancelled' then 1 else 0 end;
  elsif tg_op = 'DELETE' then
    count_delta := case when old.status <> 'Cancelled' then -1 else 0 end;
  else
    count_delta := (case when new.status <> 'Cancelled' then 1 else 0 end)
      - (case when old.status <> 'Cancelled' then 1 else 0 end);
  end if;

  if count_delta <> 0 then
    update public.dashboard_counts
       set total_order_count = total_order_count + count_delta,
           updated_at = now()
     where id = 1;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.adjust_dashboard_order_count() from public, anon, authenticated;

drop trigger if exists adjust_dashboard_order_count on public.orders;
create trigger adjust_dashboard_order_count
  after insert or delete or update of status on public.orders
  for each row execute function private.adjust_dashboard_order_count();

create or replace function private.calculate_order_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_real_fee numeric(5, 2);
  current_dummy_payout numeric(5, 2);
begin
  select real_fee_percent, dummy_payout_percent
    into current_real_fee, current_dummy_payout
    from public.app_settings where id = 1;

  if new.order_type = 'real' then
    new.platform_fee_percent := coalesce(new.platform_fee_percent, current_real_fee);
    new.dummy_payout_percent := null;
    new.buyer_paid := round(new.amount + new.service_fee, 2);
    new.platform_fee_amount := round(new.amount * new.platform_fee_percent / 100, 2);
    new.seller_receives := round(new.amount - new.platform_fee_amount, 2);
    new.profit_loss := new.seller_receives;
  else
    new.dummy_payout_percent := coalesce(new.dummy_payout_percent, current_dummy_payout);
    new.platform_fee_percent := null;
    new.buyer_paid := round((new.amount + new.service_fee) * (1 - new.discount_percent / 100), 2);
    new.platform_fee_amount := 0;
    new.seller_receives := round(new.amount * new.dummy_payout_percent / 100, 2);
    new.profit_loss := -greatest(0, new.buyer_paid - new.seller_receives);
  end if;

  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.calculate_order_totals() from public, anon, authenticated;

drop trigger if exists calculate_order_totals on public.orders;
create trigger calculate_order_totals
  before insert or update of order_type, amount, service_fee, discount_percent, platform_fee_percent, dummy_payout_percent
  on public.orders
  for each row execute function private.calculate_order_totals();

alter table public.app_settings enable row level security;
alter table public.accounts enable row level security;
alter table public.sales_managers enable row level security;
alter table public.dummy_order_manager_permissions enable row level security;
alter table public.orders enable row level security;
alter table public.dashboard_counts enable row level security;

revoke all on public.app_settings, public.accounts, public.sales_managers, public.orders, public.dashboard_counts from anon, authenticated;
revoke all on public.dummy_order_manager_permissions from anon, authenticated;
grant select on public.app_settings, public.accounts, public.sales_managers, public.orders, public.dashboard_counts to authenticated;
grant select, insert, update, delete on public.dummy_order_manager_permissions to authenticated;
grant insert, update, delete on public.accounts, public.sales_managers to authenticated;
grant insert, update, delete on public.orders to authenticated;
grant update (real_fee_percent, dummy_payout_percent, default_discount_percent) on public.app_settings to authenticated;

drop policy if exists "Active members read workspace settings" on public.app_settings;
create policy "Active members read workspace settings"
  on public.app_settings for select to authenticated
  using ((select private.is_active_member()));
drop policy if exists "Admins update workspace settings" on public.app_settings;
create policy "Admins update workspace settings"
  on public.app_settings for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists "Active members read accounts" on public.accounts;
create policy "Active members read accounts"
  on public.accounts for select to authenticated
  using ((select private.is_active_member()));
drop policy if exists "Managers manage accounts" on public.accounts;
create policy "Managers create accounts"
  on public.accounts for insert to authenticated
  with check ((select private.can_manage_workspace()));
drop policy if exists "Managers update accounts" on public.accounts;
create policy "Managers update accounts"
  on public.accounts for update to authenticated
  using ((select private.can_manage_workspace()))
  with check ((select private.can_manage_workspace()));
drop policy if exists "Managers delete accounts" on public.accounts;
drop policy if exists "Admins delete accounts" on public.accounts;
create policy "Admins delete accounts"
  on public.accounts for delete to authenticated
  using ((select private.is_active_admin()));

drop policy if exists "Active members read sales managers" on public.sales_managers;
create policy "Active members read sales managers"
  on public.sales_managers for select to authenticated
  using ((select private.is_active_member()));
drop policy if exists "Managers manage sales managers" on public.sales_managers;
create policy "Managers create sales managers"
  on public.sales_managers for insert to authenticated
  with check ((select private.can_manage_workspace()));
drop policy if exists "Managers update sales managers" on public.sales_managers;
create policy "Managers update sales managers"
  on public.sales_managers for update to authenticated
  using ((select private.can_manage_workspace()))
  with check ((select private.can_manage_workspace()));
drop policy if exists "Managers delete sales managers" on public.sales_managers;
create policy "Managers delete sales managers"
  on public.sales_managers for delete to authenticated
  using ((select private.can_manage_workspace()));

drop policy if exists "Active members read dashboard counts" on public.dashboard_counts;
create policy "Active members read dashboard counts"
  on public.dashboard_counts for select to authenticated
  using ((select private.is_active_member()));

drop policy if exists "Members read real orders and admins read all" on public.orders;
create policy "Members read real orders and admins read all"
  on public.orders for select to authenticated
  using (
    (select private.is_active_member())
    and (order_type = 'real' or (select private.is_active_admin()))
  );
drop policy if exists "Managers create orders" on public.orders;
drop policy if exists "Authorized members create orders" on public.orders;
create policy "Authorized members create orders"
  on public.orders for insert to authenticated
  with check (
    (select private.can_manage_workspace())
    and (order_type = 'real' or (select private.can_create_dummy_order()))
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
drop policy if exists "Admins and assigned managers read dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins and assigned managers read dummy permissions"
  on public.dummy_order_manager_permissions for select to authenticated
  using (
    (select private.is_active_admin())
    or exists (
      select 1 from public.sales_managers sm join public.profiles p on p.id = sm.profile_id
      where sm.id = manager_id and p.id = (select auth.uid()) and p.role = 'manager' and p.status = 'active'
    )
  );
drop policy if exists "Admins manage dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins manage dummy permissions"
  on public.dummy_order_manager_permissions for insert to authenticated
  with check (
    (select private.is_active_admin())
    and exists (
      select 1 from public.sales_managers sm join public.profiles p on p.id = sm.profile_id
      where sm.id = manager_id and sm.active and p.role = 'manager' and p.status = 'active'
    )
  );
drop policy if exists "Admins update dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins update dummy permissions"
  on public.dummy_order_manager_permissions for update to authenticated
  using ((select private.is_active_admin()))
  with check (
    (select private.is_active_admin())
    and exists (
      select 1 from public.sales_managers sm join public.profiles p on p.id = sm.profile_id
      where sm.id = manager_id and sm.active and p.role = 'manager' and p.status = 'active'
    )
  );
drop policy if exists "Admins revoke dummy permissions" on public.dummy_order_manager_permissions;
create policy "Admins revoke dummy permissions"
  on public.dummy_order_manager_permissions for delete to authenticated
  using ((select private.is_active_admin()));
drop policy if exists "Managers update orders" on public.orders;
create policy "Managers update orders"
  on public.orders for update to authenticated
  using ((select private.can_manage_workspace()))
  with check ((select private.can_manage_workspace()));
drop policy if exists "Managers delete orders" on public.orders;
create policy "Managers delete orders"
  on public.orders for delete to authenticated
  using ((select private.can_manage_workspace()));

-- The function returns only dashboard aggregates. Dummy order details stay out
-- of the normal order API; private finance aggregates are returned to admins.
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

  if not exists (
    select 1 from public.profiles
    where id = current_user_id and status = 'active'
  ) then
    raise exception 'Active workspace access required' using errcode = '42501';
  end if;

  admin_access := exists (
    select 1 from public.profiles
    where id = current_user_id and role = 'admin' and status = 'active'
  );

  select jsonb_build_object(
    'totalSales', coalesce(sum(amount) filter (where order_type = 'real'), 0),
    'netRevenue', coalesce(sum(seller_receives) filter (where order_type = 'real'), 0),
    'realOrderCount', count(*) filter (where order_type = 'real'),
    'totalOrderCount', coalesce((select total_order_count from public.dashboard_counts where id = 1), 0),
    'privateMetrics', case when admin_access then jsonb_build_object(
      'dummyOrderCount', count(*) filter (where order_type = 'dummy'),
      'investment', coalesce(sum(buyer_paid) filter (where order_type = 'dummy'), 0),
      'sellerReceives', coalesce(sum(seller_receives) filter (where order_type = 'dummy'), 0),
      'loss', coalesce(sum(abs(profit_loss)) filter (where order_type = 'dummy'), 0)
    ) else null end
  )
  into result
  from public.orders
  where status <> 'Cancelled';

  result := result || jsonb_build_object(
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

  return result;
end;
$$;
revoke all on function public.get_dashboard_metrics() from public, anon;
grant execute on function public.get_dashboard_metrics() to authenticated;

-- Refresh the PostgREST schema cache after creating the tables.
NOTIFY pgrst, 'reload schema';


-- Source: supabase/migrations/20261026062620_admin_salary_management.sql
-- Employee roster and monthly payroll snapshots. All salary and bank data is
-- restricted to active administrators through both RLS and server actions.
create table if not exists public.salary_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  designation text not null default '' check (length(designation) <= 120),
  mobile text not null default '' check (length(mobile) <= 40),
  current_salary numeric(12, 2) not null check (current_salary >= 0),
  bank_name text not null default '' check (length(bank_name) <= 120),
  bank_branch text not null default '' check (length(bank_branch) <= 120),
  bank_account text not null default '' check (length(bank_account) <= 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists salary_employees_active_name_idx
  on public.salary_employees (name)
  where active;

create table if not exists public.salary_payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.salary_employees (id) on delete restrict,
  pay_period date not null check (extract(day from pay_period) = 1),
  employee_name text not null,
  designation text not null default '',
  mobile text not null default '',
  base_salary numeric(12, 2) not null check (base_salary >= 0),
  leave_deduction numeric(12, 2) not null default 0
    check (leave_deduction >= 0 and leave_deduction <= base_salary),
  net_pay numeric(12, 2) generated always as (base_salary - leave_deduction) stored,
  bank_name text not null default '',
  bank_branch text not null default '',
  bank_account text not null default '',
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint salary_payroll_employee_period_unique unique (employee_id, pay_period),
  constraint salary_payroll_payment_timestamp_check check (
    (status = 'pending' and paid_at is null)
    or (status = 'paid' and paid_at is not null)
  )
);

create index if not exists salary_payroll_period_name_idx
  on public.salary_payroll (pay_period desc, employee_name);

alter table public.salary_employees enable row level security;
alter table public.salary_payroll enable row level security;

revoke all on public.salary_employees, public.salary_payroll from anon, authenticated;
grant select, insert, update, delete on public.salary_employees, public.salary_payroll to authenticated;

drop policy if exists "Active admins read salary employees" on public.salary_employees;
create policy "Active admins read salary employees"
  on public.salary_employees for select to authenticated
  using ((select private.is_active_admin()));

drop policy if exists "Active admins create salary employees" on public.salary_employees;
create policy "Active admins create salary employees"
  on public.salary_employees for insert to authenticated
  with check ((select private.is_active_admin()));

drop policy if exists "Active admins update salary employees" on public.salary_employees;
create policy "Active admins update salary employees"
  on public.salary_employees for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists "Active admins delete salary employees" on public.salary_employees;
create policy "Active admins delete salary employees"
  on public.salary_employees for delete to authenticated
  using ((select private.is_active_admin()));

drop policy if exists "Active admins read salary payroll" on public.salary_payroll;
create policy "Active admins read salary payroll"
  on public.salary_payroll for select to authenticated
  using ((select private.is_active_admin()));

drop policy if exists "Active admins create salary payroll" on public.salary_payroll;
create policy "Active admins create salary payroll"
  on public.salary_payroll for insert to authenticated
  with check (
    (select private.is_active_admin())
    and status = 'pending'
    and paid_at is null
  );

drop policy if exists "Active admins update pending salary payroll" on public.salary_payroll;
create policy "Active admins update pending salary payroll"
  on public.salary_payroll for update to authenticated
  using ((select private.is_active_admin()) and status = 'pending')
  with check ((select private.is_active_admin()));

drop policy if exists "Active admins delete pending salary payroll" on public.salary_payroll;
create policy "Active admins delete pending salary payroll"
  on public.salary_payroll for delete to authenticated
  using ((select private.is_active_admin()) and status = 'pending');

NOTIFY pgrst, 'reload schema';

