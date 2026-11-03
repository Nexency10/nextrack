alter table public.app_settings
  add column if not exists default_referral_percent numeric(5, 2) not null default 10
  check (default_referral_percent between 0 and 100);

alter table public.orders
  add column if not exists has_referral boolean not null default false,
  add column if not exists referral_percent numeric(5, 2) not null default 0 check (referral_percent between 0 and 100),
  add column if not exists referral_gross numeric(14, 2) not null default 0,
  add column if not exists referral_net numeric(14, 2) not null default 0,
  add column if not exists referral_client_name text not null default '',
  add column if not exists referral_source_client text not null default '',
  add column if not exists referral_link text not null default '';

create index if not exists orders_referral_account_date_idx
  on public.orders (account_id, order_date desc) where has_referral;

create or replace function private.calculate_order_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_real_fee numeric(5, 2);
  current_dummy_payout numeric(5, 2);
  referral_fee numeric(14, 2);
begin
  select real_fee_percent, dummy_payout_percent
    into current_real_fee, current_dummy_payout
    from public.app_settings where id = 1;

  if new.order_type = 'real' then
    new.platform_fee_percent := coalesce(new.platform_fee_percent, current_real_fee);
    new.dummy_payout_percent := null;
    new.buyer_paid := round(new.amount + new.service_fee, 2);
    new.platform_fee_amount := round(new.amount * new.platform_fee_percent / 100, 2);
    new.referral_gross := case when new.has_referral then round(new.amount * new.referral_percent / 100, 2) else 0 end;
    referral_fee := round(new.referral_gross * new.platform_fee_percent / 100, 2);
    new.referral_net := new.referral_gross - referral_fee;
    new.seller_receives := round(new.amount - new.platform_fee_amount + new.referral_net, 2);
    new.profit_loss := new.seller_receives;
  else
    new.dummy_payout_percent := coalesce(new.dummy_payout_percent, current_dummy_payout);
    new.platform_fee_percent := null;
    new.buyer_paid := round((new.amount + new.service_fee) * (1 - new.discount_percent / 100), 2);
    new.platform_fee_amount := 0;
    new.referral_gross := case when new.has_referral then round(new.amount * new.referral_percent / 100, 2) else 0 end;
    referral_fee := round(new.referral_gross * current_real_fee / 100, 2);
    new.referral_net := new.referral_gross - referral_fee;
    new.seller_receives := round(new.amount * new.dummy_payout_percent / 100 + new.referral_net, 2);
    new.profit_loss := -greatest(0, new.buyer_paid - new.seller_receives);
  end if;

  if not new.has_referral then
    new.referral_percent := 0;
    new.referral_client_name := '';
    new.referral_source_client := '';
    new.referral_link := '';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calculate_order_totals on public.orders;
create trigger calculate_order_totals
  before insert or update of order_type, amount, service_fee, discount_percent, platform_fee_percent, dummy_payout_percent,
    has_referral, referral_percent
  on public.orders for each row execute function private.calculate_order_totals();

grant update (default_referral_percent) on public.app_settings to authenticated;

notify pgrst, 'reload schema';
