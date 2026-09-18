import { safeNextPath } from "./safe-next";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(safeNextPath("/play/snake") === "/play/snake", "play path");
assert(safeNextPath("/leaderboard") === "/leaderboard", "ledger path");
assert(safeNextPath("//evil.example") === "/", "protocol-relative rejected");
assert(safeNextPath("https://evil.example") === "/", "absolute rejected");
assert(safeNextPath("/login?x=1") === "/", "query rejected");
assert(safeNextPath(null) === "/", "empty is home");

console.log("safe-next.selftest ok");
