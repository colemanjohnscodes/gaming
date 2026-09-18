import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database";
import { requirePublicSupabaseEnv } from "./env";

export function createClient() {
  return createBrowserClient<Database>(
    requirePublicSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
