"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, FilePlus2, LayoutDashboard, Layers3, LockKeyhole, LogOut, Menu, ReceiptText, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";

type Role = "admin" | "manager" | "viewer" | string;
type Item = { label: string; href?: string; icon: ReactNode; soon?: boolean; admin?: boolean; manager?: boolean };

export function WorkspaceShell({ children, name, role, email }: { children: ReactNode; name: string; role: Role; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin";
  const items: Item[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={17} /> },
    { label: "Add order", href: "/orders/new", icon: <FilePlus2 size={17} />, manager: true },
    { label: "Orders", href: "/orders", icon: <ReceiptText size={17} /> },
    { label: "Accounts", href: "/accounts", icon: <Building2 size={17} /> },
    { label: "Sales managers", href: "/sales-managers", icon: <Users size={17} /> },
    { label: "Reports", icon: <BarChart3 size={17} />, soon: true },
    { label: "Private finance", icon: <LockKeyhole size={17} />, soon: true },
    { label: "Settings", href: "/settings", icon: <Settings2 size={17} />, admin: true },
    { label: "Team access", href: "/admin/users", icon: <ShieldCheck size={17} />, admin: true },
  ];
  const visibleItems = items.filter((item) => (!item.admin || isAdmin) && (!item.manager || isAdmin || role === "manager"));
  const pageTitle = pathname === "/dashboard" ? "Dashboard" : pathname.startsWith("/accounts/") ? "Account details" : pathname === "/accounts" ? "Accounts" : pathname === "/orders" ? "Orders" : pathname.startsWith("/orders") ? "Add order" : pathname === "/sales-managers" ? "Sales managers" : pathname === "/settings" ? "Settings" : pathname.startsWith("/admin") ? "Team access" : "Workspace";
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const sidebar = <>
    <div className="mb-9 flex items-center justify-between"><Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 text-[18px] font-semibold tracking-[-.045em]"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#9987ff] to-[#6446e8]"><Layers3 size={20} /></span>nextrack<span className="-ml-3 text-[#a393ff]">.</span></Link><button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"><X size={18} /></button></div>
    <p className="mb-3 px-3 text-[9px] font-semibold tracking-[.18em] text-[#82829f] uppercase">Workspace</p>
    <nav className="space-y-1" aria-label="Main navigation">{visibleItems.map((item) => {
      const active = Boolean(item.href && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))));
      if (item.soon) return <div key={item.label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-medium text-[#83839f]"><span>{item.icon}</span>{item.label}<span className="ml-auto text-[8px] text-[#666681]">SOON</span></div>;
      return <Link key={item.href} href={item.href!} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-medium transition ${active ? "bg-[#735bed]/25 text-white" : "text-[#d7d4e7] hover:bg-white/[.07] hover:text-white"}`}><span className={active ? "text-[#b4a8ff]" : "text-[#aaa0eb]"}>{item.icon}</span>{item.label}{item.label === "Add order" && <span className="ml-auto text-[8px] text-[#9b8df0]">NEW</span>}</Link>;
    })}</nav>
    <div className="mt-auto rounded-[16px] border border-white/10 bg-white/[.045] p-3.5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#7563cf] text-xs font-semibold">{name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{name}</p><p className="mt-0.5 text-[10px] capitalize text-[#a5a4bf]">{role === "admin" ? "Administrator" : role === "manager" ? "Sales manager" : "View only · unassigned"}</p></div></div><form action={signOut} className="mt-3 border-t border-white/10 pt-2"><button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-medium text-[#b4b3c9] transition hover:bg-white/[.07] hover:text-white"><LogOut size={13} /> Sign out</button></form></div>
  </>;

  return <div className="min-h-screen bg-[#f4f6fb] text-[#191b2b] lg:flex print:bg-white">
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#17172f] px-4 py-6 text-white lg:flex print:hidden">{sidebar}</aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden print:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-[#10101f]/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-[min(82vw,300px)] flex-col bg-[#17172f] px-4 py-6 text-white shadow-2xl">{sidebar}</aside></div>}
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 flex min-h-[70px] items-center justify-between gap-3 border-b border-[#e9ebf2] bg-white/95 px-4 backdrop-blur-xl sm:px-8 lg:px-10 print:hidden">
        <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e9ebf2] text-[#55596d] hover:bg-[#f7f7fb] lg:hidden"><Menu size={19} /></button><Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-[-.03em] lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#7057ed] text-white"><Layers3 size={17} /></span>nextrack<span className="-ml-2 text-[#7057ed]">.</span></Link><div className="hidden text-[11px] text-[#9699a9] sm:block">Workspace <span className="mx-1.5 text-[#c4c6d0]">/</span><span className="font-semibold text-[#55596d]">{pageTitle}</span></div><h1 className="truncate text-sm font-semibold text-[#34374a] sm:hidden">{pageTitle}</h1></div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">{pathname === "/dashboard" && <span className="hidden text-[11px] text-[#8c90a2] md:block">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span>}{pathname === "/dashboard" && <DashboardActions />}{isAdmin && <Link href="/admin/users" className="hidden h-10 items-center gap-2 rounded-xl bg-[#7057ed] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#6249df] sm:inline-flex"><Users size={14} /> Team access</Link>}<form action={signOut}><button aria-label={`Sign out ${email}`} title="Sign out" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e7e8ef] bg-white px-3 text-[11px] font-semibold text-[#5f6479] transition hover:border-rose-200 hover:text-rose-600 sm:px-3.5"><LogOut size={15} /><span className="hidden sm:inline">Sign out</span></button></form></div>
      </header>
      {children}
    </main>
  </div>;
}
