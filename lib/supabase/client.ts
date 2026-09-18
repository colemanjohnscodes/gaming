import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database";
import { publicSupabaseAnonKey, publicSupabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient<Database>(
    publicSupabaseUrl(),
    publicSupabaseAnonKey(),
  );
}
