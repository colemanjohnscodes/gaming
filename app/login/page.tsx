import type { Metadata } from "next";
import { ParlorPanel } from "@/components/ParlorPanel";

export const metadata: Metadata = {
  title: "Leave a name",
};

export default function LoginPage() {
  return (
    <ParlorPanel className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl text-cream">Leave a name</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        The book opens in a later sitting.
      </p>
    </ParlorPanel>
  );
}
