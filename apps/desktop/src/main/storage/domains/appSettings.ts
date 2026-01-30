import { oneRow, type SqlJsDatabase } from "../sql.js";

export function getSetting(db: SqlJsDatabase, key: string) {
  const row = oneRow(db, "SELECT value FROM app_setting WHERE key = $k", { $k: key });
  if (!row) return null;
  return String(row.value);
}

export function setSetting(db: SqlJsDatabase, key: string, value: string | null) {
  if (value === null) {
    db.run("DELETE FROM app_setting WHERE key = $k", { $k: key });
    return;
  }
  db.run("INSERT INTO app_setting (key, value) VALUES ($k, $v) ON CONFLICT(key) DO UPDATE SET value = $v", {
    $k: key,
    $v: value
  });
}

export function getActiveCharacterId(db: SqlJsDatabase) {
  return getSetting(db, "activeCharacterId");
}

export function setActiveCharacterId(db: SqlJsDatabase, characterId: string | null) {
  setSetting(db, "activeCharacterId", characterId);
}
