import {
  BASE_TICK_MS,
  FOOD_PER_SPEED,
  GRID_SIZE,
  MIN_TICK_MS,
  START_LENGTH,
  TICK_STEP_MS,
} from "./constants";
import type { Dir, GameConfig, GameState, Point } from "./types";

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const STEP: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function nextHead(head: Point, dir: Dir): Point {
  return { x: head.x + STEP[dir].x, y: head.y + STEP[dir].y };
}

export function isOutOfBounds(point: Point, gridSize: number): boolean {
  return (
    point.x < 0 ||
    point.y < 0 ||
    point.x >= gridSize ||
    point.y >= gridSize
  );
}

export function speedForScore(score: number): number {
  const steps = Math.floor(score / FOOD_PER_SPEED);
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - steps * TICK_STEP_MS);
}

export function randomEmptyCell(
  gridSize: number,
  occupied: Point[],
  rng: () => number,
): Point {
  const blocked = new Set(occupied.map(pointKey));
  const empty: Point[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!blocked.has(`${x},${y}`)) {
        empty.push({ x, y });
      }
    }
  }
  if (empty.length === 0) {
    return occupied[0] ?? { x: 0, y: 0 };
  }
  const index = Math.min(empty.length - 1, Math.floor(rng() * empty.length));
  return empty[index];
}

function tickMsForScore(score: number): number {
  return speedForScore(score);
}

function placeFood(
  gridSize: number,
  snake: Point[],
  rng: () => number,
): Point {
  return randomEmptyCell(gridSize, snake, rng);
}

export function createGame(config: GameConfig = {}): GameState {
  const gridSize = config.gridSize ?? GRID_SIZE;
  const rng = config.rng ?? Math.random;
  const now = config.now ?? Date.now;
  const y = Math.floor(gridSize / 2);
  const headX = START_LENGTH + 1;
  const snake: Point[] = [];
  for (let i = 0; i < START_LENGTH; i += 1) {
    snake.push({ x: headX - i, y });
  }
  return {
    gridSize,
    snake,
    dir: "right",
    pendingDir: "right",
    food: placeFood(gridSize, snake, rng),
    score: 0,
    status: "running",
    tickMs: BASE_TICK_MS,
    startedAt: now(),
    endedAt: null,
    rng,
    now,
  };
}

export function turn(state: GameState, dir: Dir): GameState {
  if (state.status === "dead") {
    return state;
  }
  if (dir === OPPOSITE[state.pendingDir]) {
    return state;
  }
  if (dir === state.pendingDir) {
    return state;
  }
  return { ...state, pendingDir: dir };
}

export function tick(state: GameState): GameState {
  if (state.status === "dead") {
    return state;
  }

  const dir = state.pendingDir;
  const head = state.snake[0];
  const next: Point = {
    x: head.x + STEP[dir].x,
    y: head.y + STEP[dir].y,
  };

  if (
    next.x < 0 ||
    next.y < 0 ||
    next.x >= state.gridSize ||
    next.y >= state.gridSize
  ) {
    return {
      ...state,
      dir,
      pendingDir: dir,
      status: "dead",
      endedAt: state.endedAt ?? state.now(),
    };
  }

  const eating = samePoint(next, state.food);
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (body.some((segment) => samePoint(segment, next))) {
    return {
      ...state,
      dir,
      pendingDir: dir,
      status: "dead",
      endedAt: state.endedAt ?? state.now(),
    };
  }

  const snake = [next, ...body];
  const score = eating ? state.score + 1 : state.score;
  return {
    ...state,
    snake,
    dir,
    pendingDir: dir,
    food: eating ? placeFood(state.gridSize, snake, state.rng) : state.food,
    score,
    tickMs: eating ? tickMsForScore(score) : state.tickMs,
  };
}

export function isOpposite(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b;
}
