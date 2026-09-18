import { validateScore, type ScoreInput } from "./scores";

const KEY = "parlor:pending-score:v1";

type StoredPending = {
  v: 1;
  game: string;
  score: number;
  duration_ms: number;
  grid_size: number;
};

function isStoredPending(value: unknown): value is StoredPending {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.v === 1 &&
    typeof record.game === "string" &&
    typeof record.score === "number" &&
    typeof record.duration_ms === "number" &&
    typeof record.grid_size === "number"
  );
}

export function savePendingScore(input: ScoreInput): void {
  if (typeof window === "undefined") {
    return;
  }
  const pending: StoredPending = {
    v: 1,
    game: input.game ?? "snake",
    score: input.score,
    duration_ms: input.duration_ms,
    grid_size: input.grid_size ?? 20,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Private mode or disabled storage.
  }
}

export function loadPendingScore(): ScoreInput | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredPending(parsed)) {
      return null;
    }
    const input: ScoreInput = {
      game: parsed.game,
      score: parsed.score,
      duration_ms: parsed.duration_ms,
      grid_size: parsed.grid_size,
    };
    return validateScore(input).ok ? input : null;
  } catch {
    return null;
  }
}

export function clearPendingScore(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore storage failures.
  }
}
