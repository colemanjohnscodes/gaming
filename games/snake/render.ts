import { COLORS } from "./constants";
import type { Dir, GameState, Point } from "./types";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
): void {
  const r = Math.min(radius, size / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + size, y, x + size, y + size, r);
  ctx.arcTo(x + size, y + size, x, y + size, r);
  ctx.arcTo(x, y + size, x, y, r);
  ctx.arcTo(x, y, x + size, y, r);
  ctx.closePath();
}

function cellOrigin(cell: number, point: Point): { x: number; y: number } {
  return { x: point.x * cell, y: point.y * cell };
}

function headMark(dir: Dir, cell: number, origin: Point): Point {
  const inset = cell * 0.28;
  const mid = cell / 2;
  switch (dir) {
    case "up":
      return { x: origin.x + mid, y: origin.y + inset };
    case "down":
      return { x: origin.x + mid, y: origin.y + cell - inset };
    case "left":
      return { x: origin.x + inset, y: origin.y + mid };
    case "right":
      return { x: origin.x + cell - inset, y: origin.y + mid };
  }
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cell: number,
): void {
  const size = state.gridSize * cell;
  ctx.clearRect(0, 0, size, size);

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.boardA : COLORS.boardB;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= state.gridSize; i += 1) {
    const pos = i * cell + 0.5;
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
  }
  ctx.stroke();

  const pad = Math.max(1, Math.floor(cell * 0.12));
  const bodySize = cell - pad * 2;
  const radius = Math.max(1, Math.floor(cell * 0.16));

  for (let i = state.snake.length - 1; i >= 0; i -= 1) {
    const origin = cellOrigin(cell, state.snake[i]);
    const isHead = i === 0;
    roundRect(ctx, origin.x + pad, origin.y + pad, bodySize, radius);
    ctx.fillStyle = isHead ? COLORS.snakeHead : COLORS.snake;
    ctx.fill();
    ctx.strokeStyle = COLORS.snakeEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (isHead) {
      const mark = headMark(state.dir, cell, origin);
      ctx.fillStyle = COLORS.snake;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, Math.max(1.2, cell * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const food = cellOrigin(cell, state.food);
  const cx = food.x + cell / 2;
  const cy = food.y + cell / 2;
  const outer = cell * 0.28;
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.foodCore;
  ctx.beginPath();
  ctx.arc(cx - outer * 0.18, cy - outer * 0.18, outer * 0.38, 0, Math.PI * 2);
  ctx.fill();
}
