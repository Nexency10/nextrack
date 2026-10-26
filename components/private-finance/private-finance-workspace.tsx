"use client";

import { useMemo, useState } from "react";
import { Download, LockKeyhole, Printer, ShieldCheck, TrendingDown } from "lucide-react";
import { formatCents } from "@/lib/accounts/money";

export type DummyOrderItem = {
  id: string;
  date: string;
  account: string;
  platform: string;
  amountCents: string;
  buyerPaidCents: string;
  sellerReceivesCents: string;
  lossCents: string;
  status: string;
};
export type PlatformFinanceItem = { platform: string; orderCount: number; investmentCents: string; sellerReceivesCents: string; lossCents: string };

const amount = (cents: string) => formatCents(BigInt(cents || "0"));

export function PrivateFinanceWorkspace({ orders, platforms, totals }: {
  orders: DummyOrderItem[];
  platforms: PlatformFinanceItem[];
  totals: { orderCount: number; investmentCents: string; sellerReceivesCents: string; lossCents: string; averageLossCents: string };
}) {
  const [platformFilter, setPlatformFilter] = useState("");
  const [query, setQuery] = useState("");
  const filteredOrders = useMemo(() => orders.filter((order) => (!platformFilter || order.platform === platformFilter) && (!query.trim() || `${order.account} ${order.platform} ${order.status}`.toLowerCase().includes(query.trim().toLowerCase()))), [orders, platformFilter, query]);
  const platformOptions = [...new Set(orders.map((order) => order.platform))].sort();

  function exportCsv() {
    const rows = [["Date", "Account", "Platform", "Order amount", "Buyer paid", "Seller receives", "Dummy loss", "Status"], ...filteredOrders.map((order) => [order.date, order.account, order.platform, amount(order.amountCents), amount(order.buyerPaidCents), amount(order.sellerReceivesCents), amount(order.lossCents), order.status])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nextrack-private-finance.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-9 print:max-w-none print:px-0 print:py-2">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[.17em] text-rose-600 uppercase"><LockKeyhole size={12} /> Administrator only</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Private finance</h1><p className="mt-2 text-[13px] text-[#85899d]">Dummy order investment, seller payouts, and losses.</p></div><div className="flex gap-2 print:hidden"><button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-rose-200 hover:text-rose-700"><Download size={14} /> Export CSV</button><button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:text-rose-700"><Printer size={14} /> Print</button></div></div>

    <section className="mb-5 flex items-start gap-3 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-950"><span className="mt-0.5"><ShieldCheck size={16} /></span><div><h2 className="text-xs font-semibold">Protected financial data</h2><p className="mt-1 text-[11px] leading-5 text-rose-900/75">This page and its underlying dummy-order records are restricted to active administrators.</p></div></section>

    <section className="mb-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-5" aria-label="Dummy order finance totals">
      <FinanceMetric label="Dummy orders" value={totals.orderCount.toLocaleString()} detail="Excludes cancelled orders" icon={<LockKeyhole size={17} />} />
      <FinanceMetric label="Dummy investment" value={amount(totals.investmentCents)} detail="Total buyer-paid amount" />
      <FinanceMetric label="Seller receives" value={amount(totals.sellerReceivesCents)} detail="Total payout amount" />
      <FinanceMetric label="Total dummy loss" value={amount(totals.lossCents)} detail="Sum of per-order losses" loss />
      <FinanceMetric label="Average loss" value={amount(totals.averageLossCents)} detail="Average per dummy order" loss icon={<TrendingDown size={17} />} />
    </section>

    <section className="mb-5 overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_8px_28px_rgba(35,39,76,.035)]"><div className="border-b border-[#eceef4] px-5 py-5 sm:px-6"><h2 className="text-sm font-semibold">Private platform breakdown</h2><p className="mt-1 text-[10px] text-[#969aab]">Investment and loss totals grouped by platform.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.09em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Platform</th><th className="px-4 py-3.5 text-right">Dummy orders</th><th className="px-4 py-3.5 text-right">Investment</th><th className="px-4 py-3.5 text-right">Seller receives</th><th className="px-5 py-3.5 text-right">Dummy loss</th></tr></thead><tbody className="divide-y divide-[#f0f1f5]">{platforms.map((item) => <tr key={item.platform} className="hover:bg-[#fcfcff]"><td className="px-5 py-4 text-xs font-semibold text-[#34374a]">{item.platform}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{item.orderCount.toLocaleString()}</td><td className="px-4 py-4 text-right text-xs font-semibold text-[#34374a]">{amount(item.investmentCents)}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{amount(item.sellerReceivesCents)}</td><td className="px-5 py-4 text-right text-xs font-semibold text-rose-700">{amount(item.lossCents)}</td></tr>)}</tbody>{!platforms.length && <tfoot><tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-[#9296a7]">No non-cancelled dummy orders yet.</td></tr></tfoot>}</table></div></section>

    <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_8px_28px_rgba(35,39,76,.035)]"><div className="flex flex-wrap items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><div className="mr-auto"><h2 className="text-sm font-semibold">Dummy orders</h2><p className="mt-1 text-[10px] text-[#969aab]">{filteredOrders.length} of {orders.length} records</p></div><label><span className="sr-only">Filter by platform</span><select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="h-10 rounded-xl border border-[#e6e8ef] bg-white px-3 text-[11px] text-[#55596d]"><option value="">All platforms</option>{platformOptions.map((platform) => <option key={platform}>{platform}</option>)}</select></label><label><span className="sr-only">Search dummy orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search account or status" className="h-10 w-full rounded-xl border border-[#e6e8ef] bg-white px-3 text-[11px] sm:w-[210px]" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.09em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Date</th><th className="px-4 py-3.5">Account</th><th className="px-4 py-3.5">Platform</th><th className="px-4 py-3.5 text-right">Order</th><th className="px-4 py-3.5 text-right">Buyer paid</th><th className="px-4 py-3.5 text-right">Seller receives</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Loss</th></tr></thead><tbody className="divide-y divide-[#f0f1f5]">{filteredOrders.map((order) => <tr key={order.id} className="hover:bg-rose-50/30"><td className="px-5 py-4 text-xs text-[#656a7e]">{new Date(`${order.date}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</td><td className="px-4 py-4 text-xs font-semibold text-[#34374a]">{order.account}</td><td className="px-4 py-4 text-xs text-[#656a7e]">{order.platform}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{amount(order.amountCents)}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{amount(order.buyerPaidCents)}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{amount(order.sellerReceivesCents)}</td><td className="px-4 py-4"><span className="rounded-full bg-[#f1f2f6] px-2 py-1 text-[9px] font-semibold text-[#696e81]">{order.status}</span></td><td className="px-5 py-4 text-right text-xs font-semibold text-rose-700">{amount(order.lossCents)}</td></tr>)}</tbody>{!filteredOrders.length && <tfoot><tr><td colSpan={8} className="px-5 py-12 text-center text-xs text-[#9296a7]">{orders.length ? "No dummy orders match your filters." : "No non-cancelled dummy orders yet."}</td></tr></tfoot>}</table></div></section>
  </div>;
}

function FinanceMetric({ label, value, detail, loss = false, icon }: { label: string; value: string; detail: string; loss?: boolean; icon?: React.ReactNode }) {
  return <article className="rounded-[18px] border border-[#e9ebf2] bg-white p-4 shadow-[0_8px_28px_rgba(35,39,76,.035)]"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-[#777c90]">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-[11px] ${loss ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-[#7057ed]"}`}>{icon}</span></div><p className={`mt-4 text-[21px] font-semibold leading-none tracking-[-.04em] ${loss ? "text-rose-700" : "text-[#25283a]"}`}>{value}</p><p className="mt-2 text-[9px] text-[#9699a9]">{detail}</p></article>;
}
