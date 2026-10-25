"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccountActionState = { error?: string; success?: string };

async function getAccountManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." as const };

  const { data: profile, error } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (error || profile?.status !== "active" || !["admin", "manager"].includes(profile.role)) {
    return { error: "Active administrator or sales manager access is required." as const };
  }
  return { supabase };
}

export async function saveAccount(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const access = await getAccountManager();
  if ("error" in access) return { error: access.error };

  const accountId = String(formData.get("accountId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const activeInput = String(formData.get("active") ?? "true");
  if (!name || name.length > 120) return { error: "Enter an account name from 1 to 120 characters." };
  if (activeInput !== "true" && activeInput !== "false") return { error: "Choose whether this account is active." };

  if (accountId) {
    const { data, error } = await access.supabase.from("accounts")
      .update({ name, active: activeInput === "true" })
      .eq("id", accountId)
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "This account could not be found or updated." };
  } else {
    const { error } = await access.supabase.from("accounts").insert({ name, active: activeInput === "true" });
    if (error) return { error: error.message };
  }

  revalidatePath("/accounts");
  revalidatePath("/orders/new");
  revalidatePath("/dashboard");
  return { success: `“${name}” was saved.` };
}

export async function deleteAccount(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const access = await getAccountManager();
  if ("error" in access) return { error: access.error };

  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return { error: "Choose an account to delete." };

  const { data, error } = await access.supabase.from("accounts")
    .delete()
    .eq("id", accountId)
    .select("id")
    .maybeSingle();
  if (error?.code === "23503") return { error: "This account has order history and cannot be deleted. Set it inactive instead." };
  if (error) return { error: error.message };
  if (!data) return { error: "This account could not be found or deleted." };

  revalidatePath("/accounts");
  revalidatePath("/orders/new");
  revalidatePath("/dashboard");
  return { success: "Account deleted." };
}
