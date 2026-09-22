export const BOARD_W = 1000;
export const BOARD_H = 560;
export const PADDLE_W = 14;
export const PADDLE_H = 96;
export const PADDLE_INSET = 28;
export const BALL_R = 8;
export const VOLLEY_TO_WIN = 7;

const BASE_SPEED = 340;
const STEP_MS = 8;

export type Side = "west" | "east";
export type VolleyStatus = "ready" | "running" | "scored" | "finished";

export type VolleyState = {
  west: number;
  east: number;
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  westScore: number;
  eastScore: number;
  status: VolleyStatus;
  winner: Side | null;
  serveTo: Side;
};

function clampPaddle(centerY: number): number {
  const half = PADDLE_H / 2;
  return Math.min(BOARD_H - half, Math.max(half, centerY));
}

function serveBall(state: VolleyState): VolleyState {
  const dir = state.serveTo === "east" ? 1 : -1;
  const flick = (state.westScore + state.eastScore) % 2 === 0 ? 1 : -1;
  return {
    ...state,
    ballX: BOARD_W / 2,
    ballY: BOARD_H / 2,
    vx: dir * BASE_SPEED,
    vy: flick * 90,
  };
}

export function createVolley(): VolleyState {
  return serveBall({
    west: BOARD_H / 2,
    east: BOARD_H / 2,
    ballX: BOARD_W / 2,
    ballY: BOARD_H / 2,
    vx: BASE_SPEED,
    vy: 90,
    westScore: 0,
    eastScore: 0,
    status: "ready",
    winner: null,
    serveTo: "east",
  });
}

export function placePaddle(
  state: VolleyState,
  side: Side,
  centerY: number,
): VolleyState {
  if (state.status === "finished") {
    return state;
  }
  return { ...state, [side]: clampPaddle(centerY) };
}

export function beginVolley(state: VolleyState): VolleyState {
  if (state.status === "finished") {
    return state;
  }
  return { ...serveBall(state), status: "running" };
}

export function serveVolley(state: VolleyState): VolleyState {
  if (state.status !== "scored") {
    return state;
  }
  return { ...serveBall(state), status: "running" };
}

function reflect(
  y: number,
  vx: number,
  vy: number,
  side: Side,
  paddleCenter: number,
): { ballX: number; vx: number; vy: number } {
  const face =
    side === "west"
      ? PADDLE_INSET + PADDLE_W + BALL_R + 0.5
      : BOARD_W - PADDLE_INSET - PADDLE_W - BALL_R - 0.5;
  const sign = side === "west" ? 1 : -1;
  const speed = Math.min(860, Math.abs(vx) * 1.05 + 12);
  const offset = (y - paddleCenter) / (PADDLE_H / 2);
  const nextVy = Math.max(-480, Math.min(480, vy + offset * 240));
  return { ballX: face, vx: sign * speed, vy: nextVy };
}

function integrate(state: VolleyState, dtMs: number): VolleyState {
  const dt = dtMs / 1000;
  let x = state.ballX + state.vx * dt;
  let y = state.ballY + state.vy * dt;
  let vx = state.vx;
  let vy = state.vy;

  if (y < BALL_R) {
    y = BALL_R;
    vy = Math.abs(vy);
  } else if (y > BOARD_H - BALL_R) {
    y = BOARD_H - BALL_R;
    vy = -Math.abs(vy);
  }

  const side: Side = vx < 0 ? "west" : "east";
  const paddleX = side === "west" ? PADDLE_INSET : BOARD_W - PADDLE_INSET - PADDLE_W;
  const face = side === "west" ? paddleX + PADDLE_W : paddleX;
  const top = state[side] - PADDLE_H / 2;
  const crossed =
    side === "west"
      ? state.ballX - BALL_R >= face && x - BALL_R <= face
      : state.ballX + BALL_R <= face && x + BALL_R >= face;
  const within = y >= top && y <= top + PADDLE_H;
  if (crossed && within) {
    const bounced = reflect(y, vx, vy, side, state[side]);
    x = bounced.ballX;
    vx = bounced.vx;
    vy = bounced.vy;
  }

  if (x < -BALL_R) {
    const eastScore = state.eastScore + 1;
    const finished = eastScore >= VOLLEY_TO_WIN;
    return {
      ...state,
      ballX: x,
      ballY: y,
      vx,
      vy,
      eastScore,
      status: finished ? "finished" : "scored",
      winner: finished ? "east" : null,
      serveTo: "west",
    };
  }
  if (x > BOARD_W + BALL_R) {
    const westScore = state.westScore + 1;
    const finished = westScore >= VOLLEY_TO_WIN;
    return {
      ...state,
      ballX: x,
      ballY: y,
      vx,
      vy,
      westScore,
      status: finished ? "finished" : "scored",
      winner: finished ? "west" : null,
      serveTo: "east",
    };
  }

  return { ...state, ballX: x, ballY: y, vx, vy };
}

