"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, Check, CirclePlus, Eye, Layers3, Pencil, Search, Trash2, X } from "lucide-react";
import { deleteAccount, saveAccount } from "@/app/actions/accounts";

export type AccountCardData = {
  id: string;
  name: string;
  active: boolean;
  realOrders: number;
  dummyOrders: number | null;
  visibleOrders: number;
  sales: string;
  netRevenue: string;
};

export type AccountPlatformData = {
  accountId: string;
  accountName: string;
  platform: string;
  realOrders: number;
  dummyOrders: number | null;
  visibleOrders: number;
  sales: string;
  netRevenue: string;
};

const inputClass = "mt-2 h-11 w-full rounded-xl border border-[#e6e8ef] bg-[#fbfbfe] px-3.5 text-sm text-[#292c40] outline-none transition focus:border-[#9b8df0] focus:bg-white focus:ring-4 focus:ring-[#7057ed]/[.08]";
export function AccountOverview({
  accounts,
  platformRows,
  canManage,
  isAdmin,
}: {
  accounts: AccountCardData[];
  platformRows: AccountPlatformData[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AccountCardData | null | undefined>(undefined);
  const visibleAccounts = useMemo(() => accounts.filter((account) =>
    (filter === "all" || account.active === (filter === "active")) && account.name.toLowerCase().includes(search.trim().toLowerCase()),
  ), [accounts, filter, search]);
  const filteredIds = new Set(visibleAccounts.map((account) => account.id));
  const visiblePlatformRows = platformRows.filter((row) => filteredIds.has(row.accountId));

  return <div className="min-h-full text-[#191b2b]">
    <div className="mx-auto max-w-[1360px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-[#8071dd] uppercase">Workspace directory</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Accounts</h1><p className="mt-2 text-[13px] text-[#85899d]">Compare every account by platform, real sales, and order volume.</p></div>
        {canManage && <button type="button" onClick={() => setEditing(null)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7057ed] px-4 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(112,87,237,.18)] transition hover:bg-[#6249df]"><CirclePlus size={16} /> New account</button>}
      </div>

      <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#f1efff] text-[#7057ed]"><Layers3 size={16} /></span>
          <div><h2 className="text-sm font-semibold">Account × platform sales summary</h2><p className="mt-1 text-[10px] text-[#969aab]">Cancelled orders are excluded. Dummy order details remain private to administrators.</p></div>
          <span className="ml-auto rounded-full bg-[#f3f1ff] px-2.5 py-1 text-[9px] font-semibold text-[#7057ed]">{visiblePlatformRows.length} {visiblePlatformRows.length === 1 ? "row" : "rows"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.1em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Account</th><th className="px-4 py-3.5">Platform</th><th className="px-4 py-3.5">Real orders</th><th className="px-4 py-3.5">Dummy orders</th><th className="px-4 py-3.5">Total orders</th><th className="px-4 py-3.5">Real sales</th><th className="px-4 py-3.5">Net revenue</th><th className="px-5 py-3.5 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-[#f0f1f5]">{visiblePlatformRows.length ? visiblePlatformRows.map((row) => <tr key={`${row.accountId}-${row.platform}`} className="transition hover:bg-[#fcfcff]"><td className="px-5 py-4 text-xs font-semibold text-[#34374a]">{row.accountName}</td><td className="px-4 py-4"><span className="rounded-full bg-[#f4f5f9] px-2.5 py-1 text-[10px] font-medium text-[#696e81]">{row.platform}</span></td><td className="px-4 py-4 text-xs text-[#62677a]">{row.realOrders.toLocaleString()}</td><td className="px-4 py-4 text-xs text-[#62677a]">{isAdmin ? row.dummyOrders?.toLocaleString() ?? "0" : <span className="text-[#a1a4b2">Admin only</span>}</td><td className="px-4 py-4 text-xs font-semibold text-[#44485c]">{isAdmin ? row.visibleOrders.toLocaleString() : <span className="text-[#a1a4b2">Admin only</span>}</td><td className="px-4 py-4 text-xs font-semibold text-[#34374a]">{row.sales}</td><td className="px-4 py-4 text-xs font-semibold text-[#23956f]">{row.netRevenue}</td><td className="px-5 py-4 text-right"><Link href={`/accounts/${row.accountId}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e8eaf1] px-2.5 text-[10px] font-semibold text-[#62677a] transition hover:border-[#c9c2f7] hover:text-[#7057ed]">View account <ArrowUpRight size={13} /></Link></td></tr>) : <tr><td colSpan={8} className="px-5 py-12 text-center"><p className="text-xs font-semibold text-[#55596d]">No account/platform order data yet</p><p className="mt-1 text-[10px] text-[#999cac]">Once an account has an order, its platform summary will appear here.</p></td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto"><h2 className="text-sm font-semibold">All accounts</h2><p className="mt-1 text-[10px] text-[#969aab]">{visibleAccounts.length} of {accounts.length} accounts</p></div>
          <label className="relative block"><span className="sr-only">Search accounts</span><Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9a9eae]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts" className="h-10 w-full rounded-xl border border-[#e5e7ef] bg-white pl-9 pr-3 text-[11px] outline-none transition placeholder:text-[#a4a7b5] focus:border-[#9b8df0] sm:w-[210px]" /></label>
          <div className="flex rounded-xl border border-[#e5e7ef] bg-white p-1">{(["all", "active", "inactive"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-semibold capitalize transition ${filter === value ? "bg-[#f1efff] text-[#7057ed]" : "text-[#85899d] hover:text-[#55596d]"}`}>{value}</button>)}</div>
        </div>

        {visibleAccounts.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleAccounts.map((account) => <AccountCard key={account.id} account={account} canManage={canManage} canDelete={isAdmin} onEdit={() => setEditing(account)} />)}</div> : <div className="rounded-[20px] border border-dashed border-[#dfe2ec] bg-white px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-[#f1efff] text-[#7057ed]"><Building2 size={20} /></span><h3 className="mt-4 text-sm font-semibold">{accounts.length ? "No matching accounts" : "No accounts yet"}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#9296a7]">{accounts.length ? "Try another search or status filter." : "Create an account to start grouping orders and viewing sales performance."}</p>{canManage && !accounts.length && <button type="button" onClick={() => setEditing(null)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#7057ed] px-4 text-[11px] font-semibold text-white transition hover:bg-[#6249df]"><CirclePlus size={14} /> New account</button>}</div>}
      </section>
    </div>
    {editing !== undefined && <AccountEditor account={editing} onClose={() => setEditing(undefined)} />}
  </div>;
}

function AccountCard({ account, canManage, canDelete, onEdit }: { account: AccountCardData; canManage: boolean; canDelete: boolean; onEdit: () => void }) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteAccount, {});
  const router = useRouter();
  useEffect(() => { if (deleteState.success) router.refresh(); }, [deleteState.success, router]);

  return <article className="rounded-[20px] border border-[#e8eaf1] bg-white p-5 shadow-[0_8px_28px_rgba(35,39,76,.035)] transition hover:shadow-[0_14px_34px_rgba(35,39,76,.07)] sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#f1efff] text-sm font-bold text-[#7057ed]">{account.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold tracking-[-.02em]">{account.name}</h3><span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-[#f1f2f6] text-[#85899b]"}`}>{account.active ? "Active" : "Inactive"}</span></div><p className="mt-1 text-[10px] text-[#969aab]">{account.visibleOrders.toLocaleString()} {account.visibleOrders === 1 ? "visible order" : "visible orders"}</p></div></div>
    <div className="mt-5 grid grid-cols-2 gap-3 rounded-[15px] bg-[#fafbfe] p-3.5"><div><p className="text-[9px] font-medium text-[#979bad]">Real orders</p><p className="mt-1 text-sm font-semibold text-[#35394c]">{account.realOrders.toLocaleString()}</p></div><div><p className="text-[9px] font-medium text-[#979bad]">Dummy orders</p><p className="mt-1 text-sm font-semibold text-[#35394c]">{account.dummyOrders === null ? "Admin only" : account.dummyOrders.toLocaleString()}</p></div><div><p className="text-[9px] font-medium text-[#979bad]">Real sales</p><p className="mt-1 text-sm font-semibold text-[#35394c]">{account.sales}</p></div><div><p className="text-[9px] font-medium text-[#979bad]">Net revenue</p><p className="mt-1 text-sm font-semibold text-[#23956f]">{account.netRevenue}</p></div></div>
    <div className="mt-4 flex flex-wrap gap-2"><Link href={`/accounts/${account.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f1efff] px-3 text-[10px] font-semibold text-[#6653d2] transition hover:bg-[#e9e5ff]"><Eye size={13} /> View details</Link>{canManage && <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e7e8ef] px-3 text-[10px] font-semibold text-[#656a7d] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><Pencil size={12} /> Edit</button>}{canDelete && <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Delete ${account.name}? Accounts with orders cannot be deleted; set one inactive instead.`)) event.preventDefault(); }}><input type="hidden" name="accountId" value={account.id} /><button disabled={deleting} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#f1e1e2] px-3 text-[10px] font-semibold text-[#b5525e] transition hover:bg-rose-50 disabled:opacity-50"><Trash2 size={12} /> Delete</button></form>}</div>
    {deleteState.error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[10px] leading-4 text-rose-800">{deleteState.error}</p>}
  </article>;
}

function AccountEditor({ account, onClose }: { account: AccountCardData | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveAccount, {});
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#15152d]/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="account-editor-title" className="w-full max-w-[480px] rounded-[22px] border border-white/70 bg-white p-6 shadow-[0_28px_90px_rgba(20,19,46,.22)] sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[.16em] text-[#8071dd] uppercase">Account settings</p><h2 id="account-editor-title" className="mt-1 text-xl font-semibold tracking-[-.04em]">{account ? "Edit account" : "Create account"}</h2></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl text-[#8b8fa0] transition hover:bg-[#f3f4f8] hover:text-[#4e5264]"><X size={17} /></button></div>
      <form action={action} className="mt-6">
        {account && <input type="hidden" name="accountId" value={account.id} />}
        <label className="block text-[11px] font-semibold text-[#63687c]">Account name<input name="name" required minLength={1} maxLength={120} defaultValue={account?.name ?? ""} placeholder="e.g. Nexency" className={inputClass} /></label>
        <label className="mt-5 block text-[11px] font-semibold text-[#63687c]">Account status<select name="active" defaultValue={account?.active === false ? "false" : "true"} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <p className="mt-3 text-[10px] leading-5 text-[#969aab]">Inactive accounts stay in reports and history but won’t be available for new orders.</p>
        {state.error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-800">{state.error}</p>}
        {state.success && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800"><Check size={14} />{state.success}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-xs font-semibold text-[#74798c] transition hover:bg-[#f4f5f8]">{state.success ? "Done" : "Cancel"}</button><button disabled={pending} className="h-10 rounded-xl bg-[#7057ed] px-4 text-xs font-semibold text-white transition hover:bg-[#6249df] disabled:opacity-50">{pending ? "Saving…" : account ? "Save changes" : "Create account"}</button></div>
      </form>
    </section>
  </div>;
}
