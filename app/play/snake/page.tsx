import type { Metadata } from "next";
import { ParlorPanel } from "@/components/ParlorPanel";

export const metadata: Metadata = {
  title: "The Serpent",
};

export default function SnakePage() {
  return (
    <ParlorPanel className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl text-cream">The Serpent</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        The table is being laid.
      </p>
    </ParlorPanel>
  );
}
