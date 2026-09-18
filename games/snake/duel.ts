import { BASE_TICK_MS, DUEL_FOOD_TO_WIN, GRID_SIZE, START_LENGTH } from "./constants";
import {
  isOpposite,
  isOutOfBounds,
  nextHead,
  randomEmptyCell,
  samePoint,
  speedForScore,
} from "./engine";
import type { Dir, GameConfig, Point } from "./types";

export type DuelPlayerId = "p1" | "p2";
export type DuelWinner = DuelPlayerId | "draw";
export type DuelStatus = "running" | "finished";

export type DuelPlayer = {
  snake: Point[];
  dir: Dir;
  pendingDir: Dir;
  score: number;
};

export type DuelState = {
  gridSize: number;
  p1: DuelPlayer;
  p2: DuelPlayer;
  food: Point;
  status: DuelStatus;
  winner: DuelWinner | null;
  tickMs: number;
  startedAt: number;
  endedAt: number | null;
  rng: () => number;
  now: () => number;
};

function hits(point: Point, body: Point[]): boolean {
  return body.some((segment) => samePoint(segment, point));
}

function bodyAfterMove(snake: Point[], eating: boolean): Point[] {
  return eating ? snake : snake.slice(0, -1);
}

function makeSnake(headX: number, y: number, dir: Dir, length: number): Point[] {
  const snake: Point[] = [];
  const step = dir === "right" ? -1 : 1;
  for (let i = 0; i < length; i += 1) {
    snake.push({ x: headX + i * step, y });
  }
  return snake;
}

export function createDuel(config: GameConfig = {}): DuelState {
  const gridSize = config.gridSize ?? GRID_SIZE;
  const rng = config.rng ?? Math.random;
  const now = config.now ?? Date.now;
  const p1Y = Math.floor(gridSize / 3);
  const p2Y = gridSize - 1 - p1Y;
  const p1HeadX = START_LENGTH + 1;
  const p2HeadX = gridSize - START_LENGTH - 2;
  const p1: DuelPlayer = {
    snake: makeSnake(p1HeadX, p1Y, "right", START_LENGTH),
    dir: "right",
    pendingDir: "right",
    score: 0,
  };
  const p2: DuelPlayer = {
    snake: makeSnake(p2HeadX, p2Y, "left", START_LENGTH),
    dir: "left",
    pendingDir: "left",
    score: 0,
  };
  return {
    gridSize,
    p1,
    p2,
    food: randomEmptyCell(gridSize, [...p1.snake, ...p2.snake], rng),
    status: "running",
    winner: null,
    tickMs: BASE_TICK_MS,
    startedAt: now(),
    endedAt: null,
    rng,
    now,
  };
}

export function turnDuel(
  state: DuelState,
  player: DuelPlayerId,
  dir: Dir,
): DuelState {
  if (state.status !== "running") {
    return state;
  }
  const current = state[player];
  if (isOpposite(current.pendingDir, dir) || dir === current.pendingDir) {
    return state;
  }
  return {
    ...state,
    [player]: { ...current, pendingDir: dir },
  };
}

export function tickDuel(state: DuelState): DuelState {
  if (state.status !== "running") {
    return state;
  }

  const p1Dir = state.p1.pendingDir;
  const p2Dir = state.p2.pendingDir;
  const n1 = nextHead(state.p1.snake[0], p1Dir);
  const n2 = nextHead(state.p2.snake[0], p2Dir);
  const p1Eat = samePoint(n1, state.food);
  const p2Eat = samePoint(n2, state.food);
  const p1Body = bodyAfterMove(state.p1.snake, p1Eat);
  const p2Body = bodyAfterMove(state.p2.snake, p2Eat);
  const p1New = [n1, ...p1Body];
  const p2New = [n2, ...p2Body];

  const p1Dead =
    isOutOfBounds(n1, state.gridSize) ||
    hits(n1, p1Body) ||
    hits(n1, p2New);
  const p2Dead =
    isOutOfBounds(n2, state.gridSize) ||
    hits(n2, p2Body) ||
    hits(n2, p1New);

  if (p1Dead || p2Dead) {
    const winner: DuelWinner = p1Dead && p2Dead ? "draw" : p1Dead ? "p2" : "p1";
    return {
      ...state,
      p1: { ...state.p1, dir: p1Dir, pendingDir: p1Dir },
      p2: { ...state.p2, dir: p2Dir, pendingDir: p2Dir },
      status: "finished",
      winner,
      endedAt: state.endedAt ?? state.now(),
    };
  }

  const p1: DuelPlayer = {
    snake: p1New,
    dir: p1Dir,
    pendingDir: p1Dir,
    score: p1Eat ? state.p1.score + 1 : state.p1.score,
  };
  const p2: DuelPlayer = {
    snake: p2New,
    dir: p2Dir,
    pendingDir: p2Dir,
    score: p2Eat ? state.p2.score + 1 : state.p2.score,
  };
  const occupied = [...p1.snake, ...p2.snake];
  const food =
    p1Eat || p2Eat
      ? randomEmptyCell(state.gridSize, occupied, state.rng)
      : state.food;

  const foodWin =
    p1.score >= DUEL_FOOD_TO_WIN
      ? "p1"
      : p2.score >= DUEL_FOOD_TO_WIN
        ? "p2"
        : null;

  return {
    ...state,
    p1,
    p2,
    food,
    tickMs: speedForScore(Math.max(p1.score, p2.score)),
    status: foodWin ? "finished" : "running",
    winner: foodWin,
    endedAt: foodWin ? (state.endedAt ?? state.now()) : null,
  };
}
