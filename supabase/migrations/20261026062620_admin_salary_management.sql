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

notify pgrst, 'reload schema';
