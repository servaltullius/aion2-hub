import { useEffect, useMemo, useState } from "react";

import { Badge } from "./components/ui/badge.js";
import { Button } from "./components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card.js";

type DiffBlock =
  | { type: "same"; lines: string[] }
  | { type: "added"; lines: string[] }
  | { type: "removed"; lines: string[] };

type NoticeItem = {
  id: string;
  source: "NOTICE" | "UPDATE";
  externalId: string;
  url: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
};

type LatestDiff = {
  id: string;
  createdAt: string;
  diffJson: unknown;
  fromSnapshotId: string;
  toSnapshotId: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asNoticeItem(value: unknown): NoticeItem | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string") return null;
  if (value.source !== "NOTICE" && value.source !== "UPDATE") return null;
  if (typeof value.externalId !== "string") return null;
  if (typeof value.url !== "string") return null;
  if (typeof value.title !== "string") return null;
  if (typeof value.updatedAt !== "string") return null;
  if (value.publishedAt !== null && typeof value.publishedAt !== "string") return null;
  return {
    id: value.id,
    source: value.source,
    externalId: value.externalId,
    url: value.url,
    title: value.title,
    publishedAt: value.publishedAt as string | null,
    updatedAt: value.updatedAt
  };
}

function asLatestDiff(value: unknown): LatestDiff | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.createdAt !== "string") return null;
  if (typeof value.fromSnapshotId !== "string") return null;
  if (typeof value.toSnapshotId !== "string") return null;
  return {
    id: value.id,
    createdAt: value.createdAt,
    diffJson: value.diffJson,
    fromSnapshotId: value.fromSnapshotId,
    toSnapshotId: value.toSnapshotId
  };
}

function asBlocks(value: unknown): DiffBlock[] | null {
  if (!Array.isArray(value)) return null;
  const out: DiffBlock[] = [];
  for (const b of value) {
    if (!isObject(b)) return null;
    if (b.type !== "same" && b.type !== "added" && b.type !== "removed") return null;
    if (!Array.isArray(b.lines) || !b.lines.every((l) => typeof l === "string")) return null;
    out.push({ type: b.type, lines: b.lines } as DiffBlock);
  }
  return out;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function DiffPage(props: { id: string }) {
  const noticeId = props.id;

  const [item, setItem] = useState<NoticeItem | null>(null);
  const [diff, setDiff] = useState<LatestDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const rawItem = await window.aion2Hub.notices.get(noticeId);
        const parsedItem = asNoticeItem(rawItem);
        if (!parsedItem) throw new Error("not_found");
        setItem(parsedItem);

        const rawDiff = await window.aion2Hub.notices.getLatestDiff(noticeId);
        setDiff(rawDiff ? asLatestDiff(rawDiff) : null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
        setItem(null);
        setDiff(null);
      } finally {
        setLoading(false);
      }
    },
    [noticeId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const blocks = diff ? asBlocks(diff.diffJson) : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a className="text-sm text-muted-foreground hover:text-foreground" href="#/m/notices/feed">
          ← Back
        </a>
        {item?.url ? (
          <a className="text-sm text-primary hover:underline" href={item.url} target="_blank" rel="noreferrer">
            원문 열기
          </a>
        ) : null}
        <Button className="ml-auto" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          Reload
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {item ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.source === "NOTICE" ? "secondary" : "muted"}>
                {item.source === "NOTICE" ? "공지" : "업데이트"}
              </Badge>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </div>
            <CardDescription>
              published: {formatDate(item.publishedAt)} · updated: {formatDate(item.updatedAt)}
            </CardDescription>
          </CardHeader>
          {diff ? (
            <CardContent>
              <div className="text-sm text-muted-foreground">diff created: {formatDate(diff.createdAt)}</div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {diff === null ? (
        <p className="text-sm text-muted-foreground">No diff yet for this item.</p>
      ) : diff && !blocks ? (
        <p className="text-sm text-destructive">Diff payload has unexpected shape.</p>
      ) : diff && blocks ? (
        <div className="space-y-2">
          {blocks.map((b, idx) => {
            if (b.type === "same") {
              return (
                <details
                  key={idx}
                  className="rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
                >
                  <summary className="cursor-pointer select-none">
                    {b.lines.length} lines unchanged
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md border bg-background/30 p-3 font-mono text-xs text-foreground">
                    {b.lines.join("\n")}
                  </pre>
                </details>
              );
            }

            const prefix = b.type === "added" ? "+" : "-";
            const blockClass =
              b.type === "added"
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-destructive/30 bg-destructive/10 text-foreground";
            return (
              <pre
                key={idx}
                className={`whitespace-pre-wrap rounded-lg border p-3 font-mono text-xs ${blockClass}`}
              >
                {b.lines.map((line) => `${prefix} ${line}`).join("\n")}
              </pre>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
