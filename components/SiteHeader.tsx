import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

export function SiteHeader() {
  return (
    <header className="border-b border-gold/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="font-serif text-xl tracking-wide text-cream focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          The Parlor
        </Link>
        <nav
          aria-label="Parlor"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm tracking-[0.14em]"
        >
          <Link
            href="/play/snake"
            className="text-cream transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            Play
          </Link>
          <Link
            href="/leaderboard"
            className="text-cream transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            The Ledger
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
