import type { NoticeSource } from "@aion2/db";
import { PAGINATION } from "@aion2/constants";
import { parseIsoDate } from "@aion2/notices-client";

import { buildLineDiffJson } from "./diff.js";
import { normalizeAndHashNoticeHtml } from "./normalize.js";
import { fetchArticleDetail, fetchLatestArticleMetas, type PlayncBoardAlias } from "./plaync.js";
import { prismaNoticeSyncRepo, type NoticeSyncRepo } from "./repo.js";

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

export async function syncNotices(
  partial: Partial<SyncNoticesOptions> = {},
  deps: { repo?: NoticeSyncRepo } = {}
) {
  const repo = deps.repo ?? prismaNoticeSyncRepo;

  const options: SyncNoticesOptions = {
    sources: ["NOTICE", "UPDATE"],
    maxPages: PAGINATION.NOTICES_SYNC_DEFAULT_MAX_PAGES,
    pageSize: PAGINATION.NOTICES_SYNC_DEFAULT_PAGE_SIZE,
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
      const existingLatest = options.dryRun ? null : await repo.findLatestSnapshot({ source, externalId: meta.id });

      const detail = await fetchArticleDetail(alias, meta.id);
      const publishedAtIso = parseIsoDate(detail.publishedAt ?? detail.postedAt);
      const publishedAt = publishedAtIso ? new Date(publishedAtIso) : null;

      const { normalizedText, contentHash } = normalizeAndHashNoticeHtml(detail.contentHtml);

      if (options.dryRun) {
        continue;
      }

      const item = await repo.upsertItem({
        source,
        externalId: detail.id,
        url: detail.url,
        title: detail.title,
        publishedAt
      });
      totals.itemsUpserted += 1;

      const snapshot = await repo.upsertSnapshot({ noticeItemId: item.id, contentHash, normalizedText });
      totals.snapshotsUpserted += 1;

      if (!existingLatest) continue;
      if (existingLatest.contentHash === contentHash) continue;
      if (existingLatest.id === snapshot.id) continue;

      const diffJson = buildLineDiffJson(existingLatest.normalizedText, normalizedText);

      await repo.upsertDiff({
        noticeItemId: item.id,
        fromSnapshotId: existingLatest.id,
        toSnapshotId: snapshot.id,
        diffJson
      });
      totals.diffsUpserted += 1;
    }
  }

  return totals;
}
