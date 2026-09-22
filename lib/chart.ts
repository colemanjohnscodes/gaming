import { createClient } from "@/lib/supabase/client";
import { normalizeWagerCode } from "@/lib/wager-code";
import { parseFleet, type Cell, type Ship } from "@/games/chart/fleet";

export type ChartShot = {
  x: number;
  y: number;
  by: "you" | "them";
  result: "miss" | "hit" | "sunk";
  ship: string | null;
  cells: Cell[] | null;
};

export type ChartView = {
  seat: "host" | "guest";
  status: string;
  youLocked: boolean;
  opponentLocked: boolean;
  yourFleet: Ship[] | null;
  turn: "you" | "them" | null;
  winner: "you" | "them" | null;
  shots: ChartShot[];
};

type RpcError = { message: string; code?: string };

const claims = new Map<string, Promise<{ ok: true; guestToken: string } | { ok: false; message: string }>>();

function bookMissing(error: RpcError): boolean {
  const blob = `${error.code ?? ""} ${error.message}`.toLowerCase();
  return (
    blob.includes("pgrst202") ||
    blob.includes("42883") ||
    blob.includes("schema cache") ||
    blob.includes("could not find the function")
  );
}

function rpcMessage(error: RpcError): string {
  if (bookMissing(error)) {
    return "The chart book is not in place yet.";
  }
  return "The table did not answer.";
}

function claimMessage(reason: string): string {
  switch (reason) {
    case "taken":
      return "That chair is already taken.";
    case "closed":
      return "That table is closed.";
    case "missing":
      return "There is no table by that code.";
    default:
      return "The table did not answer.";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseCells(value: unknown): Cell[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const cells: Cell[] = [];
  for (const item of value) {
    const cell = asRecord(item);
    if (!cell || typeof cell.x !== "number" || typeof cell.y !== "number") {
      return null;
    }
    cells.push({ x: cell.x, y: cell.y });
  }
  return cells;
}

export function parseChartView(value: unknown): ChartView | { ok: false; message: string } | null {
  const row = asRecord(value);
  if (!row || row.ok !== true) {
    if (row && row.ok === false) {
      return {
        ok: false,
        message: claimMessage(typeof row.reason === "string" ? row.reason : ""),
      };
    }
    return null;
  }
  if (row.seat !== "host" && row.seat !== "guest") {
    return null;
  }
  const shots: ChartShot[] = [];
  if (Array.isArray(row.shots)) {
    for (const item of row.shots) {
      const shot = asRecord(item);
      if (!shot) {
        continue;
      }
      if (
        typeof shot.x !== "number" ||
        typeof shot.y !== "number" ||
        (shot.by !== "you" && shot.by !== "them") ||
        (shot.result !== "miss" && shot.result !== "hit" && shot.result !== "sunk")
      ) {
        continue;
      }
      shots.push({
        x: shot.x,
        y: shot.y,
        by: shot.by,
        result: shot.result,
        ship: typeof shot.ship === "string" ? shot.ship : null,
        cells: parseCells(shot.cells),
      });
    }
  }
  const fleet = row.yourFleet == null ? null : parseFleet(row.yourFleet);
  return {
    seat: row.seat,
    status: typeof row.status === "string" ? row.status : "open",
    youLocked: row.youLocked === true,
    opponentLocked: row.opponentLocked === true,
    yourFleet: fleet,
    turn: row.turn === "you" || row.turn === "them" ? row.turn : null,
    winner: row.winner === "you" || row.winner === "them" ? row.winner : null,
    shots,
  };
}

export async function openChart(): Promise<
  { ok: true; code: string; hostToken: string } | { ok: false; message: string }
> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("open_chart");
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = data?.[0];
    const code = row ? normalizeWagerCode(row.code) : null;
    if (!row || !code) {
      return { ok: false, message: "The table did not answer." };
    }
    return { ok: true, code, hostToken: row.host_token };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export async function claimChart(
  code: string,
): Promise<{ ok: true; guestToken: string } | { ok: false; message: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_chart", { p_code: code });
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = data?.[0];
    if (!row || row.reason !== "seated" || !row.guest_token) {
      return { ok: false, message: claimMessage(row?.reason ?? "") };
    }
    return { ok: true, guestToken: row.guest_token };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export function claimChartOnce(code: string) {
  const existing = claims.get(code);
  if (existing) {
    return existing;
  }
  const pending = claimChart(code).then((result) => {
    if (!result.ok) {
      claims.delete(code);
    }
    return result;
  });
  claims.set(code, pending);
  return pending;
}

export async function resumeChart(
  code: string,
  token: string,
): Promise<{ ok: true; view: ChartView } | { ok: false; message: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("resume_chart", {
      p_code: code,
      p_token: token,
    });
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const parsed = parseChartView(data);
    if (!parsed) {
      return { ok: false, message: "The table did not answer." };
    }
    if ("message" in parsed) {
      return parsed;
    }
    return { ok: true, view: parsed };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export async function lockChart(
  code: string,
  token: string,
  fleet: Ship[],
): Promise<{ ok: true; both: boolean } | { ok: false; message: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("lock_chart", {
      p_code: code,
      p_token: token,
      p_fleet: fleet,
    });
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = asRecord(data);
    if (!row || row.ok !== true) {
      const reason = row && typeof row.reason === "string" ? row.reason : "";
      if (reason === "invalid") {
        return { ok: false, message: "That chart cannot be sealed." };
      }
      if (reason === "sealed") {
        return { ok: false, message: "The chart is already sealed." };
      }
      return { ok: false, message: claimMessage(reason) };
    }
    return { ok: true, both: row.both === true };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export async function fireChart(
  code: string,
  token: string,
  x: number,
  y: number,
): Promise<
  | {
      ok: true;
      result: "miss" | "hit" | "sunk";
      ship: string | null;
      cells: Cell[] | null;
      winner: "you" | "them" | null;
      turn: "you" | "them" | null;
    }
  | { ok: false; message: string }
> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("fire_chart", {
      p_code: code,
      p_token: token,
      p_x: x,
      p_y: y,
    });
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = asRecord(data);
    if (!row || row.ok !== true) {
      const reason = row && typeof row.reason === "string" ? row.reason : "";
      if (reason === "repeat") {
        return { ok: false, message: "That square has been called." };
      }
      if (reason === "wait") {
        return { ok: false, message: "Wait for your call." };
      }
      return { ok: false, message: claimMessage(reason) };
    }
    if (row.result !== "miss" && row.result !== "hit" && row.result !== "sunk") {
      return { ok: false, message: "The table did not answer." };
    }
    return {
      ok: true,
      result: row.result,
      ship: typeof row.ship === "string" ? row.ship : null,
      cells: parseCells(row.cells),
      winner: row.winner === "you" || row.winner === "them" ? row.winner : null,
      turn: row.turn === "you" || row.turn === "them" ? row.turn : null,
    };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export async function abandonChart(code: string, token: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.rpc("abandon_chart", { p_code: code, p_token: token });
  } catch {
    return;
  }
}
