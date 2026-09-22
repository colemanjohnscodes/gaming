"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ParlorPanel } from "@/components/ParlorPanel";
import { openWager } from "@/lib/wager";
import { WAGER_ALPHABET, normalizeWagerCode, rememberSeat } from "@/lib/wager-code";
import {
  beginVolley,
  createVolley,
  placePaddle,
  type VolleyState,
} from "./engine";
import { useVolleyLoop } from "./loop";
import { OnlineVolley } from "./OnlineVolley";
import { VolleyTable, type VolleyView } from "./VolleyTable";

const buttonClass =
  "border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

const fieldClass =
  "mt-2 w-full border border-gold/80 bg-background px-3 py-2 text-center font-serif text-2xl tracking-[0.28em] text-cream uppercase outline-none focus:border-gold";

const quietClass =
  "text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

export function VolleyGame({
  room,
  invalidRoom,
}: {
  room: string | null;
  invalidRoom: boolean;
}) {
  const [together, setTogether] = useState(false);
  if (room) {
    return <OnlineVolley code={room} />;
  }
  if (together) {
    return <LocalVolley onLeave={() => setTogether(false)} />;
  }
  return <VolleyLobby invalidRoom={invalidRoom} onTogether={() => setTogether(true)} />;
}

function VolleyLobby({
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
  const shown = error || (invalidRoom ? "That code is not a table." : "");

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
    router.push(`/play/volley?room=${opened.code}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="font-serif text-3xl text-cream">The Volley</h1>
      <ParlorPanel>
        <p className="font-serif text-2xl text-cream">Two paddles, one table</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          A gold ball. First to 7. West takes W and S. East takes the arrows.
        </p>
        <button type="button" onClick={onTogether} className={`${buttonClass} mt-6`}>
          Sit together
        </button>
      </ParlorPanel>
      <ParlorPanel>
        <p className="font-serif text-2xl text-cream">Across two houses</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Open a table and send the code. Each house keeps its own paddle.
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
            router.push(`/play/volley?room=${next}`);
          }}
        >
          <label className="block">
            <span className="text-xs tracking-[0.16em] text-ink-muted">Or take a seat</span>
            <input
              value={draft}
              onChange={(event) => {
                let code = "";
                for (const char of event.target.value.toUpperCase()) {
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
        {shown ? (
          <p className="mt-4 text-sm text-cream" role="status">
            {shown}
          </p>
        ) : null}
      </ParlorPanel>
    </div>
  );
}

function viewFrom(state: VolleyState): VolleyView {
  return {
    west: state.westScore,
    east: state.eastScore,
    status: state.status,
    winner: state.winner,
  };
}

function LocalVolley({ onLeave }: { onLeave: () => void }) {
  const stateRef = useRef<VolleyState>(createVolley());
  const held = useRef(new Set<string>());
  const [view, setView] = useState<VolleyView>(viewFrom(createVolley()));

  const publish = useCallback(() => {
    setView(viewFrom(stateRef.current));
  }, []);

  useVolleyLoop(stateRef, held, "both", publish, true);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === " " && stateRef.current.status === "ready") {
        event.preventDefault();
        stateRef.current = beginVolley(stateRef.current);
        publish();
        return;
      }
      held.current.add(event.key);
      if (event.key.startsWith("Arrow") || event.key === " ") {
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      held.current.delete(event.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [publish]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <VolleyTable
        stateRef={stateRef}
        view={view}
        control="both"
        hint="W S west · arrows east. Drag a paddle."
        notice={null}
        onPaddle={(side, centerY) => {
          stateRef.current = placePaddle(stateRef.current, side, centerY);
        }}
        onBegin={() => {
          if (stateRef.current.status === "ready") {
            stateRef.current = beginVolley(stateRef.current);
            publish();
          }
        }}
        onAgain={() => {
          stateRef.current = createVolley();
          publish();
        }}
      />
      <button type="button" onClick={onLeave} className={quietClass}>
        Leave the table
      </button>
    </div>
  );
}
