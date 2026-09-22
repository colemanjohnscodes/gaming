"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParlorPanel } from "@/components/ParlorPanel";
import {
  abandonChart,
  claimChartOnce,
  fireChart,
  lockChart,
  openChart,
  resumeChart,
  type ChartShot,
  type ChartView,
} from "@/lib/chart";
import { createClient } from "@/lib/supabase/client";
import { WAGER_ALPHABET, isUuid, normalizeWagerCode } from "@/lib/wager-code";
import {
  COLUMNS,
  SHIPS,
  canPlace,
  cellsOf,
  fleetValid,
  isShipName,
  parseFleet,
  squareName,
  titleOf,
  type Ship,
  type ShipDir,
  type ShipName,
} from "./fleet";

const buttonClass =
  "border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

const fieldClass =
  "mt-2 w-full border border-gold/80 bg-background px-3 py-2 text-center font-serif text-2xl tracking-[0.28em] text-cream uppercase outline-none focus:border-gold";

const quietClass =
  "text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

type SeatRecord = { v: 1; token: string; seat: "host" | "guest" };

function seatKey(code: string): string {
  return `parlor-chart:${code}`;
}

function rememberChart(code: string, token: string, seat: "host" | "guest"): void {
  const record: SeatRecord = { v: 1, token, seat };
  sessionStorage.setItem(seatKey(code), JSON.stringify(record));
}

function recallChart(code: string): SeatRecord | null {
  const raw = sessionStorage.getItem(seatKey(code));
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (!("v" in parsed) || parsed.v !== 1) {
      return null;
    }
    if (!("token" in parsed) || !isUuid(parsed.token)) {
      return null;
    }
    if (!("seat" in parsed) || (parsed.seat !== "host" && parsed.seat !== "guest")) {
      return null;
    }
    return { v: 1, token: parsed.token, seat: parsed.seat };
  } catch {
    return null;
  }
}

function forgetChart(code: string): void {
  sessionStorage.removeItem(seatKey(code));
  sessionStorage.removeItem(`parlor-chart-draft:${code}`);
}

function loadDraft(code: string): Ship[] {
  const raw = sessionStorage.getItem(`parlor-chart-draft:${code}`);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseFleet(parsed) ?? (Array.isArray(parsed) ? partialFleet(parsed) : []);
  } catch {
    return [];
  }
}

function partialFleet(value: unknown[]): Ship[] {
  const fleet: Ship[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    if (!("name" in item) || !("x" in item) || !("y" in item) || !("dir" in item)) {
      continue;
    }
    const { name, x, y, dir } = item;
    if (!isShipName(name) || (dir !== "across" && dir !== "down")) {
      continue;
    }
    if (typeof x !== "number" || typeof y !== "number") {
      continue;
    }
    const laid: ShipDir = dir === "down" ? "down" : "across";
    const ship: Ship = { name, x, y, dir: laid };
    if (canPlace(fleet, ship)) {
      fleet.push(ship);
    }
  }
  return fleet;
}

export function ChartGame({
  room,
  invalidRoom,
}: {
  room: string | null;
  invalidRoom: boolean;
}) {
  if (room) {
    return <ChartTable code={room} />;
  }
  return <ChartLobby invalidRoom={invalidRoom} />;
}

