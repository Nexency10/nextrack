"use client";

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export type ChartPoint = { label: string; value: number };

const palette = ["#7057ed", "#37b98a", "#f5ad4e", "#4c8fe8", "#e9799e", "#24a6b7"];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function SalesCharts({ platforms, accounts }: { platforms: ChartPoint[]; accounts: ChartPoint[] }) {
  const doughnutData = {
    labels: platforms.map((item) => item.label),
    datasets: [{ data: platforms.map((item) => item.value), backgroundColor: palette, borderWidth: 0, hoverOffset: 5 }],
  };
  const barData = {
    labels: accounts.map((item) => item.label),
    datasets: [{ label: "Real sales", data: accounts.map((item) => item.value), backgroundColor: "#7057ed", hoverBackgroundColor: "#5940d3", borderRadius: 7, maxBarThickness: 34 }],
  };
  const commonLegend = { position: "bottom" as const, labels: { usePointStyle: true, pointStyle: "circle" as const, boxWidth: 7, padding: 18, color: "#73788c", font: { size: 11 } } };
  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: { legend: commonLegend, tooltip: { callbacks: { label: (context) => ` ${context.label}: ${money.format(Number(context.parsed))}` } } },
  };
  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${money.format(Number(context.parsed.y))}` } } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: "#85899d", font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: "#f0f1f6" }, border: { display: false }, ticks: { color: "#85899d", font: { size: 10 }, callback: (value: string | number) => money.format(Number(value)) } },
    },
  };

  return <div className="grid gap-5 xl:grid-cols-2">
    <section className="rounded-[20px] border border-[#e9ebf2] bg-white p-5 shadow-[0_8px_28px_rgba(35,39,76,.035)] sm:p-6">
      <div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-semibold tracking-[-.02em]">Sales by platform</h2><p className="mt-1 text-[11px] text-[#9397a8]">Real orders only</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-[#7057ed]">REAL SALES</span></div>
      {platforms.length ? <div className="mx-auto h-[248px] max-w-[390px]"><Doughnut data={doughnutData} options={doughnutOptions} /></div> : <ChartEmpty />}
    </section>
    <section className="rounded-[20px] border border-[#e9ebf2] bg-white p-5 shadow-[0_8px_28px_rgba(35,39,76,.035)] sm:p-6">
      <div className="mb-5 flex items-start justify-between"><div><h2 className="text-sm font-semibold tracking-[-.02em]">Sales by account</h2><p className="mt-1 text-[11px] text-[#9397a8]">Real orders only</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-[#7057ed]">REAL SALES</span></div>
      {accounts.length ? <div className="h-[248px]"><Bar data={barData} options={barOptions} /></div> : <ChartEmpty />}
    </section>
  </div>;
}

function ChartEmpty() {
  return <div className="grid h-[248px] place-items-center rounded-xl bg-[#fafaff]"><div className="text-center"><div className="mx-auto mb-2 h-9 w-9 rounded-full border-[5px] border-[#ece9ff] border-t-[#7057ed]"/><p className="text-xs font-medium text-[#777c90]">No real sales yet</p><p className="mt-1 text-[10px] text-[#a2a5b3]">Add completed orders to see the breakdown.</p></div></div>;
}
