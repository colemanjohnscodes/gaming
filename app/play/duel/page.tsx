import type { Metadata } from "next";
import { DuelGame } from "@/games/snake/DuelGame";

export const metadata: Metadata = {
  title: "A Private Wager",
};

export default function DuelPage() {
  return <DuelGame />;
}
