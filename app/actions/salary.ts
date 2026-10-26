"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SalaryActionState = { error?: string; success?: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const moneyPattern = /^\d{1,10}(?:\.\d{1,2})?$/;

async function getActiveAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." as const };

  const { data: profile, error } = await supabase.from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin" || profile.status !== "active") {
    return { error: "Active administrator access is required." as const };
  }
  return { supabase };
}

function formText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validMoney(value: string) {
  return moneyPattern.test(value) && Number.isFinite(Number(value)) && Number(value) <= 9_999_999_999.99;
}

function formEmployee(formData: FormData) {
  const name = formText(formData, "name");
  const designation = formText(formData, "designation");
  const mobile = formText(formData, "mobile");
  const salary = formText(formData, "currentSalary");
  const bankName = formText(formData, "bankName");
  const bankBranch = formText(formData, "bankBranch");
  const bankAccount = formText(formData, "bankAccount");

  if (!name || name.length > 120) return { error: "Enter an employee name up to 120 characters." as const };
  if (designation.length > 120 || mobile.length > 40 || bankName.length > 120 || bankBranch.length > 120 || bankAccount.length > 80) {
    return { error: "One or more employee fields exceed the allowed length." as const };
  }
  if (!validMoney(salary)) return { error: "Enter a valid non-negative salary with up to two decimal places." as const };

  return {
    value: {
      name,
      designation,
      mobile,
      current_salary: salary,
      bank_name: bankName,
      bank_branch: bankBranch,
      bank_account: bankAccount,
    },
  };
}

function revalidateSalary() {
  revalidatePath("/salary");
  revalidatePath("/dashboard");
}

export async function saveSalaryEmployee(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const employee = formEmployee(formData);
  if ("error" in employee) return { error: employee.error };
  const employeeId = formText(formData, "employeeId");

  if (employeeId) {
    if (!uuidPattern.test(employeeId)) return { error: "Invalid employee." };
    const { data, error } = await access.supabase.from("salary_employees")
      .update(employee.value)
      .eq("id", employeeId)
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Employee not found." };
  } else {
    const { error } = await access.supabase.from("salary_employees").insert(employee.value);
    if (error) return { error: error.message };
  }

  revalidateSalary();
  return { success: employeeId ? "Employee details saved." : "Employee added." };
}

export async function setSalaryEmployeeActive(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const employeeId = formText(formData, "employeeId");
  const active = formText(formData, "active");
  if (!uuidPattern.test(employeeId) || !["true", "false"].includes(active)) return { error: "Invalid employee update." };

  const { data, error } = await access.supabase.from("salary_employees")
    .update({ active: active === "true" })
    .eq("id", employeeId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Employee not found." };

  revalidateSalary();
  return { success: active === "true" ? "Employee reactivated." : "Employee archived." };
}

export async function deleteSalaryEmployee(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const employeeId = formText(formData, "employeeId");
  if (!uuidPattern.test(employeeId)) return { error: "Invalid employee." };

  const { data, error } = await access.supabase.from("salary_employees")
    .delete()
    .eq("id", employeeId)
    .select("id")
    .maybeSingle();
  if (error?.code === "23503") return { error: "This employee has payroll history. Archive the employee to preserve those records." };
  if (error) return { error: error.message };
  if (!data) return { error: "Employee not found." };

  revalidateSalary();
  return { success: "Employee deleted." };
}

export async function createMonthlyPayroll(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const month = formText(formData, "month");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Choose a valid payroll month." };
  const payPeriod = `${month}-01`;

  const { data: employees, error: employeesError } = await access.supabase.from("salary_employees")
    .select("id, name, designation, mobile, current_salary, bank_name, bank_branch, bank_account")
    .eq("active", true)
    .order("name");
  if (employeesError) return { error: employeesError.message };
  if (!employees?.length) return { error: "Add or reactivate employees before creating payroll." };

  const { data: existing, error: existingError } = await access.supabase.from("salary_payroll")
    .select("employee_id")
    .eq("pay_period", payPeriod);
  if (existingError) return { error: existingError.message };
  const existingIds = new Set((existing ?? []).map((entry) => entry.employee_id));
  const rows = employees.filter((employee) => !existingIds.has(employee.id)).map((employee) => ({
    employee_id: employee.id,
    pay_period: payPeriod,
    employee_name: employee.name,
    designation: employee.designation,
    mobile: employee.mobile,
    base_salary: employee.current_salary,
    bank_name: employee.bank_name,
    bank_branch: employee.bank_branch,
    bank_account: employee.bank_account,
  }));

  if (!rows.length) return { success: `Payroll for ${month} already exists for all active employees.` };
  const { error } = await access.supabase.from("salary_payroll").insert(rows);
  if (error?.code === "23505") return { error: "Payroll changed at the same time. Refresh the page and try again." };
  if (error) return { error: error.message };

  revalidateSalary();
  return { success: `Created payroll for ${rows.length} employee${rows.length === 1 ? "" : "s"}.` };
}

export async function updatePendingPayroll(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const payrollId = formText(formData, "payrollId");
  const leaveDeduction = formText(formData, "leaveDeduction");
  if (!uuidPattern.test(payrollId)) return { error: "Invalid payroll entry." };
  if (!validMoney(leaveDeduction)) return { error: "Enter a valid leave deduction with up to two decimal places." };

  const { data: payroll, error: readError } = await access.supabase.from("salary_payroll")
    .select("base_salary, status")
    .eq("id", payrollId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!payroll) return { error: "Payroll entry not found." };
  if (payroll.status !== "pending") return { error: "Paid payroll entries are locked to preserve the payment record." };
  if (Number(leaveDeduction) > Number(payroll.base_salary)) return { error: "Leave deduction cannot exceed the current salary." };

  const { data, error } = await access.supabase.from("salary_payroll")
    .update({ leave_deduction: leaveDeduction })
    .eq("id", payrollId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This payroll entry was changed. Refresh and try again." };

  revalidateSalary();
  return { success: "Payroll amounts saved." };
}

export async function markPayrollPaid(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const payrollId = formText(formData, "payrollId");
  if (!uuidPattern.test(payrollId)) return { error: "Invalid payroll entry." };

  const { data, error } = await access.supabase.from("salary_payroll")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payrollId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This payroll entry is already paid or no longer available." };

  revalidateSalary();
  return { success: "Payroll marked as paid." };
}

export async function deletePendingPayroll(_previous: SalaryActionState, formData: FormData): Promise<SalaryActionState> {
  const access = await getActiveAdmin();
  if ("error" in access) return { error: access.error };

  const payrollId = formText(formData, "payrollId");
  if (!uuidPattern.test(payrollId)) return { error: "Invalid payroll entry." };

  const { data, error } = await access.supabase.from("salary_payroll")
    .delete()
    .eq("id", payrollId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Only pending payroll entries can be deleted." };

  revalidateSalary();
  return { success: "Pending payroll entry deleted." };
}
