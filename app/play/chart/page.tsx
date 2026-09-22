import type { Metadata } from "next";
import { ChartGame } from "@/games/chart/ChartGame";
import { normalizeWagerCode } from "@/lib/wager-code";

export const metadata: Metadata = {
  title: "The Chart",
};

export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const { room } = await searchParams;
  const raw = typeof room === "string" ? room : null;
  const code = raw ? normalizeWagerCode(raw) : null;
  return <ChartGame room={code} invalidRoom={Boolean(raw && !code)} />;
}
