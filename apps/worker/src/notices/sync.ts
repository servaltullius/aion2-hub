import { prisma, type NoticeSource } from "@aion2/db";

import { buildLineDiffJson } from "./diff.js";
import { normalizeAndHashNoticeHtml } from "./normalize.js";
import { fetchArticleDetail, fetchLatestArticleMetas, type PlayncBoardAlias } from "./plaync.js";

export type SyncNoticesOptions = {
  sources: NoticeSource[];
  maxPages: number;
  pageSize: number;
  includePinned: boolean;
  dryRun: boolean;
};

const SOURCE_TO_ALIAS: Record<NoticeSource, PlayncBoardAlias> = {
  NOTICE: "notice_ko",
  UPDATE: "update_ko"
};

function parseDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function syncNotices(partial: Partial<SyncNoticesOptions> = {}) {
  const options: SyncNoticesOptions = {
    sources: ["NOTICE", "UPDATE"],
    maxPages: 5,
    pageSize: 18,
    includePinned: true,
    dryRun: false,
    ...partial
  };

  const totals = {
    sources: options.sources.length,
    metasFetched: 0,
    itemsUpserted: 0,
    snapshotsUpserted: 0,
    diffsUpserted: 0
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
      const existingLatest = options.dryRun
        ? null
        : await prisma.noticeSnapshot.findFirst({
            where: {
              noticeItem: {
                source,
                externalId: meta.id
              }
            },
            orderBy: { fetchedAt: "desc" },
            select: { id: true, contentHash: true, normalizedText: true }
          });

      const detail = await fetchArticleDetail(alias, meta.id);
      const publishedAt = parseDate(detail.publishedAt ?? detail.postedAt);

      const { normalizedText, contentHash } = normalizeAndHashNoticeHtml(detail.contentHtml);

      if (options.dryRun) {
        continue;
      }

      const item = await prisma.noticeItem.upsert({
        where: { source_externalId: { source, externalId: detail.id } },
        create: {
          source,
          externalId: detail.id,
          url: detail.url,
          title: detail.title,
          publishedAt
        },
        update: {
          url: detail.url,
          title: detail.title,
          publishedAt
        }
      });
      totals.itemsUpserted += 1;

      const snapshot = await prisma.noticeSnapshot.upsert({
        where: { noticeItemId_contentHash: { noticeItemId: item.id, contentHash } },
        create: { noticeItemId: item.id, contentHash, normalizedText },
        update: {}
      });
      totals.snapshotsUpserted += 1;

      if (!existingLatest) continue;
      if (existingLatest.contentHash === contentHash) continue;
      if (existingLatest.id === snapshot.id) continue;

      const diffJson = buildLineDiffJson(existingLatest.normalizedText, normalizedText);

      await prisma.noticeDiff.upsert({
        where: {
          fromSnapshotId_toSnapshotId: {
            fromSnapshotId: existingLatest.id,
            toSnapshotId: snapshot.id
          }
        },
        create: {
          noticeItemId: item.id,
          fromSnapshotId: existingLatest.id,
          toSnapshotId: snapshot.id,
          diffJson
        },
        update: { diffJson }
      });
      totals.diffsUpserted += 1;
    }
  }

  return totals;
}
