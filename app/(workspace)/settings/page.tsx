import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageLoader } from "@/components/page-loader";
import { WorkspaceSettings } from "@/components/settings/workspace-settings";
import { createClient } from "@/lib/supabase/server";

export default function SettingsPage() {
  return <Suspense fallback={<PageLoader />}><SettingsContent /></Suspense>;
}

async function SettingsContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.status !== "active") redirect("/dashboard");

  const { data: settings, error } = await supabase.from("app_settings")
    .select("real_fee_percent, dummy_payout_percent, default_discount_percent")
    .eq("id", 1)
    .maybeSingle();

  return <WorkspaceSettings
    settings={settings ? {
      realFeePercent: String(settings.real_fee_percent),
      dummyPayoutPercent: String(settings.dummy_payout_percent),
      defaultDiscountPercent: String(settings.default_discount_percent),
    } : null}
    error={error?.message ?? null}
  />;
}
