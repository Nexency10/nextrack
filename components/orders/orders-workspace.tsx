"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, CalendarDays, ChevronDown, FilePlus2, Pencil, Search, Trash2, X } from "lucide-react";
import { deleteOrder, updateOrder } from "@/app/actions/orders";

export type OrderItem = {
  id: string;
  date: string;
  accountId: string;
  account: string;
  platform: string;
  type: "real" | "dummy";
  amount: string;
  buyerPaid: string;
  sellerReceives: string;
  managerId: string | null;
  manager: string;
  status: string;
  notes: string;
};

type AccountOption = { id: string; name: string };
const fieldClass = "h-10 w-full rounded-xl border border-[#e7e8ef] bg-white px-3 text-[11px] text-[#464b60] outline-none transition placeholder:text-[#a3a6b4] focus:border-[#9b8df0] focus:ring-4 focus:ring-[#7057ed]/[.07]";
const wholeCurrency = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function toCents(value: string) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return 0n;
  const cents = BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

function formatCents(value: bigint) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = wholeCurrency.format(absolute / 100n);
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "−" : ""}$${whole}.${fraction}`;
}

export function OrdersWorkspace({ orders, accounts, isAdmin, canManage }: { orders: OrderItem[]; accounts: AccountOption[]; isAdmin: boolean; canManage: boolean }) {
  const [accountFilter, setAccountFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<OrderItem | null>(null);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) =>
      (!accountFilter || order.accountId === accountFilter)
      && (!platformFilter || order.platform === platformFilter)
      && (!typeFilter || order.type === typeFilter)
      && (!statusFilter || order.status === statusFilter)
      && (!query || order.account.toLowerCase().includes(query) || order.platform.toLowerCase().includes(query) || order.manager.toLowerCase().includes(query) || order.notes.toLowerCase().includes(query)),
    );
  }, [orders, accountFilter, platformFilter, typeFilter, statusFilter, search]);
  const platforms = [...new Set(orders.map((order) => order.platform))].sort();
  const realTotal = visibleOrders.filter((order) => order.type === "real" && order.status !== "Cancelled").reduce((sum, order) => sum + toCents(order.amount), 0n);
  const orderCount = visibleOrders.filter((order) => order.status !== "Cancelled").length;
  const pendingCount = visibleOrders.filter((order) => order.status === "Pending").length;

  return <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-9">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold tracking-[.17em] text-[#8071dd] uppercase">Order management</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Orders</h1><p className="mt-2 text-[13px] text-[#85899d]">Search, filter, and manage your workspace orders.</p></div>{canManage && <Link href="/orders/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7057ed] px-4 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(112,87,237,.18)] transition hover:bg-[#6249df]"><FilePlus2 size={15} /> Add order</Link>}</div>

    <section className="mb-5 grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Active orders" value={orderCount.toLocaleString()} detail={`${visibleOrders.length.toLocaleString()} records match · cancelled excluded`} icon={<ArrowDownUp size={16} />} />
      <SummaryCard label="Real sales" value={formatCents(realTotal)} detail="Cancelled orders excluded" icon={<span className="text-sm font-semibold">$</span>} />
      <SummaryCard label="Pending" value={pendingCount.toLocaleString()} detail="Orders awaiting completion" icon={<CalendarDays size={16} />} />
    </section>

    <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]">
      <div className="border-b border-[#eceef4] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Order directory</h2><p className="mt-1 text-[10px] text-[#969aab]">Real and cancelled orders are visible to the workspace. Dummy orders are admin only.</p></div><span className="shrink-0 rounded-full bg-[#f3f1ff] px-2.5 py-1 text-[9px] font-semibold text-[#7057ed]">{visibleOrders.length} {visibleOrders.length === 1 ? "order" : "orders"}</span></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <SelectFilter label="Filter by account" value={accountFilter} onChange={setAccountFilter}><option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</SelectFilter>
          <SelectFilter label="Filter by platform" value={platformFilter} onChange={setPlatformFilter}><option value="">All platforms</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</SelectFilter>
          <SelectFilter label="Filter by order type" value={typeFilter} onChange={setTypeFilter}><option value="">All types</option><option value="real">Real</option>{isAdmin && <option value="dummy">Dummy</option>}</SelectFilter>
          <SelectFilter label="Filter by status" value={statusFilter} onChange={setStatusFilter}><option value="">All statuses</option><option>Completed</option><option>Pending</option><option>Cancelled</option></SelectFilter>
          <label className="relative block"><span className="sr-only">Search orders</span><Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9a9eae]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" className={`${fieldClass} pl-9`} /></label>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.1em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Date</th><th className="px-4 py-3.5">Account</th><th className="px-4 py-3.5">Platform</th><th className="px-4 py-3.5">Type</th><th className="px-4 py-3.5">Order</th><th className="px-4 py-3.5">Buyer paid</th><th className="px-4 py-3.5">Seller receives</th><th className="px-4 py-3.5">Manager</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Action</th></tr></thead>
        <tbody className="divide-y divide-[#f0f1f5]">{visibleOrders.length ? visibleOrders.map((order) => <tr key={order.id} className="transition hover:bg-[#fcfcff]"><td className="whitespace-nowrap px-5 py-4 text-[11px] text-[#666b7e]">{formatDate(order.date)}</td><td className="max-w-[190px] truncate px-4 py-4 text-[11px] font-semibold text-[#34374a]">{order.account}</td><td className="px-4 py-4 text-[11px] text-[#62677a]">{order.platform}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${order.type === "real" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}>{order.type === "real" ? "Real" : "Dummy"}</span></td><td className="px-4 py-4 text-[11px] font-semibold text-[#34374a]">{formatCents(toCents(order.amount))}</td><td className="px-4 py-4 text-[11px] font-medium text-[#555a6e]">{isAdmin || order.type === "real" ? formatCents(toCents(order.buyerPaid)) : "Private"}</td><td className="px-4 py-4 text-[11px] font-medium text-[#555a6e]">{isAdmin || order.type === "real" ? formatCents(toCents(order.sellerReceives)) : "Private"}</td><td className="px-4 py-4 text-[11px] text-[#777c90]">{order.manager}</td><td className="px-4 py-4"><StatusBadge status={order.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-1.5">{canManage && <button type="button" onClick={() => setEditing(order)} aria-label={`Edit order from ${order.account}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e7e8ef] text-[#72778a] hover:border-violet-200 hover:text-[#7057ed]"><Pencil size={13} /></button>}{canManage && <form action={deleteOrder} onSubmit={(event) => { if (!window.confirm("Delete this order? This cannot be undone.")) event.preventDefault(); }}><input type="hidden" name="orderId" value={order.id} /><button aria-label={`Delete order from ${order.account}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e7e8ef] text-[#85899a] hover:border-rose-200 hover:text-rose-600"><Trash2 size={13} /></button></form>}</div></td></tr>) : <tr><td colSpan={10} className="px-5 py-16 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-[#f3f1ff] text-[#7057ed]"><Search size={17} /></span><p className="mt-3 text-xs font-semibold text-[#55596d]">No matching orders</p><p className="mt-1 text-[10px] text-[#999cac]">Change your filters or search terms and try again.</p></td></tr>}</tbody>
      </table></div>
      <div className="border-t border-[#eff0f5] px-5 py-3 text-[10px] leading-5 text-[#969aab]">Totals follow the saved order values. Database calculations are refreshed whenever an amount is edited. {isAdmin ? "Dummy order values are restricted to administrators." : "Dummy orders and their values are restricted to administrators."}</div>
    </section>
    {editing && <EditOrderDialog order={editing} onClose={() => setEditing(null)} />}
  </div>;
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <article className="rounded-[18px] border border-[#e9ebf2] bg-white p-4 shadow-[0_8px_28px_rgba(35,39,76,.035)]"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-[#777c90]">{label}</p><span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#f1efff] text-[#7057ed]">{icon}</span></div><p className="mt-4 text-[22px] font-semibold leading-none tracking-[-.04em] text-[#25283a]">{value}</p><p className="mt-2 text-[10px] text-[#9699a9]">{detail}</p></article>;
}

function SelectFilter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="relative block"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} appearance-none pr-8`}>{children}</select><ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#969aab]" /></label>;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "Completed" ? "bg-emerald-50 text-emerald-700" : status === "Cancelled" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold ${color}`}>{status}</span>;
}

