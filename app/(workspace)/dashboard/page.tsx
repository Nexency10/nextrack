import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BadgeDollarSign, Building2, ChartNoAxesCombined, CircleHelp, FilePlus2, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { SalesCharts, type ChartPoint } from "@/components/dashboard/sales-charts";
import { PageLoader } from "@/components/page-loader";
import { createClient } from "@/lib/supabase/server";

type AccountMetric = { id: string; name: string; active: boolean; realOrderCount: number; sales: number; netRevenue: number };
type DashboardMetrics = {
  totalSales: number;
  netRevenue: number;
  realOrderCount: number;
  totalOrderCount: number;
  salesByPlatform: ChartPoint[];
  accounts: AccountMetric[];
  privateMetrics: { dummyOrderCount: number; investment: number; sellerReceives: number; loss: number } | null;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function DashboardPage() {
  return <Suspense fallback={<PageLoader />}><DashboardContent /></Suspense>;
}

async function DashboardContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, username, role, status").eq("id", user.id).maybeSingle();
  if (!profile || profileError) return <AccountNotice email={user.email ?? ""} detail={profileError?.message} />;
  if (profile.status === "pending") return <AccountNotice email={user.email ?? ""} pending />;
  if (profile.status === "banned") return <AccountNotice email={user.email ?? ""} banned />;
  if (profile.status !== "active") return <AccountNotice email={user.email ?? ""} detail="This account does not have active workspace access." />;

  const { data, error } = await supabase.rpc("get_dashboard_metrics");
  const metrics = data as unknown as DashboardMetrics | null;
  const name = profile.full_name || user.user_metadata.full_name || user.email || "there";
  const accounts = metrics?.accounts ?? [];
  const salesByAccount = accounts.map((account) => ({ label: account.name, value: Number(account.sales) }));
  const salesByPlatform = (metrics?.salesByPlatform ?? []).map((point) => ({ label: point.label, value: Number(point.value) }));

  return <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-9 print:max-w-none print:px-0 print:py-2">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold tracking-[.17em] text-[#8071dd] uppercase">Sales overview</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[34px]">Good to see you, {name.split(" ")[0]}.</h1><p className="mt-2 text-[13px] text-[#85899d]">Here’s how your workspace is performing.</p></div><div className="flex flex-wrap gap-2 print:hidden">{(["admin", "manager"] as string[]).includes(profile.role) && <Link href="/orders/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7057ed] px-3.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#6249df]"><FilePlus2 size={14} /> Add order</Link>}{profile.role === "admin" && <Link href="/admin/users" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] shadow-sm ring-1 ring-[#e7e8ef] transition hover:text-[#7057ed]"><Users size={14} /> Team access</Link>}</div></div>

        {profile.role === "viewer" && <section className="mb-5 flex items-start gap-3 rounded-[16px] border border-violet-200 bg-violet-50 px-4 py-3.5 text-violet-950"><span className="mt-0.5"><ShieldCheck size={16} /></span><div><h2 className="text-xs font-semibold">View-only access</h2><p className="mt-1 text-[11px] leading-5 text-violet-900/75">You can explore workspace data. An administrator can assign a workspace role from Sales managers to enable management tools.</p></div></section>}

        {error ? <DataSetupNotice message={error.message} /> : metrics ? <>
          <section className="mb-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Sales key performance indicators">
            <MetricCard label="Total sales" value={money.format(Number(metrics.totalSales))} detail={`${metrics.realOrderCount} real orders`} icon={<BadgeDollarSign size={18} />} tone="violet" />
            <MetricCard label="Net revenue" value={money.format(Number(metrics.netRevenue))} detail="After platform fees" icon={<ChartNoAxesCombined size={18} />} tone="green" />
            <MetricCard label="Total orders" value={Number(metrics.totalOrderCount).toLocaleString()} detail="Real and dummy · excludes cancelled" icon={<Activity size={18} />} tone="blue" />
            <MetricCard label={profile.role === "admin" ? "Dummy loss" : "Private metrics"} value={profile.role === "admin" && metrics.privateMetrics ? money.format(Number(metrics.privateMetrics.loss)) : "••••••"} detail={profile.role === "admin" && metrics.privateMetrics ? `${Number(metrics.privateMetrics.dummyOrderCount).toLocaleString()} dummy orders · view finance` : "Available in Private Finance"} icon={<LockKeyhole size={17} />} tone="amber" privateMetric href={profile.role === "admin" ? "/private-finance" : undefined} />
          </section>

          <SalesCharts platforms={salesByPlatform} accounts={salesByAccount} />

          <section className="mt-5 overflow-hidden rounded-[20px] border border-[#e9ebf2] bg-white shadow-[0_8px_28px_rgba(35,39,76,.035)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eff0f5] px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold tracking-[-.02em]">Account summary</h2><span className="rounded-full bg-[#f3f1ff] px-2 py-0.5 text-[9px] font-semibold text-[#7057ed]">REAL ORDERS</span></div><p className="mt-1 text-[11px] text-[#9599a9]">Real sales and revenue for every account.</p></div><div className="flex items-center gap-3"><span className="text-[10px] font-medium text-[#979bad]">{accounts.length} {accounts.length === 1 ? "account" : "accounts"}</span><Link href="/accounts" className="text-[10px] font-semibold text-[#7057ed] hover:underline">View all</Link></div></div>
            {accounts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.1em] text-[#979bad] uppercase"><th className="px-6 py-3.5">Account</th><th className="px-4 py-3.5">Real orders</th><th className="px-4 py-3.5">Total sales</th><th className="px-4 py-3.5">Net revenue</th><th className="px-6 py-3.5 text-right">Status</th></tr></thead><tbody className="divide-y divide-[#f0f1f5]">{accounts.map((account) => <tr key={account.id} className="transition hover:bg-[#fcfcff]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#f1efff] text-[11px] font-bold text-[#7057ed]">{account.name.slice(0, 1).toUpperCase()}</span><span className="text-[12px] font-semibold text-[#34374a]">{account.name}</span></div></td><td className="px-4 py-4 text-[12px] text-[#656a7e]">{Number(account.realOrderCount).toLocaleString()}</td><td className="px-4 py-4 text-[12px] font-semibold text-[#34374a]">{money.format(Number(account.sales))}</td><td className="px-4 py-4 text-[12px] font-semibold text-[#23956f]">{money.format(Number(account.netRevenue))}</td><td className="px-6 py-4 text-right"><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-[#f1f2f6] text-[#84889a]"}`}>{account.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div> : <div className="px-6 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-[#f3f1ff] text-[#7057ed]"><Building2 size={20} /></span><p className="mt-3 text-xs font-semibold text-[#55596d]">No accounts yet</p><p className="mt-1 text-[11px] text-[#999cac]">Accounts and their sales will appear here when added.</p></div>}
          </section>
        </> : <DataSetupNotice message="Dashboard data was not returned. Apply the dashboard Supabase migration, then reload this page." />}

        <footer className="mt-7 flex items-center gap-2 text-[10px] text-[#a0a3b1] print:hidden"><CircleHelp size={13} /> All sales figures exclude cancelled orders. Dummy order details are restricted to administrators.</footer>
  </div>;
}

function MetricCard({ label, value, detail, icon, tone, privateMetric = false, href }: { label: string; value: string; detail: string; icon: ReactNode; tone: "violet" | "green" | "blue" | "amber"; privateMetric?: boolean; href?: string }) {
  const tones = { violet: "bg-violet-50 text-[#7057ed]", green: "bg-emerald-50 text-[#1d9b70]", blue: "bg-sky-50 text-[#438ce5]", amber: "bg-amber-50 text-[#d39135]" };
  const card = <article className={`rounded-[18px] border border-[#e9ebf2] bg-white p-5 shadow-[0_8px_28px_rgba(35,39,77,.035)] ${href ? "transition hover:border-[#d4cef9] hover:shadow-[0_12px_32px_rgba(112,87,237,.09)]" : ""}`}><div className="flex items-center justify-between"><p className="text-[11px] font-medium text-[#777c90]">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-[12px] ${tones[tone]}`}>{icon}</span></div><p className={`mt-5 text-[25px] font-semibold leading-none tracking-[-.05em] ${privateMetric && !href ? "text-[#a4a6b3]" : "text-[#25283a]"}`}>{value}</p><p className="mt-3 text-[10px] text-[#9699a9]">{detail}</p></article>;
  return href ? <Link href={href} className="block rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7057ed]">{card}</Link> : card;
}

function AccountNotice({ email, pending = false, banned = false, detail }: { email: string; pending?: boolean; banned?: boolean; detail?: string }) {
  const denied = banned || (!pending && !detail);
  const title = pending ? "Your account is waiting for approval" : banned ? "Workspace access has been banned" : "Your account profile is not set up";
  const message = pending ? "An administrator will review your access and assign your role." : banned ? "An administrator has suspended your workspace access. Contact your administrator if you believe this is a mistake." : detail || "Check that the Supabase setup migrations have been applied.";
  return <main className="grid min-h-screen place-items-center bg-[#f4f6fb] p-5 text-[#191b2b]"><section className={`w-full max-w-[640px] rounded-[22px] border p-7 shadow-sm sm:p-9 ${pending ? "border-amber-200 bg-amber-50" : denied ? "border-rose-200 bg-rose-50" : "border-rose-200 bg-rose-50"}`}><div className="flex gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${pending ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}><ShieldCheck size={21} /></span><div><h1 className="text-lg font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-[#777c90]">{message}</p><p className="mt-4 text-xs text-[#898d9f]">Signed in as {email}</p><form action={signOut} className="mt-5"><button className="text-xs font-semibold text-[#7057ed] hover:underline">Sign out</button></form></div></div></section></main>;
}

function DataSetupNotice({ message }: { message: string }) {
  return <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-6"><h2 className="text-sm font-semibold text-amber-950">Dashboard data is not ready</h2><p className="mt-2 text-xs leading-5 text-amber-900/75">{message}</p></section>;
}
