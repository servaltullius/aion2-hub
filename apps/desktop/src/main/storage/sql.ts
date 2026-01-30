import type { Database } from "sql.js";

export type SqlJsDatabase = Database;

export type SqlValue = number | string | Uint8Array | null;
export type ParamsObject = Record<string, SqlValue>;

export function escapeLike(value: string) {
  return value.replaceAll("\\\\", "\\\\\\\\").replaceAll("%", "\\\\%").replaceAll("_", "\\\\_");
}

export function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function oneRow(db: SqlJsDatabase, sql: string, params: ParamsObject) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (!stmt.step()) return null;
    return stmt.getAsObject() as Record<string, unknown>;
  } finally {
    stmt.free();
  }
}

export function allRows(db: SqlJsDatabase, sql: string, params: ParamsObject) {
  const stmt = db.prepare(sql);
  const out: Record<string, unknown>[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) out.push(stmt.getAsObject() as Record<string, unknown>);
    return out;
  } finally {
    stmt.free();
  }
}
