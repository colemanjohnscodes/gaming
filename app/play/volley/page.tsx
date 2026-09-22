import type { Metadata } from "next";
import { VolleyGame } from "@/games/volley/VolleyGame";
import { normalizeWagerCode } from "@/lib/wager-code";

export const metadata: Metadata = {
  title: "The Volley",
};

export default async function VolleyPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const { room } = await searchParams;
  const raw = typeof room === "string" ? room : null;
  const code = raw ? normalizeWagerCode(raw) : null;
  return <VolleyGame room={code} invalidRoom={Boolean(raw && !code)} />;
}
