import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SalesManagersWorkspace, type SalesManagerItem } from "@/components/managers/sales-managers-workspace";
import { PageLoader } from "@/components/page-loader";
import { formatCents, toCents } from "@/lib/accounts/money";
import { createClient } from "@/lib/supabase/server";

type ManagerRow = { id: string; name: string; account_id: string; target: string | number; active: boolean; profile_id: string | null };
type AccountRow = { id: string; name: string; active: boolean };
type OrderRow = { manager_id: string | null; order_type: string; amount: string | number; status: string };
type MemberRow = { id: string; full_name: string; email: string; role: string; status: string };

export default function SalesManagersPage() {
  return <Suspense fallback={<PageLoader />}><SalesManagersContent /></Suspense>;
}

async function SalesManagersContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");

  const [managersResult, accountsResult, ordersResult, membersResult] = await Promise.all([
    supabase.from("sales_managers").select("id, name, account_id, target, active, profile_id").order("name"),
    supabase.from("accounts").select("id, name, active").order("name"),
    supabase.from("orders").select("manager_id, order_type, amount, status").eq("order_type", "real").neq("status", "Cancelled"),
    profile.role === "admin"
      ? supabase.from("profiles").select("id, full_name, email, role, status").eq("status", "active").eq("role", "viewer").order("full_name")
      : Promise.resolve({ data: [] as MemberRow[], error: null }),
  ]);
  const error = managersResult.error ?? accountsResult.error ?? ordersResult.error ?? membersResult.error;
  if (error) return <ManagerDataError message={error.message} />;

  const accounts = new Map(((accountsResult.data ?? []) as AccountRow[]).map((account) => [account.id, account]));
  const managerSales = new Map<string, bigint>();
  const managerOrderCounts = new Map<string, number>();
  for (const order of (ordersResult.data ?? []) as OrderRow[]) {
    if (!order.manager_id) continue;
    managerSales.set(order.manager_id, (managerSales.get(order.manager_id) ?? 0n) + toCents(order.amount));
    managerOrderCounts.set(order.manager_id, (managerOrderCounts.get(order.manager_id) ?? 0) + 1);
  }

  const managers: SalesManagerItem[] = ((managersResult.data ?? []) as ManagerRow[]).map((manager) => {
    const account = accounts.get(manager.account_id);
    return {
      id: manager.id,
      name: manager.name,
      accountId: manager.account_id,
      accountName: account?.name ?? "Unknown account",
      accountActive: account?.active ?? false,
      target: String(manager.target),
      sales: formatCents(managerSales.get(manager.id) ?? 0n),
      salesCents: (managerSales.get(manager.id) ?? 0n).toString(),
      orderCount: managerOrderCounts.get(manager.id) ?? 0,
      active: manager.active,
      profileId: manager.profile_id,
      profileRole: manager.profile_id
        ? (((membersResult.data ?? []) as MemberRow[]).find((member) => member.id === manager.profile_id)?.role as "viewer" | "manager" | undefined) ?? null
        : null,
    };
  });

  return <SalesManagersWorkspace
    managers={managers}
    members={profile.role === "admin" ? ((membersResult.data ?? []) as MemberRow[]).map((member) => ({ id: member.id, name: member.full_name || member.email, email: member.email, role: "viewer" as const })) : []}
    accounts={[...(accountsResult.data ?? [])].map((account) => ({ id: account.id, name: account.name, active: account.active }))}
    canManage={["admin", "manager"].includes(profile.role)}
    isAdmin={profile.role === "admin"}
  />;
}

function ManagerDataError({ message }: { message: string }) {
  return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h1 className="text-base font-semibold text-amber-950">Sales managers are not ready</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">{message}. Check that the Supabase setup SQL has been applied and refresh this page.</p></section></div>;
}
