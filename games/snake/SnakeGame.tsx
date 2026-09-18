"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ParlorPanel } from "@/components/ParlorPanel";
import { loadPendingName } from "@/lib/pending-name";
import {
  clearPendingScore,
  loadPendingScore,
  savePendingScore,
} from "@/lib/pending-score";
import { recordParlorScore, type ScoreInput } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";
import { GRID_SIZE } from "./constants";
import { createGame, tick, turn } from "./engine";
import { dirFromKey, dirFromSwipe, isPauseKey } from "./input";
import { renderBoard } from "./render";
import type { Dir, GameState } from "./types";

type View = {
  score: number;
  status: GameState["status"];
  paused: boolean;
};

type LedgerNote = "idle" | "saving" | "recorded" | "error";

const MIN_CELL = 8;

function fitCell(width: number, maxHeight: number): number {
  const bound = Math.min(width, maxHeight);
  return Math.max(MIN_CELL, Math.floor(bound / GRID_SIZE));
}

function snapshot(state: GameState, paused: boolean): View {
  return { score: state.score, status: state.status, paused };
}

export function SnakeGame({ signedIn }: { signedIn: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dpadRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const stateRef = useRef<GameState>(createGame());
  const pausedRef = useRef(false);
  const cellRef = useRef(MIN_CELL);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const deathHandledRef = useRef(false);
  const [cell, setCell] = useState(MIN_CELL);
  const [view, setView] = useState<View>({
    score: 0,
    status: "running",
    paused: false,
  });
  const [ledgerNote, setLedgerNote] = useState<LedgerNote>("idle");
  const [ledgerReason, setLedgerReason] = useState("");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    renderBoard(ctx, stateRef.current, cellRef.current);
  }, []);

  const publish = useCallback(() => {
    setView(snapshot(stateRef.current, pausedRef.current));
  }, []);

  const applyTurn = useCallback(
    (dir: Dir) => {
      const next = turn(stateRef.current, dir);
      stateRef.current = next;
      if (pausedRef.current && next.status === "running") {
        pausedRef.current = false;
        publish();
      }
    },
    [publish],
  );

  const restart = useCallback(() => {
    stateRef.current = createGame();
    pausedRef.current = false;
    deathHandledRef.current = false;
    setLedgerNote("idle");
    setLedgerReason("");
    publish();
    canvasRef.current?.focus();
  }, [publish]);

  const submitLedger = useCallback(async (input: ScoreInput) => {
    setLedgerNote("saving");
    setLedgerReason("");
    try {
      const supabase = createClient();
      const result = await recordParlorScore(supabase, input, {
        displayName: loadPendingName() ?? undefined,
      });
      if (result.ok) {
        clearPendingScore();
        setLedgerNote("recorded");
        return;
      }
      setLedgerNote("error");
      setLedgerReason(result.reason);
    } catch {
      setLedgerNote("error");
      setLedgerReason("The ledger would not take the line.");
    }
  }, []);

  const togglePause = useCallback(() => {
    if (stateRef.current.status === "dead") {
      return;
    }
    pausedRef.current = !pausedRef.current;
    publish();
  }, [publish]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }

    const measure = () => {
      const width = wrap.clientWidth;
      const dpadHeight = dpadRef.current?.offsetHeight ?? 0;
      const hintHeight = hintRef.current?.offsetHeight ?? 0;
      const footerHeight =
        document.querySelector("footer")?.getBoundingClientRect().height ?? 56;
      const boardTop = wrap.getBoundingClientRect().top;
      const room =
        window.innerHeight -
        boardTop -
        dpadHeight -
        hintHeight -
        footerHeight -
        16;
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
    const pending = loadPendingScore();
    if (!pending) {
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        return;
      }
      void submitLedger(pending);
    });
  }, [submitLedger]);

  useEffect(() => {
    if (view.status !== "dead") {
      deathHandledRef.current = false;
      return;
    }
    if (deathHandledRef.current) {
      return;
    }
    deathHandledRef.current = true;
    const state = stateRef.current;
    const durationMs = Math.max(
      0,
      Math.round((state.endedAt ?? Date.now()) - state.startedAt),
    );
    const pending: ScoreInput = {
      game: "snake",
      score: state.score,
      duration_ms: durationMs,
      grid_size: state.gridSize,
    };
    savePendingScore(pending);
    if (signedIn) {
      void submitLedger(pending);
    }
  }, [view.status, signedIn, submitLedger]);

  useEffect(() => {
    canvasRef.current?.focus();
    let frame = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      const state = stateRef.current;
      if (state.status === "running" && !pausedRef.current) {
        acc += dt;
        let current = state;
        let stepped = false;
        while (acc >= current.tickMs && current.status === "running") {
          current = tick(current);
          acc -= current.tickMs;
          stepped = true;
        }
        if (current.status === "dead") {
          acc = 0;
        }
        if (stepped) {
          stateRef.current = current;
          if (
            current.score !== state.score ||
            current.status !== state.status
          ) {
            publish();
          }
        }
      }
      draw();
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [draw, publish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPauseKey(event.key)) {
        event.preventDefault();
        togglePause();
        return;
      }
      const dir = dirFromKey(event.key);
      if (!dir) {
        return;
      }
      event.preventDefault();
      applyTurn(dir);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyTurn, togglePause]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start) {
      return;
    }
    const dir = dirFromSwipe(
      event.clientX - start.x,
      event.clientY - start.y,
    );
    if (dir) {
      applyTurn(dir);
      return;
    }
    togglePause();
  };

  const boardPx = cell * GRID_SIZE;
  const showDeath = view.status === "dead";
  const showPause = view.paused && !showDeath;

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-5">
      <div className="flex w-full items-baseline justify-between gap-4">
        <h1 className="font-serif text-2xl text-cream sm:text-3xl">The Serpent</h1>
        <p className="text-sm tracking-[0.16em] text-gold" aria-live="polite">
          {view.score}
        </p>
      </div>
      {ledgerNote === "recorded" && view.status !== "dead" ? (
        <p className="text-sm tracking-[0.14em] text-gold">Recorded.</p>
      ) : null}

      <div ref={wrapRef} className="relative w-full max-w-xl">
        <div
          className="relative mx-auto border border-gold/80 bg-panel"
          style={{ width: boardPx, height: boardPx }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label="The Serpent"
            className="block touch-none outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-gold"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointerRef.current = null;
            }}
          />

          {showPause ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/55">
              <p className="font-serif text-2xl text-cream">Held.</p>
            </div>
          ) : null}

          {showDeath ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-background/70 p-3">
              <ParlorPanel className="w-full max-w-xs text-center">
                <p className="font-serif text-2xl text-cream">The house holds.</p>
                <p className="mt-3 text-2xl tracking-[0.12em] text-gold">
                  {view.score}
                </p>
                <p className="mt-2 text-xs tracking-[0.16em] text-oxblood">
                  Withdrawn.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={restart}
                    className="border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
                  >
                    Another hand
                  </button>
                  <LedgerAction
                    signedIn={signedIn}
                    note={ledgerNote}
                    reason={ledgerReason}
                    onSave={() => {
                      const pending = loadPendingScore();
                      if (pending) {
                        void submitLedger(pending);
                      }
                    }}
                  />
                </div>
              </ParlorPanel>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={dpadRef} className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        <DPad onTurn={applyTurn} />
      </div>

      <p
        ref={hintRef}
        className="shrink-0 text-center text-xs tracking-[0.14em] text-ink-muted"
      >
        Arrows or WASD. Space holds the table.
      </p>
    </div>
  );
}

