import { cellsOf, fleetIssue, fleetValid, parseFleet, type Ship } from "./fleet";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fleet: Ship[] = [
  { name: "flagship", x: 0, y: 0, dir: "across" },
  { name: "manowar", x: 0, y: 2, dir: "across" },
  { name: "frigate", x: 6, y: 4, dir: "down" },
  { name: "sloop", x: 7, y: 7, dir: "across" },
  { name: "tender", x: 2, y: 9, dir: "across" },
];

assert(fleetValid(fleet), "a proper chart is accepted");
assert(cellsOf(fleet[0]).length === 5, "the flagship covers five squares");
assert(cellsOf(fleet[2])[2]?.y === 6, "a ship laid down runs down the chart");

const overlap: Ship[] = fleet.map((ship) =>
  ship.name === "tender" ? { ...ship, x: 0, y: 0 } : ship,
);
assert(fleetIssue(overlap) === "Two ships share a square.", "shared squares are refused");

const off: Ship[] = fleet.map((ship) =>
  ship.name === "flagship" ? { ...ship, x: 7, dir: "across" as const } : ship,
);
assert(fleetIssue(off) === "A ship leaves the chart.", "a ship may not leave the chart");
assert(parseFleet(fleet)?.length === 5, "a sealed chart can be read back");
assert(parseFleet([...fleet, fleet[0]]) === null, "an extra ship is refused");

console.log("fleet.selftest ok");
