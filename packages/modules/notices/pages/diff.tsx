"use client";

import { useEffect, useMemo, useState } from "react";

type NoticeItem = {
  id: string;
  source: "NOTICE" | "UPDATE";
  externalId: string;
  url: string;
  title: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SnapshotMeta = {
  id: string;
  fetchedAt: string;
  contentHash: string;
};

type DetailResponse = {
  item: NoticeItem;
  latestSnapshot: SnapshotMeta | null;
};

type DiffBlock =
  | { type: "same"; lines: string[] }
  | { type: "added"; lines: string[] }
  | { type: "removed"; lines: string[] };

type DiffResponse = {
  diff:
    | {
        id: string;
        createdAt: string;
        diffJson: unknown;
        fromSnapshot: SnapshotMeta;
        toSnapshot: SnapshotMeta;
      }
    | null;
};

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

function asBlocks(value: unknown): DiffBlock[] | null {
  if (!Array.isArray(value)) return null;
  const blocks: DiffBlock[] = [];
  for (const b of value) {
    if (!b || typeof b !== "object") return null;
    const obj = b as Record<string, unknown>;
    const type = obj.type;
    const lines = obj.lines;
    if (type !== "same" && type !== "added" && type !== "removed") return null;
    if (!Array.isArray(lines) || !lines.every((l) => typeof l === "string")) return null;
    blocks.push({ type, lines } as DiffBlock);
  }
  return blocks;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function NoticesDiffPage() {
  const [noticeId, setNoticeId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNoticeId(params.get("id"));
  }, []);

  const detailUrl = useMemo(
    () => (noticeId ? `${apiBaseUrl()}/api/v1/notices/${encodeURIComponent(noticeId)}` : null),
    [noticeId]
  );
  const diffUrl = useMemo(
    () => (noticeId ? `${apiBaseUrl()}/api/v1/notices/${encodeURIComponent(noticeId)}/diff` : null),
    [noticeId]
  );

  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [diff, setDiff] = useState<DiffResponse["diff"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detailUrl || !diffUrl) return;
    const abort = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(detailUrl, { signal: abort.signal }).then(async (res) => {
        if (res.status === 404) throw new Error("not_found");
        if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
        return (await res.json()) as DetailResponse;
      }),
      fetch(diffUrl, { signal: abort.signal }).then(async (res) => {
        if (res.status === 404) throw new Error("not_found");
        if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
        return (await res.json()) as DiffResponse;
      })
    ])
      .then(([detailJson, diffJson]) => {
        setDetail(detailJson);
        setDiff(diffJson.diff);
      })
      .catch((e: unknown) => {
        if (abort.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setDetail(null);
        setDiff(null);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });

    return () => abort.abort();
  }, [detailUrl, diffUrl]);

  const blocks = diff ? asBlocks(diff.diffJson) : null;

  if (!noticeId) {
    return (
      <main>
        <p>
          Missing <code>?id=</code>. Go back to <a href="/m/notices/feed">feed</a>.
        </p>
      </main>
    );
  }

  return (
    <main>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/m/notices/feed">← Back to feed</a>
        {detail?.item?.url ? (
          <a href={detail.item.url} target="_blank" rel="noreferrer">
            원문 열기
          </a>
        ) : null}
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? (
        <p style={{ color: "crimson" }}>
          {error} (API: <code>{apiBaseUrl()}</code>)
        </p>
      ) : null}

      {detail ? (
        <div style={{ margin: "12px 0" }}>
          <div style={{ fontWeight: 700 }}>{detail.item.title}</div>
          <div style={{ opacity: 0.8 }}>
            latest snapshot:{" "}
            {detail.latestSnapshot ? formatDate(detail.latestSnapshot.fetchedAt) : "none"}
          </div>
        </div>
      ) : null}

      {diff === null ? (
        <p style={{ opacity: 0.8 }}>No diff yet for this item.</p>
      ) : diff && !blocks ? (
        <p style={{ color: "crimson" }}>Diff payload has unexpected shape.</p>
      ) : diff && blocks ? (
        <div>
          <div style={{ opacity: 0.8, marginBottom: 8 }}>
            diff created: {formatDate(diff.createdAt)} · from {formatDate(diff.fromSnapshot.fetchedAt)} →
            to {formatDate(diff.toSnapshot.fetchedAt)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {blocks.map((b, idx) => {
              if (b.type === "same") {
                return (
                  <details key={idx} style={{ border: "1px solid #ddd", padding: 8 }}>
                    <summary style={{ cursor: "pointer" }}>{b.lines.length} lines unchanged</summary>
                    <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
                      {b.lines.join("\n")}
                    </pre>
                  </details>
                );
              }

              const bg = b.type === "added" ? "#e8fff0" : "#ffecec";
              const prefix = b.type === "added" ? "+" : "-";
              return (
                <pre
                  key={idx}
                  style={{
                    margin: 0,
                    padding: 10,
                    border: "1px solid #ddd",
                    background: bg,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {b.lines.map((line) => `${prefix} ${line}`).join("\n")}
                </pre>
              );
            })}
          </div>
        </div>
      ) : null}
    </main>
  );
}