export function stepVolley(state: VolleyState, dtMs: number): VolleyState {
  if (state.status !== "running") {
    return state;
  }
  let left = Math.max(0, Math.min(dtMs, 50));
  let current = state;
  while (left > 0) {
    const slice = Math.min(STEP_MS, left);
    left -= slice;
    current = integrate(current, slice);
    if (current.status !== "running") {
      return current;
    }
  }
  return current;
}

export type VolleyWire = {
  west: number;
  east: number;
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  westScore: number;
  eastScore: number;
  status: VolleyStatus;
  winner: Side | null;
  serveTo: Side;
};

function isSide(value: unknown): value is Side {
  return value === "west" || value === "east";
}

function isNum(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function wireFromVolley(state: VolleyState): VolleyWire {
  return {
    west: state.west,
    east: state.east,
    ballX: state.ballX,
    ballY: state.ballY,
    vx: state.vx,
    vy: state.vy,
    westScore: state.westScore,
    eastScore: state.eastScore,
    status: state.status,
    winner: state.winner,
    serveTo: state.serveTo,
  };
}

export function parseVolleyWire(value: unknown): VolleyWire | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (
    !("west" in value) ||
    !("east" in value) ||
    !("ballX" in value) ||
    !("ballY" in value) ||
    !("vx" in value) ||
    !("vy" in value) ||
    !("westScore" in value) ||
    !("eastScore" in value) ||
    !("status" in value) ||
    !("winner" in value) ||
    !("serveTo" in value)
  ) {
    return null;
  }
  const wire = value;
  if (
    !isNum(wire.west, 0, BOARD_H) ||
    !isNum(wire.east, 0, BOARD_H) ||
    !isNum(wire.ballX, -200, BOARD_W + 200) ||
    !isNum(wire.ballY, -50, BOARD_H + 50) ||
    !isNum(wire.vx, -2000, 2000) ||
    !isNum(wire.vy, -2000, 2000) ||
    !isNum(wire.westScore, 0, VOLLEY_TO_WIN) ||
    !isNum(wire.eastScore, 0, VOLLEY_TO_WIN) ||
    !isSide(wire.serveTo)
  ) {
    return null;
  }
  if (
    wire.status !== "ready" &&
    wire.status !== "running" &&
    wire.status !== "scored" &&
    wire.status !== "finished"
  ) {
    return null;
  }
  if (wire.winner !== null && !isSide(wire.winner)) {
    return null;
  }
  if (!Number.isInteger(wire.westScore) || !Number.isInteger(wire.eastScore)) {
    return null;
  }
  return {
    west: wire.west,
    east: wire.east,
    ballX: wire.ballX,
    ballY: wire.ballY,
    vx: wire.vx,
    vy: wire.vy,
    westScore: wire.westScore,
    eastScore: wire.eastScore,
    status: wire.status,
    winner: wire.winner,
    serveTo: wire.serveTo,
  };
}

export function volleyFromWire(wire: VolleyWire): VolleyState {
  return { ...wire };
}
