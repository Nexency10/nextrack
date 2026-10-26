import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageLoader } from "@/components/page-loader";
import { PrivateFinanceWorkspace, type DummyOrderItem, type PlatformFinanceItem } from "@/components/private-finance/private-finance-workspace";
import { toCents } from "@/lib/accounts/money";
import { createClient } from "@/lib/supabase/server";

type DummyOrderRow = {
  id: string;
  order_date: string;
  account_id: string;
  platform: string;
  amount: number | string;
  buyer_paid: number | string;
  seller_receives: number | string;
  profit_loss: number | string;
  status: string;
};
type AccountRow = { id: string; name: string };

export default function PrivateFinancePage() {
  return <Suspense fallback={<PageLoader />}><PrivateFinanceContent /></Suspense>;
}

async function PrivateFinanceContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active" || profile.role !== "admin") redirect("/dashboard");

  const [ordersResult, accountsResult] = await Promise.all([
    supabase.from("orders").select("id, order_date, account_id, platform, amount, buyer_paid, seller_receives, profit_loss, status").eq("order_type", "dummy").neq("status", "Cancelled").order("order_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("accounts").select("id, name").order("name"),
  ]);
  const error = ordersResult.error ?? accountsResult.error;
  if (error) return <PrivateFinanceError message={error.message} />;

  const accounts = new Map(((accountsResult.data ?? []) as AccountRow[]).map((account) => [account.id, account.name]));
  const sourceOrders = (ordersResult.data ?? []) as DummyOrderRow[];
  const platformTotals = new Map<string, { orderCount: number; investment: bigint; sellerReceives: bigint; loss: bigint }>();
  const orders: DummyOrderItem[] = sourceOrders.map((order) => {
    const amount = toCents(order.amount);
    const buyerPaid = toCents(order.buyer_paid);
    const receives = toCents(order.seller_receives);
    const loss = toCents(order.profit_loss) < 0n ? -toCents(order.profit_loss) : toCents(order.profit_loss);
    const platform = platformTotals.get(order.platform) ?? { orderCount: 0, investment: 0n, sellerReceives: 0n, loss: 0n };
    platform.orderCount += 1;
    platform.investment += buyerPaid;
    platform.sellerReceives += receives;
    platform.loss += loss;
    platformTotals.set(order.platform, platform);
    return {
      id: order.id,
      date: order.order_date,
      account: accounts.get(order.account_id) ?? "Unknown account",
      platform: order.platform,
      amountCents: amount.toString(),
      buyerPaidCents: buyerPaid.toString(),
      sellerReceivesCents: receives.toString(),
      lossCents: loss.toString(),
      status: order.status,
    };
  });

  const totals = orders.reduce((sum, order) => ({
    investment: sum.investment + BigInt(order.buyerPaidCents),
    sellerReceives: sum.sellerReceives + BigInt(order.sellerReceivesCents),
    loss: sum.loss + BigInt(order.lossCents),
  }), { investment: 0n, sellerReceives: 0n, loss: 0n });

  const platforms: PlatformFinanceItem[] = [...platformTotals.entries()].sort(([, a], [, b]) => a.loss > b.loss ? -1 : a.loss < b.loss ? 1 : 0).map(([platform, values]) => ({
    platform,
    orderCount: values.orderCount,
    investmentCents: values.investment.toString(),
    sellerReceivesCents: values.sellerReceives.toString(),
    lossCents: values.loss.toString(),
  }));

  return <PrivateFinanceWorkspace orders={orders} platforms={platforms} totals={{ orderCount: orders.length, investmentCents: totals.investment.toString(), sellerReceivesCents: totals.sellerReceives.toString(), lossCents: totals.loss.toString(), averageLossCents: orders.length ? ((totals.loss + BigInt(orders.length) / 2n) / BigInt(orders.length)).toString() : "0" }} />;
}

function PrivateFinanceError({ message }: { message: string }) {
  return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h1 className="text-base font-semibold text-amber-950">Private finance is not ready</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{message}. Confirm the dashboard migration is applied, then refresh this page.</p></section></div>;
}
