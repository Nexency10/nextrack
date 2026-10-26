import { redirect } from "next/navigation";
import { createRequestClient } from "@/lib/supabase/request";
import { SalaryWorkspace, type PayrollRecord, type SalaryEmployee } from "@/components/salary/salary-workspace";

type SalaryPageProps = { searchParams: Promise<{ month?: string | string[] }> };

export default async function SalaryPage({ searchParams }: SalaryPageProps) {
  const params = await searchParams;
  const requestedMonth = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : new Date().toISOString().slice(0, 7);

  const supabase = await createRequestClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" || profile.status !== "active") redirect("/dashboard");

  const payPeriod = `${month}-01`;
  const [employeesResult, payrollResult] = await Promise.all([
    supabase.from("salary_employees")
      .select("id, name, designation, mobile, current_salary, bank_name, bank_branch, bank_account, active, created_at")
      .order("name"),
    supabase.from("salary_payroll")
      .select("id, employee_id, pay_period, employee_name, designation, mobile, base_salary, leave_deduction, net_pay, bank_name, bank_branch, bank_account, status, paid_at")
      .eq("pay_period", payPeriod)
      .order("employee_name"),
  ]);

  if (employeesResult.error || payrollResult.error) {
    return <main className="min-h-full bg-[#f4f6fb] px-5 py-10 text-[#191b2b] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-950">Salary management needs a database update</h1>
        <p className="mt-2 text-sm leading-6 text-amber-900/80">Apply the <code>20261026062620_admin_salary_management.sql</code> migration in Supabase, then reload this page.</p>
        <p className="mt-3 break-all text-xs text-amber-900/70">{employeesResult.error?.message ?? payrollResult.error?.message}</p>
      </section>
    </main>;
  }

  return <SalaryWorkspace
    month={month}
    employees={(employeesResult.data ?? []) as SalaryEmployee[]}
    payroll={(payrollResult.data ?? []) as PayrollRecord[]}
  />;
}
