"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = { error?: string; success?: string };

function parsePercent(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const basisPoints = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (basisPoints > 10_000n) return null;
  return `${basisPoints / 100n}.${(basisPoints % 100n).toString().padStart(2, "0")}`;
}

export async function saveWorkspaceSettings(_previousState: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.status !== "active") return { error: "Active administrator access is required to change workspace settings." };

  const realFee = parsePercent(formData.get("realFeePercent"));
  const dummyPayout = parsePercent(formData.get("dummyPayoutPercent"));
  const defaultDiscount = parsePercent(formData.get("defaultDiscountPercent"));
  if (realFee === null || dummyPayout === null || defaultDiscount === null) {
    return { error: "Enter valid percentages between 0 and 100, with up to two decimal places." };
  }

  const { data, error } = await supabase.from("app_settings").update({
    real_fee_percent: realFee,
    dummy_payout_percent: dummyPayout,
    default_discount_percent: defaultDiscount,
  }).eq("id", 1).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Workspace settings were not found. Apply the Supabase setup SQL first." };

  revalidatePath("/settings");
  revalidatePath("/orders/new");
  return { success: "Calculation defaults saved. New orders will use these values." };
}
