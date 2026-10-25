import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";
import { UserAccessActions } from "@/components/admin/user-access-actions";
import { createClient } from "@/lib/supabase/server";
import { PageLoader } from "@/components/page-loader";

export default function UsersPage() {
  return <Suspense fallback={<PageLoader />}><UsersContent /></Suspense>;
}

async function UsersContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: actor } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin" || actor.status !== "active") redirect("/dashboard");

  const { data: profiles, error } = await supabase.from("profiles").select("id, full_name, username, email, role, status, created_at").order("created_at", { ascending: true });
  return <main className="min-h-full bg-[#f4f6fb] text-[#171a2a]">
    <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 lg:py-12"><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-[16px] bg-violet-100 text-[#7057ed]"><Users size={22} /></span><div><p className="text-xs font-semibold tracking-[.14em] text-[#8071dd] uppercase">Workspace settings</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.05em]">Team access</h1></div></div><p className="mt-3 text-sm text-[#85899d]">Approve new accounts here. Assign workspace roles and sales targets in Sales managers.</p>
      <section className="mt-8 overflow-hidden rounded-[20px] border border-[#e8eaf1] bg-white shadow-[0_12px_40px_rgba(37,41,77,.04)]"><div className="flex items-center gap-3 border-b border-[#eceef4] px-6 py-5"><ShieldCheck size={17} className="text-[#7057ed]"/><h2 className="text-sm font-semibold">Workspace members</h2><span className="ml-auto rounded-full bg-[#f3f1ff] px-2.5 py-1 text-[10px] font-semibold text-[#7057ed]">{profiles?.length ?? 0} users</span></div>
        {error ? <p className="p-6 text-sm text-rose-700">Unable to load users. Apply the Supabase migration first.</p> : !profiles?.length ? <p className="p-6 text-sm text-[#85899d]">No user profiles yet.</p> : <div className="divide-y divide-[#eff0f5]">{profiles.map((profile) => <div key={profile.id} className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{profile.full_name || "New user"}{profile.id === user.id && <span className="ml-2 text-[10px] font-medium text-[#9699a9]">You</span>}</p><p className="mt-1 truncate text-xs text-[#85899d]">{profile.email}{profile.username ? ` · @${profile.username}` : ""}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${profile.status === "active" ? "bg-emerald-50 text-emerald-700" : profile.status === "banned" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{profile.status}</span><span className="w-fit min-w-[105px] text-[10px] font-medium text-[#777c90]">{profile.role === "admin" ? "Administrator" : profile.role === "manager" ? "Sales manager" : "View only"}</span><UserAccessActions userId={profile.id} status={profile.status as "pending" | "active" | "banned"} isAdmin={profile.role === "admin"} isSelf={profile.id === user.id} /></div>)}</div>}
      </section><p className="mt-4 text-xs leading-5 text-[#999cac]">Pending and banned users cannot access workspace data. Administrator accounts are protected from ban and deletion.</p>
    </div></main>;
}
