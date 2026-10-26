-- Only active administrators may remove accounts. Keep the check in RLS so it
-- also applies to direct authenticated database requests.
drop policy if exists "Managers delete accounts" on public.accounts;
drop policy if exists "Admins delete accounts" on public.accounts;

create policy "Admins delete accounts"
  on public.accounts for delete to authenticated
  using ((select private.is_active_admin()));
