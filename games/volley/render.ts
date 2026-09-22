import {
  BALL_R,
  BOARD_H,
  BOARD_W,
  PADDLE_H,
  PADDLE_INSET,
  PADDLE_W,
  type VolleyState,
} from "./engine";

const BOARD_A = "#231714";
const BOARD_B = "#2c1e19";
const CREAM = "#f3ead8";
const GOLD = "#c6a35a";
const LINE = "rgba(198, 163, 90, 0.35)";

export function drawVolley(
  ctx: CanvasRenderingContext2D,
  state: VolleyState,
  width: number,
  height: number,
): void {
  const sx = width / BOARD_W;
  const sy = height / BOARD_H;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = BOARD_A;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = BOARD_B;
  ctx.fillRect(width * 0.08, height * 0.08, width * 0.84, height * 0.84);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2, height * 0.1);
  ctx.lineTo(width / 2, height * 0.9);
  ctx.stroke();

  const paddle = (centerY: number, x: number, fill: string) => {
    const y = (centerY - PADDLE_H / 2) * sy;
    ctx.fillStyle = fill;
    ctx.fillRect(x * sx, y, PADDLE_W * sx, PADDLE_H * sy);
  };
  paddle(state.west, PADDLE_INSET, CREAM);
  paddle(state.east, BOARD_W - PADDLE_INSET - PADDLE_W, GOLD);

  ctx.beginPath();
  ctx.fillStyle = GOLD;
  ctx.arc(state.ballX * sx, state.ballY * sy, BALL_R * ((sx + sy) / 2), 0, Math.PI * 2);
  ctx.fill();
}
