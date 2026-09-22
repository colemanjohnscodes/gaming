import { createClient } from "@/lib/supabase/client";
import { normalizeWagerCode } from "@/lib/wager-code";

export type OpenWagerResult =
  | { ok: true; code: string; hostToken: string }
  | { ok: false; message: string };

export type ClaimWagerResult =
  | { ok: true; guestToken: string }
  | { ok: false; message: string };

export type ResumeWagerResult =
  | { ok: true; seat: "host" | "guest"; status: string }
  | { ok: false; message: string };

type RpcError = {
  message: string;
  code?: string;
};

const claims = new Map<string, Promise<ClaimWagerResult>>();

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
    return "The wager book is not in place yet.";
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

export async function openWager(): Promise<OpenWagerResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("open_wager");
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = data?.[0];
    if (!row) {
      return { ok: false, message: "The table did not answer." };
    }
    const code = normalizeWagerCode(row.code);
    if (!code) {
      return { ok: false, message: "The table did not answer." };
    }
    return { ok: true, code, hostToken: row.host_token };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export async function claimWager(code: string): Promise<ClaimWagerResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_wager", { p_code: code });
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = data?.[0];
    if (!row) {
      return { ok: false, message: "The table did not answer." };
    }
    if (row.reason !== "seated" || !row.guest_token) {
      return { ok: false, message: claimMessage(row.reason) };
    }
    return { ok: true, guestToken: row.guest_token };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export function claimWagerOnce(code: string): Promise<ClaimWagerResult> {
  const existing = claims.get(code);
  if (existing) {
    return existing;
  }
  const pending = claimWager(code).then((result) => {
    if (!result.ok) {
      claims.delete(code);
    }
    return result;
  });
  claims.set(code, pending);
  return pending;
}

export async function resumeWager(
  code: string,
  token: string,
): Promise<ResumeWagerResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("resume_wager", {
      p_code: code,
      p_token: token,
    });
    if (error) {
      return { ok: false, message: rpcMessage(error) };
    }
    const row = data?.[0];
    if (!row || (row.seat !== "host" && row.seat !== "guest")) {
      return { ok: false, message: "This table does not know that chair." };
    }
    return { ok: true, seat: row.seat, status: row.status };
  } catch {
    return { ok: false, message: "The table did not answer." };
  }
}

export async function confirmGuest(
  code: string,
  hostToken: string,
  guestToken: string,
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("confirm_guest", {
      p_code: code,
      p_host_token: hostToken,
      p_guest_token: guestToken,
    });
    if (error) {
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

export async function markWager(
  code: string,
  hostToken: string,
  status: "playing" | "finished" | "abandoned",
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("mark_wager", {
      p_code: code,
      p_host_token: hostToken,
      p_status: status,
    });
    if (error) {
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}
