"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { saveAccount } from "@/app/actions/accounts";

export function QuickCreateAccount() {
  const [state, action, pending] = useActionState(saveAccount, {});
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return <section className="rounded-[22px] border border-[#e8eaf2] bg-white p-6 shadow-[0_12px_40px_rgba(37,41,77,.04)] sm:p-8">
    <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#f1efff] text-[#7057ed]"><Building2 size={21} /></span>
    <h2 className="mt-5 text-lg font-semibold tracking-[-.035em]">Add your first account</h2>
    <p className="mt-2 max-w-lg text-sm leading-6 text-[#85899d]">Orders belong to an account. Create one here, then this form will be ready to record its first order.</p>
    <form action={action} className="mt-6 flex flex-col gap-3 sm:max-w-xl sm:flex-row">
      <label className="sr-only" htmlFor="first-account-name">Account name</label>
      <input id="first-account-name" name="name" required minLength={1} maxLength={120} placeholder="e.g. Nexency" className="h-12 min-w-0 flex-1 rounded-xl border border-[#e5e7ef] bg-[#fbfbfe] px-4 text-sm outline-none transition placeholder:text-[#a7aab8] focus:border-[#9b8df0] focus:bg-white focus:ring-4 focus:ring-[#7057ed]/[.08]" />
      <input type="hidden" name="active" value="true" />
      <button disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7057ed] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(112,87,237,.19)] transition hover:bg-[#6249df] disabled:cursor-wait disabled:opacity-60"><Plus size={16} />{pending ? "Creating…" : "Create account"}</button>
    </form>
    {state.error && <p role="alert" className="mt-3 text-xs font-medium text-rose-700">{state.error}</p>}
    {state.success && <p role="status" className="mt-3 text-xs font-medium text-emerald-700">{state.success}</p>}
  </section>;
}
