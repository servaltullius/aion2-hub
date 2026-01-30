import { randomUUID } from "node:crypto";

import { allRows, oneRow, type SqlJsDatabase } from "../sql.js";
import type { AppCharacter } from "../types.js";

export function listCharacters(db: SqlJsDatabase) {
  const rows = allRows(
    db,
    `
      SELECT id, name, server, class, created_at, updated_at
      FROM app_character
      ORDER BY updated_at DESC, created_at DESC
      `,
    {}
  );

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    server: r.server ? String(r.server) : null,
    class: r.class ? String(r.class) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  })) satisfies AppCharacter[];
}

export function getCharacter(db: SqlJsDatabase, characterId: string) {
  const row = oneRow(db, "SELECT id, name, server, class, created_at, updated_at FROM app_character WHERE id = $id", { $id: characterId });
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    server: row.server ? String(row.server) : null,
    class: row.class ? String(row.class) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  } satisfies AppCharacter;
}

export function createCharacter(db: SqlJsDatabase, input: { name: string; server?: string | null; class?: string | null }) {
  const now = new Date().toISOString();
  const id = randomUUID();
  db.run(
    `
      INSERT INTO app_character (id, name, server, class, created_at, updated_at)
      VALUES ($id, $name, $server, $class, $now, $now)
      `,
    {
      $id: id,
      $name: input.name,
      $server: input.server ?? null,
      $class: input.class ?? null,
      $now: now
    }
  );

  // Auto-assign all existing templates to new character.
  db.run(
    `
      INSERT OR IGNORE INTO planner_assignment (id, character_id, template_id, enabled, created_at, updated_at)
      SELECT $idPrefix || t.id, $characterId, t.id, 1, $now, $now
      FROM planner_template t
      `,
    { $idPrefix: `assign:${id}:`, $characterId: id, $now: now }
  );

  return id;
}

export function updateCharacter(db: SqlJsDatabase, input: { id: string; name: string; server?: string | null; class?: string | null }) {
  const now = new Date().toISOString();
  db.run(
    `
      UPDATE app_character
      SET name = $name, server = $server, class = $class, updated_at = $now
      WHERE id = $id
      `,
    {
      $id: input.id,
      $name: input.name,
      $server: input.server ?? null,
      $class: input.class ?? null,
      $now: now
    }
  );
}

export function deleteCharacter(db: SqlJsDatabase, characterId: string) {
  db.run("DELETE FROM app_character WHERE id = $id", { $id: characterId });
}
