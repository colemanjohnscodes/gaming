"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ParlorPanel } from "@/components/ParlorPanel";
import { DUEL_FOOD_TO_WIN, GRID_SIZE } from "./constants";
import type { DuelPlayerId, DuelState } from "./duel";
import { dirFromSwipe } from "./input";
import { renderDuelBoard } from "./render";
import type { Dir } from "./types";

export type DuelView = {
  p1: number;
  p2: number;
  status: DuelState["status"];
  winner: DuelState["winner"];
  paused: boolean;
};

const MIN_CELL = 8;

const buttonClass =
  "mt-6 border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

function fitCell(width: number, maxHeight: number): number {
  const bound = Math.min(width, maxHeight);
  return Math.max(MIN_CELL, Math.floor(bound / GRID_SIZE));
}

export function DuelTable({
  stateRef,
  view,
  control,
  hint,
  notice,
  onTurn,
  onPause,
  onRestart,
}: {
  stateRef: { current: DuelState };
  view: DuelView;
  control: "both" | DuelPlayerId;
  hint: string;
  notice: string | null;
  onTurn: (player: DuelPlayerId, dir: Dir) => void;
  onPause: () => void;
  onRestart: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const padsRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const cellRef = useRef(MIN_CELL);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [cell, setCell] = useState(MIN_CELL);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    renderDuelBoard(ctx, stateRef.current, cellRef.current);
  }, [stateRef]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const measure = () => {
      const width = wrap.clientWidth;
      const padsHeight = padsRef.current?.offsetHeight ?? 0;
      const hintHeight = hintRef.current?.offsetHeight ?? 0;
      const footerHeight =
        document.querySelector("footer")?.getBoundingClientRect().height ?? 56;
      const boardTop = wrap.getBoundingClientRect().top;
      const room =
        window.innerHeight - boardTop - padsHeight - hintHeight - footerHeight - 16;
      const nextCell = fitCell(width, room);
      if (nextCell !== cellRef.current) {
        cellRef.current = nextCell;
        setCell(nextCell);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const px = cell * GRID_SIZE;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    canvas.style.width = `${px}px`;
    canvas.style.height = `${px}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    draw();
  }, [cell, draw]);

  useEffect(() => {
    canvasRef.current?.focus();
    let frame = 0;
    const loop = () => {
      draw();
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [draw]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start) {
      return;
    }
    const dir = dirFromSwipe(event.clientX - start.x, event.clientY - start.y);
    if (!dir) {
      onPause();
      return;
    }
    if (control !== "both") {
      onTurn(control, dir);
      return;
    }
    const canvas = canvasRef.current;
    const mid = canvas
      ? canvas.getBoundingClientRect().left + canvas.clientWidth / 2
      : window.innerWidth / 2;
    onTurn(start.x < mid ? "p1" : "p2", dir);
  };

  const boardPx = cell * GRID_SIZE;
  const finished = view.status === "finished";
  let banner: string | null = null;
  if (!finished && notice) {
    banner = notice;
  } else if (!finished && view.paused) {
    banner = "Held.";
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-5">
      <div className="flex w-full items-baseline justify-between gap-4">
        <h1 className="font-serif text-2xl text-cream sm:text-3xl">A Private Wager</h1>
        <p className="text-sm tracking-[0.12em] text-ink-muted" aria-live="polite">
          <span className="text-cream">West {view.p1}</span>
          <span className="mx-2 text-gold">·</span>
          <span className="text-gold">East {view.p2}</span>
          <span className="ml-2 text-ink-muted">/ {DUEL_FOOD_TO_WIN}</span>
        </p>
      </div>

      <div ref={wrapRef} className="relative w-full max-w-xl">
        <div
          className="relative mx-auto border border-gold/80 bg-panel"
          style={{ width: boardPx, height: boardPx }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label="A Private Wager"
            className="block touch-none outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-gold"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointerRef.current = null;
            }}
          />
          {banner ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/55 px-4">
              <p className="text-center font-serif text-2xl text-cream">{banner}</p>
            </div>
          ) : null}
          {finished ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-background/70 p-3">
              <ParlorPanel className="w-full max-w-xs text-center">
                <p className="font-serif text-2xl text-cream">
                  {view.winner === "p1"
                    ? "West holds the table."
                    : view.winner === "p2"
                      ? "East holds the table."
                      : "The house holds."}
                </p>
                <p className="mt-3 text-sm tracking-[0.12em] text-ink-muted">
                  <span className="text-cream">{view.p1}</span>
                  <span className="mx-2">·</span>
                  <span className="text-gold">{view.p2}</span>
                </p>
                <button type="button" onClick={onRestart} className={buttonClass}>
                  Again
                </button>
              </ParlorPanel>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={padsRef}
        className={
          control === "both"
            ? "flex w-full max-w-xl items-start justify-between gap-6 px-2"
            : "flex w-full max-w-xl items-start justify-center px-2"
        }
      >
        {control !== "p2" ? (
          <DPad
            label={control === "both" ? "West" : "You"}
            onTurn={(dir) => onTurn("p1", dir)}
          />
        ) : null}
        {control !== "p1" ? (
          <DPad
            label={control === "both" ? "East" : "You"}
            onTurn={(dir) => onTurn("p2", dir)}
          />
        ) : null}
      </div>

      <p
        ref={hintRef}
        className="shrink-0 text-center text-xs tracking-[0.14em] text-ink-muted"
      >
        {hint}
      </p>
    </div>
  );
}

function DPad({
  label,
  onTurn,
}: {
  label: string;
  onTurn: (dir: Dir) => void;
}) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5" aria-label={label}>
      <span />
      <PadButton label={`${label} up`} onPress={() => onTurn("up")}>
        <Chevron dir="up" />
      </PadButton>
      <span />
      <PadButton label={`${label} left`} onPress={() => onTurn("left")}>
        <Chevron dir="left" />
      </PadButton>
      <span className="flex items-center justify-center text-[10px] tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      <PadButton label={`${label} right`} onPress={() => onTurn("right")}>
        <Chevron dir="right" />
      </PadButton>
      <span />
      <PadButton label={`${label} down`} onPress={() => onTurn("down")}>
        <Chevron dir="down" />
      </PadButton>
      <span />
    </div>
  );
}

function PadButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-11 w-11 touch-manipulation items-center justify-center border border-gold/50 text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-gold sm:h-12 sm:w-12"
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
      }}
    >
      {children}
    </button>
  );
}

function Chevron({ dir }: { dir: Dir }) {
  const rotate =
    dir === "up" ? "0" : dir === "right" ? "90" : dir === "down" ? "180" : "270";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path d="M7 3 L12 10 H2 Z" fill="currentColor" />
    </svg>
  );
}
