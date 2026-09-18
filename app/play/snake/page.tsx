import type { Metadata } from "next";
import { SnakeGame } from "@/games/snake/SnakeGame";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The Serpent",
};

export const dynamic = "force-dynamic";

export default async function SnakePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <SnakeGame signedIn={Boolean(data?.claims)} />;
}
