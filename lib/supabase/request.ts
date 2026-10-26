import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Build a Supabase client only after the incoming request is available. */
export async function createRequestClient() {
  await connection();
  return createClient();
}
