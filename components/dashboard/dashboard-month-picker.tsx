"use client";

export function DashboardMonthPicker({ month, maxMonth }: { month: string; maxMonth: string }) {
  return <form action="/dashboard" method="get" className="flex items-center gap-2">
    <label className="sr-only" htmlFor="dashboard-month">View dashboard month</label>
    <input
      id="dashboard-month"
      name="month"
      type="month"
      max={maxMonth}
      defaultValue={month}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="h-10 rounded-xl border border-[#e7e8ef] bg-white px-3 text-[11px] font-medium text-[#5f6479]"
      title="Choose a month to view its saved dashboard totals."
    />
  </form>;
}
