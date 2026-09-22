"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParlorPanel } from "@/components/ParlorPanel";
import { createClient } from "@/lib/supabase/client";
import { claimWagerOnce, confirmGuest, markWager, resumeWager } from "@/lib/wager";
import {
  forgetSeat,
  isUuid,
  readGuestToken,
  recallSeat,
  rememberSeat,
  type WagerSeat,
} from "@/lib/wager-code";
import {
  beginVolley,
  createVolley,
  parseVolleyWire,
  placePaddle,
  volleyFromWire,
  wireFromVolley,
  type VolleyState,
} from "./engine";
import { useVolleyLoop } from "./loop";
import { VolleyTable, type VolleyView } from "./VolleyTable";

const quietClass =
  "text-sm tracking-[0.14em] text-ink-muted hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

const buttonClass =
  "border border-gold/80 px-4 py-2 text-sm tracking-[0.14em] text-cream hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold";

function viewFrom(state: VolleyState): VolleyView {
  return {
    west: state.westScore,
    east: state.eastScore,
    status: state.status,
    winner: state.winner,
  };
}

function readPaddle(value: unknown): { guestToken: string; y: number } | null {
  if (!value || typeof value !== "object" || !("guestToken" in value) || !("y" in value)) {
    return null;
  }
  const { guestToken, y } = value;
  if (!isUuid(guestToken) || typeof y !== "number" || !Number.isFinite(y)) {
    return null;
  }
  return { guestToken, y };
}

