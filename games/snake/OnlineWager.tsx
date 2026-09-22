"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParlorPanel } from "@/components/ParlorPanel";
import { createClient } from "@/lib/supabase/client";
import { confirmGuest, markWager, resumeWager, claimWagerOnce } from "@/lib/wager";
import {
  duelFromWire,
  forgetSeat,
  parseWireState,
  readGuestToken,
  readTurn,
  recallSeat,
  rememberSeat,
  wagerChannel,
  wireFromDuel,
  type WagerSeat,
} from "@/lib/wager-code";
import { DuelTable, type DuelView } from "./DuelTable";
import { createDuel, tickDuel, turnDuel, type DuelState } from "./duel";
import { dirFromArrows, dirFromWasd, isPauseKey } from "./input";
import type { Dir } from "./types";

const buttonClass =
  "border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

const quietClass =
  "text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

function readSeats(value: unknown): Array<WagerSeat> {
  if (!value || typeof value !== "object") {
    return [];
  }
  const seats: Array<WagerSeat> = [];
  for (const entries of Object.values(value)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || !("seat" in entry)) {
        continue;
      }
      if (entry.seat === "host" || entry.seat === "guest") {
        seats.push(entry.seat);
      }
    }
  }
  return seats;
}

export function OnlineWager({ code }: { code: string }) {
  const router = useRouter();
  const stateRef = useRef<DuelState>(createDuel());
  const pausedRef = useRef(false);
  const roleRef = useRef<WagerSeat | null>(null);
  const tokenRef = useRef<string | null>(null);
  const guestTokenRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const startedRef = useRef(false);
  const welcomedRef = useRef(false);
  const awayRef = useRef(false);
  const pausedByAbsenceRef = useRef(false);
  const acceptingRef = useRef(false);
  const guestSeenRef = useRef(false);
  const finishedMarkedRef = useRef(false);
  const lastSeqRef = useRef(0);
  const seqRef = useRef(0);
  const hostGoneRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [role, setRole] = useState<WagerSeat | null>(null);
  const [detail, setDetail] = useState("Taking the chair…");
  const [closed, setClosed] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
    setNotice(awayRef.current ? "The other chair is empty." : null);
  }, []);

  const sendState = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || roleRef.current !== "host" || !startedRef.current) {
      return;
    }
    void channel.send({
      type: "broadcast",
      event: "state",
      payload: wireFromDuel(stateRef.current, pausedRef.current),
    });
  }, []);

  const beginHand = useCallback(() => {
    startedRef.current = true;
    finishedMarkedRef.current = false;
    stateRef.current = createDuel();
    pausedRef.current = false;
    pausedByAbsenceRef.current = false;
    awayRef.current = false;
    setStarted(true);
    const token = tokenRef.current;
    if (token) {
      void markWager(code, token, "playing");
    }
    publish();
    sendState();
  }, [code, publish, sendState]);

  const acceptGuest = useCallback(
    async (guestToken: string) => {
      const hostToken = tokenRef.current;
      if (!hostToken || roleRef.current !== "host") {
        return;
      }
      if (guestTokenRef.current === guestToken) {
        void channelRef.current?.send({
          type: "broadcast",
          event: "welcome",
          payload: {},
        });
        sendState();
        return;
      }
      if (guestTokenRef.current || acceptingRef.current) {
        return;
      }
      acceptingRef.current = true;
      const ok = await confirmGuest(code, hostToken, guestToken);
      acceptingRef.current = false;
      if (!ok || guestTokenRef.current) {
        return;
      }
      guestTokenRef.current = guestToken;
      if (!startedRef.current) {
        beginHand();
      }
      void channelRef.current?.send({
        type: "broadcast",
        event: "welcome",
        payload: {},
      });
      sendState();
    },
    [beginHand, code, sendState],
  );

  const turnHost = useCallback(
    (dir: Dir) => {
      if (!startedRef.current || awayRef.current || roleRef.current !== "host") {
        return;
      }
      const next = turnDuel(stateRef.current, "p1", dir);
      stateRef.current = next;
      if (pausedRef.current && next.status === "running") {
        pausedRef.current = false;
        pausedByAbsenceRef.current = false;
      }
      publish();
      sendState();
    },
    [publish, sendState],
  );

  const holdHost = useCallback(() => {
    if (!startedRef.current || awayRef.current || roleRef.current !== "host") {
      return;
    }
    if (stateRef.current.status !== "running") {
      return;
    }
    pausedRef.current = !pausedRef.current;
    pausedByAbsenceRef.current = false;
    publish();
    sendState();
  }, [publish, sendState]);

  const restartHost = useCallback(() => {
    if (roleRef.current !== "host" || !guestTokenRef.current) {
      return;
    }
    beginHand();
  }, [beginHand]);

  const applyGuestTurn = useCallback(
    (dir: Dir) => {
      if (!startedRef.current || awayRef.current) {
        return;
      }
      const next = turnDuel(stateRef.current, "p2", dir);
      stateRef.current = next;
      if (pausedRef.current && next.status === "running") {
        pausedRef.current = false;
        pausedByAbsenceRef.current = false;
      }
      publish();
      sendState();
    },
    [publish, sendState],
  );

  const markAway = useCallback(() => {
    if (awayRef.current || roleRef.current !== "host" || !startedRef.current) {
      return;
    }
    awayRef.current = true;
    if (!pausedRef.current) {
      pausedRef.current = true;
      pausedByAbsenceRef.current = true;
    }
    publish();
    sendState();
  }, [publish, sendState]);

  const clearAway = useCallback(() => {
    if (!awayRef.current) {
      return;
    }
    awayRef.current = false;
    if (pausedByAbsenceRef.current) {
      pausedRef.current = false;
      pausedByAbsenceRef.current = false;
    }
    publish();
    sendState();
  }, [publish, sendState]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = recallSeat(code);
      if (saved) {
        const resume = await resumeWager(code, saved.token);
        if (cancelled) {
          return;
        }
        if (!resume.ok) {
          forgetSeat(code);
        } else if (resume.status === "abandoned" || resume.status === "closed") {
          setClosed("This table is closed.");
          return;
        } else if (
          resume.seat === "host" &&
          (resume.status === "playing" || resume.status === "finished")
        ) {
          await markWager(code, saved.token, "abandoned");
          if (cancelled) {
            return;
          }
          forgetSeat(code);
          setClosed("This table closed when the window did.");
          return;
        } else {
          roleRef.current = resume.seat;
          tokenRef.current = saved.token;
          setRole(resume.seat);
          setDetail(
            resume.seat === "host"
              ? "The other chair is empty."
              : `West is setting the table at ${code}.`,
          );
          setReady(true);
          return;
        }
      }

      const claim = await claimWagerOnce(code);
      if (claim.ok) {
        rememberSeat(code, claim.guestToken, "guest");
      }
      if (cancelled) {
        return;
      }
      if (!claim.ok) {
        const recovered = recallSeat(code);
        if (recovered?.seat === "guest") {
          roleRef.current = "guest";
          tokenRef.current = recovered.token;
          setRole("guest");
          setDetail(`West is setting the table at ${code}.`);
          setReady(true);
          return;
        }
        setClosed(claim.message);
        return;
      }
      roleRef.current = "guest";
      tokenRef.current = claim.guestToken;
      setRole("guest");
      setDetail(`West is setting the table at ${code}.`);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!ready || !roleRef.current || !tokenRef.current) {
      return;
    }
    const supabase = createClient();
    const channel = supabase.channel(wagerChannel(code), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const endGuest = (message: string) => {
      if (roleRef.current !== "guest") {
        return;
      }
      setClosed(message);
    };

    channel
      .on("broadcast", { event: "hello" }, (message) => {
        const guestToken = readGuestToken(message.payload);
        if (!guestToken) {
          return;
        }
        void acceptGuest(guestToken);
      })
      .on("broadcast", { event: "turn" }, (message) => {
        if (roleRef.current !== "host") {
          return;
        }
        const turn = readTurn(message.payload);
        if (!turn || turn.guestToken !== guestTokenRef.current) {
          return;
        }
        if (turn.seq <= lastSeqRef.current) {
          return;
        }
        lastSeqRef.current = turn.seq;
        applyGuestTurn(turn.dir);
      })
      .on("broadcast", { event: "hold" }, (message) => {
        if (roleRef.current !== "host") {
          return;
        }
        if (readGuestToken(message.payload) !== guestTokenRef.current) {
          return;
        }
        holdHost();
      })
      .on("broadcast", { event: "again" }, (message) => {
        if (roleRef.current !== "host" || stateRef.current.status !== "finished") {
          return;
        }
        if (readGuestToken(message.payload) !== guestTokenRef.current) {
          return;
        }
        restartHost();
      })
      .on("broadcast", { event: "bye" }, (message) => {
        if (readGuestToken(message.payload) !== guestTokenRef.current) {
          return;
        }
        markAway();
      })
      .on("broadcast", { event: "state" }, (message) => {
        if (roleRef.current !== "guest") {
          return;
        }
        const wire = parseWireState(message.payload);
        if (!wire) {
          return;
        }
        stateRef.current = duelFromWire(wire);
        pausedRef.current = wire.held;
        welcomedRef.current = true;
        startedRef.current = true;
        setStarted(true);
        publish();
      })
      .on("broadcast", { event: "withdrawn" }, () => {
        endGuest("The host has withdrawn.");
      })
      .on("presence", { event: "sync" }, () => {
        const seats = readSeats(channel.presenceState());
        if (roleRef.current === "host") {
          if (seats.includes("guest")) {
            guestSeenRef.current = true;
            clearAway();
          } else if (guestSeenRef.current) {
            markAway();
          }
          return;
        }
        if (!welcomedRef.current) {
          return;
        }
        if (seats.includes("host")) {
          if (hostGoneRef.current !== null) {
            window.clearTimeout(hostGoneRef.current);
            hostGoneRef.current = null;
          }
          return;
        }
        if (hostGoneRef.current === null) {
          hostGoneRef.current = window.setTimeout(() => {
            endGuest("The host has withdrawn.");
          }, 2500);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const seated = roleRef.current;
          if (!seated) {
            return;
          }
          void channel.track({ seat: seated });
          if (seated === "guest" && tokenRef.current) {
            void channel.send({
              type: "broadcast",
              event: "hello",
              payload: { guestToken: tokenRef.current },
            });
          }
          return;
        }
        if (status === "CHANNEL_ERROR" && !startedRef.current) {
          setClosed("The table did not answer.");
        }
      });

    const helloTimer = window.setInterval(() => {
      if (roleRef.current !== "guest" || welcomedRef.current || !tokenRef.current) {
        return;
      }
      void channel.send({
        type: "broadcast",
        event: "hello",
        payload: { guestToken: tokenRef.current },
      });
    }, 1000);

    const onHide = (event: PageTransitionEvent) => {
      if (event.persisted || roleRef.current !== "host" || !tokenRef.current) {
        return;
      }
      void markWager(code, tokenRef.current, "abandoned");
      void channel.send({ type: "broadcast", event: "withdrawn", payload: {} });
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      window.removeEventListener("pagehide", onHide);
      window.clearInterval(helloTimer);
      if (hostGoneRef.current !== null) {
        window.clearTimeout(hostGoneRef.current);
        hostGoneRef.current = null;
      }
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [
    acceptGuest,
    applyGuestTurn,
    clearAway,
    code,
    holdHost,
    markAway,
    publish,
    ready,
    restartHost,
  ]);

  useEffect(() => {
    if (!ready || roleRef.current !== "host") {
      return;
    }
    let frame = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (startedRef.current) {
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
            if (!finishedMarkedRef.current && tokenRef.current) {
              finishedMarkedRef.current = true;
              void markWager(code, tokenRef.current, "finished");
            }
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
            sendState();
          }
        }
      }
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [code, publish, ready, sendState]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!startedRef.current) {
        return;
      }
      if (isPauseKey(event.key)) {
        event.preventDefault();
        if (roleRef.current === "host") {
          holdHost();
        } else {
          sendGuest("hold");
        }
        return;
      }
      const dir = dirFromWasd(event.key) ?? dirFromArrows(event.key);
      if (!dir) {
        return;
      }
      event.preventDefault();
      if (roleRef.current === "host") {
        turnHost(dir);
        return;
      }
      sendGuest("turn", dir);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [holdHost, ready, turnHost]);

  function sendGuest(event: "turn" | "hold" | "again" | "bye", dir?: Dir) {
    const token = tokenRef.current;
    const channel = channelRef.current;
    if (!token || !channel) {
      return;
    }
    if (event === "turn") {
      if (!welcomedRef.current || !dir) {
        return;
      }
      seqRef.current += 1;
      void channel.send({
        type: "broadcast",
        event: "turn",
        payload: { guestToken: token, dir, seq: seqRef.current },
      });
      return;
    }
    void channel.send({
      type: "broadcast",
      event,
      payload: { guestToken: token },
    });
  }

  async function leave() {
    const token = tokenRef.current;
    if (roleRef.current === "host" && token) {
      void channelRef.current?.send({
        type: "broadcast",
        event: "withdrawn",
        payload: {},
      });
      await markWager(code, token, "abandoned");
    } else if (token) {
      sendGuest("bye");
    }
    forgetSeat(code);
    router.push("/play/duel");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/play/duel?room=${code}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (closed) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <ParlorPanel className="text-center">
          <h1 className="font-serif text-3xl text-cream">A Private Wager</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{closed}</p>
          <Link href="/play/duel" className={`${buttonClass} mt-6 inline-block`}>
            Another table
          </Link>
        </ParlorPanel>
      </div>
    );
  }

  if (!ready || !role) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <ParlorPanel>
          <h1 className="font-serif text-3xl text-cream">A Private Wager</h1>
          <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
            {detail}
          </p>
        </ParlorPanel>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <ParlorPanel className="text-center">
          <h1 className="font-serif text-3xl text-cream">A Private Wager</h1>
          {role === "host" ? (
            <>
              <p className="mt-6 text-xs tracking-[0.16em] text-ink-muted">The code</p>
              <p
                className="mt-3 font-serif text-5xl tracking-[0.28em] text-gold"
                aria-label={`Table code ${code}`}
              >
                {code}
              </p>
              <p className="mt-3 text-xs tracking-[0.14em] text-ink-muted">
                No I, O, 0, or 1.
              </p>
              <p className="mt-6 text-sm leading-relaxed text-ink-muted" aria-live="polite">
                Send the code, or the link. {detail}
              </p>
              <button type="button" onClick={() => void copyLink()} className={`${buttonClass} mt-6`}>
                {copied ? "Copied." : "Copy the link"}
              </button>
            </>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-ink-muted" aria-live="polite">
              {detail}
            </p>
          )}
        </ParlorPanel>
        <button type="button" onClick={() => void leave()} className={quietClass}>
          Leave the table
        </button>
      </div>
    );
  }

  const mine = role === "host" ? "west" : "east";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <DuelTable
        stateRef={stateRef}
        view={view}
        control={role === "host" ? "p1" : "p2"}
        hint={`You are ${mine}. WASD or arrows. Space holds the table.`}
        notice={notice}
        onTurn={(_player, dir) => {
          if (roleRef.current === "host") {
            turnHost(dir);
            return;
          }
          sendGuest("turn", dir);
        }}
        onPause={() => {
          if (roleRef.current === "host") {
            holdHost();
            return;
          }
          sendGuest("hold");
        }}
        onRestart={() => {
          if (roleRef.current === "host") {
            restartHost();
            return;
          }
          sendGuest("again");
        }}
      />
      <button type="button" onClick={() => void leave()} className={quietClass}>
        Leave the table
      </button>
    </div>
  );
}
