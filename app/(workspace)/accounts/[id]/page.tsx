import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AccountDetails } from "@/components/accounts/account-details";
import { PageLoader } from "@/components/page-loader";
import { formatCents, toCents } from "@/lib/accounts/money";
import { createRequestClient } from "@/lib/supabase/request";

type OrderRow = {
  id: string;
  order_date: string;
  platform: string;
  order_type: "real" | "dummy";
  amount: number | string;
  seller_receives: number | string;
  status: string;
};

export default function AccountDetailsPage({ params }: PageProps<"/accounts/[id]">) {
  return <Suspense fallback={<PageLoader />}><AccountDetailsContent params={params} /></Suspense>;
}

async function AccountDetailsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createRequestClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");

  const [accountResult, ordersResult] = await Promise.all([
    supabase.from("accounts").select("id, name, active").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, order_date, platform, order_type, amount, seller_receives, status").eq("account_id", id).order("order_date", { ascending: false }),
  ]);
  if (accountResult.error || ordersResult.error) return <DetailsError />;
  if (!accountResult.data) notFound();

  const orderRows = (ordersResult.data ?? []) as OrderRow[];
  const activeOrders = orderRows.filter((order) => order.status !== "Cancelled");
  const realOrders = activeOrders.filter((order) => order.order_type === "real");
  const isAdmin = profile.role === "admin";
  const platforms = isAdmin ? [...new Set(activeOrders.map((order) => order.platform))].sort().map((platform) => {
    const matching = activeOrders.filter((order) => order.platform === platform);
    const real = matching.filter((order) => order.order_type === "real");
    const dummy = matching.filter((order) => order.order_type === "dummy");
    return {
      platform,
      realOrders: real.length,
      dummyOrders: isAdmin ? dummy.length : null,
      totalOrders: isAdmin ? matching.length : null,
      sales: formatCents(real.reduce((total, order) => total + toCents(order.amount), 0n)),
      netRevenue: formatCents(real.reduce((total, order) => total + toCents(order.seller_receives), 0n)),
    };
  }) : [];

  return <AccountDetails
    account={accountResult.data}
    orders={orderRows.map((order) => ({ id: order.id, orderDate: order.order_date, platform: order.platform, orderType: order.order_type, amount: formatCents(toCents(order.amount)), status: order.status }))}
    platforms={platforms}
    realSales={isAdmin ? formatCents(realOrders.reduce((total, order) => total + toCents(order.amount), 0n)) : ""}
    netRevenue={isAdmin ? formatCents(realOrders.reduce((total, order) => total + toCents(order.seller_receives), 0n)) : ""}
    realOrderCount={isAdmin ? realOrders.length : 0}
    visibleOrderCount={isAdmin ? activeOrders.length : 0}
    isAdmin={isAdmin}
    canManage={["admin", "manager"].includes(profile.role)}
  />;
}

function DetailsError() {
  return <main className="grid min-h-screen place-items-center bg-[#f4f6fb] p-5"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-7"><h1 className="text-lg font-semibold text-amber-950">Account details could not be loaded</h1><p className="mt-2 text-sm text-amber-900/80">Check that the Supabase setup SQL has been applied.</p></section></main>;
}
