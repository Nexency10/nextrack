import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountOverview, type AccountCardData, type AccountPlatformData } from "@/components/accounts/account-overview";
import { PageLoader } from "@/components/page-loader";
import { formatCents, toCents } from "@/lib/accounts/money";
import { createClient } from "@/lib/supabase/server";

type AccountRow = { id: string; name: string; active: boolean };
type OrderRow = { account_id: string; platform: string; order_type: "real" | "dummy"; amount: number | string; seller_receives: number | string; status: string };

export default function AccountsPage() {
  return <Suspense fallback={<PageLoader />}><AccountsContent /></Suspense>;
}

async function AccountsContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");

  const [accountsResult, ordersResult] = await Promise.all([
    supabase.from("accounts").select("id, name, active").order("name"),
    supabase.from("orders").select("account_id, platform, order_type, amount, seller_receives, status"),
  ]);
  if (accountsResult.error || ordersResult.error) return <AccountDataError message={(accountsResult.error ?? ordersResult.error)?.message ?? "Account data is unavailable."} />;

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const orders = (ordersResult.data ?? []) as OrderRow[];
  const isAdmin = profile.role === "admin";
  const accountCards: AccountCardData[] = accounts.map((account) => {
    const accountOrders = orders.filter((order) => order.account_id === account.id && order.status !== "Cancelled");
    const realOrders = accountOrders.filter((order) => order.order_type === "real");
    const dummyOrders = accountOrders.filter((order) => order.order_type === "dummy");
    return {
      id: account.id,
      name: account.name,
      active: account.active,
      realOrders: realOrders.length,
      dummyOrders: isAdmin ? dummyOrders.length : null,
      visibleOrders: accountOrders.length,
      sales: formatCents(realOrders.reduce((total, order) => total + toCents(order.amount), 0n)),
      netRevenue: formatCents(realOrders.reduce((total, order) => total + toCents(order.seller_receives), 0n)),
    };
  });

  const platformRows: AccountPlatformData[] = [];
  for (const account of accounts) {
    const accountOrders = orders.filter((order) => order.account_id === account.id && order.status !== "Cancelled");
    const platforms = [...new Set(accountOrders.map((order) => order.platform))].sort();
    for (const platform of platforms) {
      const platformOrders = accountOrders.filter((order) => order.platform === platform);
      const realOrders = platformOrders.filter((order) => order.order_type === "real");
      const dummyOrders = platformOrders.filter((order) => order.order_type === "dummy");
      platformRows.push({
        accountId: account.id,
        accountName: account.name,
        platform,
        realOrders: realOrders.length,
        dummyOrders: isAdmin ? dummyOrders.length : null,
        visibleOrders: platformOrders.length,
        sales: formatCents(realOrders.reduce((total, order) => total + toCents(order.amount), 0n)),
        netRevenue: formatCents(realOrders.reduce((total, order) => total + toCents(order.seller_receives), 0n)),
      });
    }
  }

  return <AccountOverview accounts={accountCards} platformRows={platformRows} canManage={["admin", "manager"].includes(profile.role)} isAdmin={isAdmin} />;
}

function AccountDataError({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f4f6fb] p-5 text-[#191b2b]"><section className="w-full max-w-xl rounded-[20px] border border-amber-200 bg-amber-50 p-7"><h1 className="text-lg font-semibold">Accounts are not ready</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{message}. Apply the Supabase setup SQL and refresh this page.</p></section></main>;
}
