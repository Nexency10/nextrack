"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Banknote, CalendarDays, CircleDollarSign, Info, LoaderCircle, ReceiptText, Sparkles } from "lucide-react";
import { createOrder } from "@/app/actions/orders";

type AccountOption = { id: string; name: string };
type ManagerOption = { id: string; name: string; account_id: string };

const platforms = ["WordPress", "Squarespace", "Wix", "Shopify", "Webflow"];
const fieldClass = "mt-2 h-12 w-full rounded-xl border border-[#e6e8ef] bg-[#fbfbfe] px-3.5 text-sm text-[#2c2f43] outline-none transition focus:border-[#9b8df0] focus:bg-white focus:ring-4 focus:ring-[#7057ed]/[.08]";
const labelClass = "block text-[11px] font-semibold text-[#63687c]";

function toMinorUnits(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function roundRatio(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / 2n) / denominator;
}

function asMoney(value: bigint) {
  return `$${(value / 100n).toLocaleString("en-US")}.${(value % 100n).toString().padStart(2, "0")}`;
}

function asBasisPoints(value: string) {
  return toMinorUnits(value);
}

export function OrderForm({
  accounts,
  managers,
  initialPlatformFee,
  dummyPayoutPercent,
  defaultDiscountPercent,
  canCreateDummy,
  defaultAccountId,
  fixedManager,
}: {
  accounts: AccountOption[];
  managers: ManagerOption[];
  initialPlatformFee: string;
  dummyPayoutPercent: string;
  defaultDiscountPercent: string;
  canCreateDummy: boolean;
  defaultAccountId?: string;
  fixedManager?: ManagerOption | null;
}) {
  const [state, action, pending] = useActionState(createOrder, {});
  const [orderType, setOrderType] = useState<"real" | "dummy">("real");
  const selectedAccountId = defaultAccountId ?? fixedManager?.account_id;
  const [accountId, setAccountId] = useState(accounts.some((account) => account.id === selectedAccountId) ? selectedAccountId ?? "" : accounts[0]?.id ?? "");
  const [amountText, setAmountText] = useState("350.00");
  const [serviceFeeText, setServiceFeeText] = useState("0.00");
  const [discountText, setDiscountText] = useState(defaultDiscountPercent);
  const [platformFeeText, setPlatformFeeText] = useState(initialPlatformFee);
  const [managerId, setManagerId] = useState(fixedManager?.id ?? "");
  const availableManagers = useMemo(() => managers.filter((manager) => manager.account_id === accountId), [accountId, managers]);
  const amount = toMinorUnits(amountText);
  const serviceFee = toMinorUnits(serviceFeeText);
  const discount = asBasisPoints(discountText);
  const platformFee = asBasisPoints(platformFeeText);
  const validPreview = amount !== null && serviceFee !== null && discount !== null && platformFee !== null && discount <= 10_000n && platformFee <= 10_000n;
  const preview = validPreview && amount !== null && serviceFee !== null && discount !== null && platformFee !== null
    ? orderType === "real"
      ? {
          buyerPaid: amount + serviceFee,
          platformFee: roundRatio(amount * platformFee, 10_000n),
          sellerReceives: amount - roundRatio(amount * platformFee, 10_000n),
          profitLoss: amount - roundRatio(amount * platformFee, 10_000n),
        }
      : (() => {
          const buyerPaid = roundRatio((amount + serviceFee) * (10_000n - discount), 10_000n);
          const payout = asBasisPoints(dummyPayoutPercent) ?? 8_000n;
          const sellerReceives = roundRatio(amount * payout, 10_000n);
          const loss = buyerPaid > sellerReceives ? buyerPaid - sellerReceives : 0n;
          return { buyerPaid, platformFee: 0n, sellerReceives, profitLoss: -loss };
        })()
    : null;

  return <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
    <section className="rounded-[22px] border border-[#e8eaf2] bg-white p-5 shadow-[0_12px_40px_rgba(37,41,77,.04)] sm:p-7">
      <div className="flex items-start gap-3 border-b border-[#eff0f5] pb-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#f1efff] text-[#7057ed]"><ReceiptText size={18} /></span><div><h2 className="text-sm font-semibold">Order information</h2><p className="mt-1 text-[11px] leading-5 text-[#9296a7]">Choose an account, enter the order details, and review the totals.</p></div></div>

      <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <label className={labelClass}>Account<select name="accountId" required value={accountId} onChange={(event) => { setAccountId(event.target.value); setManagerId(fixedManager?.id ?? ""); }} className={fieldClass}><option value="" disabled>Select an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className={labelClass}>Platform<select name="platform" defaultValue="Wix" className={fieldClass}>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select></label>

        <fieldset className="sm:col-span-2"><legend className={labelClass}>Order type</legend><div className="mt-2 grid grid-cols-2 gap-2 rounded-[14px] bg-[#f5f6fa] p-1.5">
          <button type="button" onClick={() => setOrderType("real")} className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-xs font-semibold transition ${orderType === "real" ? "bg-white text-[#5e49ce] shadow-sm" : "text-[#808497] hover:text-[#494e63]"}`}><BadgeCheck size={15} /> Real order</button>
          {canCreateDummy && <button type="button" onClick={() => setOrderType("dummy")} className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-xs font-semibold transition ${orderType === "dummy" ? "bg-white text-[#5e49ce] shadow-sm" : "text-[#808497] hover:text-[#494e63]"}`}><Sparkles size={15} /> Dummy order</button>}
        </div><input type="hidden" name="orderType" value={orderType} /></fieldset>

        <label className={labelClass}>Order amount ($)<input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amountText} onChange={(event) => setAmountText(event.target.value)} className={fieldClass} placeholder="0.00" /></label>
        <label className={labelClass}>Service fee ($)<input name="serviceFee" type="number" inputMode="decimal" min="0" step="0.01" required value={serviceFeeText} onChange={(event) => setServiceFeeText(event.target.value)} className={fieldClass} placeholder="0.00" /></label>

        {orderType === "real" ? <label className={labelClass}>Platform fee (%)<input name="platformFeePercent" type="number" inputMode="decimal" min="0" max="100" step="0.01" required value={platformFeeText} onChange={(event) => setPlatformFeeText(event.target.value)} className={fieldClass} /></label> : <label className={labelClass}>Discount (%)<input name="discountPercent" type="number" inputMode="decimal" min="0" max="100" step="0.01" required value={discountText} onChange={(event) => setDiscountText(event.target.value)} className={fieldClass} /></label>}

        {fixedManager ? <label className={labelClass}>Sales manager<input type="hidden" name="managerId" value={fixedManager.id} /><select aria-label="Assigned sales manager" value={fixedManager.id} disabled className={`${fieldClass} cursor-not-allowed bg-[#f1f2f6] text-[#74788a]`}><option value={fixedManager.id}>{fixedManager.name}</option></select><span className="mt-1 block text-[10px] font-normal text-[#999cac]">Automatically assigned to your account.</span></label> : <label className={labelClass}>Sales manager <span className="font-normal text-[#a0a3b1]">· optional</span><select name="managerId" value={managerId} onChange={(event) => setManagerId(event.target.value)} className={fieldClass}><option value="">Unassigned</option>{availableManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>}
        {orderType === "dummy" && <input type="hidden" name="platformFeePercent" value="0" />}
        {orderType === "real" && <input type="hidden" name="discountPercent" value="0" />}

        <label className={labelClass}><span className="flex items-center gap-1.5"><CalendarDays size={13} /> Order date</span><input name="orderDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label>
        <label className={labelClass}>Status<select name="status" defaultValue="Completed" className={fieldClass}><option>Completed</option><option>Pending</option><option>Cancelled</option></select></label>
        <label className={`${labelClass} sm:col-span-2`}>Notes <span className="font-normal text-[#a0a3b1]">· optional</span><textarea name="notes" rows={3} maxLength={2000} placeholder="Add a reference or a short note…" className="mt-2 w-full resize-y rounded-xl border border-[#e6e8ef] bg-[#fbfbfe] px-3.5 py-3 text-sm text-[#2c2f43] outline-none transition placeholder:text-[#a7aab8] focus:border-[#9b8df0] focus:bg-white focus:ring-4 focus:ring-[#7057ed]/[.08]" /></label>
      </div>

      {state.error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{state.error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#eff0f5] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-[10px] leading-5 text-[#9a9eae]"><Info size={13} className="shrink-0" /> Totals are calculated and stored by the database.</p><button disabled={pending || !accountId} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7057ed] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(112,87,237,.2)] transition hover:bg-[#6249df] disabled:cursor-not-allowed disabled:opacity-55">{pending ? <><LoaderCircle size={16} className="animate-spin" /> Saving…</> : <>Save order <ArrowRight size={16} /></>}</button></div>
    </section>

    <aside className="self-start rounded-[22px] bg-[#19182f] p-5 text-white shadow-[0_18px_48px_rgba(25,24,47,.17)] sm:p-6 xl:sticky xl:top-6">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/10 text-[#c2b8ff]"><CircleDollarSign size={18} /></span><div><p className="text-[10px] font-semibold tracking-[.15em] text-[#aaa5c2] uppercase">Live preview</p><p className="mt-0.5 text-sm font-semibold">{orderType === "real" ? "Real order totals" : "Dummy order totals"}</p></div></div>
      <div className="mt-6 rounded-[16px] border border-white/10 bg-white/[.045] p-4"><p className="text-[10px] text-[#aaa5c2]">Buyer pays</p><p className="mt-1 text-[28px] font-semibold tracking-[-.045em]">{preview ? asMoney(preview.buyerPaid) : "—"}</p></div>
      <div className="mt-4 space-y-3.5">
        <PreviewRow label={orderType === "real" ? "Platform fee" : "Discount"} value={orderType === "real" ? (preview ? asMoney(preview.platformFee) : "—") : `${discountText || "0"}%`} />
        <PreviewRow label="Seller receives" value={preview ? asMoney(preview.sellerReceives) : "—"} />
        <div className="border-t border-white/10 pt-3.5"><PreviewRow label={orderType === "real" ? "Net revenue" : "Profit / loss"} value={preview ? asMoney(preview.profitLoss < 0n ? -preview.profitLoss : preview.profitLoss) : "—"} tone={orderType === "dummy" && preview?.profitLoss && preview.profitLoss < 0n ? "red" : "green"} /></div>
      </div>
      <div className="mt-6 flex gap-2.5 rounded-xl bg-white/[.06] p-3 text-[10px] leading-5 text-[#b7b4cb]"><Banknote size={14} className="mt-0.5 shrink-0 text-[#bdb4ff]" /><p>{orderType === "real" ? "Buyer paid = amount + service fee. Platform fee is taken from the order amount." : `Payout uses your current ${dummyPayoutPercent}% workspace rule. Dummy details are visible only to administrators.`}</p></div>
    </aside>
  </form>;
}

function PreviewRow({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "red" }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-[#aaa5c2]">{label}</span><span className={`text-xs font-semibold ${tone === "green" ? "text-[#74d6b0]" : tone === "red" ? "text-[#ff9b9b]" : "text-[#f2f0fc]"}`}>{value}</span></div>;
}
