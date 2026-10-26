"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ManagerActionState = { error?: string; success?: string };

export async function assignWorkspaceRole(_previousState: ManagerActionState, formData: FormData): Promise<ManagerActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };
  const { data: actor, error: actorError } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (actorError || actor?.role !== "admin" || actor.status !== "active") return { error: "Active administrator access is required to assign workspace roles." };

  const profileId = String(formData.get("profileId") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const accountId = String(formData.get("accountId") ?? "").trim();
  const target = role === "manager" ? parseTarget(formData.get("target")) : "0.00";
  if (!/^[0-9a-f-]{36}$/i.test(profileId) || profileId === user.id) return { error: "Choose a valid team member." };
  if (role !== "manager" && role !== "viewer") return { error: "Choose a supported workspace role." };
  if (target === null) return { error: "Enter a valid target with up to two decimal places." };

  const { data: member, error: memberError } = await supabase.from("profiles").select("id, full_name, email, role, status").eq("id", profileId).maybeSingle();
  if (memberError || !member || member.status !== "active" || member.role === "admin") return { error: "Only approved non-admin users can be assigned here." };
  if (role === "manager") {
    if (!/^[0-9a-f-]{36}$/i.test(accountId)) return { error: "Choose an active account for the sales manager." };
    const { data: account, error: accountError } = await supabase.from("accounts").select("id").eq("id", accountId).eq("active", true).maybeSingle();
    if (accountError || !account) return { error: "Choose an active account." };
  }

  const { data: updatedProfile, error: profileUpdateError } = await supabase.from("profiles").update({ role }).eq("id", profileId).eq("status", "active").neq("role", "admin").select("id").maybeSingle();
  if (profileUpdateError) return { error: profileUpdateError.message };
  if (!updatedProfile) return { error: "This team member could not be updated." };

  if (role === "manager") {
    const managerName = member.full_name.trim() || member.email;
    const { error } = await supabase.from("sales_managers").upsert({
      profile_id: profileId,
      name: managerName,
      account_id: accountId,
      target,
      active: true,
    }, { onConflict: "profile_id" });
    if (error) {
      await supabase.from("profiles").update({ role: member.role }).eq("id", profileId).neq("role", "admin");
      return { error: error.message };
    }
  } else {
    const { data: linkedManager } = await supabase.from("sales_managers").select("id").eq("profile_id", profileId).maybeSingle();
    if (linkedManager) {
      await supabase.from("dummy_order_manager_permissions").delete().eq("manager_id", linkedManager.id);
    }
    const { error } = await supabase.from("sales_managers").update({ active: false }).eq("profile_id", profileId);
    if (error) {
      await supabase.from("profiles").update({ role: member.role }).eq("id", profileId).neq("role", "admin");
      return { error: error.message };
    }
  }

  revalidateManagerViews();
  revalidatePath("/admin/users");
  revalidatePath("/reports");
  revalidatePath("/private-finance");
  return { success: role === "manager" ? "Role and sales manager target saved." : "User now has view-only access." };
}

export async function setDummyOrderPermission(_previousState: ManagerActionState, formData: FormData): Promise<ManagerActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };
  const { data: actor, error: actorError } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (actorError || actor?.role !== "admin" || actor.status !== "active") return { error: "Active administrator access is required to manage dummy-order permissions." };

  const managerId = String(formData.get("managerId") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(managerId)) return { error: "Choose a valid sales manager." };
  const { data: manager, error: managerError } = await supabase.from("sales_managers").select("id, profile_id, active").eq("id", managerId).maybeSingle();
  if (managerError || !manager?.profile_id || !manager.active) return { error: "Only an active, linked sales manager can be authorized." };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, status").eq("id", manager.profile_id).maybeSingle();
  if (profileError || profile?.role !== "manager" || profile.status !== "active") return { error: "This manager does not have an active sales-manager role." };

  if (enabled) {
    const { error } = await supabase.from("dummy_order_manager_permissions").upsert({ manager_id: managerId, granted_by: user.id }, { onConflict: "manager_id" });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("dummy_order_manager_permissions").delete().eq("manager_id", managerId);
    if (error) return { error: error.message };
  }

  revalidateManagerViews();
  return { success: enabled ? "Dummy-order access granted." : "Dummy-order access removed." };
}

async function getManagerOperator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." as const };
  const { data: profile, error } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (error || profile?.status !== "active" || !["admin", "manager"].includes(profile.role)) {
    return { error: "Active administrator or sales manager access is required." as const };
  }
  return { supabase, role: profile.role };
}

function parseTarget(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{1,12}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents <= 99_999_999_999_999n ? `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}` : null;
}

function revalidateManagerViews() {
  revalidatePath("/sales-managers");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/private-finance");
}

export async function saveSalesManager(_previousState: ManagerActionState, formData: FormData): Promise<ManagerActionState> {
  const access = await getManagerOperator();
  if ("error" in access) return { error: access.error };

  const managerId = String(formData.get("managerId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const target = parseTarget(formData.get("target"));
  if (!name || name.length > 120) return { error: "Enter a manager name from 1 to 120 characters." };
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) return { error: "Choose an account." };
  if (target === null) return { error: "Enter a monthly target with up to two decimal places." };

  const { data: account, error: accountError } = await access.supabase.from("accounts").select("id").eq("id", accountId).eq("active", true).maybeSingle();
  if (accountError || !account) return { error: "Choose an active account." };

  if (managerId) {
    if (!/^[0-9a-f-]{36}$/i.test(managerId)) return { error: "Choose a valid manager." };
    const { data: existing, error: lookupError } = await access.supabase.from("sales_managers").select("profile_id").eq("id", managerId).maybeSingle();
    if (lookupError) return { error: lookupError.message };
    if (existing?.profile_id) return { error: "Linked user roles and targets are managed in Workspace role assignments." };
    const { data, error } = await access.supabase.from("sales_managers").update({ name, account_id: accountId, target }).eq("id", managerId).select("id").maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "This manager could not be found or updated." };
  } else {
    const { error } = await access.supabase.from("sales_managers").insert({ name, account_id: accountId, target });
    if (error) return { error: error.message };
  }

  revalidateManagerViews();
  return { success: `“${name}” was saved.` };
}

export async function deleteSalesManager(_previousState: ManagerActionState, formData: FormData): Promise<ManagerActionState> {
  const access = await getManagerOperator();
  if ("error" in access) return { error: access.error };
  const managerId = String(formData.get("managerId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(managerId)) return { error: "Choose a valid manager." };
  const { data: existing, error: lookupError } = await access.supabase.from("sales_managers").select("profile_id").eq("id", managerId).maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (existing?.profile_id) return { error: "Linked user roles and targets are managed in Workspace role assignments." };
  const { data, error } = await access.supabase.from("sales_managers").delete().eq("id", managerId).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This manager could not be found or deleted." };
  revalidateManagerViews();
  return { success: "Manager deleted. Existing orders are now unassigned." };
}
