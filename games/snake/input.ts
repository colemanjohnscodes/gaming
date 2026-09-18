import type { Dir } from "./types";

export function dirFromKey(key: string): Dir | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

export function isPauseKey(key: string): boolean {
  return key === " " || key === "Spacebar";
}

export function dirFromSwipe(
  dx: number,
  dy: number,
  threshold = 24,
): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
    return null;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}
