"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, BadgeDollarSign, ChartNoAxesCombined, Layers3, LockKeyhole, ReceiptText } from "lucide-react";

type AccountOrder = { id: string; orderDate: string; platform: string; orderType: "real" | "dummy"; amount: string; status: string };
type PlatformMetric = { platform: string; realOrders: number; dummyOrders: number | null; totalOrders: number | null; sales: string; netRevenue: string };

export function AccountDetails({
  account,
  orders,
  platforms,
  realSales,
  netRevenue,
  realOrderCount,
  visibleOrderCount,
  canManage,
  isAdmin,
}: {
  account: { id: string; name: string; active: boolean };
  orders: AccountOrder[];
  platforms: PlatformMetric[];
  realSales: string;
  netRevenue: string;
  realOrderCount: number;
  visibleOrderCount: number;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"overview" | "orders" | "platforms">(isAdmin ? "overview" : "orders");
  return <div className="min-h-full text-[#191b2b]">
    <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-[#8071dd] uppercase">Account details</p><div className="flex flex-wrap items-center gap-3"><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">{account.name}</h1><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-[#f1f2f6] text-[#85889a]"}`}>{account.active ? "Active" : "Inactive"}</span></div><p className="mt-2 text-[13px] text-[#85899d]">Account-level overview, order history, and platform breakdown.</p></div>
        {canManage && <Link href={`/orders/new?accountId=${account.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7057ed] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#6249df]"><ReceiptText size={14} /> Add order</Link>}
      </div>

      <div className="mb-5 flex w-fit gap-1 rounded-[14px] border border-[#e7e8ef] bg-white p-1.5">{(isAdmin ? ["overview", "orders", "platforms"] as const : ["orders"] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-[10px] px-3.5 py-2 text-[10px] font-semibold capitalize transition ${tab === value ? "bg-[#f1efff] text-[#6753d5]" : "text-[#808497] hover:text-[#4e5367]"}`}>{value === "platforms" ? "Platform breakdown" : value}</button>)}</div>
      {isAdmin && tab === "overview" && <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Real sales" value={realSales} icon={<BadgeDollarSign size={17} />} tone="violet" />
        <MetricCard label="Net revenue" value={netRevenue} icon={<ChartNoAxesCombined size={17} />} tone="green" />
        <MetricCard label="Real orders" value={realOrderCount.toLocaleString()} icon={<Activity size={17} />} tone="blue" />
        <MetricCard label="Private metrics" value="••••••" icon={<LockKeyhole size={17} />} tone="amber" detail="Dummy finance remains protected" />
        <section className="rounded-[20px] border border-[#e8eaf1] bg-white p-6 shadow-[0_8px_28px_rgba(35,39,76,.035)] sm:col-span-2 2xl:col-span-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#f1efff] text-[#7057ed]"><ReceiptText size={17} /></span><div><h2 className="text-sm font-semibold">Order activity</h2><p className="mt-1 text-[10px] text-[#9296a7]">{visibleOrderCount.toLocaleString()} non-cancelled orders visible in this account</p></div><button onClick={() => setTab("orders")} className="ml-auto text-[10px] font-semibold text-[#7057ed] hover:underline">View order history</button></div>
        </section>
      </section>}

      {tab === "orders" && <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,39,76,.04)]">
        <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#f1efff] text-[#7057ed]"><ReceiptText size={16} /></span><div><h2 className="text-sm font-semibold">Order history</h2><p className="mt-1 text-[10px] text-[#969aab]">{orders.length.toLocaleString()} visible records, including cancelled orders.</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.1em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Date</th><th className="px-4 py-3.5">Platform</th><th className="px-4 py-3.5">Type</th><th className="px-4 py-3.5">Order amount</th><th className="px-5 py-3.5 text-right">Status</th></tr></thead>
          <tbody className="divide-y divide-[#f0f1f5]">{orders.length ? orders.map((order) => <tr key={order.id} className="hover:bg-[#fcfcff]"><td className="px-5 py-4 text-xs text-[#666b7e]">{formatDate(order.orderDate)}</td><td className="px-4 py-4 text-xs font-medium text-[#44485b]">{order.platform}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold capitalize ${order.orderType === "real" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}>{order.orderType}</span></td><td className="px-4 py-4 text-xs font-semibold text-[#34374a]">{order.amount}</td><td className="px-5 py-4 text-right"><StatusBadge status={order.status} /></td></tr>) : <tr><td colSpan={5} className="px-5 py-14 text-center text-xs text-[#9296a7]">No orders recorded for this account yet.</td></tr>}</tbody>
        </table></div>
      </section>}

      {isAdmin && tab === "platforms" && <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,39,76,.04)]">
        <div className="border-b border-[#eceef4] px-5 py-5 sm:px-6"><h2 className="text-sm font-semibold">Platform breakdown</h2><p className="mt-1 text-[10px] text-[#969aab]">Cancelled orders are excluded. Dummy loss and payouts are available only in Private Finance.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.1em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Platform</th><th className="px-4 py-3.5">Real orders</th><th className="px-4 py-3.5">Dummy orders</th><th className="px-4 py-3.5">Total orders</th><th className="px-4 py-3.5">Real sales</th><th className="px-5 py-3.5">Net revenue</th></tr></thead>
          <tbody className="divide-y divide-[#f0f1f5]">{platforms.length ? platforms.map((row) => <tr key={row.platform} className="hover:bg-[#fcfcff]"><td className="px-5 py-4 text-xs font-semibold text-[#34374a]">{row.platform}</td><td className="px-4 py-4 text-xs text-[#62677a]">{row.realOrders.toLocaleString()}</td><td className="px-4 py-4 text-xs text-[#62677a]">{row.dummyOrders === null ? <span className="text-[#a1a4b2">Admin only</span> : row.dummyOrders.toLocaleString()}</td><td className="px-4 py-4 text-xs font-semibold text-[#44485c]">{row.totalOrders === null ? <span className="text-[#a1a4b2">Admin only</span> : row.totalOrders.toLocaleString()}</td><td className="px-4 py-4 text-xs font-semibold text-[#34374a]">{row.sales}</td><td className="px-5 py-4 text-xs font-semibold text-[#23956f]">{row.netRevenue}</td></tr>) : <tr><td colSpan={6} className="px-5 py-14 text-center text-xs text-[#9296a7]">No active order volume by platform yet.</td></tr>}</tbody>
        </table></div>
      </section>}
      <p className="mt-5 flex items-center gap-2 text-[10px] leading-5 text-[#9a9eae]"><Layers3 size={13} /> Dummy order records are protected by workspace access rules.</p>
    </div>
  </div>;
}

function MetricCard({ label, value, icon, tone, detail }: { label: string; value: string; icon: React.ReactNode; tone: "violet" | "green" | "blue" | "amber"; detail?: string }) {
  const tones = { violet: "bg-violet-50 text-[#7057ed]", green: "bg-emerald-50 text-[#1d9b70]", blue: "bg-sky-50 text-[#438ce5]", amber: "bg-amber-50 text-[#d39135]" };
  return <article className="rounded-[18px] border border-[#e9ebf2] bg-white p-5 shadow-[0_8px_28px_rgba(35,39,76,.035)]"><div className="flex items-center justify-between"><p className="text-[11px] font-medium text-[#777c90]">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-[12px] ${tones[tone]}`}>{icon}</span></div><p className="mt-5 text-[25px] font-semibold leading-none tracking-[-.05em] text-[#25283a]">{value}</p><p className="mt-3 text-[10px] text-[#9699a9]">{detail ?? "Cancelled orders excluded"}</p></article>;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "Completed" ? "bg-emerald-50 text-emerald-700" : status === "Cancelled" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${color}`}>{status}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

