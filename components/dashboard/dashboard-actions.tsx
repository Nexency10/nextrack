"use client";

import { Download, Printer } from "lucide-react";

export function DashboardActions() {
  return <div className="flex items-center gap-2 print:hidden">
    <a href="/api/orders/export" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e5e7ef] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-[#c9c2f7] hover:text-[#7057ed] sm:px-4"><Download size={14} /> <span className="hidden sm:inline">Export CSV</span></a>
    <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e5e7ef] bg-white px-3.5 text-[11px] font-semibold text-[#5f6479] transition hover:border-[#c9c2f7] hover:text-[#7057ed] sm:px-4"><Printer size={14} /> <span className="hidden sm:inline">Print</span></button>
  </div>;
}
