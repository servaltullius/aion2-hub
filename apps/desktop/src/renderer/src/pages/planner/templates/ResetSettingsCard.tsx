import type { PlannerSettingsBundle } from "./model.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import { Select } from "../../../components/ui/select.js";
import { dayLabel, formatCountdown, nextDailyResetAt, nextWeeklyResetAt } from "../../../planner/reset.js";

export function ResetSettingsCard({
  selectedServer,
  servers,
  settingsBundle,
  dailyResetHhmm,
  weeklyResetDay,
  resetValid,
  resetDirty,
  loading,
  onSelectedServerChange,
  onDailyResetHhmmChange,
  onWeeklyResetDayChange,
  onSave,
  onClearServerOverride
}: {
  selectedServer: string | null;
  servers: string[];
  settingsBundle: PlannerSettingsBundle | null;
  dailyResetHhmm: string;
  weeklyResetDay: number;
  resetValid: boolean;
  resetDirty: boolean;
  loading: boolean;
  onSelectedServerChange: (server: string | null) => void;
  onDailyResetHhmmChange: (hhmm: string) => void;
  onWeeklyResetDayChange: (day: number) => void;
  onSave: () => void;
  onClearServerOverride: () => void;
}) {
  const hasServerOverride = Boolean(selectedServer && settingsBundle?.server);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>리셋 설정</CardTitle>
          {resetDirty ? <Badge variant="secondary">unsaved</Badge> : <Badge variant="muted">saved</Badge>}
        </div>
        <CardDescription>서버별 설정(override)을 지원합니다. 서버 설정이 없으면 기본값을 사용합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label>대상 서버</Label>
            <Select
              value={selectedServer ?? ""}
              onChange={(e) => {
                const next = e.target.value.trim();
                onSelectedServerChange(next ? next : null);
              }}
            >
              <option value="">(기본값 - 전체)</option>
              {servers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            {selectedServer ? (
              <div className="pt-1 text-xs text-muted-foreground">
                {hasServerOverride ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">override</Badge>
                    <span>서버별 설정을 사용 중입니다.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">default</Badge>
                    <span>기본값을 사용 중입니다.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-1 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">default</Badge>
                  <span>기본값(전체) 설정을 수정합니다.</span>
                </div>
              </div>
            )}

            {settingsBundle ? (
              <div className="pt-1 text-xs text-muted-foreground">
                기본값: {settingsBundle.default.dailyResetHhmm} / {dayLabel(settingsBundle.default.weeklyResetDay)}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>일일 리셋 (HH:MM)</Label>
            <Input value={dailyResetHhmm} onChange={(e) => onDailyResetHhmmChange(e.target.value)} placeholder="09:00" />
            {!resetValid ? <div className="text-xs text-destructive">형식: HH:MM (예: 09:00)</div> : null}
          </div>

          <div className="space-y-2">
            <Label>주간 리셋 요일</Label>
            <Select value={weeklyResetDay} onChange={(e) => onWeeklyResetDayChange(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm text-muted-foreground md:grid-cols-2">
          {(() => {
            const now = new Date();
            const nextDaily = nextDailyResetAt(now, dailyResetHhmm);
            const nextWeekly = nextWeeklyResetAt(now, dailyResetHhmm, weeklyResetDay);
            return (
              <>
                <div>
                  다음 일일 리셋: <span className="text-foreground">{nextDaily.toLocaleString()}</span>{" "}
                  <span className="opacity-70">({formatCountdown(nextDaily.getTime() - now.getTime())})</span>
                </div>
                <div>
                  다음 주간 리셋: <span className="text-foreground">{nextWeekly.toLocaleString()}</span>{" "}
                  <span className="opacity-70">({formatCountdown(nextWeekly.getTime() - now.getTime())})</span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="min-w-28" variant="secondary" disabled={loading || !resetValid || !resetDirty} onClick={onSave}>
            저장
          </Button>
          {hasServerOverride ? (
            <Button variant="outline" onClick={onClearServerOverride}>
              기본값으로 되돌리기
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
