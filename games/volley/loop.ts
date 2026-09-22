"use client";

import { useEffect } from "react";
import {
  placePaddle,
  serveVolley,
  stepVolley,
  type Side,
  type VolleyState,
} from "./engine";

const PADDLE_SPEED = 640;

function heldKey(held: Set<string>, ...keys: string[]): boolean {
  return keys.some((key) => held.has(key));
}

export function useVolleyLoop(
  stateRef: { current: VolleyState },
  held: { current: Set<string> },
  control: "both" | Side,
  publish: () => void,
  simulate: boolean,
) {
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let wait = 0;
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      let state = stateRef.current;
      const speed = (PADDLE_SPEED * dt) / 1000;
      const move = (side: Side, up: boolean, down: boolean) => {
        if (!up && !down) {
          return;
        }
        const next = state[side] + (down ? speed : 0) - (up ? speed : 0);
        state = placePaddle(state, side, next);
      };
      if (control !== "east") {
        move(
          "west",
          heldKey(held.current, "w", "W") ||
            (control === "west" && heldKey(held.current, "ArrowUp")),
          heldKey(held.current, "s", "S") ||
            (control === "west" && heldKey(held.current, "ArrowDown")),
        );
      }
      if (control !== "west") {
        move(
          "east",
          heldKey(held.current, "ArrowUp") ||
            (control === "east" && heldKey(held.current, "w", "W")),
          heldKey(held.current, "ArrowDown") ||
            (control === "east" && heldKey(held.current, "s", "S")),
        );
      }
      if (simulate && state.status === "scored") {
        wait += dt;
        if (wait >= 700) {
          state = serveVolley(state);
          wait = 0;
          publish();
        }
      } else if (simulate) {
        wait = 0;
      }
      if (simulate && state.status === "running") {
        const beforeWest = state.westScore;
        const beforeEast = state.eastScore;
        const beforeStatus = state.status;
        state = stepVolley(state, dt);
        if (
          state.westScore !== beforeWest ||
          state.eastScore !== beforeEast ||
          state.status !== beforeStatus
        ) {
          publish();
        }
      }
      stateRef.current = state;
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [control, held, publish, simulate, stateRef]);
}
