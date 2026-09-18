import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, ParlorProfile, ParlorScore } from "./supabase/database";

export const SCORE_MAX = 10_000;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;
export const DEFAULT_GRID_SIZE = 20;
export const MIN_MS_PER_POINT = 250;
export const GRID_20_SCORE_SOFT_CAP = 400;
export const PARLOR_GAMES = ["snake"] as const;

export type ParlorGame = (typeof PARLOR_GAMES)[number];
export type ParlorClient = SupabaseClient<Database>;

export type ScoreInput = {
  game?: string;
  score: number;
  duration_ms: number;
  grid_size?: number;
};

export type ScoreCheck =
  | { ok: true }
  | { ok: false; reason: string };

export type LedgerEntry = {
  id: number;
  score: number;
  duration_ms: number;
  grid_size: number;
  created_at: string;
  display_name: string;
};

const NAME_CHARS = /[^A-Za-z0-9 ._-]/g;

function isParlorGame(game: string): game is ParlorGame {
  return (PARLOR_GAMES as readonly string[]).includes(game);
}

function profileName(
  profile: { display_name: string } | { display_name: string }[] | null,
): string {
  if (!profile) {
    return "—";
  }
  if (Array.isArray(profile)) {
    return profile[0]?.display_name ?? "—";
  }
  return profile.display_name;
}

export function displayNameFromEmail(email: string): string {
  const prefix = email.split("@")[0] ?? "guest";
  const cleaned = prefix.replace(NAME_CHARS, "").trim();
  const base = cleaned.length >= DISPLAY_NAME_MIN ? cleaned : `g-${cleaned || "uest"}`;
  return base.slice(0, DISPLAY_NAME_MAX);
}

export function validateScore(input: ScoreInput): ScoreCheck {
  const game = input.game ?? "snake";
  const gridSize = input.grid_size ?? DEFAULT_GRID_SIZE;
  const { score, duration_ms: durationMs } = input;

  if (!isParlorGame(game)) {
    return { ok: false, reason: "Unknown table." };
  }
  if (!Number.isInteger(score) || score < 0 || score > SCORE_MAX) {
    return { ok: false, reason: "The house will not record that." };
  }
  if (!Number.isInteger(durationMs) || durationMs < 0) {
    return { ok: false, reason: "The house will not record that." };
  }
  if (!Number.isInteger(gridSize) || gridSize <= 0) {
    return { ok: false, reason: "The house will not record that." };
  }
  if (score > durationMs / MIN_MS_PER_POINT) {
    return { ok: false, reason: "The house will not record that." };
  }
  if (
    gridSize === DEFAULT_GRID_SIZE &&
    score > GRID_20_SCORE_SOFT_CAP &&
    durationMs < GRID_20_SCORE_SOFT_CAP * MIN_MS_PER_POINT
  ) {
    return { ok: false, reason: "The house will not record that." };
  }

  return { ok: true };
}

async function currentUser(supabase: ParlorClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export async function ensureParlorProfile(
  supabase: ParlorClient,
  user: User,
): Promise<{ ok: true; profile: ParlorProfile } | { ok: false; reason: string }> {
  const { data: existing, error: readError } = await supabase
    .from("parlor_profiles")
    .select("id, display_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return { ok: false, reason: "The book could not be opened." };
  }
  if (existing) {
    return { ok: true, profile: existing };
  }

  const displayName = displayNameFromEmail(user.email ?? "guest");
  const { data: created, error: insertError } = await supabase
    .from("parlor_profiles")
    .insert({ id: user.id, display_name: displayName })
    .select("id, display_name, created_at, updated_at")
    .single();

  if (insertError || !created) {
    return { ok: false, reason: "The book could not take a name." };
  }
  return { ok: true, profile: created };
}

export async function recordParlorScore(
  supabase: ParlorClient,
  input: ScoreInput,
): Promise<{ ok: true; score: ParlorScore } | { ok: false; reason: string }> {
  const check = validateScore(input);
  if (!check.ok) {
    return check;
  }

  const user = await currentUser(supabase);
  if (!user) {
    return { ok: false, reason: "Leave a name first." };
  }

  const profile = await ensureParlorProfile(supabase, user);
  if (!profile.ok) {
    return profile;
  }

  const { data, error } = await supabase
    .from("parlor_scores")
    .insert({
      user_id: user.id,
      game: input.game ?? "snake",
      score: input.score,
      duration_ms: input.duration_ms,
      grid_size: input.grid_size ?? DEFAULT_GRID_SIZE,
    })
    .select(
      "id, user_id, game, score, duration_ms, grid_size, created_at",
    )
    .single();

  if (error || !data) {
    return { ok: false, reason: "The ledger would not take the line." };
  }
  return { ok: true, score: data };
}

export async function listParlorScores(
  supabase: ParlorClient,
  options: { game?: string; limit?: number; since?: string } = {},
): Promise<{ ok: true; entries: LedgerEntry[] } | { ok: false; reason: string }> {
  const game = options.game ?? "snake";
  const limit = options.limit ?? 25;

  let query = supabase
    .from("parlor_scores")
    .select(
      "id, score, duration_ms, grid_size, created_at, parlor_profiles!inner(display_name)",
    )
    .eq("game", game)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (options.since) {
    query = query.gte("created_at", options.since);
  }

  const { data, error } = await query;
  if (error || !data) {
    return { ok: false, reason: "The ledger could not be read." };
  }

  const entries: LedgerEntry[] = data.map((row) => ({
    id: row.id,
    score: row.score,
    duration_ms: row.duration_ms,
    grid_size: row.grid_size,
    created_at: row.created_at,
    display_name: profileName(row.parlor_profiles),
  }));

  return { ok: true, entries };
}
