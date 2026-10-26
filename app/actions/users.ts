"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type UserActionState = { error?: string; success?: string };

function getAuthAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

const SERVICE_KEY_REQUIRED = "This action needs SUPABASE_SERVICE_ROLE_KEY configured on the server. Add it to the private environment and restart the app.";

async function getAdminActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." as const };
  const { data: actor, error } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (error || actor?.role !== "admin" || actor.status !== "active") return { error: "Active administrator access is required." as const };
  return { supabase, user };
}

function parseUserId(value: FormDataEntryValue | null) {
  const userId = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f-]{36}$/i.test(userId) ? userId : null;
}

export async function approveUser(_previousState: UserActionState, formData: FormData): Promise<UserActionState> {
  const access = await getAdminActor();
  if ("error" in access) return { error: access.error };
  const userId = parseUserId(formData.get("userId"));
  if (!userId || userId === access.user.id) return { error: "Choose a valid pending user." };

  const { data, error } = await access.supabase.from("profiles").update({ status: "active" }).eq("id", userId).eq("status", "pending").neq("role", "admin").select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This user is no longer pending or could not be approved." };
  revalidatePath("/admin/users");
  return { success: "User approved. Assign a role from Sales managers." };
}

export async function banUser(_previousState: UserActionState, formData: FormData): Promise<UserActionState> {
  const access = await getAdminActor();
  if ("error" in access) return { error: access.error };
  const userId = parseUserId(formData.get("userId"));
  if (!userId || userId === access.user.id) return { error: "You cannot ban your own administrator account." };

  const { data: target, error: targetError } = await access.supabase.from("profiles").select("role").eq("id", userId).eq("status", "active").neq("role", "admin").maybeSingle();
  if (targetError) return { error: targetError.message };
  if (!target) return { error: "Only an active non-administrator can be banned." };
  const authAdmin = getAuthAdminClient();
  if (!authAdmin) return { error: SERVICE_KEY_REQUIRED };
  const { error: authBanError } = await authAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (authBanError) return { error: authBanError.message };
  const { data, error } = await access.supabase.from("profiles").update({ status: "banned" }).eq("id", userId).eq("status", "active").neq("role", "admin").select("id").maybeSingle();
  if (error || !data) {
    await authAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    return { error: error?.message ?? "Only an active non-administrator can be banned." };
  }
  if (target.role === "manager") {
    const { error: managerError } = await access.supabase.from("sales_managers").update({ active: false }).eq("profile_id", userId);
    if (managerError) {
      await access.supabase.from("profiles").update({ status: "active" }).eq("id", userId);
      await authAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      return { error: managerError.message };
    }
  }
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/sales-managers");
  revalidatePath("/reports");
  return { success: "The user is banned from Supabase Auth and workspace data." };
}

export async function restoreUser(_previousState: UserActionState, formData: FormData): Promise<UserActionState> {
  const access = await getAdminActor();
  if ("error" in access) return { error: access.error };
  const userId = parseUserId(formData.get("userId"));
  if (!userId || userId === access.user.id) return { error: "Choose a valid banned user." };
  const { data: target, error: targetError } = await access.supabase.from("profiles").select("role").eq("id", userId).eq("status", "banned").neq("role", "admin").maybeSingle();
  if (targetError) return { error: targetError.message };
  if (!target) return { error: "This user is no longer banned or could not be restored." };
  const authAdmin = getAuthAdminClient();
  if (!authAdmin) return { error: SERVICE_KEY_REQUIRED };
  const { error: authRestoreError } = await authAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (authRestoreError) return { error: authRestoreError.message };
  const { data, error } = await access.supabase.from("profiles").update({ status: "active" }).eq("id", userId).eq("status", "banned").neq("role", "admin").select("id").maybeSingle();
  if (error || !data) {
    await authAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    return { error: error?.message ?? "This user is no longer banned or could not be restored." };
  }
  if (target.role === "manager") {
    const { error: managerError } = await access.supabase.from("sales_managers").update({ active: true }).eq("profile_id", userId);
    if (managerError) {
      await access.supabase.from("profiles").update({ status: "banned" }).eq("id", userId);
      await authAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      return { error: managerError.message };
    }
  }
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/sales-managers");
  revalidatePath("/reports");
  return { success: "The user can sign in and access the workspace again." };
}

export async function deleteUser(_previousState: UserActionState, formData: FormData): Promise<UserActionState> {
  const access = await getAdminActor();
  if ("error" in access) return { error: access.error };
  const userId = parseUserId(formData.get("userId"));
  if (!userId || userId === access.user.id) return { error: "You cannot delete your own administrator account." };

  const { data: target, error: targetError } = await access.supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  if (targetError) return { error: targetError.message };
  if (!target || target.role === "admin") return { error: "Only non-administrator accounts can be deleted here." };

  const admin = getAuthAdminClient();
  if (!admin) return { error: SERVICE_KEY_REQUIRED };
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/sales-managers");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { success: "User account deleted." };
}
