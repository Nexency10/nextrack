"use client";

import { useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, Building2, Download, FileText, Printer, TrendingUp } from "lucide-react";
import { SalesCharts, type ChartPoint } from "@/components/dashboard/sales-charts";
import { formatCents } from "@/lib/accounts/money";

export type AccountReport = {
  id: string;
  name: string;
  active: boolean;
  orderCount: number;
  salesCents: string;
  netCents: string;
  platforms: { platform: string; orderCount: number; salesCents: string; netCents: string }[];
};

export type ManagerReport = {
  id: string;
  name: string;
  accountName: string;
  active: boolean;
  targetCents: string;
  salesCents: string;
  orderCount: number;
};

type ReportKind = "company" | "account" | "manager";
const cents = (value: string) => BigInt(value || "0");
const formatMoney = (value: string) => formatCents(cents(value));

export function ReportsWorkspace({ company, accounts, managers, platforms }: {
  company: { salesCents: string; netCents: string; orderCount: number; averageCents: string };
  accounts: AccountReport[];
  managers: ManagerReport[];
  platforms: ChartPoint[];
}) {
  const [report, setReport] = useState<ReportKind>("company");
  const accountChart = useMemo(() => accounts.filter((account) => cents(account.salesCents) > 0n).map((account) => ({ label: account.name, value: Number(cents(account.salesCents)) / 100 })), [accounts]);
  const generatedLabel = report === "company" ? "Company summary" : report === "account" ? "Account report" : "Manager report";

  function downloadReport() {
    const rows: (string | number)[][] = report === "company"
      ? [["Metric", "Value"], ["Real sales", formatMoney(company.salesCents)], ["Net revenue", formatMoney(company.netCents)], ["Real orders", company.orderCount], ["Average order", formatMoney(company.averageCents)]]
      : report === "account"
        ? [["Account", "Platform", "Orders", "Real sales", "Net revenue"], ...accounts.flatMap((account) => account.platforms.length ? account.platforms.map((item) => [account.name, item.platform, item.orderCount, formatMoney(item.salesCents), formatMoney(item.netCents)]) : [[account.name, "—", 0, formatMoney("0"), formatMoney("0")]])]
        : [["Sales manager", "Account", "Orders", "Real sales", "Monthly target", "Target progress"], ...managers.map((manager) => [manager.name, manager.accountName, manager.orderCount, formatMoney(manager.salesCents), formatMoney(manager.targetCents), cents(manager.targetCents) ? `${Math.min(100, Number(cents(manager.salesCents) * 10_000n / cents(manager.targetCents)) / 100).toFixed(1)}%` : "—"] )];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nextrack-${report}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-9">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold tracking-[.17em] text-[#8071dd] uppercase">Live workspace data</p><h1 className="text-[30px] leading-tight font-semibold tracking-[-.055em] sm:text-[36px]">Reports</h1><p className="mt-2 text-[13px] text-[#85899d]">Generate company, account, and manager summaries from saved orders.</p></div><div className="flex gap-2 print:hidden"><button type="button" onClick={downloadReport} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-[#c9c2f7] hover:text-[#7057ed]"><Download size={14} /> Export CSV</button><button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:text-[#7057ed]"><Printer size={14} /> Print</button></div></div>

    <section className="mb-6 grid gap-3 md:grid-cols-3" aria-label="Choose a report">
      <ReportChoice active={report === "company"} onClick={() => setReport("company")} title="Company summary" description="Real sales, net revenue, and order counts." icon={<TrendingUp size={17} />} />
      <ReportChoice active={report === "account"} onClick={() => setReport("account")} title="Account report" description="Sales and revenue by account and platform." icon={<Building2 size={17} />} />
      <ReportChoice active={report === "manager"} onClick={() => setReport("manager")} title="Manager report" description="Assigned real sales against monthly targets." icon={<BriefcaseBusiness size={17} />} />
    </section>

    <section className="overflow-hidden rounded-[22px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-violet-50 text-[#7057ed]"><FileText size={18} /></span><div><h2 className="text-sm font-semibold">{generatedLabel}</h2><p className="mt-1 text-[10px] text-[#969aab]">All totals use saved order calculations and exclude cancelled orders.</p></div><span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">LIVE</span></div>
      <div className="p-5 sm:p-6">
        {report === "company" && <CompanyReport company={company} platforms={platforms} accounts={accountChart} />}
        {report === "account" && <AccountReportTable accounts={accounts} />}
        {report === "manager" && <ManagerReportTable managers={managers} />}
      </div>
    </section>
    <p className="mt-4 flex items-center gap-2 text-[10px] text-[#a0a3b1]"><BarChart3 size={13} /> Dummy order details and losses are restricted to Private Finance.</p>
  </div>;
}

function ReportChoice({ active, onClick, title, description, icon }: { active: boolean; onClick: () => void; title: string; description: string; icon: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-[18px] border p-4 text-left transition ${active ? "border-[#bdb3fb] bg-[#f7f5ff] shadow-[0_8px_24px_rgba(112,87,237,.08)]" : "border-[#e8eaf1] bg-white hover:border-[#d2cdf5] hover:bg-[#fcfbff]"}`}><span className={`grid h-9 w-9 place-items-center rounded-[12px] ${active ? "bg-[#7057ed] text-white" : "bg-violet-50 text-[#7057ed]"}`}>{icon}</span><span className="mt-3 block text-xs font-semibold text-[#34374a]">{title}</span><span className="mt-1 block text-[10px] leading-5 text-[#8d91a2]">{description}</span></button>;
}

function CompanyReport({ company, platforms, accounts }: { company: { salesCents: string; netCents: string; orderCount: number; averageCents: string }; platforms: ChartPoint[]; accounts: ChartPoint[] }) {
  const stats = [["Total real sales", formatMoney(company.salesCents)], ["Net revenue", formatMoney(company.netCents)], ["Real orders", company.orderCount.toLocaleString()], ["Average order", formatMoney(company.averageCents)]];
  return <><div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value]) => <article key={label} className="rounded-[16px] border border-[#eceef4] bg-[#fafbfe] p-4"><p className="text-[10px] font-medium text-[#85899d]">{label}</p><p className="mt-2 text-xl font-semibold tracking-[-.04em] text-[#292c40]">{value}</p></article>)}</div><SalesCharts platforms={platforms} accounts={accounts} /></>;
}

function AccountReportTable({ accounts }: { accounts: AccountReport[] }) {
  const rows = accounts.flatMap((account) => account.platforms.length ? account.platforms.map((platform) => ({ ...platform, account })) : [{ platform: "—", orderCount: 0, salesCents: "0", netCents: "0", account }]);
  return <div className="overflow-x-auto rounded-[16px] border border-[#eceef4]"><table className="w-full min-w-[760px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.09em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Account</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Platform</th><th className="px-4 py-3.5 text-right">Real orders</th><th className="px-4 py-3.5 text-right">Real sales</th><th className="px-5 py-3.5 text-right">Net revenue</th></tr></thead><tbody className="divide-y divide-[#f0f1f5]">{rows.map((row, index) => <tr key={`${row.account.id}-${row.platform}-${index}`} className="hover:bg-[#fcfcff]"><td className="px-5 py-4 text-xs font-semibold text-[#34374a]">{row.account.name}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${row.account.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{row.account.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-4 text-xs text-[#656a7e]">{row.platform}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{row.orderCount.toLocaleString()}</td><td className="px-4 py-4 text-right text-xs font-semibold text-[#34374a]">{formatMoney(row.salesCents)}</td><td className="px-5 py-4 text-right text-xs font-semibold text-emerald-700">{formatMoney(row.netCents)}</td></tr>)}</tbody></table>{!accounts.length && <p className="px-5 py-12 text-center text-xs text-[#9296a7]">No accounts are available yet.</p>}</div>;
}

function ManagerReportTable({ managers }: { managers: ManagerReport[] }) {
  return <div className="overflow-x-auto rounded-[16px] border border-[#eceef4]"><table className="w-full min-w-[800px] text-left"><thead><tr className="bg-[#fafbfe] text-[9px] font-semibold tracking-[.09em] text-[#979bad] uppercase"><th className="px-5 py-3.5">Sales manager</th><th className="px-4 py-3.5">Account</th><th className="px-4 py-3.5 text-right">Real orders</th><th className="px-4 py-3.5 text-right">Sales</th><th className="px-4 py-3.5 text-right">Monthly target</th><th className="px-5 py-3.5">Progress</th></tr></thead><tbody className="divide-y divide-[#f0f1f5]">{managers.map((manager) => {
    const target = cents(manager.targetCents);
    const sales = cents(manager.salesCents);
    const progress = target > 0n ? Math.min(100, Number(sales * 10_000n / target) / 100) : 0;
    return <tr key={manager.id} className="hover:bg-[#fcfcff]"><td className="px-5 py-4"><div className="text-xs font-semibold text-[#34374a]">{manager.name}</div><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${manager.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{manager.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-4 text-xs text-[#656a7e]">{manager.accountName}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{manager.orderCount.toLocaleString()}</td><td className="px-4 py-4 text-right text-xs font-semibold text-[#34374a]">{formatMoney(manager.salesCents)}</td><td className="px-4 py-4 text-right text-xs text-[#656a7e]">{formatMoney(manager.targetCents)}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><div className="h-2 min-w-[74px] flex-1 overflow-hidden rounded-full bg-[#eeedf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#8d79f5] to-[#6e55e8]" style={{ width: `${progress}%` }} /></div><span className="w-12 text-right text-[10px] font-semibold text-[#6653d2]">{target > 0n ? `${progress.toFixed(1)}%` : "—"}</span></div></td></tr>;
  })}</tbody></table>{!managers.length && <p className="px-5 py-12 text-center text-xs text-[#9296a7]">No sales managers are available yet.</p>}</div>;
}
