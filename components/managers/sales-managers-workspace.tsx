"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BriefcaseBusiness, Building2, CirclePlus, KeyRound, Pencil, Search, Target, Trash2, TrendingUp, Users, X } from "lucide-react";
import { assignWorkspaceRole, deleteSalesManager, saveSalesManager, setDummyOrderPermission, type ManagerActionState } from "@/app/actions/managers";

export type SalesManagerItem = {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  accountActive: boolean;
  target: string;
  sales: string;
  salesCents: string;
  orderCount: number;
  active: boolean;
  profileId: string | null;
  profileRole: "viewer" | "manager" | null;
  canCreateDummy: boolean;
};
type AccountOption = { id: string; name: string; active: boolean };
type MemberOption = { id: string; name: string; email: string; role: "viewer" | "manager" };

const inputClass = "h-11 w-full rounded-xl border border-[#e6e8ef] bg-[#fbfbfe] px-3.5 text-sm text-[#292c40] outline-none transition focus:border-[#9b8df0] focus:bg-white focus:ring-4 focus:ring-[#7057ed]/[.08]";
const wholeCurrency = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function cents(value: string) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return 0n;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
}

function money(value: bigint) {
  const major = value / 100n;
  const minor = (value % 100n).toString().padStart(2, "0");
  return `$${wholeCurrency.format(major)}.${minor}`;
}

