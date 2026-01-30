import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button, buttonVariants } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { isObject } from "../lib/guards.js";
import { cn } from "../lib/utils.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

type LootRunListItem = {
  id: string;
  content: string;
  seconds: number;
  endedAt: string | null;
  dropCount: number;
  costCount: number;
};

type LootRunDetail = {
  run: {
    id: string;
    content: string;
    seconds: number;
    endedAt: string | null;
    role: string | null;
    powerBracket: string | null;
  };
  drops: Array<{ itemName: string; qty: number }>;
  costs: Array<{ kind: "KINAH" | "ITEM"; itemName: string | null; qty: number; kinah: number }>;
};

type WeeklyReport = {
  weekStartIso: string;
  weekEndIso: string;
  server: string | null;
  totals: {
    runs: number;
    seconds: number;
    value: number;
    cost: number;
    net: number;
    valuePerHour: number;
    netPerHour: number;
    missingPriceItems: string[];
  };
  byContent: Array<{ content: string; runs: number; seconds: number; value: number; cost: number; net: number }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatHms(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m}m ${ss}s`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

function asRuns(value: unknown): LootRunListItem[] {
  if (!Array.isArray(value)) return [];
  const out: LootRunListItem[] = [];
  for (const v of value) {
    if (!isObject(v)) continue;
    const id = typeof v.id === "string" ? v.id : "";
    const content = typeof v.content === "string" ? v.content : "";
    const seconds = typeof v.seconds === "number" ? v.seconds : 0;
    const endedAt = v.endedAt === null || typeof v.endedAt === "string" ? (v.endedAt as string | null) : null;
    const dropCount = typeof v.dropCount === "number" ? v.dropCount : 0;
    const costCount = typeof v.costCount === "number" ? v.costCount : 0;
    if (!id || !content) continue;
    out.push({ id, content, seconds, endedAt, dropCount, costCount });
  }
  return out;
}

function asWeeklyReport(value: unknown): WeeklyReport | null {
  if (!isObject(value)) return null;
  const totalsRaw = isObject(value.totals) ? (value.totals as Record<string, unknown>) : null;
  const byContentRaw = Array.isArray(value.byContent) ? value.byContent : [];
  if (!totalsRaw) return null;
  const totals: WeeklyReport["totals"] = {
    runs: typeof totalsRaw.runs === "number" ? totalsRaw.runs : 0,
    seconds: typeof totalsRaw.seconds === "number" ? totalsRaw.seconds : 0,
    value: typeof totalsRaw.value === "number" ? totalsRaw.value : 0,
    cost: typeof totalsRaw.cost === "number" ? totalsRaw.cost : 0,
    net: typeof totalsRaw.net === "number" ? totalsRaw.net : 0,
    valuePerHour: typeof totalsRaw.valuePerHour === "number" ? totalsRaw.valuePerHour : 0,
    netPerHour: typeof totalsRaw.netPerHour === "number" ? totalsRaw.netPerHour : 0,
    missingPriceItems: Array.isArray(totalsRaw.missingPriceItems) ? (totalsRaw.missingPriceItems as string[]) : []
  };

  const byContent: WeeklyReport["byContent"] = [];
  for (const v of byContentRaw) {
    if (!isObject(v)) continue;
    const content = typeof v.content === "string" ? v.content : "";
    if (!content) continue;
    byContent.push({
      content,
      runs: typeof v.runs === "number" ? v.runs : 0,
      seconds: typeof v.seconds === "number" ? v.seconds : 0,
      value: typeof v.value === "number" ? v.value : 0,
      cost: typeof v.cost === "number" ? v.cost : 0,
      net: typeof v.net === "number" ? v.net : 0
    });
  }

  const weekStartIso = typeof value.weekStartIso === "string" ? value.weekStartIso : "";
  const weekEndIso = typeof value.weekEndIso === "string" ? value.weekEndIso : "";
  const server = value.server === null || typeof value.server === "string" ? (value.server as string | null) : null;
  return { weekStartIso, weekEndIso, server, totals, byContent };
}

function asRunDetail(value: unknown): LootRunDetail | null {
  if (!isObject(value)) return null;
  const runRaw = isObject(value.run) ? (value.run as Record<string, unknown>) : null;
  if (!runRaw) return null;
  const id = typeof runRaw.id === "string" ? runRaw.id : "";
  const content = typeof runRaw.content === "string" ? runRaw.content : "";
  if (!id || !content) return null;
  const run: LootRunDetail["run"] = {
    id,
    content,
    seconds: typeof runRaw.seconds === "number" ? runRaw.seconds : 0,
    endedAt: runRaw.endedAt === null || typeof runRaw.endedAt === "string" ? (runRaw.endedAt as string | null) : null,
    role: runRaw.role === null || typeof runRaw.role === "string" ? (runRaw.role as string | null) : null,
    powerBracket: runRaw.powerBracket === null || typeof runRaw.powerBracket === "string" ? (runRaw.powerBracket as string | null) : null
  };
  const dropsRaw = Array.isArray(value.drops) ? value.drops : [];
  const costsRaw = Array.isArray(value.costs) ? value.costs : [];
  const drops: LootRunDetail["drops"] = [];
  for (const d of dropsRaw) {
    if (!isObject(d)) continue;
    const itemName = typeof d.itemName === "string" ? d.itemName : "";
    const qty = typeof d.qty === "number" ? d.qty : 0;
    if (!itemName) continue;
    drops.push({ itemName, qty });
  }
  const costs: LootRunDetail["costs"] = [];
  for (const c of costsRaw) {
    if (!isObject(c)) continue;
    const kind = c.kind === "KINAH" || c.kind === "ITEM" ? c.kind : null;
    if (!kind) continue;
    const itemName = c.itemName === null || typeof c.itemName === "string" ? (c.itemName as string | null) : null;
    const qty = typeof c.qty === "number" ? c.qty : 0;
    const kinah = typeof c.kinah === "number" ? c.kinah : 0;
    costs.push({ kind, itemName, qty, kinah });
  }
  return { run, drops, costs };
}

type DropRow = { itemName: string; qty: number; note?: string | null };
type CostRow =
  | { kind: "KINAH"; kinah: number; note?: string | null }
  | { kind: "ITEM"; itemName: string; qty: number; note?: string | null };

export function LootLogbookPage(props: { activeCharacterId: string | null; characters: AppCharacter[] }) {
  const active = props.activeCharacterId
    ? props.characters.find((c) => c.id === props.activeCharacterId) ?? null
    : null;

  const [server, setServer] = useState(() => active?.server ?? "");

  const [content, setContent] = useState("");
  const [minutes, setMinutes] = useState<number>(0);
  const [role, setRole] = useState<string>("DPS");
  const [powerBracket, setPowerBracket] = useState("");

  const [drops, setDrops] = useState<DropRow[]>([{ itemName: "", qty: 1 }]);
  const [costs, setCosts] = useState<CostRow[]>([]);

  const [runs, setRuns] = useState<LootRunListItem[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<LootRunDetail | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (active?.server && !server) setServer(active.server);
  }, [active?.server, server]);

  const refresh = useMemo(
    () => async () => {
      setError(null);
      setNotice(null);
      if (!props.activeCharacterId) {
        setRuns([]);
        setReport(null);
        return;
      }
      try {
        const [rawRuns, rawReport] = await Promise.all([
          window.aion2Hub.loot.listRuns({ characterId: props.activeCharacterId, limit: 100 }),
          window.aion2Hub.loot.weeklyReport({ characterId: props.activeCharacterId, server: server.trim() || null })
        ]);
        setRuns(asRuns(rawRuns));
        setReport(asWeeklyReport(rawReport));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
        setRuns([]);
        setReport(null);
      }
    },
    [props.activeCharacterId, server]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openDetails(id: string) {
    setError(null);
    setNotice(null);
    setOpenRunId(id);
    setOpenRun(null);
    try {
      const raw = await window.aion2Hub.loot.getRun({ id });
      const parsed = asRunDetail(raw);
      setOpenRun(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  async function submitRun() {
    if (!props.activeCharacterId) return setError("no_character");
    const c = content.trim();
    if (!c) return setError("content_required");
    const seconds = Math.max(0, Math.floor((Number.isFinite(minutes) ? minutes : 0) * 60));
    const dropsClean = drops
      .map((d) => ({ itemName: d.itemName.trim(), qty: Number(d.qty), note: d.note ?? null }))
      .filter((d) => d.itemName && Number.isFinite(d.qty) && d.qty > 0);
    const costsClean = costs
      .map((cst) =>
        cst.kind === "KINAH"
          ? { kind: "KINAH" as const, kinah: Number(cst.kinah), note: cst.note ?? null }
          : { kind: "ITEM" as const, itemName: cst.itemName.trim(), qty: Number(cst.qty), note: cst.note ?? null }
      )
      .filter((cst) => (cst.kind === "KINAH" ? Number.isFinite(cst.kinah) && cst.kinah > 0 : cst.itemName && Number.isFinite(cst.qty) && cst.qty > 0));

    setError(null);
    setNotice(null);
    try {
      await window.aion2Hub.loot.createRun({
        characterId: props.activeCharacterId,
        content: c,
        seconds,
        role: role || null,
        powerBracket: powerBracket.trim() || null,
        drops: dropsClean,
        costs: costsClean
      });
      setContent("");
      setMinutes(0);
      setPowerBracket("");
      setDrops([{ itemName: "", qty: 1 }]);
      setCosts([]);
      setNotice("기록했습니다.");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  if (!props.activeCharacterId) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Loot Logbook</h2>
        <p className="text-sm text-muted-foreground">먼저 캐릭터를 추가해 주세요.</p>
        <a href="#/characters" className={cn(buttonVariants())}>
          Characters
        </a>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Loot Logbook</h2>
          <p className="text-sm text-muted-foreground">원정/토벌 드랍을 수동 기록하고 ROI를 리포트로 확인합니다.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="muted">character-scoped</Badge>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Report (This week)</CardTitle>
          <CardDescription>서버별 시세(수동 입력)를 기준으로 환산합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="loot-server">Server (prices)</Label>
              <Input
                id="loot-server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder={active?.server ? `예: ${active.server}` : "예: 이스라펠"}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-end gap-2">
              <Button variant="outline" onClick={() => void refresh()}>
                Refresh
              </Button>
              <a href="#/m/economy" className={cn(buttonVariants({ variant: "secondary" }))}>
                시세 입력
              </a>
            </div>
          </div>

          {report ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">기간</div>
                <div className="text-sm">
                  {formatDate(report.weekStartIso)} ~ {formatDate(report.weekEndIso)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">총합</div>
                <div className="text-sm">
                  runs {report.totals.runs} · time {formatHms(report.totals.seconds)}
                </div>
                <div className="text-sm">
                  value {report.totals.value.toLocaleString()} · cost {report.totals.cost.toLocaleString()}
                </div>
                <div className="text-sm font-medium">net {report.totals.net.toLocaleString()}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">시간당</div>
                <div className="text-sm">
                  value/h {Math.floor(report.totals.valuePerHour).toLocaleString()}
                </div>
                <div className="text-sm font-medium">
                  net/h {Math.floor(report.totals.netPerHour).toLocaleString()}
                </div>
                {report.totals.missingPriceItems.length ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    미시세 아이템: {report.totals.missingPriceItems.length}개 (0원 처리)
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">리포트를 불러오는 중…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New run</CardTitle>
          <CardDescription>드랍은 “아이템명+수량”으로 전부 기록(자동으로 아이템 사전에 추가).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="run-content">콘텐츠</Label>
              <Input id="run-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="예: 주간 토벌" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="run-minutes">시간(분)</Label>
              <Input
                id="run-minutes"
                type="number"
                inputMode="numeric"
                value={Number.isFinite(minutes) ? minutes : 0}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="run-role">역할</Label>
              <Select id="run-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="DPS">DPS</option>
                <option value="TANK">TANK</option>
                <option value="HEAL">HEAL</option>
                <option value="ETC">ETC</option>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="run-power">전투력 구간(선택)</Label>
              <Input id="run-power" value={powerBracket} onChange={(e) => setPowerBracket(e.target.value)} placeholder="예: 80k~90k" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Drops</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDrops((prev) => [...prev, { itemName: "", qty: 1 }])}
              >
                Add row
              </Button>
            </div>
            <div className="space-y-2">
              {drops.map((d, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <div className="col-span-8">
                    <Input
                      aria-label={`drop item ${idx + 1}`}
                      value={d.itemName}
                      onChange={(e) =>
                        setDrops((prev) => prev.map((v, i) => (i === idx ? { ...v, itemName: e.target.value } : v)))
                      }
                      placeholder="아이템명"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      aria-label={`drop qty ${idx + 1}`}
                      type="number"
                      inputMode="numeric"
                      value={Number.isFinite(d.qty) ? d.qty : 0}
                      onChange={(e) =>
                        setDrops((prev) => prev.map((v, i) => (i === idx ? { ...v, qty: Number(e.target.value) } : v)))
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDrops((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={drops.length <= 1}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Costs</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCosts((prev) => [...prev, { kind: "KINAH", kinah: 0 }])}
              >
                Add row
              </Button>
            </div>
            {costs.length ? (
              <div className="space-y-2">
                {costs.map((cst, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <Select
                        aria-label={`cost kind ${idx + 1}`}
                        value={cst.kind}
                        onChange={(e) => {
                          const next = e.target.value === "ITEM" ? ("ITEM" as const) : ("KINAH" as const);
                          setCosts((prev) =>
                            prev.map((v, i) =>
                              i === idx ? (next === "ITEM" ? { kind: "ITEM", itemName: "", qty: 1 } : { kind: "KINAH", kinah: 0 }) : v
                            )
                          );
                        }}
                      >
                        <option value="KINAH">KINAH</option>
                        <option value="ITEM">ITEM</option>
                      </Select>
                    </div>

                    {cst.kind === "KINAH" ? (
                      <>
                        <div className="col-span-8">
                          <Input
                            aria-label={`cost kinah ${idx + 1}`}
                            type="number"
                            inputMode="numeric"
                            value={Number.isFinite(cst.kinah) ? cst.kinah : 0}
                            onChange={(e) =>
                              setCosts((prev) =>
                                prev.map((v, i) => (i === idx && v.kind === "KINAH" ? { ...v, kinah: Number(e.target.value) } : v))
                              )
                            }
                            placeholder="소모 키나"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-6">
                          <Input
                            aria-label={`cost item ${idx + 1}`}
                            value={cst.itemName}
                            onChange={(e) =>
                              setCosts((prev) =>
                                prev.map((v, i) => (i === idx && v.kind === "ITEM" ? { ...v, itemName: e.target.value } : v))
                              )
                            }
                            placeholder="소모 아이템명"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            aria-label={`cost qty ${idx + 1}`}
                            type="number"
                            inputMode="numeric"
                            value={Number.isFinite(cst.qty) ? cst.qty : 0}
                            onChange={(e) =>
                              setCosts((prev) =>
                                prev.map((v, i) => (i === idx && v.kind === "ITEM" ? { ...v, qty: Number(e.target.value) } : v))
                              )
                            }
                          />
                        </div>
                      </>
                    )}

                    <div className="col-span-1 flex items-center justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setCosts((prev) => prev.filter((_, i) => i !== idx))}>
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">없음</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => void submitRun()}>Save</Button>
            <Button variant="outline" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>클릭하면 드랍/소모 상세를 봅니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length ? (
            <div className="space-y-2">
              {runs.map((r) => (
                <div key={r.id} className="rounded-md border p-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Button variant="ghost" size="sm" onClick={() => void openDetails(r.id)}>
                      {r.content}
                    </Button>
                    <span className="text-muted-foreground">{formatHms(r.seconds)}</span>
                    <Badge variant="muted">drops {r.dropCount}</Badge>
                    <Badge variant="muted">costs {r.costCount}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.endedAt)}</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const ok = window.confirm("삭제할까요?");
                        if (!ok) return;
                        setError(null);
                        try {
                          await window.aion2Hub.loot.deleteRun({ id: r.id, characterId: props.activeCharacterId });
                          if (openRunId === r.id) {
                            setOpenRunId(null);
                            setOpenRun(null);
                          }
                          await refresh();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>

                  {openRunId === r.id ? (
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <div className="rounded-md bg-muted/20 p-2 text-sm">
                        <div className="text-xs font-semibold text-muted-foreground">Drops</div>
                        {openRun ? (
                          openRun.drops.length ? (
                            <ul className="mt-1 space-y-1">
                              {openRun.drops.map((d, i) => (
                                <li key={i} className="flex items-center justify-between gap-2">
                                  <span>{d.itemName}</span>
                                  <span className="text-muted-foreground">x{d.qty}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-muted-foreground">없음</p>
                          )
                        ) : (
                          <p className="mt-1 text-muted-foreground">loading…</p>
                        )}
                      </div>
                      <div className="rounded-md bg-muted/20 p-2 text-sm">
                        <div className="text-xs font-semibold text-muted-foreground">Costs</div>
                        {openRun ? (
                          openRun.costs.length ? (
                            <ul className="mt-1 space-y-1">
                              {openRun.costs.map((c, i) => (
                                <li key={i} className="flex items-center justify-between gap-2">
                                  <span>{c.kind === "KINAH" ? "KINAH" : c.itemName ?? "(item)"}</span>
                                  <span className="text-muted-foreground">
                                    {c.kind === "KINAH" ? c.kinah.toLocaleString() : `x${c.qty}`}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-muted-foreground">없음</p>
                          )
                        ) : (
                          <p className="mt-1 text-muted-foreground">loading…</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">아직 기록이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
