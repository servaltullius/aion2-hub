import type { DesktopDb, NoticeSource } from "../storage/db.js";

import { buildLineDiffJson } from "./diff.js";
import { normalizeAndHashNoticeHtml } from "./normalize.js";
import {
  fetchArticleDetail,
  fetchLatestArticleMetas,
  type PlayncBoardAlias,
  type PlayncArticleMeta
} from "./plaync.js";

export type SyncNoticesOptions = {
  sources: NoticeSource[];
  maxPages: number;
  pageSize: number;
  includePinned: boolean;
};

const SOURCE_TO_ALIAS: Record<NoticeSource, PlayncBoardAlias> = {
  NOTICE: "notice_ko",
  UPDATE: "update_ko"
};

function parseIsoDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function effectiveUpdatedAt(meta: PlayncArticleMeta) {
  return parseIsoDate(meta.updatedAt) ?? parseIsoDate(meta.publishedAt);
}

export async function syncNotices(db: DesktopDb, partial: Partial<SyncNoticesOptions> = {}) {
  const options: SyncNoticesOptions = {
    sources: ["NOTICE", "UPDATE"],
    maxPages: 1,
    pageSize: 18,
    includePinned: true,
    ...partial
  };

  const totals = {
    sources: options.sources.length,
    metasFetched: 0,
    detailsFetched: 0,
    itemsUpserted: 0,
    snapshotsInserted: 0,
    diffsInserted: 0,
    skipped: 0
  };

  for (const source of options.sources) {
    const alias = SOURCE_TO_ALIAS[source];
    const metas = await fetchLatestArticleMetas(alias, {
      maxPages: options.maxPages,
      pageSize: options.pageSize,
      includePinned: options.includePinned
    });
    totals.metasFetched += metas.length;

    for (const meta of metas) {
      const metaUpdatedAt = effectiveUpdatedAt(meta);
      const existing = db.getNoticeItemByExternalId({ source, externalId: meta.id });
      if (existing && metaUpdatedAt && existing.updatedAt === metaUpdatedAt) {
        const latestSnapshot = db.getLatestSnapshot(existing.id);
        if (latestSnapshot) {
          totals.skipped += 1;
          continue;
        }
      }

      const detail = await fetchArticleDetail(alias, meta.id);
      totals.detailsFetched += 1;

      const publishedAt = parseIsoDate(detail.publishedAt ?? detail.postedAt);
      const updatedAt = metaUpdatedAt ?? parseIsoDate(detail.updatedAt);

      const itemId = db.upsertNoticeItem({
        source,
        externalId: detail.id,
        url: detail.url,
        title: detail.title,
        publishedAt,
        updatedAt
      });
      totals.itemsUpserted += 1;

      const before = db.getLatestSnapshot(itemId);
      const { normalizedText, contentHash } = normalizeAndHashNoticeHtml(detail.contentHtml);
      const snapshot = db.upsertSnapshot({ noticeItemId: itemId, contentHash, normalizedText });
      if (snapshot.inserted) totals.snapshotsInserted += 1;

      if (!before) continue;
      if (before.contentHash === contentHash) continue;
      if (before.id === snapshot.id) continue;

      const diffJson = buildLineDiffJson(before.normalizedText, normalizedText);
      const diff = db.upsertDiff({
        noticeItemId: itemId,
        fromSnapshotId: before.id,
        toSnapshotId: snapshot.id,
        diffJson
      });
      if (diff.inserted) totals.diffsInserted += 1;
    }
  }

  await db.persist();
  return totals;
}