export function OnlineVolley({ code }: { code: string }) {
  const router = useRouter();
  const stateRef = useRef<VolleyState>(createVolley());
  const held = useRef(new Set<string>());
  const roleRef = useRef<WagerSeat | null>(null);
  const tokenRef = useRef<string | null>(null);
  const guestTokenRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const startedRef = useRef(false);
  const acceptingRef = useRef(false);
  const guestSeenRef = useRef(false);
  const awayRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [role, setRole] = useState<WagerSeat | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState("Taking the chair…");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<VolleyView>(viewFrom(createVolley()));

  const publish = useCallback(() => {
    setView(viewFrom(stateRef.current));
    setNotice(awayRef.current ? "The other paddle is empty." : null);
  }, []);

  const sendState = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || roleRef.current !== "host" || !startedRef.current) {
      return;
    }
    void channel.send({
      type: "broadcast",
      event: "state",
      payload: wireFromVolley(stateRef.current),
    });
  }, []);

  useVolleyLoop(stateRef, held, role === "guest" ? "east" : "west", publish, role === "host" && started);

  useEffect(() => {
    if (role !== "host" || !started) {
      return;
    }
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last > 50) {
        last = now;
        sendState();
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [role, sendState, started]);

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
        } else if (
          resume.status === "abandoned" ||
          resume.status === "closed" ||
          (resume.seat === "host" && (resume.status === "playing" || resume.status === "finished"))
        ) {
          if (resume.seat === "host" && resume.ok) {
            await markWager(code, saved.token, "abandoned");
          }
          forgetSeat(code);
          setClosed(
            resume.status === "playing" || resume.status === "finished"
              ? "This table closed when the window did."
              : "This table is closed.",
          );
          return;
        } else {
          roleRef.current = resume.seat;
          tokenRef.current = saved.token;
          setRole(resume.seat);
          setDetail(resume.seat === "host" ? "The other paddle is empty." : "West is setting the table.");
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
        setClosed(claim.message);
        return;
      }
      roleRef.current = "guest";
      tokenRef.current = claim.guestToken;
      setRole("guest");
      setDetail("West is setting the table.");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const acceptGuest = useCallback(
    async (guestToken: string) => {
      const hostToken = tokenRef.current;
      if (!hostToken || roleRef.current !== "host") {
        return;
      }
      if (guestTokenRef.current === guestToken) {
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
      startedRef.current = true;
      stateRef.current = beginVolley(createVolley());
      awayRef.current = false;
      setStarted(true);
      void markWager(code, hostToken, "playing");
      publish();
      sendState();
    },
    [code, publish, sendState],
  );

  useEffect(() => {
    if (!ready || !roleRef.current || !tokenRef.current) {
      return;
    }
    const supabase = createClient();
    const channel = supabase.channel(`volley:${code}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "hello" }, (message) => {
        const guestToken = readGuestToken(message.payload);
        if (guestToken) {
          void acceptGuest(guestToken);
        }
      })
      .on("broadcast", { event: "paddle" }, (message) => {
        if (roleRef.current !== "host") {
          return;
        }
        const paddle = readPaddle(message.payload);
        if (!paddle || paddle.guestToken !== guestTokenRef.current || awayRef.current) {
          return;
        }
        stateRef.current = placePaddle(stateRef.current, "east", paddle.y);
      })
      .on("broadcast", { event: "state" }, (message) => {
        if (roleRef.current !== "guest") {
          return;
        }
        const wire = parseVolleyWire(message.payload);
        if (!wire) {
          return;
        }
        const localEast = stateRef.current.east;
        const next = volleyFromWire(wire);
        next.east = localEast;
        stateRef.current = next;
        startedRef.current = true;
        setStarted(true);
        publish();
      })
      .on("broadcast", { event: "again" }, (message) => {
        if (roleRef.current !== "host" || stateRef.current.status !== "finished") {
          return;
        }
        if (readGuestToken(message.payload) !== guestTokenRef.current) {
          return;
        }
        stateRef.current = beginVolley(createVolley());
        publish();
        sendState();
      })
      .on("broadcast", { event: "withdrawn" }, () => {
        if (roleRef.current === "guest") {
          setClosed("The host has withdrawn.");
        }
      })
      .on("presence", { event: "sync" }, () => {
        const raw: unknown = channel.presenceState();
        const seats: string[] = [];
        if (raw && typeof raw === "object") {
          for (const entries of Object.values(raw)) {
            if (!Array.isArray(entries)) {
              continue;
            }
            for (const entry of entries) {
              if (entry && typeof entry === "object" && "seat" in entry && typeof entry.seat === "string") {
                seats.push(entry.seat);
              }
            }
          }
        }
        if (roleRef.current === "host" && startedRef.current) {
          if (seats.includes("guest")) {
            guestSeenRef.current = true;
            if (awayRef.current) {
              awayRef.current = false;
              publish();
            }
          } else if (guestSeenRef.current && !awayRef.current) {
            awayRef.current = true;
            publish();
          }
        }
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED" || !roleRef.current) {
          if (status === "CHANNEL_ERROR" && !startedRef.current) {
            setClosed("The table did not answer.");
          }
          return;
        }
        void channel.track({ seat: roleRef.current });
        if (roleRef.current === "guest" && tokenRef.current) {
          void channel.send({
            type: "broadcast",
            event: "hello",
            payload: { guestToken: tokenRef.current },
          });
        }
      });

    const hello = window.setInterval(() => {
      if (roleRef.current !== "guest" || startedRef.current || !tokenRef.current) {
        return;
      }
      void channel.send({
        type: "broadcast",
        event: "hello",
        payload: { guestToken: tokenRef.current },
      });
    }, 1000);

    const paddle = window.setInterval(() => {
      if (roleRef.current !== "guest" || !startedRef.current || !tokenRef.current) {
        return;
      }
      void channel.send({
        type: "broadcast",
        event: "paddle",
        payload: { guestToken: tokenRef.current, y: stateRef.current.east },
      });
    }, 40);

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
      window.clearInterval(hello);
      window.clearInterval(paddle);
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [acceptGuest, code, publish, ready, sendState]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const down = (event: KeyboardEvent) => {
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
  }, [ready]);

  async function leave() {
    const token = tokenRef.current;
    if (roleRef.current === "host" && token) {
      void channelRef.current?.send({ type: "broadcast", event: "withdrawn", payload: {} });
      await markWager(code, token, "abandoned");
    }
    forgetSeat(code);
    router.push("/play/volley");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/play/volley?room=${code}`);
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
          <h1 className="font-serif text-3xl text-cream">The Volley</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{closed}</p>
          <Link href="/play/volley" className={`${buttonClass} mt-6 inline-block`}>
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
          <h1 className="font-serif text-3xl text-cream">The Volley</h1>
          <p className="mt-4 text-sm text-ink-muted">{detail}</p>
        </ParlorPanel>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <ParlorPanel className="text-center">
          <h1 className="font-serif text-3xl text-cream">The Volley</h1>
          {role === "host" ? (
            <>
              <p className="mt-6 text-xs tracking-[0.16em] text-ink-muted">The code</p>
              <p className="mt-3 font-serif text-5xl tracking-[0.28em] text-gold">{code}</p>
              <p className="mt-3 text-xs tracking-[0.14em] text-ink-muted">No I, O, 0, or 1.</p>
              <p className="mt-6 text-sm text-ink-muted">{detail}</p>
              <button type="button" onClick={() => void copyLink()} className={`${buttonClass} mt-6`}>
                {copied ? "Copied." : "Copy the link"}
              </button>
            </>
          ) : (
            <p className="mt-6 text-sm text-ink-muted">{detail}</p>
          )}
        </ParlorPanel>
        <button type="button" onClick={() => void leave()} className={quietClass}>
          Leave the table
        </button>
      </div>
    );
  }

  const side = role === "host" ? "west" : "east";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <VolleyTable
        stateRef={stateRef}
        view={view}
        control={side}
        hint={`You are ${side}. W S or arrows. Drag the paddle.`}
        notice={notice}
        onPaddle={(_paddle, centerY) => {
          stateRef.current = placePaddle(stateRef.current, side, centerY);
        }}
        onBegin={() => {
          if (roleRef.current === "host" && stateRef.current.status === "ready") {
            stateRef.current = beginVolley(stateRef.current);
            publish();
            sendState();
          }
        }}
        onAgain={() => {
          if (roleRef.current === "host") {
            stateRef.current = beginVolley(createVolley());
            publish();
            sendState();
            return;
          }
          const token = tokenRef.current;
          if (!token) {
            return;
          }
          void channelRef.current?.send({
            type: "broadcast",
            event: "again",
            payload: { guestToken: token },
          });
        }}
      />
      <button type="button" onClick={() => void leave()} className={quietClass}>
        Leave the table
      </button>
    </div>
  );
}