function LedgerAction({
  signedIn,
  note,
  reason,
  onSave,
}: {
  signedIn: boolean;
  note: LedgerNote;
  reason: string;
  onSave: () => void;
}) {
  if (note === "recorded") {
    return (
      <p className="text-sm tracking-[0.14em] text-gold">Recorded.</p>
    );
  }
  if (note === "saving") {
    return (
      <p className="text-sm tracking-[0.14em] text-ink-muted">
        The book is open…
      </p>
    );
  }
  if (signedIn) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={onSave}
          className="text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          Enter the ledger
        </button>
        {note === "error" ? (
          <p className="text-xs text-oxblood">{reason}</p>
        ) : null}
      </div>
    );
  }
  return (
    <Link
      href="/login?next=/play/snake"
      className="text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
    >
      Enter the ledger
    </Link>
  );
}

function DPad({ onTurn }: { onTurn: (dir: Dir) => void }) {
  return (
    <div
      className="grid grid-cols-3 grid-rows-3 gap-1.5"
      aria-label="Direction"
    >
      <span />
      <PadButton label="Up" onPress={() => onTurn("up")}>
        <Chevron dir="up" />
      </PadButton>
      <span />
      <PadButton label="Left" onPress={() => onTurn("left")}>
        <Chevron dir="left" />
      </PadButton>
      <span />
      <PadButton label="Right" onPress={() => onTurn("right")}>
        <Chevron dir="right" />
      </PadButton>
      <span />
      <PadButton label="Down" onPress={() => onTurn("down")}>
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
    dir === "up"
      ? "0"
      : dir === "right"
        ? "90"
        : dir === "down"
          ? "180"
          : "270";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M7 3 L12 10 H2 Z"
        fill="currentColor"
      />
    </svg>
  );
}
