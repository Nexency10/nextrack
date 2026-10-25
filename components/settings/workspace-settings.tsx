"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgePercent, Download, LockKeyhole, Save, Settings2, ShieldCheck, WalletCards } from "lucide-react";
import { saveWorkspaceSettings } from "@/app/actions/settings";

type Defaults = { realFeePercent: string; dummyPayoutPercent: string; defaultDiscountPercent: string };
const inputClass = "mt-2 h-11 w-full rounded-xl border border-[#e6e8ef] bg-[#fbfbfe] px-3.5 text-sm text-[#292c40] outline-none transition focus:border-[#9b8df0] focus:bg-white focus:ring-4 focus:ring-[#7057ed]/[.08]";

export function WorkspaceSettings({ settings, error }: { settings: Defaults | null; error: string | null }) {
  const [state, action, pending] = useActionState(saveWorkspaceSettings, {});
  return <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 lg:px-10 lg:py-9">
    <div className="mb-7"><p className="mb-2 text-[10px] font-semibold tracking-[.17em] text-[#8071dd] uppercase">Workspace administration</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Settings</h1><p className="mt-2 text-[13px] text-[#85899d]">Manage the calculation defaults and workspace access tools.</p></div>

    {error || !settings ? <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h2 className="text-sm font-semibold text-amber-950">Workspace settings are unavailable</h2><p className="mt-2 text-xs leading-5 text-amber-900/75">{error || "The settings row was not found."} Check that the Supabase setup migration has been applied and refresh this page.</p></section> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
      <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]"><div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#f1efff] text-[#7057ed]"><Settings2 size={18} /></span><div><h2 className="text-sm font-semibold">Calculation defaults</h2><p className="mt-1 text-[10px] text-[#969aab]">Defaults used when creating new orders.</p></div></div>
        <form action={action} className="p-5 sm:p-6"><div className="grid gap-x-4 gap-y-5 sm:grid-cols-2"><PercentField name="realFeePercent" label="Default real platform fee" value={settings.realFeePercent} help="Deducted from the order amount to calculate seller proceeds." /><PercentField name="dummyPayoutPercent" label="Dummy seller payout" value={settings.dummyPayoutPercent} help="Used to calculate payout and private dummy-order loss." /><PercentField name="defaultDiscountPercent" label="Default dummy discount" value={settings.defaultDiscountPercent} help="Applied as the starting discount on new dummy orders." /></div>
          <div className="mt-5 flex gap-2.5 rounded-xl bg-[#f7f7fc] p-3.5 text-[10px] leading-5 text-[#73788b]"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-[#7057ed]" /><p>These values are saved with each new order. Changing a default does not rewrite historical orders or their saved totals.</p></div>
          {state.error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{state.error}</p>}{state.success && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">{state.success}</p>}
          <div className="mt-5 flex justify-end border-t border-[#eff0f5] pt-5"><button disabled={pending || !settings} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7057ed] px-4 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(112,87,237,.18)] transition hover:bg-[#6249df] disabled:cursor-not-allowed disabled:opacity-55">{pending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving…</> : <><Save size={14} /> Save calculation defaults</>}</button></div>
        </form>
      </section>

      <div className="space-y-5"><section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]"><div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-emerald-50 text-emerald-700"><ShieldCheck size={17} /></span><div><h2 className="text-sm font-semibold">Access and security</h2><p className="mt-1 text-[10px] text-[#969aab]">Manage who can use the workspace.</p></div></div><div className="p-5"><p className="text-[11px] leading-5 text-[#777c90]">User sign-in, session security, and access approval use Supabase Auth and workspace roles. New users remain pending until an administrator approves them.</p><Link href="/admin/users" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><ShieldCheck size={14} /> Manage team access <ArrowUpRight size={13} /></Link></div></section>

        <section className="overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]"><div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-sky-50 text-sky-700"><WalletCards size={17} /></span><div><h2 className="text-sm font-semibold">Workspace data</h2><p className="mt-1 text-[10px] text-[#969aab]">Export stored orders or manage account records.</p></div></div><div className="flex flex-wrap gap-2 p-5"><a href="/api/orders/export" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><Download size={14} /> Export orders CSV</a><Link href="/accounts" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><BadgePercent size={14} /> Manage accounts</Link></div></section>

        <p className="px-1 text-[10px] leading-5 text-[#9a9eae]">Calculation settings are protected by administrator access policies in Supabase. No secondary admin PIN is stored in the browser.</p>
      </div>
    </div>}
  </div>;
}

function PercentField({ name, label, value, help }: { name: string; label: string; value: string; help: string }) {
  return <label className="block text-[11px] font-semibold text-[#63687c]">{label}<span className="relative mt-2 block"><input required name={name} type="number" inputMode="decimal" min="0" max="100" step="0.01" defaultValue={value} className={`${inputClass} mt-0 pr-9`} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-[#969aab]">%</span></span><span className="mt-2 block text-[10px] leading-4 font-normal text-[#969aab]">{help}</span></label>;
}
