import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LockKeyhole, ReceiptText } from "lucide-react";
import { OrderForm } from "@/components/orders/order-form";
import { QuickCreateAccount } from "@/components/orders/quick-create-account";
import { PageLoader } from "@/components/page-loader";
import { createClient } from "@/lib/supabase/server";

export default function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  return <Suspense fallback={<PageLoader />}><NewOrderContent searchParams={searchParams} /></Suspense>;
}

async function NewOrderContent({ searchParams }: { searchParams: Promise<{ accountId?: string | string[] }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("full_name, role, status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active" || !["admin", "manager"].includes(profile.role)) redirect("/dashboard");

  const [accountsResult, managersResult, settingsResult] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("active", true).order("name"),
    supabase.from("sales_managers").select("id, name, account_id, profile_id").eq("active", true).order("name"),
    supabase.from("app_settings").select("real_fee_percent, dummy_payout_percent, default_discount_percent").eq("id", 1).single(),
  ]);

  const fixedManager = profile.role === "manager"
    ? (managersResult.data ?? []).find((manager) => manager.profile_id === user.id) ?? null
    : null;
  if (profile.role === "manager" && !fixedManager) {
    return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6"><h1 className="text-base font-semibold text-amber-950">Sales manager assignment unavailable</h1><p className="mt-2 text-sm leading-6 text-amber-900/80">Your active sales manager profile is missing. Ask an administrator to review your role assignment before creating orders.</p></section></div>;
  }
  const availableAccounts = fixedManager
    ? (accountsResult.data ?? []).filter((account) => account.id === fixedManager.account_id)
    : accountsResult.data ?? [];

  const displayName = profile.full_name || user.email || "Workspace member";
  return <div className="min-h-full text-[#191b2b]">
    <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-[.16em] text-[#8071dd] uppercase"><ReceiptText size={13} /> Order management</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Add a new order</h1><p className="mt-2 text-[13px] text-[#85899d]">Capture the details once. Your workspace rules take care of the math.</p></div>
        <div className="hidden items-center gap-2 rounded-full border border-[#e8eaf2] bg-white px-3 py-2 text-[10px] font-medium text-[#7c8193] sm:inline-flex"><LockKeyhole size={13} className="text-[#7057ed]" /> Saved securely to your workspace</div>
      </div>

      {accountsResult.error ? <SetupNotice message={accountsResult.error.message} /> : settingsResult.error ? <SetupNotice message={settingsResult.error.message} /> : !availableAccounts.length && fixedManager ? <SetupNotice message="Your assigned account is inactive. Ask an administrator to activate the account before creating orders." /> : !availableAccounts.length ? <QuickCreateAccount /> : <OrderForm
        accounts={availableAccounts}
        managers={managersResult.data ?? []}
        initialPlatformFee={String(settingsResult.data.real_fee_percent)}
        dummyPayoutPercent={String(settingsResult.data.dummy_payout_percent)}
        defaultDiscountPercent={String(settingsResult.data.default_discount_percent)}
        canCreateDummy={profile.role === "admin"}
        defaultAccountId={typeof query.accountId === "string" ? query.accountId : undefined}
        fixedManager={fixedManager}
      />}
      <p className="mt-5 px-1 text-[10px] leading-5 text-[#9a9eae]">Signed in as {displayName}. Order totals are recomputed by the database when saved; real and dummy order access follows your workspace role.</p>
    </div>
  </div>;
}

function SetupNotice({ message }: { message: string }) {
  return <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-6"><h2 className="text-sm font-semibold text-amber-950">Order data is not ready</h2><p className="mt-2 text-xs leading-5 text-amber-900/75">{message}. Check that the Supabase setup SQL has been applied and refresh this page.</p></section>;
}
