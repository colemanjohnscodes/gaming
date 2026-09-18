import type { Metadata } from "next";
import { ParlorPanel } from "@/components/ParlorPanel";

export const metadata: Metadata = {
  title: "The Ledger",
};

export default function LeaderboardPage() {
  return (
    <ParlorPanel className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl text-cream">The Ledger</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Nothing is recorded yet.
      </p>
    </ParlorPanel>
  );
}
