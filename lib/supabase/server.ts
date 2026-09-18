import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database";
import { requirePublicSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requirePublicSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; session refresh is Phase 3.
          }
        },
      },
    },
  );
}
