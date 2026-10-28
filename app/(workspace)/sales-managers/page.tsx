import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SalesManagersWorkspace, type SalesManagerItem } from "@/components/managers/sales-managers-workspace";
import { PageLoader } from "@/components/page-loader";
import { formatCents, toCents } from "@/lib/accounts/money";
import { createRequestClient } from "@/lib/supabase/request";

type ManagerRow = { id: string; name: string; account_id: string; target: string | number; active: boolean; profile_id: string | null };
type ManagerAccountRow = { manager_id: string; account_id: string };
type AccountRow = { id: string; name: string; active: boolean };
type OrderRow = { manager_id: string | null; order_type: string; amount: string | number; status: string };
type MemberRow = { id: string; full_name: string; email: string; role: string; status: string };

export default function SalesManagersPage() {
  return <Suspense fallback={<PageLoader />}><SalesManagersContent /></Suspense>;
}

async function SalesManagersContent() {
  const supabase = await createRequestClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  const [managersResult, accountsResult, ordersResult, membersResult, permissionsResult, assignmentsResult] = await Promise.all([
    supabase.from("sales_managers").select("id, name, account_id, target, active, profile_id").order("name"),
    supabase.from("accounts").select("id, name, active").order("name"),
    isAdmin
      ? supabase.from("orders").select("manager_id, order_type, amount, status").eq("order_type", "real").neq("status", "Cancelled")
      : Promise.resolve({ data: [], error: null }),
    isAdmin
      ? supabase.from("profiles").select("id, full_name, email, role, status").eq("status", "active").eq("role", "viewer").order("full_name")
      : Promise.resolve({ data: [] as MemberRow[], error: null }),
    profile.role === "admin"
      ? supabase.from("dummy_order_manager_permissions").select("manager_id")
      : Promise.resolve({ data: [] as { manager_id: string }[], error: null }),
    supabase.from("sales_manager_accounts").select("manager_id, account_id"),
  ]);
  const error = managersResult.error ?? accountsResult.error ?? ordersResult.error ?? membersResult.error ?? permissionsResult.error ?? assignmentsResult.error;
  if (error) return <ManagerDataError message={error.message} />;

  const accounts = new Map(((accountsResult.data ?? []) as AccountRow[]).map((account) => [account.id, account]));
  const assignments = new Map<string, string[]>();
  for (const row of (assignmentsResult.data ?? []) as ManagerAccountRow[]) assignments.set(row.manager_id, [...(assignments.get(row.manager_id) ?? []), row.account_id]);
  const managerSales = new Map<string, bigint>();
  const managerOrderCounts = new Map<string, number>();
  for (const order of (ordersResult.data ?? []) as OrderRow[]) {
    if (!order.manager_id) continue;
    managerSales.set(order.manager_id, (managerSales.get(order.manager_id) ?? 0n) + toCents(order.amount));
    managerOrderCounts.set(order.manager_id, (managerOrderCounts.get(order.manager_id) ?? 0) + 1);
  }

  const managers: SalesManagerItem[] = ((managersResult.data ?? []) as ManagerRow[]).map((manager) => {
    const account = accounts.get(manager.account_id);
    const assignedIds = assignments.get(manager.id) ?? [manager.account_id];
    const assignedNames = assignedIds.map((id) => accounts.get(id)?.name).filter((name): name is string => Boolean(name));
    return {
      id: manager.id,
      name: manager.name,
      accountId: manager.account_id,
      accountName: assignedNames.join(", ") || account?.name || "Unknown account",
      accountIds: assignedIds,
      accountActive: assignedIds.some((id) => accounts.get(id)?.active),
      target: String(manager.target),
      sales: isAdmin ? formatCents(managerSales.get(manager.id) ?? 0n) : "",
      salesCents: isAdmin ? (managerSales.get(manager.id) ?? 0n).toString() : "0",
      orderCount: isAdmin ? managerOrderCounts.get(manager.id) ?? 0 : 0,
      active: manager.active,
      profileId: manager.profile_id,
      profileRole: manager.profile_id
        ? (((membersResult.data ?? []) as MemberRow[]).find((member) => member.id === manager.profile_id)?.role as "viewer" | undefined) ?? "manager"
        : null,
      canCreateDummy: ((permissionsResult.data ?? []) as { manager_id: string }[]).some((permission) => permission.manager_id === manager.id),
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
