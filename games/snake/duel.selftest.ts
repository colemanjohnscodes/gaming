import { DUEL_FOOD_TO_WIN, GRID_SIZE } from "./constants";
import { createDuel, tickDuel, turnDuel } from "./duel";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const start = createDuel({ rng: () => 0.5, now: () => 1 });
assert(start.p1.snake.length === 3, "west starts length 3");
assert(start.p2.snake.length === 3, "east starts length 3");
assert(start.p1.dir === "right", "west moves right");
assert(start.p2.dir === "left", "east moves left");
assert(start.gridSize === GRID_SIZE, "20×20");
assert(start.status === "running", "starts running");

const noReverse = turnDuel(start, "p1", "left");
assert(noReverse.p1.pendingDir === "right", "west cannot reverse");

let wall = createDuel({ now: () => 2 });
wall = {
  ...wall,
  p1: {
    ...wall.p1,
    snake: [
      { x: GRID_SIZE - 1, y: 6 },
      { x: GRID_SIZE - 2, y: 6 },
      { x: GRID_SIZE - 3, y: 6 },
    ],
    dir: "right",
    pendingDir: "right",
  },
  p2: {
    ...wall.p2,
    snake: [
      { x: 4, y: 13 },
      { x: 5, y: 13 },
      { x: 6, y: 13 },
    ],
    dir: "left",
    pendingDir: "left",
  },
  food: { x: 10, y: 10 },
};
wall = tickDuel(wall);
assert(wall.status === "finished", "wall ends the wager");
assert(wall.winner === "p2", "east last alive when west hits the hedge");

let headOn = createDuel({ now: () => 3 });
headOn = {
  ...headOn,
  p1: {
    snake: [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ],
    dir: "right",
    pendingDir: "right",
    score: 0,
  },
  p2: {
    snake: [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 12, y: 10 },
    ],
    dir: "left",
    pendingDir: "left",
    score: 0,
  },
  food: { x: 0, y: 0 },
};
headOn = tickDuel(headOn);
assert(headOn.winner === "draw", "simultaneous head-to-head is a draw");

let intoBody = createDuel({ now: () => 4 });
intoBody = {
  ...intoBody,
  p1: {
    snake: [
      { x: 10, y: 9 },
      { x: 10, y: 8 },
      { x: 10, y: 7 },
    ],
    dir: "down",
    pendingDir: "down",
    score: 0,
  },
  p2: {
    snake: [
      { x: 8, y: 10 },
      { x: 9, y: 10 },
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ],
    dir: "left",
    pendingDir: "left",
    score: 0,
  },
  food: { x: 0, y: 0 },
};
intoBody = tickDuel(intoBody);
assert(intoBody.winner === "p2", "head into body loses");

let foodWin = createDuel({ rng: () => 0.99, now: () => 5 });
foodWin = {
  ...foodWin,
  p1: {
    ...foodWin.p1,
    score: DUEL_FOOD_TO_WIN - 1,
  },
  food: {
    x: foodWin.p1.snake[0].x + 1,
    y: foodWin.p1.snake[0].y,
  },
};
foodWin = tickDuel(foodWin);
assert(foodWin.winner === "p1", "first to 10 food wins");
assert(foodWin.p1.score === DUEL_FOOD_TO_WIN, "west reaches ten");

const still = tickDuel(foodWin);
assert(still.status === "finished", "finished state ignores ticks");

const again = createDuel();
assert(again.status === "running", "again is a fresh wager");

console.log("duel.selftest ok");
