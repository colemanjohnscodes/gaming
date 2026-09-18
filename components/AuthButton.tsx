import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const className =
  "text-cream transition-colors duration-[120ms] hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    return (
      <Link href="/login" className={className}>
        Leave a name
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("parlor_profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <Link href="/login" className={className}>
      {profile?.display_name || "Leave a name"}
    </Link>
  );
}
