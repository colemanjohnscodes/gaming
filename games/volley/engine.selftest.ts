import {
  BALL_R,
  BOARD_H,
  PADDLE_INSET,
  PADDLE_W,
  VOLLEY_TO_WIN,
  beginVolley,
  createVolley,
  placePaddle,
  serveVolley,
  stepVolley,
} from "./engine";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const started = beginVolley(createVolley());
assert(started.status === "running", "the rally begins");
assert(started.vx > 0, "the first ball runs east");

const clamped = placePaddle(started, "west", -40);
assert(clamped.west > 0, "a paddle stays on the table");

let wall = beginVolley(createVolley());
wall = { ...wall, ballX: 500, ballY: BALL_R + 1, vy: -400, vx: 40 };
wall = stepVolley(wall, 16);
assert(wall.vy > 0, "the ball leaves the near rail");

const face = PADDLE_INSET + PADDLE_W;
let hit = beginVolley(createVolley());
hit = {
  ...hit,
  ballX: face + BALL_R + 4,
  ballY: BOARD_H / 2,
  vx: -500,
  vy: 0,
  west: BOARD_H / 2,
};
hit = stepVolley(hit, 16);
assert(hit.vx > 0, "west returns the ball");

let miss = beginVolley(createVolley());
miss = { ...miss, ballX: 12, ballY: 40, vx: -800, vy: 0, west: BOARD_H - 80 };
miss = stepVolley(miss, 40);
assert(miss.eastScore === 1, "a ball past west scores for east");
assert(miss.status === "scored", "the rally pauses on a point");
const next = serveVolley(miss);
assert(next.status === "running", "the next ball is served");
assert(next.vx < 0, "the ball returns to the chair that missed");

let won = beginVolley(createVolley());
won = { ...won, eastScore: VOLLEY_TO_WIN - 1, ballX: 12, ballY: 40, vx: -800, vy: 0, west: 400 };
won = stepVolley(won, 40);
assert(won.status === "finished" && won.winner === "east", "east holds at 7");
assert(placePaddle(won, "west", 100).west === won.west, "paddles rest when the table is done");

console.log("volley.selftest ok");