export function SalesManagersWorkspace({ managers, members, accounts, canManage, isAdmin }: { managers: SalesManagerItem[]; members: MemberOption[]; accounts: AccountOption[]; canManage: boolean; isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SalesManagerItem | null | undefined>(undefined);
  const viewOnlyMembers = members.filter((member) => member.role === "viewer");
  const activeAccounts = accounts.filter((account) => account.active);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return managers.filter((manager) => !value || manager.name.toLowerCase().includes(value) || manager.accountName.toLowerCase().includes(value));
  }, [managers, query]);
  const totalSales = managers.reduce((sum, manager) => sum + BigInt(manager.salesCents), 0n);
  const totalTarget = managers.reduce((sum, manager) => sum + cents(manager.target), 0n);
  const activeCount = managers.filter((manager) => manager.active && manager.accountActive).length;

  return <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-9">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold tracking-[.17em] text-[#8071dd] uppercase">Team performance</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Sales managers</h1><p className="mt-2 text-[13px] text-[#85899d]">Track assigned accounts, sales, and monthly targets.</p></div>{canManage && <button type="button" disabled={!activeAccounts.length} onClick={() => setEditing(null)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7057ed] px-4 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(112,87,237,.18)] transition hover:bg-[#6249df] disabled:cursor-not-allowed disabled:opacity-50"><CirclePlus size={15} /> Add manager</button>}</div>

    <section className="mb-6 grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Sales managers" value={managers.length.toLocaleString()} detail={`${activeCount} assigned to active accounts`} icon={<Users size={17} />} />
      <SummaryCard label="Real sales assigned" value={money(totalSales)} detail="All non-cancelled real orders" icon={<TrendingUp size={17} />} />
      <SummaryCard label="Combined targets" value={money(totalTarget)} detail="Monthly targets across managers" icon={<Target size={17} />} />
    </section>

    {isAdmin && <section className="mb-7 overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]"><div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-violet-50 text-[#7057ed]"><Target size={16} /></span><div><h2 className="text-sm font-semibold">Workspace role assignments</h2><p className="mt-1 text-[10px] text-[#969aab]">Approved view-only users appear here. Assign a sales manager role and target to give them management access.</p></div><span className="ml-auto rounded-full bg-[#f3f1ff] px-2.5 py-1 text-[9px] font-semibold text-[#7057ed]">{viewOnlyMembers.length} view-only users</span></div>{viewOnlyMembers.length ? <div className="divide-y divide-[#eff0f5]">{viewOnlyMembers.map((member) => <MemberAssignment key={member.id} member={member} accounts={activeAccounts} manager={managers.find((item) => item.profileId === member.id) ?? null} />)}</div> : <p className="px-6 py-8 text-center text-[11px] text-[#9296a7]">No approved view-only users to assign yet.</p>}</section>}

    {!activeAccounts.length && canManage && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900"><p>Create or activate an account before adding a sales manager.</p><Link href="/accounts" className="inline-flex items-center gap-1 font-semibold hover:underline">Go to accounts <ArrowUpRight size={13} /></Link></div>}

    <div className="mb-4 flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="text-sm font-semibold">Manager directory</h2><p className="mt-1 text-[10px] text-[#969aab]">{filtered.length} of {managers.length} managers</p></div><label className="relative block"><span className="sr-only">Search sales managers</span><Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9a9eae]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or account" className={`${inputClass} w-full bg-white pl-9 text-[11px] sm:w-[240px]`} /></label></div>

    {filtered.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((manager) => <ManagerCard key={manager.id} manager={manager} canManage={canManage} isAdmin={isAdmin} onEdit={() => setEditing(manager)} />)}</div> : <section className="rounded-[20px] border border-dashed border-[#dfe2ec] bg-white px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-[#f1efff] text-[#7057ed]"><BriefcaseBusiness size={20} /></span><h2 className="mt-4 text-sm font-semibold">{managers.length ? "No matching managers" : "No sales managers yet"}</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#9296a7]">{managers.length ? "Try another search." : "Add a manager, assign an account, and set a monthly sales target."}</p>{canManage && activeAccounts.length > 0 && !managers.length && <button type="button" onClick={() => setEditing(null)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#7057ed] px-4 text-[11px] font-semibold text-white"><CirclePlus size={14} /> Add manager</button>}</section>}

    {editing !== undefined && <ManagerEditor manager={editing} accounts={activeAccounts} onClose={() => setEditing(undefined)} />}
  </div>;
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <article className="rounded-[18px] border border-[#e9ebf2] bg-white p-4 shadow-[0_8px_28px_rgba(35,39,76,.035)]"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-[#777c90]">{label}</p><span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#f1efff] text-[#7057ed]">{icon}</span></div><p className="mt-4 text-[22px] font-semibold leading-none tracking-[-.04em] text-[#25283a]">{value}</p><p className="mt-2 text-[10px] text-[#9699a9]">{detail}</p></article>;
}

function MemberAssignment({ member, accounts, manager }: { member: MemberOption; accounts: AccountOption[]; manager: SalesManagerItem | null }) {
  const router = useRouter();
  const [role, setRole] = useState<"viewer" | "manager">(member.role);
  const [state, action, pending] = useActionState(async (previous: ManagerActionState, formData: FormData) => {
    const result = await assignWorkspaceRole(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  const initialAccountId = manager && accounts.some((account) => account.id === manager.accountId) ? manager.accountId : accounts[0]?.id ?? "";
  return <form action={action} className="flex flex-col gap-3 px-5 py-4 sm:px-6 xl:flex-row xl:items-center">
    <input type="hidden" name="profileId" value={member.id} />
    <div className="min-w-0 xl:w-[230px] xl:shrink-0"><p className="truncate text-[11px] font-semibold text-[#34374a]">{member.name}</p><p className="mt-1 truncate text-[10px] text-[#969aab]">{member.email}</p></div>
    <div className="grid flex-1 gap-2 sm:grid-cols-3">
      <label className="block text-[9px] font-semibold text-[#85899d]">Workspace role<select name="role" value={role} onChange={(event) => setRole(event.target.value as "viewer" | "manager")} className={`${inputClass} mt-1 h-10 text-[11px]`}><option value="viewer">View only</option><option value="manager">Sales manager</option></select></label>
      <label className="block text-[9px] font-semibold text-[#85899d]">Assigned account<select name="accountId" disabled={role !== "manager" || !accounts.length} required={role === "manager"} defaultValue={initialAccountId} className={`${inputClass} mt-1 h-10 text-[11px] disabled:bg-[#f5f5f8] disabled:text-[#a1a4b1]`}><option value="">Select an active account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label className="block text-[9px] font-semibold text-[#85899d]">Monthly target ($)<input name="target" type="number" inputMode="decimal" min="0" step="0.01" disabled={role !== "manager"} required={role === "manager"} defaultValue={manager?.target ?? "0.00"} className={`${inputClass} mt-1 h-10 text-[11px] disabled:bg-[#f5f5f8] disabled:text-[#a1a4b1]`} /></label>
    </div>
    <button disabled={pending || (role === "manager" && accounts.length === 0)} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#7057ed] px-3.5 text-[10px] font-semibold text-white transition hover:bg-[#6249df] disabled:cursor-not-allowed disabled:opacity-55">{pending ? "Saving…" : "Save assignment"}</button>
    {state.error && <p role="alert" className="text-[10px] text-rose-700 xl:basis-full xl:pl-[230px]">{state.error}</p>}
    {state.success && <p role="status" className="text-[10px] text-emerald-700 xl:basis-full xl:pl-[230px]">{state.success}</p>}
  </form>;
}

function ManagerCard({ manager, canManage, isAdmin, onEdit }: { manager: SalesManagerItem; canManage: boolean; isAdmin: boolean; onEdit: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: ManagerActionState, formData: FormData) => {
    const result = await deleteSalesManager(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  const targetCents = cents(manager.target);
  const salesCents = BigInt(manager.salesCents);
  const progress = targetCents > 0n ? Math.min(100, Number((salesCents * 10_000n) / targetCents) / 100) : 0;

  return <article className="rounded-[20px] border border-[#e8eaf1] bg-white p-5 shadow-[0_8px_28px_rgba(35,39,76,.035)] transition hover:shadow-[0_14px_34px_rgba(37,41,77,.07)] sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#f1efff] text-[#7057ed]"><Users size={18} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold tracking-[-.02em]">{manager.name}</h3><p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-[#9296a7]"><Building2 size={12} className="shrink-0" />{manager.accountName}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${manager.active && manager.accountActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{!manager.active ? "Inactive" : manager.accountActive ? "Active" : "Inactive account"}</span></div>
    {isAdmin ? <><div className="mt-5 grid grid-cols-2 gap-3 rounded-[15px] bg-[#fafbfe] p-3.5"><div><p className="text-[9px] font-medium text-[#979bad]">Real sales</p><p className="mt-1 text-sm font-semibold text-[#35394c]">{manager.sales}</p></div><div><p className="text-[9px] font-medium text-[#979bad]">Monthly target</p><p className="mt-1 text-sm font-semibold text-[#35394c]">{money(targetCents)}</p></div></div><div className="mt-4"><div className="mb-2 flex items-center justify-between text-[9px]"><span className="font-medium text-[#85899d]">Sales against target</span><span className="font-semibold text-[#6653d2]">{progress.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eeedf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#8d79f5] to-[#6e55e8] transition-[width]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[9px] text-[#a0a3b1]">{manager.orderCount.toLocaleString()} assigned real {manager.orderCount === 1 ? "order" : "orders"}</p></div></> : <p className="mt-5 rounded-[15px] bg-[#fafbfe] p-3.5 text-[10px] text-[#969aab]">Performance calculations are available to administrators only.</p>}
    {manager.profileId && <p className="mt-4 border-t border-[#eff0f5] pt-3 text-[10px] text-[#969aab]">{isAdmin && manager.profileRole ? <>Linked workspace role: <span className="font-semibold text-[#656a7d]">{manager.profileRole === "manager" ? "Sales manager" : "View only"}</span></> : "Linked to a workspace user."}</p>}
    {isAdmin && manager.profileId && manager.profileRole === "manager" && <DummyPermissionToggle manager={manager} />}
    {canManage && isAdmin && manager.profileId && manager.profileRole && <div className="mt-4 border-t border-[#eff0f5] pt-4"><button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e7e8ef] px-3 text-[10px] font-semibold text-[#656a7d] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><Pencil size={12} /> Edit manager & role</button></div>}
    {canManage && !manager.profileId && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eff0f5] pt-4"><button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e7e8ef] px-3 text-[10px] font-semibold text-[#656a7d] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><Pencil size={12} /> Edit</button><form action={action} onSubmit={(event) => { if (!window.confirm(`Delete ${manager.name}? Existing orders will become unassigned.`)) event.preventDefault(); }}><input type="hidden" name="managerId" value={manager.id} /><button disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e7e8ef] px-3 text-[10px] font-semibold text-[#85899a] transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"><Trash2 size={12} /> {pending ? "Deleting…" : "Delete"}</button></form>{state.error && <p role="alert" className="basis-full text-[10px] text-rose-700">{state.error}</p>}</div>}
  </article>;
}

function DummyPermissionToggle({ manager }: { manager: SalesManagerItem }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: ManagerActionState, formData: FormData) => {
    const result = await setDummyOrderPermission(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  return <form action={action} className="mt-4 border-t border-[#eff0f5] pt-4">
    <input type="hidden" name="managerId" value={manager.id} />
    <input type="hidden" name="enabled" value={String(!manager.canCreateDummy)} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-[11px] ${manager.canCreateDummy ? "bg-emerald-50 text-emerald-700" : "bg-[#f5f5f9] text-[#85899a]"}`}><KeyRound size={14} /></span><div><p className="text-[10px] font-semibold text-[#4d5266]">Dummy-order access</p><p className="mt-0.5 text-[9px] text-[#969aab]">{manager.canCreateDummy ? "This manager can create dummy orders" : "This manager can create real orders only"}</p></div></div>
      <button type="submit" disabled={pending || (!manager.canCreateDummy && (!manager.active || !manager.accountActive))} className={`h-9 rounded-lg px-3 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${manager.canCreateDummy ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "bg-[#7057ed] text-white hover:bg-[#6249df]"}`}>{pending ? "Saving…" : manager.canCreateDummy ? "Revoke access" : "Allow dummy orders"}</button>
    </div>
    {state.error && <p role="alert" className="mt-2 text-[10px] text-rose-700">{state.error}</p>}
    {state.success && <p role="status" className="mt-2 text-[10px] text-emerald-700">{state.success}</p>}
  </form>;
}

function ManagerEditor({ manager, accounts, onClose }: { manager: SalesManagerItem | null; accounts: AccountOption[]; onClose: () => void }) {
  const router = useRouter();
  const [role, setRole] = useState<"viewer" | "manager">(manager?.profileRole === "viewer" ? "viewer" : "manager");
  const [state, action, pending] = useActionState(async (previous: ManagerActionState, formData: FormData) => {
    const result = manager?.profileId
      ? await assignWorkspaceRole(previous, formData)
      : await saveSalesManager(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#141326]/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="manager-editor-title" className="my-auto w-full max-w-lg rounded-[22px] border border-[#e9ebf2] bg-white p-5 shadow-[0_24px_80px_rgba(18,17,40,.24)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.14em] text-[#8071dd] uppercase">Team performance</p><h2 id="manager-editor-title" className="mt-1 text-lg font-semibold">{manager ? "Edit sales manager" : "Add sales manager"}</h2><p className="mt-1 text-[11px] text-[#969aab]">Assign an account and set a monthly sales target.</p></div><button type="button" disabled={pending} onClick={onClose} aria-label="Close manager form" className="grid h-9 w-9 place-items-center rounded-lg text-[#85899a] hover:bg-[#f5f5f9]"><X size={17} /></button></div>
    <form action={action} className="mt-5 space-y-4"><input type="hidden" name="managerId" value={manager?.id ?? ""} />{manager?.profileId ? <><input type="hidden" name="profileId" value={manager.profileId} /><label className="block text-[11px] font-semibold text-[#63687c]">Workspace role<select name="role" value={role} onChange={(event) => setRole(event.target.value as "viewer" | "manager")} className={`${inputClass} mt-2`}><option value="viewer">View only</option><option value="manager">Sales manager</option></select></label></> : <label className="block text-[11px] font-semibold text-[#63687c]">Manager name<input required name="name" maxLength={120} defaultValue={manager?.name ?? ""} placeholder="Enter a name" className={`${inputClass} mt-2`} /></label>}<label className="block text-[11px] font-semibold text-[#63687c]">Assigned account<select name="accountId" disabled={manager?.profileId ? role !== "manager" || !accounts.length : false} required={manager?.profileId ? role === "manager" : true} defaultValue={manager && accounts.some((account) => account.id === manager.accountId) ? manager.accountId : accounts[0]?.id ?? ""} className={`${inputClass} mt-2 disabled:bg-[#f5f5f8] disabled:text-[#a1a4b1]`}><option value="" disabled>Select an active account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="block text-[11px] font-semibold text-[#63687c]">Monthly target ($)<input name="target" type="number" inputMode="decimal" min="0" step="0.01" disabled={Boolean(manager?.profileId && role !== "manager")} required={manager?.profileId ? role === "manager" : true} defaultValue={manager?.target ?? "0.00"} className={`${inputClass} mt-2 disabled:bg-[#f5f5f8] disabled:text-[#a1a4b1]`} /></label>{state.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-800">{state.error}</p>}{state.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800">{state.success}</p>}<div className="flex justify-end gap-2 border-t border-[#eff0f5] pt-4"><button type="button" disabled={pending} onClick={onClose} className="h-10 rounded-xl border border-[#e7e8ef] px-4 text-[11px] font-semibold text-[#686d81]">Cancel</button><button disabled={pending} className="h-10 rounded-xl bg-[#7057ed] px-4 text-[11px] font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save manager"}</button></div></form>
  </section></div>;
}
