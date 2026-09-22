import { DUEL_FOOD_TO_WIN, GRID_SIZE } from "@/games/snake/constants";
import type { DuelState } from "@/games/snake/duel";
import type { Dir, Point } from "@/games/snake/types";

export const WAGER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SEAT_VERSION = 1;

export type WagerSeat = "host" | "guest";

export type StoredSeat = {
  v: typeof SEAT_VERSION;
  token: string;
  seat: WagerSeat;
};

export type WireSnake = {
  snake: Point[];
  dir: Dir;
  score: number;
};

export type WireState = {
  held: boolean;
  p1: WireSnake;
  p2: WireSnake;
  food: Point;
  status: DuelState["status"];
  winner: DuelState["winner"];
  tickMs: number;
};

export function normalizeWagerCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  if (code.length !== 4) {
    return null;
  }
  for (const char of code) {
    if (!WAGER_ALPHABET.includes(char)) {
      return null;
    }
  }
  return code;
}

export function wagerChannel(code: string): string {
  return `wager:${code}`;
}

export function seatKey(code: string): string {
  return `parlor-wager:${code}`;
}

export function rememberSeat(code: string, token: string, seat: WagerSeat): void {
  const record: StoredSeat = { v: SEAT_VERSION, token, seat };
  sessionStorage.setItem(seatKey(code), JSON.stringify(record));
}

export function recallSeat(code: string): StoredSeat | null {
  const raw = sessionStorage.getItem(seatKey(code));
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (!("v" in parsed) || parsed.v !== SEAT_VERSION) {
      return null;
    }
    if (!("token" in parsed) || !isUuid(parsed.token)) {
      return null;
    }
    if (!("seat" in parsed) || (parsed.seat !== "host" && parsed.seat !== "guest")) {
      return null;
    }
    return { v: SEAT_VERSION, token: parsed.token, seat: parsed.seat };
  } catch {
    return null;
  }
}

export function forgetSeat(code: string): void {
  sessionStorage.removeItem(seatKey(code));
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isDir(value: unknown): value is Dir {
  return value === "up" || value === "down" || value === "left" || value === "right";
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object" || !("x" in value) || !("y" in value)) {
    return false;
  }
  const { x, y } = value;
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < GRID_SIZE &&
    y < GRID_SIZE
  );
}

function isSnake(value: unknown): value is WireSnake {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (!("snake" in value) || !("dir" in value) || !("score" in value)) {
    return false;
  }
  const { snake, dir, score } = value;
  if (!Array.isArray(snake) || snake.length < 1 || snake.length > GRID_SIZE * GRID_SIZE) {
    return false;
  }
  if (!snake.every(isPoint) || !isDir(dir)) {
    return false;
  }
  return typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= DUEL_FOOD_TO_WIN;
}

export function wireFromDuel(state: DuelState, held: boolean): WireState {
  return {
    held,
    p1: { snake: state.p1.snake, dir: state.p1.dir, score: state.p1.score },
    p2: { snake: state.p2.snake, dir: state.p2.dir, score: state.p2.score },
    food: state.food,
    status: state.status,
    winner: state.winner,
    tickMs: state.tickMs,
  };
}

export function parseWireState(value: unknown): WireState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (
    !("held" in value) ||
    !("p1" in value) ||
    !("p2" in value) ||
    !("food" in value) ||
    !("status" in value) ||
    !("winner" in value) ||
    !("tickMs" in value)
  ) {
    return null;
  }
  const { held, p1, p2, food, status, winner, tickMs } = value;
  if (typeof held !== "boolean" || !isSnake(p1) || !isSnake(p2) || !isPoint(food)) {
    return null;
  }
  if (status !== "running" && status !== "finished") {
    return null;
  }
  if (winner !== null && winner !== "p1" && winner !== "p2" && winner !== "draw") {
    return null;
  }
  if (status === "running" && winner !== null) {
    return null;
  }
  if (status === "finished" && winner === null) {
    return null;
  }
  if (typeof tickMs !== "number" || !Number.isFinite(tickMs) || tickMs < 40 || tickMs > 1000) {
    return null;
  }
  return { held, p1, p2, food, status, winner, tickMs };
}

export function duelFromWire(wire: WireState): DuelState {
  const player = (side: WireSnake): DuelState["p1"] => ({
    snake: side.snake,
    dir: side.dir,
    pendingDir: side.dir,
    score: side.score,
  });
  return {
    gridSize: GRID_SIZE,
    p1: player(wire.p1),
    p2: player(wire.p2),
    food: wire.food,
    status: wire.status,
    winner: wire.winner,
    tickMs: wire.tickMs,
    startedAt: 0,
    endedAt: wire.status === "finished" ? 1 : null,
    rng: () => 0,
    now: () => 0,
  };
}

export function readGuestToken(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("guestToken" in value)) {
    return null;
  }
  return isUuid(value.guestToken) ? value.guestToken : null;
}

export function readTurn(
  value: unknown,
): { guestToken: string; dir: Dir; seq: number } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (!("guestToken" in value) || !("dir" in value) || !("seq" in value)) {
    return null;
  }
  const { guestToken, dir, seq } = value;
  if (!isUuid(guestToken) || !isDir(dir)) {
    return null;
  }
  if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 0) {
    return null;
  }
  return { guestToken, dir, seq };
}
