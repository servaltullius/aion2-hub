export type PlayncBoardAlias = "notice_ko" | "update_ko";

export type PlayncArticleMeta = {
  id: string;
  title: string;
  updatedAt?: string;
  publishedAt?: string;
  url: string;
};

export type PlayncArticleDetail = PlayncArticleMeta & {
  contentHtml: string;
  postedAt?: string;
};

const API_BASE = "https://api-community.plaync.com/aion2/board";

function buildFallbackUrl(alias: PlayncBoardAlias, articleId: string) {
  const board = alias.startsWith("update") ? "update" : "notice";
  return `https://aion2.plaync.com/ko-kr/board/${board}/view?articleId=${encodeURIComponent(articleId)}`;
}

function buildArticleUrl(urlPattern: unknown, alias: PlayncBoardAlias, articleId: string) {
  if (typeof urlPattern === "string" && urlPattern.includes("{articleId}")) {
    return urlPattern.replace("{articleId}", articleId);
  }
  return buildFallbackUrl(alias, articleId);
}

function toMeta(alias: PlayncBoardAlias, raw: unknown): PlayncArticleMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = obj.id;
  const title = obj.title;

  const timestamps = obj.timestamps as Record<string, unknown> | undefined;
  const updatedAt = typeof timestamps?.updatedAt === "string" ? timestamps.updatedAt : undefined;
  const publishedAt = typeof timestamps?.publishedAt === "string" ? timestamps.publishedAt : undefined;

  const categoryBoard = obj.categoryBoard as Record<string, unknown> | undefined;
  const urlPattern = categoryBoard?.boardUrlPattern;

  if (typeof id !== "string" || typeof title !== "string") return null;

  const meta: PlayncArticleMeta = {
    id,
    title,
    url: buildArticleUrl(urlPattern, alias, id)
  };
  if (updatedAt) meta.updatedAt = updatedAt;
  if (publishedAt) meta.publishedAt = publishedAt;
  return meta;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "aion2-hub-desktop/0.1 (notices-sync)"
    }
  });

  if (!res.ok) {
    throw new Error(`PlayNC API request failed: ${res.status} ${res.statusText} url=${url}`);
  }

  return (await res.json()) as unknown;
}

export async function fetchPinnedArticleMetas(alias: PlayncBoardAlias) {
  const url = `${API_BASE}/${alias}/noticeArticle`;
  const data = (await fetchJson(url)) as { noticesList?: unknown[] };

  const list = Array.isArray(data.noticesList) ? data.noticesList : [];
  const metas: PlayncArticleMeta[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const meta = toMeta(alias, (item as Record<string, unknown>).articleMeta);
    if (meta) metas.push(meta);
  }

  return metas;
}

export async function fetchMoreArticleMetas(
  alias: PlayncBoardAlias,
  previousArticleId: string | 0,
  moreSize: number
) {
  const params = new URLSearchParams({
    isVote: "true",
    moreSize: String(moreSize),
    moreDirection: "BEFORE",
    previousArticleId: String(previousArticleId)
  });

  const url = `${API_BASE}/${alias}/article/search/moreArticle?${params.toString()}`;
  const data = (await fetchJson(url)) as { contentList?: unknown[]; hasMore?: boolean };

  const list = Array.isArray(data.contentList) ? data.contentList : [];
  const metas = list.map((r) => toMeta(alias, r)).filter((m): m is PlayncArticleMeta => m !== null);

  return { metas, hasMore: Boolean(data.hasMore) };
}

export async function fetchLatestArticleMetas(
  alias: PlayncBoardAlias,
  options: { maxPages: number; pageSize: number; includePinned: boolean }
) {
  const { maxPages, pageSize, includePinned } = options;

  const pinned = includePinned ? await fetchPinnedArticleMetas(alias) : [];
  const byId = new Map<string, PlayncArticleMeta>();
  for (const meta of pinned) byId.set(meta.id, meta);

  let previousArticleId: string | 0 = 0;
  let page = 0;

  while (page < maxPages) {
    const { metas, hasMore } = await fetchMoreArticleMetas(alias, previousArticleId, pageSize);
    for (const meta of metas) byId.set(meta.id, meta);

    if (!hasMore || metas.length === 0) break;
    previousArticleId = metas.at(-1)?.id ?? previousArticleId;
    page += 1;
  }

  return [...byId.values()];
}

export async function fetchArticleDetail(alias: PlayncBoardAlias, articleId: string) {
  const url = `${API_BASE}/${alias}/article/${articleId}`;
  const data = (await fetchJson(url)) as {
    article?: { contentMeta?: unknown; content?: { content?: unknown } };
  };

  const meta = toMeta(alias, data.article?.contentMeta);
  if (!meta) throw new Error(`unexpected PlayNC detail shape (missing meta) articleId=${articleId}`);

  const contentHtml = data.article?.content?.content;
  if (typeof contentHtml !== "string") {
    throw new Error(`unexpected PlayNC detail shape (missing HTML) articleId=${articleId}`);
  }

  const timestamps = (data.article?.contentMeta as Record<string, unknown> | undefined)?.timestamps as
    | Record<string, unknown>
    | undefined;
  const postedAt = typeof timestamps?.postedAt === "string" ? timestamps.postedAt : undefined;

  const detail: PlayncArticleDetail = { ...meta, contentHtml };
  if (postedAt) detail.postedAt = postedAt;
  return detail;
}

