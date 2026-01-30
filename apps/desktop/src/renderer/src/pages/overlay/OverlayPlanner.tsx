import { useEffect, useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { computeDurationSeconds, formatDurationSeconds } from "../../planner/duration.js";
import { recommendPlannerItems } from "../../planner/recommend.js";
import { formatCountdown, nextDailyResetAt, nextWeeklyResetAt } from "../../planner/reset.js";
import { asDurationStats, asOverview, estimateForBudget, type PlannerOverview } from "../planner/today/model.js";

type PickedItem = {
  templateId: string;
  title: string;
  period: "DAILY" | "WEEKLY";
  estimateMinutes: number;
  completed: boolean;
  estimateSource: "avg" | "estimate";
};

export function OverlayPlanner(props: { activeCharacterId: string | null }) {
  const [overview, setOverview] = useState<PlannerOverview | null>(null);
  const [avgSecondsByTemplateId, setAvgSecondsByTemplateId] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [budgetMinutes, setBudgetMinutes] = useState(30);
  const [includeWeekly, setIncludeWeekly] = useState(true);

  const [activeTimer, setActiveTimer] = useState<{ templateId: string; startedAtMs: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useMemo(
    () => async () => {
      if (!props.activeCharacterId) {
        setOverview(null);
        setAvgSecondsByTemplateId(new Map());
        return;
      }

      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const raw = await window.aion2Hub.planner.getOverview({ characterId: props.activeCharacterId });
        if (raw === null) {
          setOverview(null);
          setAvgSecondsByTemplateId(new Map());
          return;
        }
        const parsed = asOverview(raw);
        if (!parsed) throw new Error("unexpected_response");
        setOverview(parsed);

        const statsRaw = await window.aion2Hub.planner.getDurationStats({ characterId: parsed.character.id });
        const stats = asDurationStats(statsRaw) ?? [];
        const avg = new Map<string, number>();
        for (const s of stats) {
          if (typeof s.avgSeconds === "number" && Number.isFinite(s.avgSeconds) && s.avgSeconds > 0) avg.set(s.templateId, s.avgSeconds);
        }
        setAvgSecondsByTemplateId(avg);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
        setOverview(null);
        setAvgSecondsByTemplateId(new Map());
      } finally {
        setLoading(false);
      }
    },
    [props.activeCharacterId]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countdown = useMemo(() => {
    if (!overview) return null;
    const now = new Date(nowMs);
    const nextDaily = nextDailyResetAt(now, overview.settings.dailyResetHhmm);
    const nextWeekly = nextWeeklyResetAt(now, overview.settings.dailyResetHhmm, overview.settings.weeklyResetDay);
    return {
      daily: formatCountdown(nextDaily.getTime() - now.getTime()),
      weekly: formatCountdown(nextWeekly.getTime() - now.getTime())
    };
  }, [nowMs, overview]);

  const picked: PickedItem[] = useMemo(() => {
    if (!overview) return [];

    const remainingDaily = overview.daily.filter((d) => !d.completed);
    const remainingWeekly = overview.weekly.filter((w) => !w.completed);
    const candidate = includeWeekly ? [...remainingDaily, ...remainingWeekly] : remainingDaily;

    const rec = recommendPlannerItems({
      budgetMinutes,
      items: candidate.map((c) => ({
        templateId: c.templateId,
        estimateMinutes: estimateForBudget(c)
      })),
      avgSecondsByTemplateId
    });

    const out: PickedItem[] = [];
    for (const p of rec.picked.slice(0, 5)) {
      const meta = candidate.find((c) => c.templateId === p.templateId);
      if (!meta) continue;
      out.push({
        templateId: meta.templateId,
        title: meta.title,
        period: meta.type === "WEEKLY" ? "WEEKLY" : "DAILY",
        estimateMinutes: p.estimateMinutes,
        completed: meta.completed,
        estimateSource: p.source
      });
    }
    return out;
  }, [avgSecondsByTemplateId, budgetMinutes, includeWeekly, overview]);

  const timerTitle = useMemo(() => {
    if (!overview || !activeTimer) return null;
    return (
      overview.daily.find((d) => d.templateId === activeTimer.templateId)?.title ??
      overview.weekly.find((w) => w.templateId === activeTimer.templateId)?.title ??
      overview.charges.find((c) => c.templateId === activeTimer.templateId)?.title ??
      activeTimer.templateId
    );
  }, [activeTimer, overview]);

  const timerSeconds = activeTimer ? computeDurationSeconds(activeTimer.startedAtMs, nowMs) : 0;

  async function toggleComplete(input: { templateId: string; period: "DAILY" | "WEEKLY"; completed: boolean }) {
    if (!overview) return;
    setError(null);
    setNotice(null);
    try {
      const raw = await window.aion2Hub.planner.toggleComplete({
        characterId: overview.character.id,
        templateId: input.templateId,
        period: input.period,
        completed: input.completed
      });
      const parsed = asOverview(raw);
      if (parsed) setOverview(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  function startTimer(templateId: string) {
    setError(null);
    setNotice(null);
    setActiveTimer({ templateId, startedAtMs: Date.now() });
  }

  async function stopAndSaveTimer() {
    if (!overview || !activeTimer) return;
    const endedAtMs = Date.now();
    const seconds = computeDurationSeconds(activeTimer.startedAtMs, endedAtMs);
    setError(null);
    setNotice(null);
    try {
      await window.aion2Hub.planner.addDuration({
        characterId: overview.character.id,
        templateId: activeTimer.templateId,
        startedAt: new Date(activeTimer.startedAtMs).toISOString(),
        endedAt: new Date(endedAtMs).toISOString(),
        seconds
      });
      setActiveTimer(null);
      setNotice(`기록됨: ${formatDurationSeconds(seconds)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  function cancelTimer() {
    setActiveTimer(null);
    setNotice("취소됨 (저장 안 함)");
  }

  if (!props.activeCharacterId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planner mini</CardTitle>
          <CardDescription>캐릭터를 선택해 주세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Planner mini</CardTitle>
            <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
          </div>
          <CardDescription>추천 숙제 + 타이머 + 체크</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {countdown ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="muted">Daily {countdown.daily}</Badge>
              <Badge variant="muted">Weekly {countdown.weekly}</Badge>
              {overview?.character.server ? <span className="opacity-70">{overview.character.server}</span> : null}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">-</div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {[30, 60, 90].map((m) => (
              <Button key={m} size="sm" variant={budgetMinutes === m ? "default" : "outline"} onClick={() => setBudgetMinutes(m)}>
                {m}m
              </Button>
            ))}
            <Button size="sm" variant={includeWeekly ? "default" : "outline"} onClick={() => setIncludeWeekly((v) => !v)}>
              Weekly
            </Button>
          </div>

          {activeTimer ? (
            <div className="rounded-md border bg-background/30 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{timerTitle}</div>
                  <div className="text-xs text-muted-foreground">{formatDurationSeconds(timerSeconds)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => void stopAndSaveTimer()}>
                    Stop&Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelTimer}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className="text-xs text-destructive">{error}</div> : null}
          {notice ? <div className="text-xs text-muted-foreground">{notice}</div> : null}

          {overview ? (
            <div className="space-y-2">
              {picked.length === 0 ? (
                <div className="rounded-md border bg-background/30 px-3 py-4 text-sm text-muted-foreground">추천할 항목이 없습니다.</div>
              ) : (
                picked.map((t) => (
                  <div key={t.templateId} className="flex items-center gap-3 rounded-md border bg-background/30 px-3 py-2 text-sm">
                    <input
                      className="h-4 w-4 accent-primary"
                      type="checkbox"
                      checked={t.completed}
                      onChange={(e) => void toggleComplete({ templateId: t.templateId, period: t.period, completed: e.target.checked })}
                    />
                    <span className="flex-1">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.estimateMinutes}m{t.estimateSource === "avg" ? "*" : ""}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => startTimer(t.templateId)} disabled={Boolean(activeTimer)}>
                      Start
                    </Button>
                  </div>
                ))
              )}
              <div className="text-[11px] text-muted-foreground">
                * 이전 기록(평균) 기반 추정이 있으면 표시합니다. (없으면 템플릿 추정치)
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-background/30 px-3 py-4 text-sm text-muted-foreground">
              {loading ? "Loading…" : "데이터가 없습니다."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
