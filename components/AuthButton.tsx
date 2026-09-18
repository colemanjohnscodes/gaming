import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const className =
  "text-cream transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  return (
    <Link href="/login" className={className}>
      {signedIn ? "Account" : "Leave a name"}
    </Link>
  );
}
