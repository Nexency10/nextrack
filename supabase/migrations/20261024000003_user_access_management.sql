-- Add a workspace-level ban state and link manager assignments to Auth users.
-- Deleting an Auth user cascades through profiles and manager assignments;
-- existing orders retain their history with manager_id set to NULL.

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'active', 'banned'));

alter table public.sales_managers
  add column if not exists profile_id uuid references public.profiles (id) on delete cascade;

create unique index if not exists sales_managers_profile_id_unique
  on public.sales_managers (profile_id);

create index if not exists profiles_status_created_at_idx
  on public.profiles (status, created_at);
