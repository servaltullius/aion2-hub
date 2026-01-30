import {
  fetchArticleDetail as fetchArticleDetailBase,
  fetchLatestArticleMetas as fetchLatestArticleMetasBase,
  fetchMoreArticleMetas as fetchMoreArticleMetasBase,
  fetchPinnedArticleMetas as fetchPinnedArticleMetasBase,
  type PlayncBoardAlias
} from "@aion2/notices-client";

export type { PlayncArticleDetail, PlayncArticleMeta, PlayncBoardAlias } from "@aion2/notices-client";

const FETCH_OPTIONS = { userAgent: "aion2-hub/0.1 (notices-sync)" } as const;

export async function fetchPinnedArticleMetas(alias: PlayncBoardAlias) {
  return await fetchPinnedArticleMetasBase(alias, FETCH_OPTIONS);
}

export async function fetchMoreArticleMetas(
  alias: PlayncBoardAlias,
  previousArticleId: string | 0,
  moreSize: number
) {
  return await fetchMoreArticleMetasBase(alias, previousArticleId, moreSize, FETCH_OPTIONS);
}

export async function fetchLatestArticleMetas(
  alias: PlayncBoardAlias,
  options: { maxPages: number; pageSize: number; includePinned: boolean }
) {
  return await fetchLatestArticleMetasBase(alias, options, FETCH_OPTIONS);
}

export async function fetchArticleDetail(alias: PlayncBoardAlias, articleId: string) {
  return await fetchArticleDetailBase(alias, articleId, FETCH_OPTIONS);
}
