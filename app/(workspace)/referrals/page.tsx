import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageLoader } from "@/components/page-loader";
import { ReferralLedger, type ReferralRow } from "@/components/referrals/referral-ledger";
import { createRequestClient } from "@/lib/supabase/request";

export default function ReferralsPage() {
  return <Suspense fallback={<PageLoader />}><ReferralContent /></Suspense>;
}

async function ReferralContent() {
  const supabase = await createRequestClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");
  const [referralsResult, accountsResult] = await Promise.all([
    supabase.from("orders").select("id, order_date, account_id, platform, amount, has_referral, referral_percent, referral_gross, referral_net, referral_client_name, referral_source_client, referral_link, status").eq("has_referral", true).order("order_date", { ascending: false }),
    supabase.from("accounts").select("id, name").order("name"),
  ]);
  if (referralsResult.error || accountsResult.error) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h1 className="text-base font-semibold text-amber-950">Referral ledger is not ready</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{referralsResult.error?.message ?? accountsResult.error?.message}. Apply the referral ledger migration and refresh.</p></section></div>;
  const accountNames = new Map((accountsResult.data ?? []).map((account) => [account.id, account.name]));
  const rows: ReferralRow[] = (referralsResult.data ?? []).map((row) => ({
    id: row.id, date: row.order_date, accountId: row.account_id, account: accountNames.get(row.account_id) ?? "Unknown account",
    platform: row.platform, amount: String(row.amount), percent: String(row.referral_percent), gross: String(row.referral_gross), net: String(row.referral_net),
    client: row.referral_client_name, source: row.referral_source_client, link: row.referral_link, status: row.status,
  }));
  return <ReferralLedger rows={rows} accounts={[...(accountsResult.data ?? [])]} />;
}
