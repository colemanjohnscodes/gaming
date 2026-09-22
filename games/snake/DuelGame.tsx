"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ParlorPanel } from "@/components/ParlorPanel";
import { openWager } from "@/lib/wager";
import { WAGER_ALPHABET, normalizeWagerCode, rememberSeat } from "@/lib/wager-code";
import { DuelTable, type DuelView } from "./DuelTable";
import { createDuel, tickDuel, turnDuel, type DuelPlayerId, type DuelState } from "./duel";
import { dirFromArrows, dirFromWasd, isPauseKey } from "./input";
import { OnlineWager } from "./OnlineWager";
import type { Dir } from "./types";

const buttonClass =
  "border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

const fieldClass =
  "mt-2 w-full border border-gold/80 bg-background px-3 py-2 text-center font-serif text-2xl tracking-[0.28em] text-cream uppercase outline-none focus:border-gold";

const quietClass =
  "text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

export function DuelGame({
  room,
  invalidRoom,
}: {
  room: string | null;
  invalidRoom: boolean;
}) {
  const [together, setTogether] = useState(false);

  if (room) {
    return <OnlineWager code={room} />;
  }
  if (together) {
    return <LocalDuel onLeave={() => setTogether(false)} />;
  }
  return (
    <WagerLobby
      invalidRoom={invalidRoom}
      onTogether={() => setTogether(true)}
    />
  );
}

function WagerLobby({
  invalidRoom,
  onTogether,
}: {
  invalidRoom: boolean;
  onTogether: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shownError = error || (invalidRoom ? "That code is not a table." : "");

  async function openTable() {
    setBusy(true);
    setError("");
    const opened = await openWager();
    if (!opened.ok) {
      setError(opened.message);
      setBusy(false);
      return;
    }
    rememberSeat(opened.code, opened.hostToken, "host");
    router.push(`/play/duel?room=${opened.code}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="font-serif text-3xl text-cream">A Private Wager</h1>
      <ParlorPanel>
        <p className="font-serif text-2xl text-cream">Two chairs, one table</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Last alive, or first to 10. One keyboard. West takes WASD. East takes the arrows.
        </p>
        <button type="button" onClick={onTogether} className={`${buttonClass} mt-6`}>
          Sit together
        </button>
      </ParlorPanel>
      <ParlorPanel>
        <p className="font-serif text-2xl text-cream">Across two houses</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Open a table and send the code. The other player sits at their own screen.
          No name is required. The ledger is not involved.
        </p>
        <button
          type="button"
          onClick={() => void openTable()}
          disabled={busy}
          className={`${buttonClass} mt-6`}
        >
          {busy ? "Opening…" : "Open a table"}
        </button>
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            const next = normalizeWagerCode(draft);
            if (!next) {
              setError("That code is not a table.");
              return;
            }
            router.push(`/play/duel?room=${next}`);
          }}
        >
          <label className="block">
            <span className="text-xs tracking-[0.16em] text-ink-muted">Or take a seat</span>
            <input
              value={draft}
              onChange={(event) => {
                const next = event.target.value.toUpperCase();
                let code = "";
                for (const char of next) {
                  if (WAGER_ALPHABET.includes(char) && code.length < 4) {
                    code += char;
                  }
                }
                setDraft(code);
              }}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Table code"
              className={fieldClass}
            />
          </label>
          <button type="submit" disabled={draft.length !== 4} className={`${buttonClass} mt-4`}>
            Sit
          </button>
        </form>
        {shownError ? (
          <p className="mt-4 text-sm text-cream" role="status">
            {shownError}
          </p>
        ) : null}
      </ParlorPanel>
    </div>
  );
}

function LocalDuel({ onLeave }: { onLeave: () => void }) {
  const stateRef = useRef<DuelState>(createDuel());
  const pausedRef = useRef(false);
  const [view, setView] = useState<DuelView>({
    p1: 0,
    p2: 0,
    status: "running",
    winner: null,
    paused: false,
  });

  const publish = useCallback(() => {
    const state = stateRef.current;
    setView({
      p1: state.p1.score,
      p2: state.p2.score,
      status: state.status,
      winner: state.winner,
      paused: pausedRef.current,
    });
  }, []);

  const applyTurn = useCallback(
    (player: DuelPlayerId, dir: Dir) => {
      const next = turnDuel(stateRef.current, player, dir);
      stateRef.current = next;
      if (pausedRef.current && next.status === "running") {
        pausedRef.current = false;
        publish();
      }
    },
    [publish],
  );

  const restart = useCallback(() => {
    stateRef.current = createDuel();
    pausedRef.current = false;
    publish();
  }, [publish]);

  const togglePause = useCallback(() => {
    if (stateRef.current.status !== "running") {
      return;
    }
    pausedRef.current = !pausedRef.current;
    publish();
  }, [publish]);

  useEffect(() => {
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
          current = tickDuel(current);
          acc -= current.tickMs;
          stepped = true;
        }
        if (current.status === "finished") {
          acc = 0;
        }
        if (stepped) {
          stateRef.current = current;
          if (
            current.p1.score !== state.p1.score ||
            current.p2.score !== state.p2.score ||
            current.status !== state.status
          ) {
            publish();
          }
        }
      }
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [publish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPauseKey(event.key)) {
        event.preventDefault();
        togglePause();
        return;
      }
      const west = dirFromWasd(event.key);
      if (west) {
        event.preventDefault();
        applyTurn("p1", west);
        return;
      }
      const east = dirFromArrows(event.key);
      if (east) {
        event.preventDefault();
        applyTurn("p2", east);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyTurn, togglePause]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DuelTable
        stateRef={stateRef}
        view={view}
        control="both"
        hint="WASD west · arrows east. Space holds the table."
        notice={null}
        onTurn={applyTurn}
        onPause={togglePause}
        onRestart={restart}
      />
      <button type="button" onClick={onLeave} className={quietClass}>
        Leave the chairs
      </button>
    </div>
  );
}
