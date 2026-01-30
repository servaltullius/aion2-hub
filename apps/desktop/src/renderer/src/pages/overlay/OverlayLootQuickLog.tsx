import { useEffect, useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { computeDurationSeconds, formatDurationSeconds } from "../../planner/duration.js";

type RunListItem = { content: string };

function asRuns(value: unknown): RunListItem[] | null {
  if (!Array.isArray(value)) return null;
  const out: RunListItem[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") return null;
    const obj = v as Record<string, unknown>;
    if (typeof obj.content !== "string") return null;
    out.push({ content: obj.content });
  }
  return out;
}

type DropRow = { itemName: string; qty: string };
type CostRow =
  | { kind: "KINAH"; kinah: string; note: string }
  | { kind: "ITEM"; itemName: string; qty: string; note: string };

export function OverlayLootQuickLog(props: { activeCharacterId: string | null }) {
  const [content, setContent] = useState("");
  const [role, setRole] = useState("");
  const [powerBracket, setPowerBracket] = useState("");

  const [drops, setDrops] = useState<DropRow[]>([{ itemName: "", qty: "1" }]);
  const [costs, setCosts] = useState<CostRow[]>([]);

  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [savedSeconds, setSavedSeconds] = useState<number | null>(null);

  const [recentContents, setRecentContents] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const effectiveSeconds = useMemo(() => {
    if (savedSeconds !== null) return savedSeconds;
    if (startedAtMs === null) return null;
    return computeDurationSeconds(startedAtMs, nowMs);
  }, [nowMs, savedSeconds, startedAtMs]);

  useEffect(() => {
    if (!props.activeCharacterId) {
      setRecentContents([]);
      return;
    }
    void (async () => {
      try {
        const raw = await window.aion2Hub.loot.listRuns({ characterId: props.activeCharacterId, limit: 50 });
        const parsed = asRuns(raw) ?? [];
        const uniq = new Set<string>();
        for (const r of parsed) {
          const name = r.content.trim();
          if (!name) continue;
          uniq.add(name);
          if (uniq.size >= 12) break;
        }
        setRecentContents([...uniq]);
      } catch {
        setRecentContents([]);
      }
    })();
  }, [props.activeCharacterId]);

  function addDropRow() {
    setDrops((prev) => [...prev, { itemName: "", qty: "1" }]);
  }

  function addCostRow(kind: "KINAH" | "ITEM") {
    if (kind === "KINAH") setCosts((prev) => [...prev, { kind: "KINAH", kinah: "0", note: "" }]);
    else setCosts((prev) => [...prev, { kind: "ITEM", itemName: "", qty: "1", note: "" }]);
  }

  function startTimer() {
    setError(null);
    setNotice(null);
    setSavedSeconds(null);
    setStartedAtMs(Date.now());
  }

  function stopTimer() {
    if (startedAtMs === null) return;
    const seconds = computeDurationSeconds(startedAtMs, Date.now());
    setSavedSeconds(seconds);
    setStartedAtMs(null);
  }

  function clearTimer() {
    setStartedAtMs(null);
    setSavedSeconds(null);
  }

  async function save() {
    if (!props.activeCharacterId) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setError("content_required");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const endedAtMs = Date.now();
      const seconds =
        savedSeconds !== null ? savedSeconds : startedAtMs !== null ? computeDurationSeconds(startedAtMs, endedAtMs) : null;

      const startedAtIso = startedAtMs !== null ? new Date(startedAtMs).toISOString() : null;
      const endedAtIso = startedAtMs !== null ? new Date(endedAtMs).toISOString() : null;

      const dropPayload = drops
        .map((d) => ({ itemName: d.itemName.trim(), qty: Number(d.qty) }))
        .filter((d) => d.itemName.length > 0)
        .map((d) => ({ itemName: d.itemName, qty: Number.isFinite(d.qty) && d.qty > 0 ? d.qty : 1 }));

      const costPayload = costs
        .map((c) => {
          if (c.kind === "KINAH") {
            const kinah = Number(c.kinah);
            return { kind: "KINAH" as const, kinah: Number.isFinite(kinah) ? kinah : 0, note: c.note.trim() || null };
          }
          const qty = Number(c.qty);
          return {
            kind: "ITEM" as const,
            itemName: c.itemName.trim() || null,
            qty: Number.isFinite(qty) ? qty : 0,
            note: c.note.trim() || null
          };
        })
        .filter((c) => (c.kind === "ITEM" ? Boolean(c.itemName) || Boolean(c.qty) : true));

      await window.aion2Hub.loot.createRun({
        characterId: props.activeCharacterId,
        content: trimmed,
        role: role.trim() || null,
        powerBracket: powerBracket.trim() || null,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        seconds,
        drops: dropPayload,
        costs: costPayload
      });

      setNotice("저장했습니다.");
      setSavedSeconds(null);
      setStartedAtMs(null);
      setDrops([{ itemName: "", qty: "1" }]);
      setCosts([]);

      setRecentContents((prev) => {
        const next = [trimmed, ...prev.filter((v) => v !== trimmed)];
        return next.slice(0, 12);
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  }

  if (!props.activeCharacterId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Loot Log</CardTitle>
          <CardDescription>캐릭터를 선택해 주세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Quick Loot Log</CardTitle>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => void save()}>
            Save
          </Button>
        </div>
        <CardDescription>원정/토벌 드랍을 빠르게 수동 기록합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Content</div>
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="예: 불의 신전" list="loot-content-suggest" />
          <datalist id="loot-content-suggest">
            {recentContents.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {recentContents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentContents.slice(0, 6).map((c) => (
                <Button key={c} size="sm" variant="outline" onClick={() => setContent(c)}>
                  {c}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Role</div>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="딜/탱/힐 (옵션)" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Power</div>
            <Input value={powerBracket} onChange={(e) => setPowerBracket(e.target.value)} placeholder="전투력 구간 (옵션)" />
          </div>
        </div>

        <div className="rounded-md border bg-background/30 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="muted">Timer</Badge>
              <span className="text-xs text-muted-foreground">{effectiveSeconds !== null ? formatDurationSeconds(effectiveSeconds) : "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              {startedAtMs === null ? (
                <Button size="sm" variant="outline" onClick={startTimer}>
                  Start
                </Button>
              ) : (
                <Button size="sm" onClick={stopTimer}>
                  Stop
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={clearTimer}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Drops</div>
            <Button size="sm" variant="outline" onClick={addDropRow}>
              + Drop
            </Button>
          </div>
          {drops.map((d, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_84px_44px] gap-2">
              <Input
                value={d.itemName}
                onChange={(e) => setDrops((prev) => prev.map((v, i) => (i === idx ? { ...v, itemName: e.target.value } : v)))}
                placeholder="아이템명"
              />
              <Input
                value={d.qty}
                onChange={(e) => setDrops((prev) => prev.map((v, i) => (i === idx ? { ...v, qty: e.target.value } : v)))}
                placeholder="수량"
              />
              <Button size="sm" variant="outline" onClick={() => setDrops((prev) => prev.filter((_, i) => i !== idx))}>
                -
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Costs</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => addCostRow("KINAH")}>
                + Kinah
              </Button>
              <Button size="sm" variant="outline" onClick={() => addCostRow("ITEM")}>
                + Item
              </Button>
            </div>
          </div>
          {costs.length === 0 ? <div className="text-sm text-muted-foreground">비용은 선택사항입니다.</div> : null}
          {costs.map((c, idx) => (
            <div key={idx} className="rounded-md border bg-background/30 p-2 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="muted">{c.kind}</Badge>
                <Button size="sm" variant="outline" onClick={() => setCosts((prev) => prev.filter((_, i) => i !== idx))}>
                  Remove
                </Button>
              </div>
              {c.kind === "KINAH" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={c.kinah}
                    onChange={(e) =>
                      setCosts((prev) => prev.map((v, i) => (i === idx && v.kind === "KINAH" ? { ...v, kinah: e.target.value } : v)))
                    }
                    placeholder="키나"
                  />
                  <Input
                    value={c.note}
                    onChange={(e) =>
                      setCosts((prev) => prev.map((v, i) => (i === idx && v.kind === "KINAH" ? { ...v, note: e.target.value } : v)))
                    }
                    placeholder="메모(옵션)"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={c.itemName}
                    onChange={(e) =>
                      setCosts((prev) =>
                        prev.map((v, i) => (i === idx && v.kind === "ITEM" ? { ...v, itemName: e.target.value } : v))
                      )
                    }
                    placeholder="아이템명"
                  />
                  <Input
                    value={c.qty}
                    onChange={(e) =>
                      setCosts((prev) => prev.map((v, i) => (i === idx && v.kind === "ITEM" ? { ...v, qty: e.target.value } : v)))
                    }
                    placeholder="수량"
                  />
                  <div className="col-span-2">
                    <Input
                      value={c.note}
                      onChange={(e) =>
                        setCosts((prev) => prev.map((v, i) => (i === idx && v.kind === "ITEM" ? { ...v, note: e.target.value } : v)))
                      }
                      placeholder="메모(옵션)"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {error ? <div className="text-xs text-destructive">{error}</div> : null}
        {notice ? <div className="text-xs text-muted-foreground">{notice}</div> : null}
      </CardContent>
    </Card>
  );
}

