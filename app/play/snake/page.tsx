import type { Metadata } from "next";
import { SnakeGame } from "@/games/snake/SnakeGame";

export const metadata: Metadata = {
  title: "The Serpent",
};

export default function SnakePage() {
  return <SnakeGame />;
}
