export const CHART_SIZE = 10;
export const COLUMNS = "ABCDEFGHIJ";

export const SHIPS = [
  { name: "flagship", size: 5, title: "Flagship" },
  { name: "manowar", size: 4, title: "Man-of-war" },
  { name: "frigate", size: 3, title: "Frigate" },
  { name: "sloop", size: 3, title: "Sloop" },
  { name: "tender", size: 2, title: "Tender" },
] as const;

export type ShipName = (typeof SHIPS)[number]["name"];
export type ShipDir = "across" | "down";

export type Ship = {
  name: ShipName;
  x: number;
  y: number;
  dir: ShipDir;
};

export type Cell = { x: number; y: number };

export function isShipName(value: unknown): value is ShipName {
  return SHIPS.some((ship) => ship.name === value);
}

export function sizeOf(name: ShipName): number {
  const found = SHIPS.find((ship) => ship.name === name);
  return found ? found.size : 0;
}

export function titleOf(name: ShipName): string {
  const found = SHIPS.find((ship) => ship.name === name);
  return found ? found.title : name;
}

export function cellsOf(ship: Ship): Cell[] {
  const cells: Cell[] = [];
  const size = sizeOf(ship.name);
  for (let i = 0; i < size; i += 1) {
    cells.push(
      ship.dir === "across"
        ? { x: ship.x + i, y: ship.y }
        : { x: ship.x, y: ship.y + i },
    );
  }
  return cells;
}

export function onChart(cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < CHART_SIZE && cell.y < CHART_SIZE;
}

export function fleetIssue(fleet: Ship[]): string | null {
  if (fleet.length !== SHIPS.length) {
    return "Place every ship.";
  }
  const names = new Set<string>();
  const taken = new Set<string>();
  for (const ship of fleet) {
    if (!isShipName(ship.name) || names.has(ship.name)) {
      return "The chart is not sealed properly.";
    }
    names.add(ship.name);
    for (const cell of cellsOf(ship)) {
      if (!onChart(cell)) {
        return "A ship leaves the chart.";
      }
      const key = `${cell.x},${cell.y}`;
      if (taken.has(key)) {
        return "Two ships share a square.";
      }
      taken.add(key);
    }
  }
  for (const spec of SHIPS) {
    if (!names.has(spec.name)) {
      return "Place every ship.";
    }
  }
  return null;
}

export function fleetValid(fleet: Ship[]): boolean {
  return fleetIssue(fleet) === null;
}

export function canPlace(fleet: Ship[], ship: Ship): boolean {
  return coversOnly(
    fleet.filter((item) => item.name !== ship.name),
    ship,
  );
}

function coversOnly(others: Ship[], ship: Ship): boolean {
  const cells = cellsOf(ship);
  if (cells.some((cell) => !onChart(cell))) {
    return false;
  }
  const taken = new Set<string>();
  for (const other of others) {
    if (!isShipName(other.name)) {
      return false;
    }
    for (const cell of cellsOf(other)) {
      taken.add(`${cell.x},${cell.y}`);
    }
  }
  return cells.every((cell) => !taken.has(`${cell.x},${cell.y}`));
}

export function squareName(x: number, y: number): string {
  const column = COLUMNS[x] ?? "?";
  return `${column}${y + 1}`;
}

export function parseFleet(value: unknown): Ship[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const fleet: Ship[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }
    if (!("name" in item) || !("x" in item) || !("y" in item) || !("dir" in item)) {
      return null;
    }
    const { name, x, y, dir } = item;
    if (!isShipName(name) || (dir !== "across" && dir !== "down")) {
      return null;
    }
    if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
      return null;
    }
    fleet.push({ name, x, y, dir });
  }
  return fleetValid(fleet) ? fleet : null;
}
