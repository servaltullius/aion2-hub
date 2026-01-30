import { randomUUID } from "node:crypto";

import { allRows, escapeLike, oneRow, safeJsonParse, type ParamsObject, type SqlJsDatabase } from "../sql.js";
import type { NoticeDiffBlock, NoticeListItem, NoticeSource } from "../types.js";

export function listNotices(db: SqlJsDatabase, input: { source?: NoticeSource; q?: string; page: number; pageSize: number }) {
  const page = Math.max(1, input.page);
  const pageSize = Math.max(1, Math.min(50, input.pageSize));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: ParamsObject = { $limit: pageSize, $offset: offset };

  if (input.source) {
    where.push("source = $source");
    params.$source = input.source;
  }
  if (input.q && input.q.trim()) {
    where.push("title LIKE $q ESCAPE '\\\\' COLLATE NOCASE");
    params.$q = `%${escapeLike(input.q.trim())}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = oneRow(db, `SELECT COUNT(1) AS c FROM notice_item ${whereSql}`, params);
  const total = Number(totalRow?.c ?? 0);

  const rows = allRows(
    db,
    `
      SELECT id, source, external_id, url, title, published_at, updated_at
      FROM notice_item
      ${whereSql}
      ORDER BY COALESCE(published_at, updated_at) DESC, updated_at DESC
      LIMIT $limit OFFSET $offset
      `,
    params
  );

  const items = rows.map((r) => ({
    id: String(r.id),
    source: r.source as NoticeSource,
    externalId: String(r.external_id),
    url: String(r.url),
    title: String(r.title),
    publishedAt: r.published_at ? String(r.published_at) : null,
    updatedAt: String(r.updated_at)
  })) satisfies NoticeListItem[];

  return { page, pageSize, total, items };
}

export function upsertNoticeItem(
  db: SqlJsDatabase,
  input: {
    source: NoticeSource;
    externalId: string;
    url: string;
    title: string;
    publishedAt: string | null;
    updatedAt: string | null;
  }
) {
  const now = new Date().toISOString();
  const updatedAt = input.updatedAt ?? now;
  const existing = oneRow(db, "SELECT id FROM notice_item WHERE source = $s AND external_id = $e", {
    $s: input.source,
    $e: input.externalId
  });

  if (existing?.id) {
    db.run(
      `
        UPDATE notice_item
        SET url = $url, title = $title, published_at = $publishedAt, updated_at = $updatedAt
        WHERE id = $id
        `,
      {
        $id: String(existing.id),
        $url: input.url,
        $title: input.title,
        $publishedAt: input.publishedAt,
        $updatedAt: updatedAt
      }
    );
    return String(existing.id);
  }

  const id = randomUUID();
  db.run(
    `
      INSERT INTO notice_item (id, source, external_id, url, title, published_at, created_at, updated_at)
      VALUES ($id, $source, $externalId, $url, $title, $publishedAt, $now, $updatedAt)
      `,
    {
      $id: id,
      $source: input.source,
      $externalId: input.externalId,
      $url: input.url,
      $title: input.title,
      $publishedAt: input.publishedAt,
      $now: now,
      $updatedAt: updatedAt
    }
  );
  return id;
}

export function getNoticeItemByExternalId(db: SqlJsDatabase, input: { source: NoticeSource; externalId: string }) {
  const row = oneRow(db, "SELECT id, updated_at FROM notice_item WHERE source = $s AND external_id = $e", {
    $s: input.source,
    $e: input.externalId
  });
  if (!row) return null;
  return { id: String(row.id), updatedAt: String(row.updated_at) };
}

export function getLatestSnapshot(db: SqlJsDatabase, noticeItemId: string) {
  const row = oneRow(
    db,
    `
      SELECT id, fetched_at, content_hash, normalized_text
      FROM notice_snapshot
      WHERE notice_item_id = $id
      ORDER BY fetched_at DESC
      LIMIT 1
      `,
    { $id: noticeItemId }
  );
  if (!row) return null;
  return {
    id: String(row.id),
    fetchedAt: String(row.fetched_at),
    contentHash: String(row.content_hash),
    normalizedText: String(row.normalized_text)
  };
}

export function upsertSnapshot(db: SqlJsDatabase, input: { noticeItemId: string; contentHash: string; normalizedText: string }) {
  const existing = oneRow(db, "SELECT id, fetched_at FROM notice_snapshot WHERE notice_item_id = $n AND content_hash = $h", {
    $n: input.noticeItemId,
    $h: input.contentHash
  });
  if (existing?.id) {
    return { id: String(existing.id), fetchedAt: String(existing.fetched_at), inserted: false };
  }

  const id = randomUUID();
  const fetchedAt = new Date().toISOString();
  db.run(
    `
      INSERT INTO notice_snapshot (id, notice_item_id, fetched_at, content_hash, normalized_text)
      VALUES ($id, $noticeItemId, $fetchedAt, $contentHash, $normalizedText)
      `,
    {
      $id: id,
      $noticeItemId: input.noticeItemId,
      $fetchedAt: fetchedAt,
      $contentHash: input.contentHash,
      $normalizedText: input.normalizedText
    }
  );
  return { id, fetchedAt, inserted: true };
}

export function upsertDiff(
  db: SqlJsDatabase,
  input: {
    noticeItemId: string;
    fromSnapshotId: string;
    toSnapshotId: string;
    diffJson: NoticeDiffBlock[];
  }
) {
  const existing = oneRow(db, "SELECT id FROM notice_diff WHERE from_snapshot_id = $f AND to_snapshot_id = $t", {
    $f: input.fromSnapshotId,
    $t: input.toSnapshotId
  });
  const now = new Date().toISOString();
  const diffJsonText = JSON.stringify(input.diffJson);

  if (existing?.id) {
    db.run("UPDATE notice_diff SET diff_json = $d WHERE id = $id", {
      $id: String(existing.id),
      $d: diffJsonText
    });
    return { id: String(existing.id), inserted: false };
  }

  const id = randomUUID();
  db.run(
    `
      INSERT INTO notice_diff (id, notice_item_id, from_snapshot_id, to_snapshot_id, diff_json, created_at)
      VALUES ($id, $n, $f, $t, $d, $now)
      `,
    {
      $id: id,
      $n: input.noticeItemId,
      $f: input.fromSnapshotId,
      $t: input.toSnapshotId,
      $d: diffJsonText,
      $now: now
    }
  );
  return { id, inserted: true };
}

export function getLatestDiff(db: SqlJsDatabase, noticeItemId: string) {
  const row = oneRow(
    db,
    `
      SELECT id, created_at, diff_json, from_snapshot_id, to_snapshot_id
      FROM notice_diff
      WHERE notice_item_id = $id
      ORDER BY created_at DESC
      LIMIT 1
      `,
    { $id: noticeItemId }
  );
  if (!row) return null;
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    diffJson: safeJsonParse(String(row.diff_json)),
    fromSnapshotId: String(row.from_snapshot_id),
    toSnapshotId: String(row.to_snapshot_id)
  };
}

export function getNotice(db: SqlJsDatabase, noticeItemId: string) {
  const row = oneRow(
    db,
    `
      SELECT id, source, external_id, url, title, published_at, updated_at
      FROM notice_item
      WHERE id = $id
      LIMIT 1
      `,
    { $id: noticeItemId }
  );
  if (!row) return null;
  return {
    id: String(row.id),
    source: row.source as NoticeSource,
    externalId: String(row.external_id),
    url: String(row.url),
    title: String(row.title),
    publishedAt: row.published_at ? String(row.published_at) : null,
    updatedAt: String(row.updated_at)
  } satisfies NoticeListItem;
}
