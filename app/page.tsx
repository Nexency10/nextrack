import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { PageLoader } from "@/components/page-loader";

export default function Home() {
  return <Suspense fallback={<PageLoader />}><HomeContent /></Suspense>;
}

async function HomeContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <AuthScreen />;
}
