"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string };

const MAX_DECIMAL_UNITS = 99_999_999_999_999n;
const PLATFORMS = ["WordPress", "Squarespace", "Wix", "Shopify", "Webflow"] as const;
const STATUSES = ["Completed", "Pending", "Cancelled"] as const;

function parseDecimal(value: FormDataEntryValue | null, max: bigint) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return units <= max ? units : null;
}

function asDecimal(value: bigint) {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}

async function getOperator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." as const };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.status !== "active" || !["admin", "manager"].includes(profile.role)) {
    return { error: "Active administrator or sales manager access is required." as const };
  }

  return { supabase, user, profile };
}

export async function createOrder(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const operator = await getOperator();
  if ("error" in operator) return { error: operator.error };
  const { supabase, user, profile } = operator;

  const orderType = String(formData.get("orderType") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const platform = String(formData.get("platform") ?? "");
  const status = String(formData.get("status") ?? "");
  const orderDate = String(formData.get("orderDate") ?? "");
  const amount = parseDecimal(formData.get("amount"), MAX_DECIMAL_UNITS);
  const serviceFee = parseDecimal(formData.get("serviceFee"), MAX_DECIMAL_UNITS);
  const discount = parseDecimal(formData.get("discountPercent") || "0", 10_000n);
  const platformFee = parseDecimal(formData.get("platformFeePercent"), 10_000n);
  let managerId = String(formData.get("managerId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (orderType !== "real" && orderType !== "dummy") return { error: "Choose a valid order type." };
  if (orderType === "dummy" && profile.role !== "admin") return { error: "Only administrators can create dummy orders." };
  if (!accountId) return { error: "Choose an account." };
  if (!(PLATFORMS as readonly string[]).includes(platform)) return { error: "Choose a valid platform." };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Choose a valid order status." };
  if (!amount || amount <= 0n) return { error: "Enter an order amount greater than zero, with no more than two decimal places." };
  if (serviceFee === null || discount === null || (orderType === "real" && platformFee === null)) {
    return { error: "Enter valid amounts and percentages with no more than two decimal places." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate) || Number.isNaN(Date.parse(`${orderDate}T00:00:00.000Z`)) || new Date(`${orderDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== orderDate) {
    return { error: "Choose a valid order date." };
  }
  if (notes.length > 2_000) return { error: "Notes must be 2,000 characters or fewer." };

  if (profile.role === "manager") {
    const { data: assignedManager, error: managerAssignmentError } = await supabase
      .from("sales_managers")
      .select("id")
      .eq("profile_id", user.id)
      .eq("account_id", accountId)
      .eq("active", true)
      .maybeSingle();
    if (managerAssignmentError || !assignedManager) {
      return { error: "You can only create orders for your active assigned account." };
    }
    managerId = assignedManager.id;
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("active", true)
    .maybeSingle();
  if (accountError || !account) return { error: "That account is unavailable. Refresh the page and choose an active account." };

  if (managerId) {
    const { data: manager, error: managerError } = await supabase
      .from("sales_managers")
      .select("id")
      .eq("id", managerId)
      .eq("account_id", accountId)
      .eq("active", true)
      .maybeSingle();
    if (managerError || !manager) return { error: "Choose an active sales manager assigned to this account." };
  }

  let dummyPayout: string | null = null;
  if (orderType === "dummy") {
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("dummy_payout_percent")
      .eq("id", 1)
      .single();
    if (settingsError || !settings) return { error: "Workspace calculation settings are unavailable." };
    dummyPayout = String(settings.dummy_payout_percent);
  }

  const { error } = await supabase.from("orders").insert({
    order_date: orderDate,
    account_id: accountId,
    platform,
    order_type: orderType,
    amount: asDecimal(amount),
    service_fee: asDecimal(serviceFee),
    discount_percent: asDecimal(discount),
    platform_fee_percent: orderType === "real" && platformFee !== null ? asDecimal(platformFee) : null,
    dummy_payout_percent: dummyPayout,
    manager_id: managerId || null,
    status,
    notes,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  redirect("/orders");
}

export async function updateOrder(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const operator = await getOperator();
  if ("error" in operator) return { error: operator.error };

  const id = String(formData.get("orderId") ?? "").trim();
  const amount = parseDecimal(formData.get("amount"), MAX_DECIMAL_UNITS);
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Choose a valid order." };
  if (amount === null || amount <= 0n) return { error: "Enter an order amount greater than zero, with no more than two decimal places." };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Choose a valid order status." };
  if (notes.length > 2_000) return { error: "Notes must be 2,000 characters or fewer." };

  let query = operator.supabase.from("orders").update({ amount: asDecimal(amount), status, notes }).eq("id", id);
  if (operator.profile.role !== "admin") query = query.eq("order_type", "real");
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { error: error?.message ?? "That order could not be updated." };

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { success: "Order updated. Its totals have been recalculated." };
}

export async function deleteOrder(formData: FormData) {
  const operator = await getOperator();
  if ("error" in operator) redirect("/orders?error=unauthorized");
  const id = String(formData.get("orderId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/orders?error=invalid-order");

  let query = operator.supabase.from("orders").delete().eq("id", id);
  if (operator.profile.role !== "admin") query = query.eq("order_type", "real");
  const { data, error } = await query.select("id").maybeSingle();
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  if (error || !data) redirect("/orders?error=delete-failed");
  redirect("/orders?deleted=1");
}

