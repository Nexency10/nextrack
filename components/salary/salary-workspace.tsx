"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CalendarDays, Check, CirclePlus, Pencil, Trash2, Users, WalletCards, X } from "lucide-react";
import {
  createMonthlyPayroll,
  deletePendingPayroll,
  deleteSalaryEmployee,
  markPayrollPaid,
  saveSalaryEmployee,
  setSalaryEmployeeActive,
  updatePendingPayroll,
} from "@/app/actions/salary";

export type SalaryEmployee = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  current_salary: number | string;
  bank_name: string;
  bank_branch: string;
  bank_account: string;
  active: boolean;
  created_at: string;
};

export type PayrollRecord = {
  id: string;
  employee_id: string;
  pay_period: string;
  employee_name: string;
  designation: string;
  mobile: string;
  base_salary: number | string;
  leave_deduction: number | string;
  net_pay: number | string;
  bank_name: string;
  bank_branch: string;
  bank_account: string;
  status: "pending" | "paid";
  paid_at: string | null;
};

const amount = (value: number | string) => Number(value) || 0;
const money = (value: number | string) => new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(amount(value));

export function SalaryWorkspace({ month, employees, payroll }: {
  month: string;
  employees: SalaryEmployee[];
  payroll: PayrollRecord[];
}) {
  const [editing, setEditing] = useState<SalaryEmployee | null | undefined>(undefined);
  const [generationState, generateAction, generating] = useActionState(createMonthlyPayroll, {});
  const activeEmployees = employees.filter((employee) => employee.active);
  const totals = useMemo(() => payroll.reduce((sum, row) => ({
    net: sum.net + amount(row.net_pay),
    paid: sum.paid + (row.status === "paid" ? amount(row.net_pay) : 0),
    pending: sum.pending + (row.status === "pending" ? amount(row.net_pay) : 0),
  }), { net: 0, paid: 0, pending: 0 }), [payroll]);

  return <main className="min-h-full bg-[#f4f6fb] text-[#191b2b]">
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-[#8071dd] uppercase">Administrator workspace</p>
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#e9e5ff] text-[#7057ed]"><WalletCards size={21} /></span><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Salary management</h1></div>
          <p className="mt-2 text-[13px] text-[#85899d]">Employee pay, leave deductions, and monthly payment records.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" action="/salary" className="flex items-end gap-2">
            <label className="text-[10px] font-semibold text-[#656a7d]">Payroll month<input type="month" name="month" defaultValue={month} required className="mt-1.5 block h-10 rounded-xl border border-[#e6e8ef] bg-white px-3 text-xs outline-none focus:border-[#9b8df0]" /></label>
            <button className="h-10 rounded-xl border border-[#e3e5ed] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] hover:bg-[#fafaff]">View month</button>
          </form>
          <button type="button" onClick={() => setEditing(null)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7057ed] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#6249df]"><CirclePlus size={14} /> Add employee</button>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Users size={16} />} label="Active employees" value={activeEmployees.length.toLocaleString()} />
        <SummaryCard icon={<CalendarDays size={16} />} label="Employees in this payroll" value={payroll.length.toLocaleString()} />
        <SummaryCard icon={<Banknote size={16} />} label="Total to pay" value={money(totals.net)} />
        <SummaryCard icon={<Check size={16} />} label="Paid · remaining" value={`${money(totals.paid)} · ${money(totals.pending)}`} />
      </div>

      <section className="mt-7 overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eceef4] px-5 py-4 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#f1efff] text-[#7057ed]"><CalendarDays size={16} /></span>
          <div><h2 className="text-sm font-semibold">Monthly payroll</h2><p className="mt-1 text-[10px] text-[#969aab]">Salary and bank details are snapshotted when a month is created. Paid entries are locked.</p></div>
          <form action={generateAction} className="ml-auto flex flex-wrap items-center gap-2">
            <input type="hidden" name="month" value={month} />
            <button disabled={generating || activeEmployees.length === 0} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#ded9fb] bg-[#f7f5ff] px-3 text-[10px] font-semibold text-[#6653d2] transition hover:bg-[#f0edff] disabled:cursor-not-allowed disabled:opacity-50">{generating ? "Creating…" : payroll.length ? "Add missing employees" : "Create this month’s payroll"}</button>
          </form>
        </div>
        {(generationState.error || generationState.success) && <p role={generationState.error ? "alert" : "status"} className={`border-b px-5 py-3 text-xs sm:px-6 ${generationState.error ? "border-rose-100 bg-rose-50 text-rose-800" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>{generationState.error ?? generationState.success}</p>}
        {payroll.length ? <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] text-left text-xs">
            <thead><tr className="bg-[#12345f] text-[10px] font-semibold tracking-[.06em] text-white uppercase"><th className="sticky left-0 z-10 bg-[#12345f] px-4 py-3.5">Name</th><th className="px-4 py-3.5">Designation</th><th className="px-4 py-3.5">Mobile</th><th className="px-4 py-3.5 text-right">Current salary</th><th className="px-4 py-3.5 text-right">Leave deduction</th><th className="px-4 py-3.5 text-right">Need to pay</th><th className="px-4 py-3.5">Bank name</th><th className="px-4 py-3.5">Bank branch</th><th className="px-4 py-3.5">Account number</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf0f5]">{payroll.map((row, index) => <PayrollRow key={row.id} row={row} index={index} />)}</tbody>
            <tfoot><tr className="bg-[#12345f] text-white"><td colSpan={5} className="px-4 py-3 text-right text-[10px] font-semibold uppercase">Total payable</td><td className="px-4 py-3 text-right text-xs font-bold">{money(totals.net)}</td><td colSpan={5} /></tr></tfoot>
          </table>
        </div> : <div className="px-6 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-[#f1efff] text-[#7057ed]"><CalendarDays size={18} /></span><h3 className="mt-3 text-sm font-semibold">No payroll created for {month}</h3><p className="mt-1 text-xs text-[#9296a7]">Create the month’s payroll to snapshot active employees’ salaries and bank details.</p>{!activeEmployees.length && <p className="mt-2 text-[10px] text-[#9296a7]">Add or reactivate an employee first.</p>}</div>}
      </section>

      <section className="mt-7 overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eceef4] px-5 py-4 sm:px-6"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#eff7f4] text-[#23856b]"><Users size={16} /></span><div><h2 className="text-sm font-semibold">Employee roster</h2><p className="mt-1 text-[10px] text-[#969aab]">Current salary changes apply to future payrolls only. Archived employees remain in history.</p></div><span className="ml-auto rounded-full bg-[#f3f1ff] px-2.5 py-1 text-[9px] font-semibold text-[#7057ed]">{employees.length} total</span></div>
        {employees.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-xs"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.1em] text-[#979bad] uppercase"><th className="px-5 py-3">Employee</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3 text-right">Current salary</th><th className="px-4 py-3">Bank name</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Account number</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Manage</th></tr></thead><tbody className="divide-y divide-[#edf0f5]">{employees.map((employee, index) => <EmployeeRow key={employee.id} employee={employee} index={index} onEdit={() => setEditing(employee)} />)}</tbody></table></div> : <p className="px-6 py-12 text-center text-xs text-[#9296a7]">No employees have been added yet.</p>}
      </section>
    </div>
    {editing !== undefined && <EmployeeDialog employee={editing} onClose={() => setEditing(undefined)} />}
  </main>;
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-[16px] border border-[#e8eaf1] bg-white px-4 py-3.5 shadow-[0_5px_20px_rgba(37,41,77,.025)]"><div className="flex items-center gap-2 text-[#8071dd]">{icon}<span className="text-[10px] font-medium text-[#85899d]">{label}</span></div><p className="mt-2 truncate text-lg font-semibold tracking-[-.03em] text-[#303348]">{value}</p></div>;
}

function PayrollRow({ row, index }: { row: PayrollRecord; index: number }) {
  const [saveState, saveAction, saving] = useActionState(updatePendingPayroll, {});
  const [paidState, paidAction, markingPaid] = useActionState(markPayrollPaid, {});
  const [deleteState, deleteAction, deleting] = useActionState(deletePendingPayroll, {});
  const router = useRouter();
  const changed = saveState.success || paidState.success || deleteState.success;
  useEffect(() => { if (changed) router.refresh(); }, [changed, router]);
  const error = saveState.error ?? paidState.error ?? deleteState.error;
  const cell = `px-4 py-3 align-top ${index % 2 === 0 ? "bg-white" : "bg-[#f7f8fa]"}`;

  return <tr className="text-[11px] text-[#344157]">
    <td className={`sticky left-0 z-[1] min-w-[180px] px-4 py-3 font-semibold text-[#17365e] ${index % 2 === 0 ? "bg-white" : "bg-[#f7f8fa]"}`}>{row.employee_name}</td>
    <td className={cell}>{row.designation || "—"}</td><td className={cell}>{row.mobile || "—"}</td>
    <td className={`${cell} text-right font-medium tabular-nums`}>{money(row.base_salary)}</td>
    <td className={`${cell} min-w-[130px] text-right`}>
      {row.status === "pending" ? <form action={saveAction} className="flex items-center justify-end gap-1.5"><input type="hidden" name="payrollId" value={row.id} /><input type="number" name="leaveDeduction" min="0" max={amount(row.base_salary)} step="0.01" required defaultValue={amount(row.leave_deduction)} aria-label={`Leave deduction for ${row.employee_name}`} className="h-8 w-24 rounded-lg border border-[#e4e7ef] bg-white px-2 text-right text-[11px] tabular-nums outline-none focus:border-[#9b8df0]" /><button disabled={saving} title="Save deduction" className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4e7ef] bg-white text-[#7057ed] hover:bg-violet-50 disabled:opacity-50">{saving ? "…" : <Check size={13} />}</button></form> : <span className="tabular-nums">{money(row.leave_deduction)}</span>}
    </td>
    <td className={`${cell} text-right font-bold tabular-nums text-[#17365e]`}>{money(row.net_pay)}</td>
    <td className={cell}>{row.bank_name || "—"}</td><td className={cell}>{row.bank_branch || "—"}</td><td className={`${cell} font-mono text-[10px]`}>{row.bank_account || "—"}</td>
    <td className={cell}><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${row.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status === "paid" ? "Paid" : "Pending"}</span>{row.paid_at && <span className="mt-1 block whitespace-nowrap text-[9px] text-[#969aab]">{new Date(row.paid_at).toLocaleDateString()}</span>}</td>
    <td className={`${cell} min-w-[150px]`}>
      {row.status === "pending" ? <div className="flex flex-wrap gap-1.5"><form action={paidAction} onSubmit={(event) => { if (!window.confirm(`Mark ${row.employee_name} as paid for ${row.pay_period.slice(0, 7)}?`)) event.preventDefault(); }}><input type="hidden" name="payrollId" value={row.id} /><button disabled={markingPaid} className="h-8 rounded-lg bg-[#7057ed] px-2.5 text-[9px] font-semibold text-white hover:bg-[#6249df] disabled:opacity-50">{markingPaid ? "…" : "Mark paid"}</button></form><form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Delete this pending payroll row for ${row.employee_name}?`)) event.preventDefault(); }}><input type="hidden" name="payrollId" value={row.id} /><button aria-label={`Delete pending payroll for ${row.employee_name}`} disabled={deleting} className="grid h-8 w-8 place-items-center rounded-lg border border-[#f1e1e2] text-[#b5525e] hover:bg-rose-50 disabled:opacity-50"><Trash2 size={12} /></button></form></div> : <span className="text-[9px] text-[#9296a7]">Locked</span>}
      {error && <p role="alert" className="mt-1 max-w-[190px] text-[9px] leading-4 text-rose-700">{error}</p>}
    </td>
  </tr>;
}

function EmployeeRow({ employee, index, onEdit }: { employee: SalaryEmployee; index: number; onEdit: () => void }) {
  const [activeState, activeAction, changing] = useActionState(setSalaryEmployeeActive, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteSalaryEmployee, {});
  const router = useRouter();
  const changed = activeState.success || deleteState.success;
  useEffect(() => { if (changed) router.refresh(); }, [changed, router]);
  const error = activeState.error ?? deleteState.error;
  const cell = `px-4 py-3 ${index % 2 === 0 ? "bg-white" : "bg-[#f7f8fa]"}`;

  return <tr className={`text-[11px] ${employee.active ? "text-[#344157]" : "text-[#9b9eaa]"}`}>
    <td className={`${cell} px-5 font-semibold text-[#17365e]`}>{employee.name}</td><td className={cell}>{employee.designation || "—"}</td><td className={cell}>{employee.mobile || "—"}</td><td className={`${cell} text-right font-semibold tabular-nums`}>{money(employee.current_salary)}</td><td className={cell}>{employee.bank_name || "—"}</td><td className={cell}>{employee.bank_branch || "—"}</td><td className={`${cell} font-mono text-[10px]`}>{employee.bank_account || "—"}</td>
    <td className={cell}><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${employee.active ? "bg-emerald-50 text-emerald-700" : "bg-[#f0f1f4] text-[#85899b]"}`}>{employee.active ? "Active" : "Archived"}</span></td>
    <td className={`${cell} min-w-[190px]`}><div className="flex gap-1.5"><button type="button" onClick={onEdit} aria-label={`Edit ${employee.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4e7ef] bg-white text-[#646a7d] hover:border-violet-200 hover:text-[#7057ed]"><Pencil size={12} /></button><form action={activeAction}><input type="hidden" name="employeeId" value={employee.id} /><input type="hidden" name="active" value={employee.active ? "false" : "true"} /><button disabled={changing} className="h-8 rounded-lg border border-[#e4e7ef] bg-white px-2 text-[9px] font-semibold text-[#646a7d] hover:bg-[#fafaff] disabled:opacity-50">{changing ? "…" : employee.active ? "Archive" : "Reactivate"}</button></form><form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Permanently delete ${employee.name}? Employees with payroll history must be archived instead.`)) event.preventDefault(); }}><input type="hidden" name="employeeId" value={employee.id} /><button aria-label={`Delete ${employee.name}`} disabled={deleting} className="grid h-8 w-8 place-items-center rounded-lg border border-[#f1e1e2] bg-white text-[#b5525e] hover:bg-rose-50 disabled:opacity-50"><Trash2 size={12} /></button></form></div>{error && <p role="alert" className="mt-1 max-w-[240px] text-[9px] leading-4 text-rose-700">{error}</p>}</td>
  </tr>;
}

function EmployeeDialog({ employee, onClose }: { employee: SalaryEmployee | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveSalaryEmployee, {});
  const router = useRouter();
  useEffect(() => { if (state.success) { router.refresh(); onClose(); } }, [state.success, router, onClose]);
  const inputClass = "mt-1.5 h-10 w-full rounded-lg border border-[#e6e8ef] bg-[#fbfbfe] px-3 text-xs text-[#292c40] outline-none focus:border-[#9b8df0] focus:bg-white";

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#15152d]/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title" className="my-auto w-full max-w-[680px] rounded-[22px] border border-white/70 bg-white p-5 shadow-[0_28px_90px_rgba(20,19,46,.22)] sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold tracking-[.16em] text-[#8071dd] uppercase">Confidential · administrator only</p><h2 id="employee-dialog-title" className="mt-1 text-xl font-semibold tracking-[-.04em]">{employee ? "Edit employee" : "Add employee"}</h2></div><button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl text-[#8b8fa0] transition hover:bg-[#f3f4f8] disabled:opacity-50"><X size={17} /></button></div>
      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        {employee && <input type="hidden" name="employeeId" value={employee.id} />}
        <label className="text-[10px] font-semibold text-[#63687c]">Employee name<input name="name" required maxLength={120} defaultValue={employee?.name ?? ""} className={inputClass} autoComplete="off" /></label>
        <label className="text-[10px] font-semibold text-[#63687c]">Designation<input name="designation" maxLength={120} defaultValue={employee?.designation ?? ""} className={inputClass} /></label>
        <label className="text-[10px] font-semibold text-[#63687c]">Mobile number<input name="mobile" maxLength={40} defaultValue={employee?.mobile ?? ""} className={inputClass} inputMode="tel" /></label>
        <label className="text-[10px] font-semibold text-[#63687c]">Current monthly salary (৳)<input name="currentSalary" type="number" required min="0" max="9999999999.99" step="0.01" defaultValue={employee ? amount(employee.current_salary) : ""} className={inputClass} /></label>
        <label className="text-[10px] font-semibold text-[#63687c]">Bank or payment provider<input name="bankName" maxLength={120} defaultValue={employee?.bank_name ?? ""} className={inputClass} placeholder="Bank name or bKash" /></label>
        <label className="text-[10px] font-semibold text-[#63687c]">Bank branch<input name="bankBranch" maxLength={120} defaultValue={employee?.bank_branch ?? ""} className={inputClass} /></label>
        <label className="text-[10px] font-semibold text-[#63687c] sm:col-span-2">Account number<input name="bankAccount" maxLength={80} defaultValue={employee?.bank_account ?? ""} className={inputClass} autoComplete="off" /></label>
        {state.error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] leading-5 text-rose-800 sm:col-span-2">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-1 sm:col-span-2"><button type="button" disabled={pending} onClick={onClose} className="h-10 rounded-xl px-4 text-xs font-semibold text-[#74798c] hover:bg-[#f4f5f8]">Cancel</button><button disabled={pending} className="h-10 rounded-xl bg-[#7057ed] px-4 text-xs font-semibold text-white transition hover:bg-[#6249df] disabled:opacity-50">{pending ? "Saving…" : employee ? "Save employee" : "Add employee"}</button></div>
      </form>
    </section>
  </div>;
}
