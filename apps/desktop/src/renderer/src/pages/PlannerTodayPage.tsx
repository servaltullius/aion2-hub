import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { computeDurationSeconds, formatDurationSeconds } from "../planner/duration.js";
import { recommendPlannerItems } from "../planner/recommend.js";
import { formatCountdown, nextDailyResetAt, nextWeeklyResetAt } from "../planner/reset.js";
import { startTimerWithConfirm } from "../planner/timer.js";

import { PlannerChargesCard } from "./planner/today/PlannerChargesCard.js";
import { PlannerTaskListCard } from "./planner/today/PlannerTaskListCard.js";
import { PlannerTimerCard } from "./planner/today/PlannerTimerCard.js";
import { asDurationStats, asOverview, estimateForBudget, formatDate, type PlannerOverview } from "./planner/today/model.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

export function PlannerTodayPage(props: { activeCharacterId: string | null; characters: AppCharacter[] }) {
  const [overview, setOverview] = useState<PlannerOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [avgSecondsByTemplateId, setAvgSecondsByTemplateId] = useState<Map<string, number>>(() => new Map());

  const [budgetMinutes, setBudgetMinutes] = useState(30);
  const [includeWeekly, setIncludeWeekly] = useState(true);

  const [taskQ, setTaskQ] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const [activeTimer, setActiveTimer] = useState<{ templateId: string; startedAtMs: number } | null>(null);
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!activeTimer) return;
    setTimerNowMs(Date.now());
    const id = window.setInterval(() => setTimerNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  const resolveTitle = useMemo(() => {
    return (templateId: string) => {
      if (overview) {
        const title =
          overview.daily.find((d) => d.templateId === templateId)?.title ??
          overview.weekly.find((w) => w.templateId === templateId)?.title ??
          overview.charges.find((c) => c.templateId === templateId)?.title ??
          null;
        if (title) return title;
      }
      return templateId;
    };
  }, [overview]);

  function requestStartTimer(input: { templateId: string; title?: string }) {
    const nextTitle = input.title ?? resolveTitle(input.templateId);
    const res = startTimerWithConfirm({
      current: activeTimer,
      nextTemplateId: input.templateId,
      nowMs: Date.now(),
      resolveTitle: (id) => (id === input.templateId ? nextTitle : resolveTitle(id)),
      confirmFn: (msg) => window.confirm(msg)
    });
    setActiveTimer(res.next);
    if (res.notice) setNotice(res.notice);
  }

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const raw = await window.aion2Hub.planner.getOverview({ characterId: props.activeCharacterId });
        if (raw === null) {
          setOverview(null);
          setAvgSecondsByTemplateId(new Map());
        } else {
          const parsed = asOverview(raw);
          if (!parsed) throw new Error("unexpected_response");
          setOverview(parsed);
          const rawStats = await window.aion2Hub.planner.getDurationStats({ characterId: parsed.character.id });
          const parsedStats = asDurationStats(rawStats) ?? [];
          const avg = new Map<string, number>();
          for (const s of parsedStats) {
            if (typeof s.avgSeconds === "number" && Number.isFinite(s.avgSeconds) && s.avgSeconds > 0) avg.set(s.templateId, s.avgSeconds);
          }
          setAvgSecondsByTemplateId(avg);
        }
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

  const active = props.activeCharacterId
    ? props.characters.find((c) => c.id === props.activeCharacterId) ?? null
    : null;

  const matchesQ = useMemo(() => {
    const q = taskQ.trim().toLowerCase();
    if (!q) return (_title: string) => true;
    return (title: string) => title.toLowerCase().includes(q);
  }, [taskQ]);

  const dailyAll = overview?.daily ?? [];
  const weeklyAll = overview?.weekly ?? [];
  const chargesAll = overview?.charges ?? [];

  const dailyVisible = useMemo(
    () => dailyAll.filter((t) => (showCompleted ? true : !t.completed) && matchesQ(t.title)),
    [dailyAll, matchesQ, showCompleted]
  );
  const weeklyVisible = useMemo(
    () => weeklyAll.filter((t) => (showCompleted ? true : !t.completed) && matchesQ(t.title)),
    [matchesQ, showCompleted, weeklyAll]
  );
  const chargesVisible = useMemo(() => chargesAll.filter((t) => matchesQ(t.title)), [chargesAll, matchesQ]);

  const dailyDone = useMemo(() => dailyAll.reduce((acc, t) => acc + (t.completed ? 1 : 0), 0), [dailyAll]);
  const weeklyDone = useMemo(() => weeklyAll.reduce((acc, t) => acc + (t.completed ? 1 : 0), 0), [weeklyAll]);

  const remainingDaily = overview?.daily.filter((d) => !d.completed) ?? [];
  const remainingWeekly = overview?.weekly.filter((w) => !w.completed) ?? [];

  const candidate = includeWeekly ? [...remainingDaily, ...remainingWeekly] : remainingDaily;
  const rec = recommendPlannerItems({
    budgetMinutes,
    items: candidate.map((c) => ({ templateId: c.templateId, estimateMinutes: c.estimateMinutes })),
    avgSecondsByTemplateId
  });
  const picked = rec.picked
    .map((p) => {
      const meta = candidate.find((c) => c.templateId === p.templateId);
      if (!meta) return null;
      return { ...meta, estimate: p.estimateMinutes, estimateSource: p.source } as const;
    })
    .filter((v) => v !== null);
  const sum = rec.totalMinutes;

  async function toggleChecklist(input: { period: "DAILY" | "WEEKLY"; templateId: string; completed: boolean }) {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "error");
    }
  }

  function startFromTask(input: { templateId: string; title: string }) {
    setError(null);
    setNotice(null);
    requestStartTimer({ templateId: input.templateId, title: input.title });
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
      setNotice(`기록했습니다: ${formatDurationSeconds(seconds)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    }
  }

  function cancelTimer() {
    setActiveTimer(null);
    setNotice("타이머를 취소했습니다. (저장되지 않음)");
  }

  async function useCharge(input: { templateId: string }) {
    if (!overview) return;
    setError(null);
    setNotice(null);
    try {
      const raw = await window.aion2Hub.planner.useCharge({
        characterId: overview.character.id,
        templateId: input.templateId
      });
      const parsed = asOverview(raw);
      if (parsed) setOverview(parsed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "error");
    }
  }

  async function undoCharge(input: { templateId: string }) {
    if (!overview) return;
    setError(null);
    setNotice(null);
    try {
      const raw = await window.aion2Hub.planner.undoCharge({
        characterId: overview.character.id,
        templateId: input.templateId
      });
      const parsed = asOverview(raw);
      if (parsed) setOverview(parsed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Planner · Today</h2>
          <p className="text-sm text-muted-foreground">일일/주간 체크 + 충전형(티켓) 남은 스택</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#/m/planner/templates">
            → Templates
          </a>
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#/m/planner/stats">
            → Stats
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
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {overview ? (
        <>
          {activeTimer ? (
            <PlannerTimerCard
              title={
                (overview.daily.find((d) => d.templateId === activeTimer.templateId)?.title ??
                  overview.weekly.find((w) => w.templateId === activeTimer.templateId)?.title ??
                  activeTimer.templateId) as string
              }
              elapsedSeconds={Math.max(0, Math.floor((timerNowMs - activeTimer.startedAtMs) / 1000))}
              onStopSave={() => void stopAndSaveTimer()}
              onCancel={cancelTimer}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="muted">daily {overview.periodKeys.daily}</Badge>
            <Badge variant="muted">weekly {overview.periodKeys.weekly}</Badge>
            <Badge variant="muted">now {formatDate(overview.now)}</Badge>
            {(() => {
              const now = new Date(overview.now);
              const nowResolved = Number.isNaN(now.getTime()) ? new Date() : now;
              const nextDaily = nextDailyResetAt(nowResolved, overview.settings.dailyResetHhmm);
              const nextWeekly = nextWeeklyResetAt(
                nowResolved,
                overview.settings.dailyResetHhmm,
                overview.settings.weeklyResetDay
              );
              const dailyDelta = formatCountdown(nextDaily.getTime() - nowResolved.getTime());
              const weeklyDelta = formatCountdown(nextWeekly.getTime() - nowResolved.getTime());
              return (
                <>
                  <Badge variant="muted">
                    daily reset {overview.settings.dailyResetHhmm} → {formatDate(nextDaily.toISOString())} ({dailyDelta})
                  </Badge>
                  <Badge variant="muted">
                    weekly reset {overview.settings.weeklyResetDay} → {formatDate(nextWeekly.toISOString())} ({weeklyDelta})
                  </Badge>
                </>
              );
            })()}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>오늘 남은 숙제 추천</CardTitle>
              <CardDescription>시간 예산(30/60/90분) + 내 평균 소요시간(없으면 템플릿 예상시간)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label>예산</Label>
                  <Select className="w-32" value={budgetMinutes} onChange={(e) => setBudgetMinutes(Number(e.target.value))}>
                    <option value={30}>30분</option>
                    <option value={60}>60분</option>
                    <option value={90}>90분</option>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    className="h-4 w-4 accent-primary"
                    type="checkbox"
                    checked={includeWeekly}
                    onChange={(e) => setIncludeWeekly(e.target.checked)}
                  />
                  <span>주간 포함</span>
                </label>
                <span className="text-sm text-muted-foreground">
                  pick {picked.length} · est {sum}m
                </span>
              </div>

              {picked.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {picked.map((it) => (
                    <li key={`${it.type}:${it.templateId}`}>
                      <button
                        type="button"
                        className="text-left text-foreground hover:underline"
                        onClick={() => {
                          setError(null);
                          setNotice(null);
                          requestStartTimer({ templateId: it.templateId, title: it.title });
                        }}
                      >
                        {it.title}
                      </button>{" "}
                      <span className="text-muted-foreground">
                        ({it.type}, {it.estimate}m{it.estimateSource === "avg" ? " avg" : ""})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">추천할 항목이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>검색</Label>
              <Input value={taskQ} onChange={(e) => setTaskQ(e.target.value)} placeholder="숙제/티켓 이름 검색…" />
              <div className="text-xs text-muted-foreground">검색은 DAILY/WEEKLY/CHARGE 전체에 적용됩니다.</div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  className="h-4 w-4 accent-primary"
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
                <span>완료도 표시</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!taskQ && !showCompleted}
                onClick={() => {
                  setTaskQ("");
                  setShowCompleted(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PlannerTaskListCard
              title="DAILY"
              description="일일 체크"
              totalCount={dailyAll.length}
              doneCount={dailyDone}
              visible={dailyVisible}
              onToggle={(input) => toggleChecklist({ period: "DAILY", ...input })}
              onStart={startFromTask}
            />

            <PlannerTaskListCard
              title="WEEKLY"
              description="주간 체크"
              totalCount={weeklyAll.length}
              doneCount={weeklyDone}
              visible={weeklyVisible}
              onToggle={(input) => toggleChecklist({ period: "WEEKLY", ...input })}
              onStart={startFromTask}
            />
          </div>

          <PlannerChargesCard allCount={chargesAll.length} visible={chargesVisible} onUse={useCharge} onUndo={undoCharge} />
        </>
      ) : active ? (
        <Card>
          <CardHeader>
            <CardTitle>Planner 데이터가 없습니다</CardTitle>
            <CardDescription>
              먼저 <a className="text-primary hover:underline" href="#/m/planner/templates">Templates</a>에서 템플릿을 추가해 보세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </section>
  );
}
