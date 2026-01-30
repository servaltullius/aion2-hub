import { useEffect, useMemo, useState } from "react";

import { Badge } from "./components/ui/badge.js";
import { Button } from "./components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card.js";
import { Input } from "./components/ui/input.js";
import { Label } from "./components/ui/label.js";
import { Select } from "./components/ui/select.js";

type NoticeSource = "NOTICE" | "UPDATE";
type SourceFilter = "all" | NoticeSource;

type NoticeListItem = {
  id: string;
  source: NoticeSource;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asListResponse(value: unknown): NoticeListResponse | null {
  if (!isObject(value)) return null;
  const page = value.page;
  const pageSize = value.pageSize;
  const total = value.total;
  const items = value.items;
  if (typeof page !== "number" || typeof pageSize !== "number" || typeof total !== "number") return null;
  if (!Array.isArray(items)) return null;
  const parsed: NoticeListItem[] = [];
  for (const it of items) {
    if (!isObject(it)) return null;
    if (typeof it.id !== "string") return null;
    if (it.source !== "NOTICE" && it.source !== "UPDATE") return null;
    if (typeof it.externalId !== "string") return null;
    if (typeof it.url !== "string") return null;
    if (typeof it.title !== "string") return null;
    if (typeof it.updatedAt !== "string") return null;
    if (it.publishedAt !== null && typeof it.publishedAt !== "string") return null;
    parsed.push({
      id: it.id,
      source: it.source,
      externalId: it.externalId,
      url: it.url,
      title: it.title,
      publishedAt: it.publishedAt,
      updatedAt: it.updatedAt
    });
  }
  return { page, pageSize, total, items: parsed };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function sourceLabel(source: NoticeSource) {
  return source === "NOTICE" ? "공지" : "업데이트";
}

export function FeedPage() {
  const [source, setSource] = useState<SourceFilter>("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [data, setData] = useState<NoticeListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useMemo(() => {
    const input: Record<string, unknown> = { page, pageSize };
    if (source !== "all") input.source = source;
    if (q.trim()) input.q = q.trim();
    return input;
  }, [page, pageSize, q, source]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    window.aion2Hub.notices
      .list(request)
      .then((raw) => {
        const parsed = asListResponse(raw);
        if (!parsed) throw new Error("unexpected_response");
        setData(parsed);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "error");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [request]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notices</h2>
          <p className="text-sm text-muted-foreground">공식 공지/업데이트 피드 + 최신 diff.</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {data ? (
            <span>
              total {data.total} · page {data.page}/{totalPages}
            </span>
          ) : (
            <span />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>필터/검색 후 Sync now로 갱신할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>분류</Label>
              <Select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value as SourceFilter);
                  setPage(1);
                }}
              >
                <option value="all">전체</option>
                <option value="NOTICE">공지</option>
                <option value="UPDATE">업데이트</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>검색</Label>
              <div className="flex gap-2">
                <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="제목 검색" />
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ(qInput);
                    setPage(1);
                  }}
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {data?.items?.length ? (
        <div className="space-y-2">
          {data.items.map((item) => (
            <Card key={item.id} className="bg-background/40">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.source === "NOTICE" ? "secondary" : "muted"}>{sourceLabel(item.source)}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(item.publishedAt)}</span>
                  <span className="mx-1 opacity-50">·</span>
                  <a className="text-sm text-primary hover:underline" href={item.url} target="_blank" rel="noreferrer">
                    원문
                  </a>
                  <a
                    className="text-sm text-primary hover:underline"
                    href={`#/m/notices/diff?id=${encodeURIComponent(item.id)}`}
                  >
                    diff
                  </a>
                </div>
                <div className="mt-2 text-sm font-medium">{item.title}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !loading ? (
        <p className="text-sm text-muted-foreground">No items yet. (자동 sync는 실행 후 30분마다 갱신됩니다)</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