function EditOrderDialog({ order, onClose }: { order: OrderItem; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateOrder, {});
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#141326]/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="edit-order-title" className="my-auto w-full max-w-lg rounded-[22px] border border-[#e9ebf2] bg-white p-5 shadow-[0_24px_80px_rgba(18,17,40,.24)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.14em] text-[#8071dd] uppercase">{order.account} · {order.platform}</p><h2 id="edit-order-title" className="mt-1 text-lg font-semibold">Edit order</h2><p className="mt-1 text-[11px] text-[#969aab]">Saved totals recalculate from the order amount.</p></div><button type="button" disabled={pending} onClick={onClose} aria-label="Close edit order" className="grid h-9 w-9 place-items-center rounded-lg text-[#85899a] hover:bg-[#f5f5f9]"><X size={17} /></button></div>
      <form action={action} className="mt-5 space-y-4"><input type="hidden" name="orderId" value={order.id} /><label className="block text-[11px] font-semibold text-[#63687c]">Order amount ($)<input required name="amount" type="number" min="0.01" step="0.01" defaultValue={order.amount} className={`${fieldClass} mt-2`} /></label><label className="block text-[11px] font-semibold text-[#63687c]">Status<select name="status" defaultValue={order.status} className={`${fieldClass} mt-2`}><option>Completed</option><option>Pending</option><option>Cancelled</option></select></label><label className="block text-[11px] font-semibold text-[#63687c]">Notes<textarea name="notes" maxLength={2000} rows={4} defaultValue={order.notes} placeholder="Optional order notes" className="mt-2 w-full resize-y rounded-xl border border-[#e7e8ef] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#9b8df0] focus:ring-4 focus:ring-[#7057ed]/[.07]" /></label>{state.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-800">{state.error}</p>}{state.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800">{state.success}</p>}<div className="flex justify-end gap-2 border-t border-[#eff0f5] pt-4"><button type="button" disabled={pending} onClick={onClose} className="h-10 rounded-xl border border-[#e7e8ef] px-4 text-[11px] font-semibold text-[#686d81]">Cancel</button><button disabled={pending} className="h-10 rounded-xl bg-[#7057ed] px-4 text-[11px] font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save changes"}</button></div></form>
    </section>
  </div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