function ChartLobby({ invalidRoom }: { invalidRoom: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = error || (invalidRoom ? "That code is not a table." : "");

  async function openTable() {
    setBusy(true);
    setError("");
    const opened = await openChart();
    if (!opened.ok) {
      setError(opened.message);
      setBusy(false);
      return;
    }
    rememberChart(opened.code, opened.hostToken, "host");
    router.push(`/play/chart?room=${opened.code}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="font-serif text-3xl text-cream">The Chart</h1>
      <ParlorPanel>
        <p className="font-serif text-2xl text-cream">Two sealed charts</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Place the fleet, then lock it. After that the book answers every call.
          Hit or miss is not a matter of honor.
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
            router.push(`/play/chart?room=${next}`);
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

function ChartTable({ code }: { code: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<ChartView | null>(null);
  const [fleet, setFleet] = useState<Ship[]>([]);
  const [selected, setSelected] = useState<ShipName>("flagship");
  const [dir, setDir] = useState<ShipDir>("across");
  const [note, setNote] = useState("Place the fleet, then seal the chart.");
  const [closed, setClosed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [booted, setBooted] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const applyView = useCallback((next: ChartView) => {
    setView(next);
    if (next.yourFleet) {
      setFleet(next.yourFleet);
    }
    if (next.status === "abandoned" || next.status === "closed") {
      setClosed("This table is closed.");
    }
  }, []);

  const refresh = useCallback(
    async (current = token) => {
      if (!current) {
        return;
      }
      const resumed = await resumeChart(code, current);
      if (!resumed.ok) {
        setClosed(resumed.message);
        return;
      }
      applyView(resumed.view);
    },
    [applyView, code, token],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = recallChart(code);
      let nextToken = saved?.token ?? null;
      if (saved) {
        const resumed = await resumeChart(code, saved.token);
        if (cancelled) {
          return;
        }
        if (!resumed.ok) {
          forgetChart(code);
          nextToken = null;
        } else {
          setToken(saved.token);
          applyView(resumed.view);
          if (!resumed.view.youLocked) {
            setFleet(loadDraft(code));
          }
          setBooted(true);
          return;
        }
      }
      const claim = await claimChartOnce(code);
      if (cancelled) {
        return;
      }
      if (!claim.ok) {
        setClosed(claim.message);
        return;
      }
      rememberChart(code, claim.guestToken, "guest");
      setToken(claim.guestToken);
      setFleet(loadDraft(code));
      setBooted(true);
      if (!nextToken) {
        const resumed = await resumeChart(code, claim.guestToken);
        if (!cancelled && resumed.ok) {
          applyView(resumed.view);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyView, code]);

  useEffect(() => {
    if (!token || closed) {
      return;
    }
    const timer = window.setInterval(() => {
      void refresh(token);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [closed, refresh, token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const supabase = createClient();
    const channel = supabase.channel(`chart:${code}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "moved" }, () => {
        void refresh(token);
      })
      .subscribe();
    return () => {
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [code, refresh, token]);

  useEffect(() => {
    if (!booted || view?.youLocked) {
      return;
    }
    sessionStorage.setItem(`parlor-chart-draft:${code}`, JSON.stringify(fleet));
  }, [booted, code, fleet, view?.youLocked]);

  function ping() {
    void channelRef.current?.send({ type: "broadcast", event: "moved", payload: {} });
  }

  function placeAt(x: number, y: number) {
    if (view?.youLocked) {
      return;
    }
    const ship: Ship = { name: selected, x, y, dir };
    if (!canPlace(fleet, ship)) {
      setNote("That ship does not fit there.");
      return;
    }
    setFleet((current) => [...current.filter((item) => item.name !== selected), ship]);
    setNote("Place the fleet, then seal the chart.");
  }

  async function seal() {
    if (!token || !fleetValid(fleet)) {
      setNote("Place every ship before the chart is sealed.");
      return;
    }
    setBusy(true);
    const locked = await lockChart(code, token, fleet);
    setBusy(false);
    if (!locked.ok) {
      setNote(locked.message);
      return;
    }
    setNote(locked.both ? "Both charts are sealed." : "Your chart is sealed.");
    ping();
    await refresh(token);
  }

  async function callSquare(x: number, y: number) {
    if (!token || view?.turn !== "you" || view.status !== "playing" || busy) {
      return;
    }
    if (view.shots.some((shot) => shot.by === "you" && shot.x === x && shot.y === y)) {
      return;
    }
    setBusy(true);
    const fired = await fireChart(code, token, x, y);
    setBusy(false);
    if (!fired.ok) {
      setNote(fired.message);
      return;
    }
    const name = fired.ship && isShipName(fired.ship) ? titleOf(fired.ship) : "A ship";
    setNote(
      fired.result === "sunk"
        ? `The ${name.toLowerCase()} is lost.`
        : fired.result === "hit"
          ? `${squareName(x, y)}. Hit.`
          : `${squareName(x, y)}. Miss.`,
    );
    ping();
    await refresh(token);
  }

  async function leave() {
    if (token) {
      ping();
      await abandonChart(code, token);
    }
    forgetChart(code);
    router.push("/play/chart");
  }

  if (closed) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <ParlorPanel className="text-center">
          <h1 className="font-serif text-3xl text-cream">The Chart</h1>
          <p className="mt-4 text-sm text-ink-muted">{closed}</p>
          <Link href="/play/chart" className={`${buttonClass} mt-6 inline-block`}>
            Another table
          </Link>
        </ParlorPanel>
      </div>
    );
  }

  if (!token || !view) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <ParlorPanel>
          <h1 className="font-serif text-3xl text-cream">The Chart</h1>
          <p className="mt-4 text-sm text-ink-muted">Taking the chair…</p>
        </ParlorPanel>
      </div>
    );
  }

  const sealed = view.youLocked;
  const playing = view.status === "playing" || view.status === "finished";
  const yours = sealed && view.yourFleet ? view.yourFleet : fleet;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl text-cream">The Chart</h1>
        <p className="text-xs tracking-[0.16em] text-gold">{code}</p>
      </div>
      {view.seat === "host" && view.status === "open" ? (
        <ParlorPanel className="text-center">
          <p className="text-xs tracking-[0.16em] text-ink-muted">Send this code</p>
          <p className="mt-3 font-serif text-4xl tracking-[0.28em] text-gold">{code}</p>
          <button
            type="button"
            className={`${buttonClass} mt-6`}
            onClick={() => {
              void navigator.clipboard
                .writeText(`${window.location.origin}/play/chart?room=${code}`)
                .then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => setCopied(false));
            }}
          >
            {copied ? "Copied." : "Copy the link"}
          </button>
        </ParlorPanel>
      ) : null}
      <p className="text-sm text-ink-muted" aria-live="polite">
        {playing
          ? view.status === "finished"
            ? view.winner === "you"
              ? "Your chart holds."
              : "Their chart holds."
            : view.turn === "you"
              ? "Your call."
              : "Their call."
          : sealed
            ? view.opponentLocked
              ? "Both charts are sealed."
              : "Your chart is sealed. Theirs is not."
            : note}
        {playing && view.shots.length > 0 ? ` ${callLine(view.shots[view.shots.length - 1])}` : ""}
      </p>
      {playing ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <Waters
            label="Their waters"
            ships={null}
            shots={view.shots.filter((shot) => shot.by === "you")}
            onCell={(x, y) => void callSquare(x, y)}
            disabled={view.turn !== "you" || view.status !== "playing" || busy}
          />
          <Waters
            label="Your chart"
            ships={yours}
            shots={view.shots.filter((shot) => shot.by === "them")}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Waters
            label="Your chart"
            ships={yours}
            shots={[]}
            selected={sealed ? null : selected}
            onCell={sealed ? undefined : placeAt}
          />
          {sealed ? null : (
            <div>
              <div className="flex flex-col gap-2">
                {SHIPS.map((ship) => {
                  const placed = fleet.some((item) => item.name === ship.name);
                  return (
                    <button
                      key={ship.name}
                      type="button"
                      onClick={() => setSelected(ship.name)}
                      className={`border px-3 py-2 text-left text-sm ${
                        selected === ship.name
                          ? "border-gold text-gold"
                          : "border-gold/40 text-cream"
                      }`}
                    >
                      {ship.title}
                      <span className="ml-2 text-ink-muted">
                        {ship.size}
                        {placed ? " · placed" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={`${buttonClass} mt-4`}
                onClick={() => setDir((current) => (current === "across" ? "down" : "across"))}
              >
                {dir === "across" ? "Laid across" : "Laid down"}
              </button>
              <button
                type="button"
                className={`${buttonClass} mt-3`}
                disabled={!fleetValid(fleet) || busy}
                onClick={() => void seal()}
              >
                Seal the chart
              </button>
            </div>
          )}
        </div>
      )}
      {playing ? <CallList shots={view.shots} /> : null}
      <button type="button" onClick={() => void leave()} className={quietClass}>
        Leave the table
      </button>
    </div>
  );
}

function Waters({
  label,
  ships,
  shots,
  selected,
  onCell,
  disabled,
}: {
  label: string;
  ships: Ship[] | null;
  shots: ChartShot[];
  selected?: ShipName | null;
  onCell?: (x: number, y: number) => void;
  disabled?: boolean;
}) {
  const shipCells = new Set<string>();
  const selectedCells = new Set<string>();
  if (ships) {
    for (const ship of ships) {
      for (const cell of cellsOf(ship)) {
        shipCells.add(`${cell.x},${cell.y}`);
        if (ship.name === selected) {
          selectedCells.add(`${cell.x},${cell.y}`);
        }
      }
    }
  }
  const marks = new Map<string, ChartShot>();
  for (const shot of shots) {
    marks.set(`${shot.x},${shot.y}`, shot);
    if (shot.cells) {
      for (const cell of shot.cells) {
        marks.set(`${cell.x},${cell.y}`, shot);
      }
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs tracking-[0.16em] text-ink-muted">{label}</p>
      <div className="grid grid-cols-[1.4rem_repeat(10,minmax(0,1fr))] gap-px">
        <span />
        {COLUMNS.split("").map((letter) => (
          <span key={letter} className="pb-1 text-center text-[10px] text-ink-muted">
            {letter}
          </span>
        ))}
        {Array.from({ length: 10 }, (_, y) => (
          <Row
            key={y}
            y={y}
            shipCells={shipCells}
            selectedCells={selectedCells}
            marks={marks}
            onCell={onCell}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  y,
  shipCells,
  selectedCells,
  marks,
  onCell,
  disabled,
}: {
  y: number;
  shipCells: Set<string>;
  selectedCells: Set<string>;
  marks: Map<string, ChartShot>;
  onCell?: (x: number, y: number) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <span className="flex items-center justify-center text-[10px] text-ink-muted">{y + 1}</span>
      {Array.from({ length: 10 }, (_, x) => {
        const key = `${x},${y}`;
        const mark = marks.get(key);
        const ship = shipCells.has(key);
        const chosen = selectedCells.has(key);
        const hit = mark?.result === "hit" || mark?.result === "sunk";
        const miss = mark?.result === "miss";
        const className = [
          "aspect-square border text-[10px]",
          hit
            ? "border-oxblood bg-oxblood text-cream"
            : chosen
              ? "border-gold bg-gold/30"
              : ship
                ? "border-gold/70 bg-cream/15"
                : "border-gold/25 bg-background",
        ].join(" ");
        if (!onCell) {
          return (
            <span key={key} className={`${className} flex items-center justify-center text-ink-muted`}>
              {miss ? "·" : ""}
            </span>
          );
        }
        return (
          <button
            key={key}
            type="button"
            aria-label={squareName(x, y)}
            disabled={disabled}
            className={className}
            onClick={() => onCell(x, y)}
          >
            {miss ? "·" : ""}
          </button>
        );
      })}
    </>
  );
}

function callLine(shot: ChartShot): string {
  const who = shot.by === "you" ? "You" : "They";
  const name = shot.ship && isShipName(shot.ship) ? titleOf(shot.ship).toLowerCase() : null;
  const result =
    shot.result === "sunk" && name
      ? `the ${name} is lost`
      : shot.result === "hit"
        ? "hit"
        : "miss";
  return `${who} called ${squareName(shot.x, shot.y)}. ${result}.`;
}

function CallList({ shots }: { shots: ChartShot[] }) {
  const recent = shots.slice(-6).reverse();
  if (recent.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-1 text-sm text-ink-muted">
      {recent.map((shot) => {
        return (
          <li key={`${shot.by}-${shot.x}-${shot.y}`}>
            {callLine(shot)}
          </li>
        );
      })}
    </ul>
  );
}
