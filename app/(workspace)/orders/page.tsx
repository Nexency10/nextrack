import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OrdersWorkspace, type OrderItem } from "@/components/orders/orders-workspace";
import { PageLoader } from "@/components/page-loader";
import { createRequestClient } from "@/lib/supabase/request";

type OrderRow = {
  id: string;
  order_date: string;
  account_id: string;
  platform: string;
  order_type: "real" | "dummy";
  amount: number | string;
  buyer_paid: number | string;
  seller_receives: number | string;
  manager_id: string | null;
  status: string;
  notes: string;
};

export default function OrdersPage() {
  return <Suspense fallback={<PageLoader />}><OrdersContent /></Suspense>;
}

async function OrdersContent() {
  const supabase = await createRequestClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");

  const [ordersResult, accountsResult, managersResult] = await Promise.all([
    supabase.from("orders").select("id, order_date, account_id, platform, order_type, amount, buyer_paid, seller_receives, manager_id, status, notes").order("order_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("sales_managers").select("id, name"),
  ]);
  const error = ordersResult.error ?? accountsResult.error ?? managersResult.error;
  if (error) return <OrdersDataError message={error.message} />;

  const accounts = new Map((accountsResult.data ?? []).map((account) => [account.id, account.name]));
  const managers = new Map((managersResult.data ?? []).map((manager) => [manager.id, manager.name]));
  const orders: OrderItem[] = ((ordersResult.data ?? []) as OrderRow[]).map((order) => ({
    id: order.id,
    date: order.order_date,
    accountId: order.account_id,
    account: accounts.get(order.account_id) ?? "Unknown account",
    platform: order.platform,
    type: order.order_type,
    amount: String(order.amount),
    buyerPaid: String(order.buyer_paid),
    sellerReceives: String(order.seller_receives),
    managerId: order.manager_id,
    manager: order.manager_id ? managers.get(order.manager_id) ?? "Unassigned" : "Unassigned",
    status: order.status,
    notes: order.notes,
  }));

  return <OrdersWorkspace orders={orders} accounts={[...accounts].map(([id, name]) => ({ id, name }))} isAdmin={profile.role === "admin"} canManage={["admin", "manager"].includes(profile.role)} />;
}

function OrdersDataError({ message }: { message: string }) {
  return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h1 className="text-base font-semibold text-amber-950">Orders are not ready</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{message}. Check that the Supabase setup SQL has been applied and refresh this page.</p></section></div>;
}
