import type { BuildScoreUnit } from "../../buildScore/catalog.js";
import { BUILD_SCORE_CATALOG } from "../../buildScore/catalog.js";

import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { Label } from "../../components/ui/label.js";
import { Select } from "../../components/ui/select.js";

import { numberOrZero, type BuildScoreStat, type BuildScoreState } from "./model.js";

export function StatsTableCard({
  state,
  visibleStats,
  visibleEnabledCount,
  addCatalogId,
  customLabel,
  customUnit,
  statsQuery,
  statsOnlyEnabled,
  statsSort,
  selectedStatId,
  saving,
  loading,
  isDirty,
  onAddCatalogIdChange,
  onCustomLabelChange,
  onCustomUnitChange,
  onStatsQueryChange,
  onStatsOnlyEnabledChange,
  onStatsSortChange,
  onSelectedStatIdChange,
  updateState,
  onSave,
  onReload,
  onReset
}: {
  state: BuildScoreState;
  visibleStats: BuildScoreStat[];
  visibleEnabledCount: number;
  addCatalogId: string;
  customLabel: string;
  customUnit: BuildScoreUnit;
  statsQuery: string;
  statsOnlyEnabled: boolean;
  statsSort: "default" | "enabled" | "label" | "delta";
  selectedStatId: string | null;
  saving: boolean;
  loading: boolean;
  isDirty: boolean;
  onAddCatalogIdChange: (id: string) => void;
  onCustomLabelChange: (label: string) => void;
  onCustomUnitChange: (unit: BuildScoreUnit) => void;
  onStatsQueryChange: (query: string) => void;
  onStatsOnlyEnabledChange: (onlyEnabled: boolean) => void;
  onStatsSortChange: (sort: "default" | "enabled" | "label" | "delta") => void;
  onSelectedStatIdChange: (id: string | null) => void;
  updateState: (fn: (s: BuildScoreState) => BuildScoreState) => void;
  onSave: () => void;
  onReload: () => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>항목</CardTitle>
          <Badge variant="muted">
            {visibleStats.length}/{state.stats.length}
          </Badge>
          <span className="text-xs text-muted-foreground">
            On {visibleEnabledCount}/{visibleStats.length}
          </span>
        </div>
        <CardDescription>체크된 항목만 점수 계산에 반영합니다. 단위는 표기용(계산은 숫자 그대로)입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>기본 항목 추가</Label>
            <Select value={addCatalogId} onChange={(e) => onAddCatalogIdChange(e.target.value)}>
              {BUILD_SCORE_CATALOG.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                const item = BUILD_SCORE_CATALOG.find((it) => it.id === addCatalogId);
                if (!item) return;
                updateState((s) => {
                  if (s.stats.some((st) => st.id === item.id)) return s;
                  return {
                    ...s,
                    stats: [...s.stats, { id: item.id, label: item.label, unit: item.unit, enabled: false, weight: 1 }]
                  };
                });
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>커스텀 항목</Label>
            <Input value={customLabel} onChange={(e) => onCustomLabelChange(e.target.value)} placeholder="예: 보스 피해 증폭" />
          </div>
          <div className="space-y-2">
            <Label>단위</Label>
            <Select value={customUnit} onChange={(e) => onCustomUnitChange(e.target.value as BuildScoreUnit)}>
              <option value="flat">값</option>
              <option value="percent">%</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                const label = customLabel.trim();
                if (!label) return;
                const id = (globalThis.crypto?.randomUUID
                  ? `custom:${globalThis.crypto.randomUUID()}`
                  : `custom:${Date.now()}`) as string;
                updateState((s) => ({
                  ...s,
                  stats: [...s.stats, { id, label, unit: customUnit, enabled: true, weight: 1 }]
                }));
                onCustomLabelChange("");
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>필터</Label>
            <Input value={statsQuery} onChange={(e) => onStatsQueryChange(e.target.value)} placeholder="항목 검색…" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={statsOnlyEnabled}
                onChange={(e) => onStatsOnlyEnabledChange(e.target.checked)}
              />
              On만 보기
            </label>
          </div>
          <div className="space-y-2">
            <Label>정렬</Label>
            <Select value={statsSort} onChange={(e) => onStatsSortChange(e.target.value as typeof statsSort)}>
              <option value="default">기본</option>
              <option value="enabled">On 먼저</option>
              <option value="label">이름</option>
              <option value="delta">기여도(Δ)</option>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() =>
                updateState((s) => ({
                  ...s,
                  stats: s.stats.map((x) => ({ ...x, enabled: true }))
                }))
              }
            >
              On all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() =>
                updateState((s) => ({
                  ...s,
                  stats: s.stats.map((x) => ({ ...x, enabled: false }))
                }))
              }
            >
              Off all
            </Button>
          </div>
        </div>

        <div className="rounded-md border bg-background/30">
          <div className="max-h-[560px] overflow-auto">
            <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 border-b bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
              <div className="col-span-1">On</div>
              <div className="col-span-3">항목</div>
              <div className="col-span-2">단위</div>
              <div className="col-span-2">가중치</div>
              <div className="col-span-2">A</div>
              <div className="col-span-2">B</div>
            </div>

            <div className="divide-y">
              {visibleStats.map((st) => {
                const a = state.setA.values[st.id] ?? 0;
                const b = state.setB.values[st.id] ?? 0;
                const d = (b - a) * st.weight;

                return (
                  <div
                    key={st.id}
                    className={selectedStatId === st.id ? "bg-background/60" : ""}
                    onClick={() => onSelectedStatIdChange(st.id)}
                    onFocusCapture={() => onSelectedStatIdChange(st.id)}
                  >
                    <div className="grid grid-cols-12 gap-2 px-3 py-2">
                      <div className="col-span-1 flex items-center">
                        <input
                          className="h-4 w-4 accent-primary"
                          type="checkbox"
                          checked={st.enabled}
                          onChange={(e) =>
                            updateState((s) => ({
                              ...s,
                              stats: s.stats.map((x) => (x.id === st.id ? { ...x, enabled: e.target.checked } : x))
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={st.label}
                          onChange={(e) =>
                            updateState((s) => ({
                              ...s,
                              stats: s.stats.map((x) => (x.id === st.id ? { ...x, label: e.target.value } : x))
                            }))
                          }
                        />
                        <div className="mt-1 text-[11px] text-muted-foreground">Δ {d.toFixed(2)}</div>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={st.unit}
                          onChange={(e) =>
                            updateState((s) => ({
                              ...s,
                              stats: s.stats.map((x) =>
                                x.id === st.id ? { ...x, unit: e.target.value === "percent" ? "percent" : "flat" } : x
                              )
                            }))
                          }
                        >
                          <option value="flat">값</option>
                          <option value="percent">%</option>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={String(st.weight)}
                          onChange={(e) =>
                            updateState((s) => ({
                              ...s,
                              stats: s.stats.map((x) => (x.id === st.id ? { ...x, weight: numberOrZero(e.target.value) } : x))
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={String(a)}
                          onChange={(e) =>
                            updateState((s) => ({
                              ...s,
                              setA: { ...s.setA, values: { ...s.setA.values, [st.id]: numberOrZero(e.target.value) } }
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={String(b)}
                          onChange={(e) =>
                            updateState((s) => ({
                              ...s,
                              setB: { ...s.setB, values: { ...s.setB.values, [st.id]: numberOrZero(e.target.value) } }
                            }))
                          }
                        />
                      </div>
                    </div>

                    {selectedStatId === st.id ? (
                      <div className="flex items-center justify-between gap-2 px-3 pb-3">
                        <div className="text-xs text-muted-foreground">
                          A={a} · B={b} · w={st.weight} · Δ {d.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateState((s) => ({
                                ...s,
                                setA: { ...s.setA, values: { ...s.setA.values, [st.id]: 0 } },
                                setB: { ...s.setB, values: { ...s.setB.values, [st.id]: 0 } }
                              }))
                            }
                          >
                            값 초기화
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (!confirm(`항목을 삭제할까요? (${st.label})`)) return;
                              onSelectedStatIdChange(null);
                              updateState((s) => {
                                const nextA = { ...s.setA.values };
                                const nextB = { ...s.setB.values };
                                delete nextA[st.id];
                                delete nextB[st.id];
                                return {
                                  ...s,
                                  stats: s.stats.filter((x) => x.id !== st.id),
                                  setA: { ...s.setA, values: nextA },
                                  setB: { ...s.setB, values: nextB }
                                };
                              });
                            }}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {visibleStats.length === 0 ? <div className="px-3 py-6 text-sm text-muted-foreground">표시할 항목이 없습니다.</div> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" disabled={saving || !isDirty} onClick={onSave}>
            Save
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={onReload}>
            Reload
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={onReset}>
            Reset
          </Button>
          <div className="text-xs text-muted-foreground">
            {isDirty ? "변경사항이 있습니다. Save를 눌러 저장하세요." : "저장됨"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
