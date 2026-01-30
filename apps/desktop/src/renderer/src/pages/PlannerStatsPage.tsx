import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { isObject } from "../lib/guards.js";
import { formatDurationSeconds } from "../planner/duration.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

type PlannerTemplateType = "DAILY" | "WEEKLY" | "CHARGE";

type PlannerTemplate = {
  id: string;
  title: string;
  type: PlannerTemplateType;
  estimateMinutes: number;
  rechargeHours: number | null;
  maxStacks: number | null;
};

type PlannerOverview = {
  now: string;
  periodKeys: { daily: string; weekly: string };
  settings: { dailyResetHhmm: string; weeklyResetDay: number };
  character: AppCharacter;
};

type PlannerDurationStat = {
  templateId: string;
  count: number;
  totalSeconds: number;
  avgSeconds: number;
};

type PlannerDurationRow = {
  id: string;
  characterId: string;
  templateId: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
};

function asTemplates(value: unknown): PlannerTemplate[] | null {
  if (!Array.isArray(value)) return null;
  const out: PlannerTemplate[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    if (typeof v.id !== "string") return null;
    if (typeof v.title !== "string") return null;
    if (v.type !== "DAILY" && v.type !== "WEEKLY" && v.type !== "CHARGE") return null;
    const estimateMinutes = typeof v.estimateMinutes === "number" ? v.estimateMinutes : 0;
    const rechargeHours = v.rechargeHours === null || typeof v.rechargeHours === "number" ? v.rechargeHours : null;
    const maxStacks = v.maxStacks === null || typeof v.maxStacks === "number" ? v.maxStacks : null;
    out.push({ id: v.id, title: v.title, type: v.type, estimateMinutes, rechargeHours, maxStacks });
  }
  return out;
}

function asOverview(value: unknown): PlannerOverview | null {
  if (!isObject(value)) return null;
  if (typeof value.now !== "string") return null;
  if (!isObject(value.periodKeys)) return null;
  if (typeof value.periodKeys.daily !== "string") return null;
  if (typeof value.periodKeys.weekly !== "string") return null;
  if (!isObject(value.settings)) return null;
  if (typeof value.settings.dailyResetHhmm !== "string") return null;
  if (typeof value.settings.weeklyResetDay !== "number") return null;
  if (!isObject(value.character)) return null;
  if (typeof value.character.id !== "string" || typeof value.character.name !== "string") return null;

  return {
    now: value.now,
    periodKeys: { daily: value.periodKeys.daily, weekly: value.periodKeys.weekly },
    settings: { dailyResetHhmm: value.settings.dailyResetHhmm, weeklyResetDay: value.settings.weeklyResetDay },
    character: {
      id: value.character.id,
      name: value.character.name,
      server: value.character.server === null || typeof value.character.server === "string" ? value.character.server : null,
      class: value.character.class === null || typeof value.character.class === "string" ? value.character.class : null
    }
  };
}

function asDurationStats(value: unknown): PlannerDurationStat[] | null {
  if (!Array.isArray(value)) return null;
  const out: PlannerDurationStat[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    if (typeof v.templateId !== "string") return null;
    if (typeof v.count !== "number") return null;
    if (typeof v.totalSeconds !== "number") return null;
    if (typeof v.avgSeconds !== "number") return null;
    out.push({
      templateId: v.templateId,
      count: v.count,
      totalSeconds: v.totalSeconds,
      avgSeconds: v.avgSeconds
    });
  }
  return out;
}

function asDurations(value: unknown): PlannerDurationRow[] | null {
  if (!Array.isArray(value)) return null;
  const out: PlannerDurationRow[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    if (typeof v.id !== "string") return null;
    if (typeof v.characterId !== "string") return null;
    if (typeof v.templateId !== "string") return null;
    if (typeof v.startedAt !== "string") return null;
    if (typeof v.endedAt !== "string") return null;
    if (typeof v.seconds !== "number") return null;
    out.push({
      id: v.id,
      characterId: v.characterId,
      templateId: v.templateId,
      startedAt: v.startedAt,
      endedAt: v.endedAt,
      seconds: v.seconds
    });
  }
  return out;
}

function parseHhmm(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return { hour: 9, minute: 0 };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: 9, minute: 0 };
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: 9, minute: 0 };
  return { hour, minute };
}

