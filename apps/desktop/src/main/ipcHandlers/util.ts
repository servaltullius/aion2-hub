import type { DesktopDb } from "../storage/db.js";

export function asRecord(input: unknown): Record<string, unknown> {
  return (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) as Record<string, unknown>;
}

export function resolveCharacterId(db: DesktopDb, input: Record<string, unknown>) {
  const fromInput = typeof input.characterId === "string" ? input.characterId : null;
  return fromInput ?? db.getActiveCharacterId();
}

