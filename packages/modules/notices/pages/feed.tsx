"use client";

import { useEffect, useMemo, useState } from "react";

type NoticeSourceFilter = "all" | "notice" | "update";

type NoticeListItem = {
  id: string;
  source: "NOTICE" | "UPDATE";
  externalId: string;
  url: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
};

type NoticeListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: NoticeListItem[];
};

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function sourceLabel(source: NoticeListItem["source"]) {
  return source === "NOTICE" ? "공지" : "업데이트";
}

export default function NoticesFeedPage() {
  const [source, setSource] = useState<NoticeSourceFilter>("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [data, setData] = useState<NoticeListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (source !== "all") params.set("source", source);
    if (q.trim()) params.set("q", q.trim());

    return `${apiBaseUrl()}/api/v1/notices?${params.toString()}`;
  }, [page, pageSize, q, source]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);

    fetch(url, { signal: abort.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
        return (await res.json()) as NoticeListResponse;
      })
      .then((json) => setData(json))
      .catch((e: unknown) => {
        if (abort.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setData(null);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });

    return () => abort.abort();
  }, [url]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          <span style={{ marginRight: 6 }}>분류</span>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as NoticeSourceFilter);
              setPage(1);
            }}
          >
            <option value="all">전체</option>
            <option value="notice">공지</option>
            <option value="update">업데이트</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span>검색</span>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="제목 검색"
          />
        </label>
        <button
          onClick={() => {
            setQ(qInput);
            setPage(1);
          }}
        >
          Search
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {data ? (
            <span>
              total {data.total} · page {data.page}/{totalPages}
            </span>
          ) : (
            <span />
          )}
        </div>
      </div>

      {error ? (
        <p style={{ color: "crimson" }}>
          {error} (API: <code>{apiBaseUrl()}</code>)
        </p>
      ) : null}

      {loading ? <p>Loading…</p> : null}

      {data?.items?.length ? (
        <ul style={{ paddingLeft: 18 }}>
          {data.items.map((item) => (
            <li key={item.id} style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ opacity: 0.7 }}>{sourceLabel(item.source)}</span>
                <span style={{ opacity: 0.7 }}>{formatDate(item.publishedAt)}</span>
                <a href={item.url} target="_blank" rel="noreferrer">
                  원문
                </a>
                <a href={`/m/notices/diff?id=${encodeURIComponent(item.id)}`}>diff</a>
              </div>
              <div>{item.title}</div>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p style={{ opacity: 0.8 }}>
          No items yet. 먼저 Worker에서 <code>pnpm --filter worker notices:sync</code> 를 실행하세요.
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <button
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </main>
  );
}