function weeklyResetStartAt(now: Date, dailyResetHhmm: string, weeklyResetDay: number) {
  const { hour, minute } = parseHhmm(dailyResetHhmm);
  const resetDay = Number.isFinite(weeklyResetDay) ? Math.max(0, Math.min(6, weeklyResetDay)) : 1;

  const start = new Date(now);
  const nowDay = start.getDay();
  const daysSinceReset = (nowDay - resetDay + 7) % 7;
  start.setDate(start.getDate() - daysSinceReset);
  start.setHours(hour, minute, 0, 0);
  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 7);
  return start;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function PlannerStatsPage(props: { activeCharacterId: string | null; characters: AppCharacter[] }) {
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [overview, setOverview] = useState<PlannerOverview | null>(null);
  const [stats, setStats] = useState<PlannerDurationStat[]>([]);
  const [sessions, setSessions] = useState<PlannerDurationRow[]>([]);
  const [scope, setScope] = useState<"week" | "all">("week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = props.activeCharacterId
    ? props.characters.find((c) => c.id === props.activeCharacterId) ?? null
    : null;

  const refresh = useMemo(
    () => async () => {
      if (!props.activeCharacterId) {
        setOverview(null);
        setStats([]);
        setSessions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [rawTemplates, rawOverview] = await Promise.all([
          window.aion2Hub.planner.listTemplates(),
          window.aion2Hub.planner.getOverview({ characterId: props.activeCharacterId })
        ]);
        setTemplates(asTemplates(rawTemplates) ?? []);
        const ov = rawOverview ? asOverview(rawOverview) : null;
        setOverview(ov);

        let sinceIso: string | undefined = undefined;
        if (scope === "week" && ov) {
          const now = new Date(ov.now);
          const nowResolved = Number.isNaN(now.getTime()) ? new Date() : now;
          sinceIso = weeklyResetStartAt(nowResolved, ov.settings.dailyResetHhmm, ov.settings.weeklyResetDay).toISOString();
        }

        const rawStats = await window.aion2Hub.planner.getDurationStats({
          characterId: props.activeCharacterId,
          ...(sinceIso ? { sinceIso } : {})
        });
        setStats(asDurationStats(rawStats) ?? []);

        const rawSessions = await window.aion2Hub.planner.listDurations({ characterId: props.activeCharacterId, limit: 50 });
        const parsedSessions = (asDurations(rawSessions) ?? []).filter((s) => (sinceIso ? s.endedAt >= sinceIso : true));
        setSessions(parsedSessions);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
        setStats([]);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    },
    [props.activeCharacterId, scope]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const totalSeconds = stats.reduce((sum, s) => sum + s.totalSeconds, 0);
    const totalCount = stats.reduce((sum, s) => sum + s.count, 0);
    return { totalSeconds, totalCount };
  }, [stats]);

  function titleForTemplateId(templateId: string) {
    return templates.find((t) => t.id === templateId)?.title ?? templateId;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Planner · Stats</h2>
          <p className="text-sm text-muted-foreground">타이머 기록 기반 주간 통계</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#/m/planner/today">
            → Today
          </a>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}>
            Reload
          </Button>
        </div>
      </div>

      {active ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="muted">active</Badge>
          <span>
            {active.name}
            {active.server ? ` · ${active.server}` : ""}
            {active.class ? ` · ${active.class}` : ""}
          </span>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>캐릭터가 필요합니다</CardTitle>
            <CardDescription>
              먼저 <a className="text-primary hover:underline" href="#/characters">Characters</a>에서 캐릭터를 추가해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>범위</CardTitle>
          <CardDescription>통계를 볼 기간을 선택합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label>기간</Label>
            <Select className="w-40" value={scope} onChange={(e) => setScope(e.target.value === "all" ? "all" : "week")}>
              <option value="week">이번 주</option>
              <option value="all">전체</option>
            </Select>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {overview ? (
              <>
                <Badge variant="muted" className="mr-2">
                  weekly {overview.periodKeys.weekly}
                </Badge>
                <span>now {formatDate(overview.now)}</span>
              </>
            ) : (
              <span>-</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>요약</CardTitle>
          <CardDescription>{scope === "week" ? "이번 주" : "전체"} 합계</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="rounded-md border bg-background/30 p-3">
            <div className="text-xs text-muted-foreground">sessions</div>
            <div className="text-lg font-semibold">{totals.totalCount}</div>
          </div>
          <div className="rounded-md border bg-background/30 p-3">
            <div className="text-xs text-muted-foreground">total</div>
            <div className="text-lg font-semibold">{formatDurationSeconds(totals.totalSeconds)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>템플릿별</CardTitle>
          <CardDescription>total / avg / sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.length === 0 ? <p className="text-sm text-muted-foreground">기록이 없습니다. Today에서 타이머를 사용해 보세요.</p> : null}
          {stats.map((s) => (
            <div key={s.templateId} className="flex flex-wrap items-center gap-2 rounded-md border bg-background/30 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{titleForTemplateId(s.templateId)}</div>
                <div className="text-xs text-muted-foreground">{s.templateId}</div>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                total {formatDurationSeconds(s.totalSeconds)} · avg {formatDurationSeconds(s.avgSeconds)} · {s.count} sessions
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 세션</CardTitle>
          <CardDescription>최근 기록 50개 (개별 삭제)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">세션 기록이 없습니다.</p> : null}
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-background/30 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{titleForTemplateId(s.templateId)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(s.startedAt)} → {formatDate(s.endedAt)}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDurationSeconds(s.seconds)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={async () => {
                    if (!props.activeCharacterId) return;
                    if (!confirm(`세션을 삭제할까요?\n\n${titleForTemplateId(s.templateId)} · ${formatDurationSeconds(s.seconds)}`)) return;
                    setLoading(true);
                    setError(null);
                    try {
                      await window.aion2Hub.planner.deleteDuration({ characterId: props.activeCharacterId, id: s.id });
                      await refresh();
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : "error");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
