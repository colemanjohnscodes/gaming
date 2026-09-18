import Link from "next/link";
import { ParlorPanel } from "@/components/ParlorPanel";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <p className="font-serif text-5xl tracking-wide text-cream sm:text-6xl">
        The Parlor
      </p>
      <p className="mt-4 text-sm tracking-[0.18em] text-ink-muted">
        Coleman Johns · Middle Tennessee
      </p>
      <div className="mt-8 h-px w-24 bg-gold/70" aria-hidden="true" />

      <div className="mt-12 grid w-full gap-6 md:grid-cols-2">
        <Link
          href="/play/snake"
          className="block focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <ParlorPanel className="h-full hover:border-gold">
            <p className="font-serif text-3xl text-cream">The Serpent</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              A quiet table. One guest. The house holds.
            </p>
            <p className="mt-8 text-xs tracking-[0.16em] text-gold">Take a seat</p>
          </ParlorPanel>
        </Link>

        <ParlorPanel variant="ghost" className="h-full">
          <p className="font-serif text-3xl text-cream/80">A Private Wager</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Two chairs. Last alive.
          </p>
          <p className="mt-8 text-xs tracking-[0.16em] text-gold">soon</p>
        </ParlorPanel>
      </div>

      <Link
        href="/leaderboard"
        className="mt-12 text-sm tracking-[0.16em] text-cream transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        The Ledger
      </Link>
    </div>
  );
}
