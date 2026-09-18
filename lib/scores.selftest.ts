import {
  DEFAULT_GRID_SIZE,
  GRID_20_SCORE_SOFT_CAP,
  MIN_MS_PER_POINT,
  displayNameFromEmail,
  validateScore,
} from "./scores";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(validateScore({ score: 12, duration_ms: 12 * MIN_MS_PER_POINT }).ok, "honest score passes");
assert(
  !validateScore({ score: 12, duration_ms: 12 * MIN_MS_PER_POINT - 1 }).ok,
  "faster than 250ms per point is rejected",
);
assert(
  !validateScore({
    score: GRID_20_SCORE_SOFT_CAP + 1,
    duration_ms: GRID_20_SCORE_SOFT_CAP * MIN_MS_PER_POINT - 1,
    grid_size: DEFAULT_GRID_SIZE,
  }).ok,
  "score above 400 on 20x20 without a plausible sitting is rejected",
);
assert(
  validateScore({
    score: GRID_20_SCORE_SOFT_CAP + 1,
    duration_ms: (GRID_20_SCORE_SOFT_CAP + 1) * MIN_MS_PER_POINT,
    grid_size: DEFAULT_GRID_SIZE,
  }).ok,
  "score above 400 on 20x20 with a plausible sitting passes the rate checks",
);
assert(!validateScore({ score: -1, duration_ms: 1000 }).ok, "negative score rejected");
assert(!validateScore({ score: 10001, duration_ms: 10001 * MIN_MS_PER_POINT }).ok, "score cap");
assert(!validateScore({ score: 1, duration_ms: -1 }).ok, "negative duration rejected");
assert(!validateScore({ score: 1, duration_ms: 1000, game: "duel" }).ok, "unknown game rejected");
assert(displayNameFromEmail("coleman@example.com") === "coleman", "email prefix display name");
assert(displayNameFromEmail("a@example.com").length >= 2, "short prefix is padded");
assert(displayNameFromEmail(`${"n".repeat(40)}@example.com`).length === 20, "name is capped at 20");

console.log("scores.selftest ok");
