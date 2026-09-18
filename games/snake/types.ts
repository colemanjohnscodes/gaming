export type Dir = "up" | "down" | "left" | "right";

export type Point = {
  x: number;
  y: number;
};

export type GameStatus = "running" | "dead";

export type GameState = {
  gridSize: number;
  snake: Point[];
  dir: Dir;
  pendingDir: Dir;
  food: Point;
  score: number;
  status: GameStatus;
  tickMs: number;
  startedAt: number;
  endedAt: number | null;
  rng: () => number;
  now: () => number;
};

export type GameConfig = {
  gridSize?: number;
  rng?: () => number;
  now?: () => number;
};
