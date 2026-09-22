import { createDuel } from "../games/snake/duel";
import {
  duelFromWire,
  normalizeWagerCode,
  parseWireState,
  readTurn,
  wireFromDuel,
} from "./wager-code";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(normalizeWagerCode("k7qh") === "K7QH", "codes fold to the alphabet");
assert(normalizeWagerCode("K7QO") === null, "O is not a table letter");
assert(normalizeWagerCode("K7Q0") === null, "zero is not a table letter");
assert(normalizeWagerCode("K7QI") === null, "I is not a table letter");
assert(normalizeWagerCode("K7Q1") === null, "one is not a table letter");
assert(normalizeWagerCode("K7Q") === null, "short codes are refused");

const state = createDuel({ rng: () => 0.25, now: () => 5 });
const wire = wireFromDuel(state, false);
const parsed = parseWireState(wire);
assert(parsed !== null, "a live board is accepted");
assert(parsed?.p1.score === 0 && parsed.p2.score === 0, "scores survive the wire");
assert(parsed?.food.x === state.food.x && parsed?.food.y === state.food.y, "food survives");
const hydrated = parsed ? duelFromWire(parsed) : null;
assert(hydrated?.p1.snake.length === 3, "west length survives");
assert(hydrated?.status === "running", "status survives");

assert(parseWireState({ ...wire, winner: "p1" }) === null, "a running board cannot name a winner");
assert(parseWireState({ ...wire, p1: { ...wire.p1, score: 99 } }) === null, "a wild score is refused");
assert(readTurn({ guestToken: "not-a-token", dir: "up", seq: 1 }) === null, "turns need a token");
assert(
  readTurn({
    guestToken: "11111111-1111-4111-8111-111111111111",
    dir: "left",
    seq: 2,
  })?.dir === "left",
  "a real turn is accepted",
);

console.log("wager-code.selftest ok");
