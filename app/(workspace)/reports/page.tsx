import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageLoader } from "@/components/page-loader";
import { ReportsWorkspace, type AccountReport, type ManagerReport } from "@/components/reports/reports-workspace";
import { toCents } from "@/lib/accounts/money";
import { createClient } from "@/lib/supabase/server";

type AccountRow = { id: string; name: string; active: boolean };
type ManagerRow = { id: string; name: string; account_id: string; target: number | string; active: boolean };
type OrderRow = { account_id: string; platform: string; amount: number | string; seller_receives: number | string; manager_id: string | null };

export default function ReportsPage() {
  return <Suspense fallback={<PageLoader />}><ReportsContent /></Suspense>;
}

async function ReportsContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");

  const [accountsResult, managersResult, ordersResult] = await Promise.all([
    supabase.from("accounts").select("id, name, active").order("name"),
    supabase.from("sales_managers").select("id, name, account_id, target, active").order("name"),
    supabase.from("orders").select("account_id, platform, amount, seller_receives, manager_id").eq("order_type", "real").neq("status", "Cancelled"),
  ]);
  const error = accountsResult.error ?? managersResult.error ?? ordersResult.error;
  if (error) return <ReportsError message={error.message} />;

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const managers = (managersResult.data ?? []) as ManagerRow[];
  const orders = (ordersResult.data ?? []) as OrderRow[];
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const accountTotals = new Map(accounts.map((account) => [account.id, { orderCount: 0, sales: 0n, net: 0n, platforms: new Map<string, { orderCount: number; sales: bigint; net: bigint }>() }]));
  const managerTotals = new Map(managers.map((manager) => [manager.id, { sales: 0n, orderCount: 0 }]));
  const platformTotals = new Map<string, bigint>();
  let totalSales = 0n;
  let totalNet = 0n;

  for (const order of orders) {
    const amount = toCents(order.amount);
    const net = toCents(order.seller_receives);
    totalSales += amount;
    totalNet += net;
    platformTotals.set(order.platform, (platformTotals.get(order.platform) ?? 0n) + amount);

    const accountTotal = accountTotals.get(order.account_id);
    if (accountTotal) {
      accountTotal.orderCount += 1;
      accountTotal.sales += amount;
      accountTotal.net += net;
      const platform = accountTotal.platforms.get(order.platform) ?? { orderCount: 0, sales: 0n, net: 0n };
      platform.orderCount += 1;
      platform.sales += amount;
      platform.net += net;
      accountTotal.platforms.set(order.platform, platform);
    }

    if (order.manager_id) {
      const managerTotal = managerTotals.get(order.manager_id);
      if (managerTotal) {
        managerTotal.sales += amount;
        managerTotal.orderCount += 1;
      }
    }
  }

  const accountReports: AccountReport[] = accounts.map((account) => {
    const totals = accountTotals.get(account.id)!;
    return {
      id: account.id,
      name: account.name,
      active: account.active,
      orderCount: totals.orderCount,
      salesCents: totals.sales.toString(),
      netCents: totals.net.toString(),
      platforms: [...totals.platforms.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([platform, values]) => ({
        platform,
        orderCount: values.orderCount,
        salesCents: values.sales.toString(),
        netCents: values.net.toString(),
      })),
    };
  });

  const managerReports: ManagerReport[] = managers.map((manager) => {
    const totals = managerTotals.get(manager.id)!;
    return {
      id: manager.id,
      name: manager.name,
      accountName: accountById.get(manager.account_id)?.name ?? "Unknown account",
      active: manager.active,
      targetCents: toCents(manager.target).toString(),
      salesCents: totals.sales.toString(),
      orderCount: totals.orderCount,
    };
  });

  return <ReportsWorkspace
    company={{ salesCents: totalSales.toString(), netCents: totalNet.toString(), orderCount: orders.length, averageCents: orders.length ? ((totalSales + BigInt(orders.length) / 2n) / BigInt(orders.length)).toString() : "0" }}
    accounts={accountReports}
    managers={managerReports}
    platforms={[...platformTotals.entries()].sort(([, a], [, b]) => a > b ? -1 : a < b ? 1 : 0).map(([label, value]) => ({ label, value: Number(value) / 100 }))}
  />;
}

function ReportsError({ message }: { message: string }) {
  return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h1 className="text-base font-semibold text-amber-950">Reports are not ready</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{message}. Check the Supabase setup, then refresh this page.</p></section></div>;
}
