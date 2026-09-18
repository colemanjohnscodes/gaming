import type { Metadata } from "next";
import { ParlorPanel } from "@/components/ParlorPanel";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Leave a name",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: profile } = data.user
    ? await supabase
        .from("parlor_profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle()
    : { data: null };

  return (
    <ParlorPanel className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl text-cream">Leave a name</h1>
      <p className="mt-4 mb-8 text-sm leading-relaxed text-ink-muted">
        The name in the book is how you will be known on The Ledger.
        Guests may still play.
      </p>
      <LoginForm
        nextPath={safeNextPath(params.next ?? "/")}
        email={data.user?.email ?? null}
        displayName={profile?.display_name ?? null}
        errorCode={params.error ?? null}
      />
    </ParlorPanel>
  );
}
