import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ParlorPanel } from "@/components/ParlorPanel";
import { cn } from "@/lib/cn";
import { listParlorBest } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";
import { startOfTennesseeDay } from "@/lib/zoned-day";

export const metadata: Metadata = {
  title: "The Ledger",
};

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ when?: string }>;
}) {
  const { when } = await searchParams;
  const evening = when === "evening" || when === "today";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId =
    typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  const result = await listParlorBest(supabase, {
    limit: 25,
    since: evening ? startOfTennesseeDay() : undefined,
  });
  const entries = result.ok ? result.entries : [];

  return (
    <ParlorPanel className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl text-cream">The Ledger</h1>
      <p className="mt-3 text-sm tracking-[0.12em] text-ink-muted">
        Best sitting of The Hedge
      </p>
      <div className="mt-6 mb-8 flex gap-6 text-sm tracking-[0.16em]">
        <Link
          href="/leaderboard?when=evening"
          className={cn(
            "pb-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold",
            evening
              ? "border-b border-gold text-gold"
              : "text-ink-muted hover:text-gold",
          )}
        >
          This evening
        </Link>
        <Link
          href="/leaderboard"
          className={cn(
            "pb-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold",
            evening
              ? "text-ink-muted hover:text-gold"
              : "border-b border-gold text-gold",
          )}
        >
          All time
        </Link>
      </div>
      {result.ok ? (
        <LeaderboardTable
          entries={entries}
          empty={
            evening
              ? "No one has sat this evening."
              : "The book is still clean."
          }
          highlightUserId={userId}
          showSittings
        />
      ) : (
        <p className="text-sm leading-relaxed text-ink-muted">{result.reason}</p>
      )}
    </ParlorPanel>
  );
}
