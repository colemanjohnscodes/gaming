import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ParlorPanel } from "@/components/ParlorPanel";
import { cn } from "@/lib/cn";
import { listParlorBest } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";
import { startOfTennesseeDay } from "@/lib/zoned-day";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ when?: string }>;
}) {
  const { when } = await searchParams;
  const evening = when === "evening";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId =
    typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  const ledger = await listParlorBest(supabase, {
    limit: 5,
    since: evening ? startOfTennesseeDay() : undefined,
  });
  const names = ledger.ok ? ledger.entries : [];

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center">
      <p className="font-serif text-5xl tracking-wide text-cream sm:text-6xl">
        The Parlor
      </p>
      <p className="mt-4 text-sm tracking-[0.18em] text-ink-muted">
        Coleman Johns · Middle Tennessee
      </p>
      <div className="mt-8 h-px w-24 bg-gold/70" aria-hidden="true" />
      <p className="mt-6 text-sm tracking-[0.12em] text-ink-muted">
        A private table. Not a listing.
      </p>

      <div className="mt-10 grid w-full gap-5">
        <Link
          href="/play/snake"
          className="block focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <ParlorPanel className="min-h-44 border-gold/80 transition-colors duration-[120ms] hover:border-gold">
            <p className="font-serif text-3xl text-cream">The Hedge</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              A quiet table. One guest. The house holds.
            </p>
            <p className="mt-10 text-xs tracking-[0.16em] text-gold">Sit down</p>
          </ParlorPanel>
        </Link>

        <Link
          href="/play/duel"
          className="block focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <ParlorPanel className="min-h-44 border-gold/80 transition-colors duration-[120ms] hover:border-gold">
            <p className="font-serif text-3xl text-cream">A Private Wager</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Two chairs. Last alive.
            </p>
            <p className="mt-10 text-xs tracking-[0.16em] text-gold">
              Take the other chair.
            </p>
          </ParlorPanel>
        </Link>
      </div>

      <div className="mt-12 w-full">
        <Link
          href="/leaderboard"
          className="font-serif text-2xl tracking-wide text-cream transition-colors duration-[120ms] hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          The Ledger
        </Link>
        <div className="mt-4 mb-6 flex gap-6 text-sm tracking-[0.16em]">
          <Link
            href="/?when=evening"
            className={cn(
              "pb-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold",
              evening
                ? "border-b border-gold text-gold"
                : "text-ink-muted hover:text-gold",
            )}
          >
            Evening
          </Link>
          <Link
            href="/"
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
        {ledger.ok ? (
          names.length > 0 ? (
            <>
              <LeaderboardTable
                entries={names}
                empty="The book is still clean."
                highlightUserId={userId}
              />
              <Link
                href={evening ? "/leaderboard?when=evening" : "/leaderboard"}
                className="mt-6 inline-block text-sm tracking-[0.14em] text-ink-muted transition-colors duration-[120ms] hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                View the full ledger →
              </Link>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-muted">
              {evening
                ? "No one has sat this evening."
                : "The book is still clean."}
            </p>
          )
        ) : (
          <p className="text-sm leading-relaxed text-ink-muted">
            {ledger.reason}
          </p>
        )}
      </div>
    </div>
  );
}
