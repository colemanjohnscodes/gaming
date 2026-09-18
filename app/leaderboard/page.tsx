import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ParlorPanel } from "@/components/ParlorPanel";
import { cn } from "@/lib/cn";
import { listParlorScores } from "@/lib/scores";
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
  const today = when === "today";
  const supabase = await createClient();
  const result = await listParlorScores(supabase, {
    limit: 25,
    since: today ? startOfTennesseeDay() : undefined,
  });
  const entries = result.ok ? result.entries : [];

  return (
    <ParlorPanel className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl text-cream">The Ledger</h1>
      <div className="mt-6 mb-8 flex gap-6 text-sm tracking-[0.16em]">
        <Link
          href="/leaderboard"
          className={cn(
            "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold",
            today ? "text-ink-muted hover:text-gold" : "text-gold",
          )}
        >
          All time
        </Link>
        <Link
          href="/leaderboard?when=today"
          className={cn(
            "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold",
            today ? "text-gold" : "text-ink-muted hover:text-gold",
          )}
        >
          Today
        </Link>
      </div>
      {result.ok ? (
        <LeaderboardTable
          entries={entries}
          empty={
            today ? "Nothing recorded today." : "Nothing is recorded yet."
          }
        />
      ) : (
        <p className="text-sm leading-relaxed text-ink-muted">
          {result.reason}
        </p>
      )}
    </ParlorPanel>
  );
}
