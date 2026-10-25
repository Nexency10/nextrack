"use server";

import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function signInWithIdentifier(identifier: string, password: string) {
  let email = identifier.trim().toLowerCase();
  if (!email.includes("@")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { error: "Username sign-in needs SUPABASE_SERVICE_ROLE_KEY on the server. You can sign in with your email meanwhile." };
    const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error } = await admin.from("profiles").select("email").eq("username", email).maybeSingle();
    if (error || !profile?.email) return { error: "No account was found for that username." };
    email = profile.email;
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
