import { normalizeDisplayName } from "./scores";

const KEY = "parlor:pending-name:v1";

export function savePendingName(raw: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const name = normalizeDisplayName(raw);
  if (!name) {
    return null;
  }
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    // Private mode or disabled storage.
  }
  return name;
}

export function loadPendingName(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return normalizeDisplayName(sessionStorage.getItem(KEY) ?? "");
  } catch {
    return null;
  }
}

export function clearPendingName(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore storage failures.
  }
}
