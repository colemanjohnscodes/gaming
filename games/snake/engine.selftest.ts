import { BASE_TICK_MS, MIN_TICK_MS } from "./constants";
import { createGame, tick, turn } from "./engine";
import type { GameState, Point } from "./types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function same(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function playUntilDead(state: GameState): GameState {
  let current = state;
  let steps = 0;
  while (current.status === "running") {
    current = tick(current);
    steps += 1;
    if (steps > 400) {
      throw new Error("did not die within 400 ticks");
    }
  }
  return current;
}

const start = createGame({ rng: () => 0, now: () => 1_000 });
assert(start.snake.length === 3, "start length 3");
assert(start.dir === "right", "starts moving right");
assert(start.status === "running", "starts running");
assert(start.score === 0, "score starts at 0");
assert(start.tickMs === BASE_TICK_MS, "base speed");
assert(start.snake[0].x > start.snake[1].x, "head is the rightmost segment");

const reversed = turn(start, "left");
assert(reversed.pendingDir === "right", "no reverse into yourself");

const wall = playUntilDead(start);
assert(wall.status === "dead", "dies on the right wall");
assert(wall.snake[0].x === start.gridSize - 1, "head stays on the last cell");
assert(wall.snake[0].x !== 0, "does not wrap");
assert(wall.endedAt === 1_000, "stamps endedAt from the clock");

const leftWall = playUntilDead(
  tick(turn(tick(turn(createGame({ now: () => 2 }), "up")), "left")),
);
assert(leftWall.status === "dead", "dies on the left wall");
assert(leftWall.snake[0].x === 0, "left wall death does not wrap");

let eat = createGame({ rng: () => 0.99, now: () => 0 });
const head = eat.snake[0];
eat = {
  ...eat,
  food: { x: head.x + 1, y: head.y },
};
eat = tick(eat);
assert(eat.score === 1, "eating scores 1");
assert(eat.snake.length === 4, "eating grows by 1");
assert(same(eat.snake[0], { x: head.x + 1, y: head.y }), "head moves onto food");
assert(!same(eat.food, eat.snake[0]), "new food is not on the head");

let sped = createGame({ rng: () => 0.5 });
for (let n = 0; n < 5; n += 1) {
  const h = sped.snake[0];
  sped = tick({
    ...sped,
    food: { x: h.x + 1, y: h.y },
    pendingDir: "right",
    dir: "right",
  });
}
assert(sped.score === 5, "five food eaten");
assert(sped.tickMs < BASE_TICK_MS, "speeds up every 5 food");
assert(sped.tickMs >= MIN_TICK_MS, "speed is capped");

let loop = createGame();
loop = {
  ...loop,
  snake: [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 6, y: 5 },
    { x: 6, y: 4 },
  ],
  dir: "right",
  pendingDir: "right",
  food: { x: 0, y: 0 },
};
loop = tick(loop);
assert(loop.status === "dead", "dies on self");

const again = createGame();
assert(again.status === "running", "another hand is a fresh game");
assert(again.snake.length === 3, "restart length 3");

const stillDead = tick(turn(wall, "up"));
assert(stillDead.status === "dead", "dead state ignores turns and ticks");

console.log("engine.selftest ok");
