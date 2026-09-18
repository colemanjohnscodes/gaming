import type { Metadata } from "next";
import { SnakeGame } from "@/games/snake/SnakeGame";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The Hedge",
};

export const dynamic = "force-dynamic";

export default async function SnakePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const { data: profile } = user
    ? await supabase
        .from("parlor_profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <SnakeGame
      signedIn={Boolean(user)}
      parlorName={profile?.display_name ?? null}
      email={user?.email ?? null}
    />
  );
}
