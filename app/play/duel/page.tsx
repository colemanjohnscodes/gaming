import type { Metadata } from "next";
import { DuelGame } from "@/games/snake/DuelGame";
import { normalizeWagerCode } from "@/lib/wager-code";

export const metadata: Metadata = {
  title: "A Private Wager",
};

export default async function DuelPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const { room } = await searchParams;
  const raw = typeof room === "string" ? room : null;
  const code = raw ? normalizeWagerCode(raw) : null;
  return <DuelGame room={code} invalidRoom={Boolean(raw && !code)} />;
}
