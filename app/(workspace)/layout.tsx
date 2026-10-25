import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { PageLoader } from "@/components/page-loader";
import { createClient } from "@/lib/supabase/server";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}><WorkspaceContent>{children}</WorkspaceContent></Suspense>;
}

async function WorkspaceContent({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles")
    .select("full_name, role, status")
    .eq("id", user.id)
    .maybeSingle();

  return <WorkspaceShell
    name={profile?.full_name || user.user_metadata.full_name || user.email || "Workspace member"}
    role={profile?.role ?? "viewer"}
    email={user.email ?? ""}
  >{children}</WorkspaceShell>;
}
