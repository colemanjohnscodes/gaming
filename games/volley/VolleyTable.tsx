"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ParlorPanel } from "@/components/ParlorPanel";
import {
  BOARD_H,
  BOARD_W,
  VOLLEY_TO_WIN,
  type Side,
  type VolleyState,
} from "./engine";
import { drawVolley } from "./render";

const buttonClass =
  "mt-6 border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

export type VolleyView = {
  west: number;
  east: number;
  status: VolleyState["status"];
  winner: VolleyState["winner"];
};

export function VolleyTable({
  stateRef,
  view,
  control,
  hint,
  notice,
  onPaddle,
  onBegin,
  onAgain,
}: {
  stateRef: { current: VolleyState };
  view: VolleyView;
  control: "both" | Side;
  hint: string;
  notice: string | null;
  onPaddle: (side: Side, centerY: number) => void;
  onBegin: () => void;
  onAgain: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<Side | null>(null);
  const [size, setSize] = useState({ width: 640, height: 358 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    drawVolley(ctx, stateRef.current, size.width, size.height);
  }, [size.height, size.width, stateRef]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const measure = () => {
      const width = wrap.clientWidth;
      const footer = document.querySelector("footer")?.getBoundingClientRect().height ?? 56;
      const top = wrap.getBoundingClientRect().top;
      const maxHeight = Math.max(180, window.innerHeight - top - footer - 96);
      const byHeight = maxHeight * (BOARD_W / BOARD_H);
      const nextWidth = Math.max(280, Math.min(width, byHeight));
      const nextHeight = nextWidth * (BOARD_H / BOARD_W);
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
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
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    draw();
  }, [draw, size.height, size.width]);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      draw();
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [draw]);

  function sideFor(clientX: number): Side {
    if (control !== "both") {
      return control;
    }
    const canvas = canvasRef.current;
    const mid = canvas
      ? canvas.getBoundingClientRect().left + canvas.clientWidth / 2
      : window.innerWidth / 2;
    return clientX < mid ? "west" : "east";
  }

  function centerY(clientY: number): number {
    const canvas = canvasRef.current;
    if (!canvas) {
      return BOARD_H / 2;
    }
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.height === 0 ? 0.5 : (clientY - rect.top) / rect.height;
    return Math.min(1, Math.max(0, ratio)) * BOARD_H;
  }

  const finished = view.status === "finished";
  const ready = view.status === "ready";

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-5">
      <div className="flex w-full items-baseline justify-between gap-4">
        <h1 className="font-serif text-2xl text-cream sm:text-3xl">The Volley</h1>
        <p className="text-sm tracking-[0.12em] text-ink-muted" aria-live="polite">
          <span className="text-cream">West {view.west}</span>
          <span className="mx-2 text-gold">·</span>
          <span className="text-gold">East {view.east}</span>
          <span className="ml-2">/ {VOLLEY_TO_WIN}</span>
        </p>
      </div>
      <div ref={wrapRef} className="relative w-full max-w-3xl">
        <div
          className="relative mx-auto border border-gold/80 bg-panel"
          style={{ width: size.width, height: size.height }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label="The Volley"
            className="block touch-none outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragging.current = sideFor(event.clientX);
              onPaddle(dragging.current, centerY(event.clientY));
              if (ready) {
                onBegin();
              }
            }}
            onPointerMove={(event) => {
              if (!dragging.current) {
                return;
              }
              onPaddle(dragging.current, centerY(event.clientY));
            }}
            onPointerUp={() => {
              dragging.current = null;
            }}
            onPointerCancel={() => {
              dragging.current = null;
            }}
          />
          {notice && !finished ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/55 px-4">
              <p className="text-center font-serif text-2xl text-cream">{notice}</p>
            </div>
          ) : null}
          {ready ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/45">
              <button type="button" onClick={onBegin} className={buttonClass}>
                Begin
              </button>
            </div>
          ) : null}
          {finished ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-4">
              <ParlorPanel className="w-full max-w-xs text-center">
                <p className="text-xs tracking-[0.16em] text-ink-muted">The table is closed</p>
                <p className="mt-4 font-serif text-3xl text-cream">
                  {view.winner === "west"
                    ? "West holds the table."
                    : "East holds the table."}
                </p>
                <p className="mt-4 text-sm tracking-[0.14em] text-ink-muted">
                  <span className="text-cream">West {view.west}</span>
                  <span className="mx-2 text-gold">·</span>
                  <span className="text-gold">East {view.east}</span>
                </p>
                <button type="button" onClick={onAgain} className={buttonClass}>
                  Play again
                </button>
              </ParlorPanel>
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-center text-xs tracking-[0.14em] text-ink-muted">{hint}</p>
    </div>
  );
}
