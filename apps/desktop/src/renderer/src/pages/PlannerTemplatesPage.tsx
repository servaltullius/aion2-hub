import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { isObject } from "../lib/guards.js";
import { PLANNER_PRESETS } from "../planner/presets.js";
import { dayLabel, formatCountdown, nextDailyResetAt, nextWeeklyResetAt, parseHhmm } from "../planner/reset.js";

type PlannerTemplateType = "DAILY" | "WEEKLY" | "CHARGE";

type PlannerTemplate = {
  id: string;
  title: string;
  type: PlannerTemplateType;
  estimateMinutes: number;
  rechargeHours: number | null;
  maxStacks: number | null;
};

type PlannerSettings = {
  dailyResetHhmm: string;
  weeklyResetDay: number;
  updatedAt?: string;
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
    out.push({
      id: v.id,
      title: v.title,
      type: v.type,
      estimateMinutes,
      rechargeHours,
      maxStacks
    });
  }
  return out;
}

function asSettings(value: unknown): PlannerSettings | null {
  if (!isObject(value)) return null;
  if (typeof value.dailyResetHhmm !== "string") return null;
  if (typeof value.weeklyResetDay !== "number") return null;
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : undefined;
  if (!updatedAt) return { dailyResetHhmm: value.dailyResetHhmm, weeklyResetDay: value.weeklyResetDay };
  return { dailyResetHhmm: value.dailyResetHhmm, weeklyResetDay: value.weeklyResetDay, updatedAt };
}

type PlannerSettingsBundle = {
  default: PlannerSettings;
  server: { server: string; settings: PlannerSettings } | null;
  effective: PlannerSettings;
  effectiveScope: "default" | "server";
};

function asSettingsBundle(value: unknown): PlannerSettingsBundle | null {
  if (!isObject(value)) return null;
  const def = asSettings(value.default);
  const effective = asSettings(value.effective);
  if (!def || !effective) return null;

  let server: PlannerSettingsBundle["server"] = null;
  if (value.server !== null) {
    if (!isObject(value.server)) return null;
    if (typeof value.server.server !== "string") return null;
    const settings = asSettings(value.server.settings);
    if (!settings) return null;
    server = { server: value.server.server, settings };
  }

  const scope = value.effectiveScope === "server" ? "server" : "default";
  return { default: def, server, effective, effectiveScope: scope };
}

type ApplyPresetResult = { created: number; skipped: number };

function asApplyPresetResult(value: unknown): ApplyPresetResult | null {
  if (!isObject(value)) return null;
  if (typeof value.created !== "number") return null;
  if (typeof value.skipped !== "number") return null;
  return { created: value.created, skipped: value.skipped };
}

function asServersFromCharacters(value: unknown) {
  if (!Array.isArray(value)) return [];
  const set = new Set<string>();
  for (const v of value) {
    if (!isObject(v)) continue;
    const server = typeof v.server === "string" ? v.server.trim() : "";
    if (server) set.add(server);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

export function PlannerTemplatesPage() {
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [settingsBundle, setSettingsBundle] = useState<PlannerSettingsBundle | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [servers, setServers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const [rawTemplates, rawSettings, rawCharacters] = await Promise.all([
          window.aion2Hub.planner.listTemplates(),
          window.aion2Hub.planner.getSettings({ server: selectedServer }),
          window.aion2Hub.characters.list()
        ]);
        setTemplates(asTemplates(rawTemplates) ?? []);
        setSettingsBundle(asSettingsBundle(rawSettings));
        setServers(asServersFromCharacters(rawCharacters));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedServer]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<PlannerTemplateType>("DAILY");
  const [estimateMinutes, setEstimateMinutes] = useState(10);
  const [rechargeHours, setRechargeHours] = useState(24);
  const [maxStacks, setMaxStacks] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => templates.find((t) => t.id === editingId) ?? null, [templates, editingId]);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<PlannerTemplateType>("DAILY");
  const [editEstimateMinutes, setEditEstimateMinutes] = useState(10);
  const [editRechargeHours, setEditRechargeHours] = useState(24);
  const [editMaxStacks, setEditMaxStacks] = useState(1);

  const [dailyResetHhmm, setDailyResetHhmm] = useState("09:00");
  const [weeklyResetDay, setWeeklyResetDay] = useState(1);

  const baseSettings = useMemo(() => {
    if (!settingsBundle) return null;
    if (!selectedServer) return settingsBundle.default;
    return settingsBundle.server?.settings ?? settingsBundle.default;
  }, [selectedServer, settingsBundle]);

  const resetTimeParsed = useMemo(() => parseHhmm(dailyResetHhmm), [dailyResetHhmm]);
  const resetValid = resetTimeParsed.ok;
  const resetDirty = useMemo(() => {
    if (!baseSettings) return false;
    const hhmm = dailyResetHhmm.trim();
    return hhmm !== baseSettings.dailyResetHhmm || weeklyResetDay !== baseSettings.weeklyResetDay;
  }, [baseSettings, dailyResetHhmm, weeklyResetDay]);

  useEffect(() => {
    if (!settingsBundle) return;
    const base = selectedServer ? (settingsBundle.server?.settings ?? settingsBundle.default) : settingsBundle.default;
    setDailyResetHhmm(base.dailyResetHhmm);
    setWeeklyResetDay(base.weeklyResetDay);
  }, [settingsBundle, selectedServer]);

  const [presetId, setPresetId] = useState(() => PLANNER_PRESETS[0]?.id ?? "");
  const preset = useMemo(() => PLANNER_PRESETS.find((p) => p.id === presetId) ?? PLANNER_PRESETS[0], [presetId]);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [presetApplying, setPresetApplying] = useState(false);

  const presetCounts = useMemo(() => {
    if (!preset) return { daily: 0, weekly: 0, charge: 0, total: 0 };
    let daily = 0;
    let weekly = 0;
    let charge = 0;
    for (const t of preset.templates) {
      if (t.type === "DAILY") daily += 1;
      if (t.type === "WEEKLY") weekly += 1;
      if (t.type === "CHARGE") charge += 1;
    }
    return { daily, weekly, charge, total: preset.templates.length };
  }, [preset]);

  const [templateQ, setTemplateQ] = useState("");
  const [templateTypeFilter, setTemplateTypeFilter] = useState<"ALL" | PlannerTemplateType>("ALL");

  const visibleTemplates = useMemo(() => {
    const q = templateQ.trim().toLowerCase();
    return templates.filter((t) => {
      if (templateTypeFilter !== "ALL" && t.type !== templateTypeFilter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q);
    });
  }, [templateQ, templateTypeFilter, templates]);

  const templateCounts = useMemo(() => {
    let daily = 0;
    let weekly = 0;
    let charge = 0;
    for (const t of visibleTemplates) {
      if (t.type === "DAILY") daily += 1;
      if (t.type === "WEEKLY") weekly += 1;
      if (t.type === "CHARGE") charge += 1;
    }
    return { daily, weekly, charge, total: visibleTemplates.length };
  }, [visibleTemplates]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Planner · Templates</h2>
          <p className="text-sm text-muted-foreground">리셋 설정과 템플릿(일일/주간/충전형)을 관리합니다.</p>
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {preset ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>프리셋</CardTitle>
              <Badge variant="muted">{presetCounts.total}</Badge>
            </div>
            <CardDescription>{preset.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>프리셋 선택</Label>
                <Select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                  {PLANNER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>구성</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">DAILY {presetCounts.daily}</Badge>
                  <Badge variant="secondary">WEEKLY {presetCounts.weekly}</Badge>
                  <Badge variant="secondary">CHARGE {presetCounts.charge}</Badge>
                </div>
              </div>
            </div>

            {presetMessage ? <p className="text-sm text-muted-foreground">{presetMessage}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={presetApplying || loading}
                onClick={async () => {
                  if (!preset) return;
                  setPresetApplying(true);
                  setPresetMessage(null);
                  try {
                    const raw = await window.aion2Hub.planner.applyPreset({ mode: "merge", templates: preset.templates });
                    const parsed = asApplyPresetResult(raw);
                    setPresetMessage(parsed ? `추가 ${parsed.created} · 건너뜀 ${parsed.skipped}` : "적용 완료");
                    await refresh();
                  } catch (e: unknown) {
                    setPresetMessage(e instanceof Error ? e.message : "error");
                  } finally {
                    setPresetApplying(false);
                  }
                }}
              >
                프리셋 추가(기존 유지)
              </Button>
              <Button
                variant="destructive"
                disabled={presetApplying || loading}
                onClick={async () => {
                  if (!preset) return;
                  if (!confirm(`현재 템플릿 ${templates.length}개를 삭제하고 프리셋을 적용할까요? (체크/충전 기록도 함께 초기화됩니다)`)) {
                    return;
                  }
                  setPresetApplying(true);
                  setPresetMessage(null);
                  try {
                    const raw = await window.aion2Hub.planner.applyPreset({ mode: "replace", templates: preset.templates });
                    const parsed = asApplyPresetResult(raw);
                    setPresetMessage(parsed ? `적용 ${parsed.created} · 건너뜀 ${parsed.skipped}` : "적용 완료");
                    await refresh();
                  } catch (e: unknown) {
                    setPresetMessage(e instanceof Error ? e.message : "error");
                  } finally {
                    setPresetApplying(false);
                  }
                }}
              >
                초기화 후 적용
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>리셋 설정</CardTitle>
            {resetDirty ? <Badge variant="secondary">unsaved</Badge> : <Badge variant="muted">saved</Badge>}
          </div>
          <CardDescription>서버별 설정(override)을 지원합니다. 서버 설정이 없으면 기본값을 사용합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label>대상 서버</Label>
              <Select
                value={selectedServer ?? ""}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  setSelectedServer(next ? next : null);
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
                  {settingsBundle?.server ? (
                    <span>
                      <Badge variant="secondary" className="mr-2">
                        override
                      </Badge>
                      이 서버는 서버별 설정을 사용 중입니다.
                    </span>
                  ) : (
                    <span>
                      <Badge variant="muted" className="mr-2">
                        default
                      </Badge>
                      이 서버는 기본값을 사용 중입니다.
                    </span>
                  )}
                </div>
              ) : (
                <div className="pt-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">
                    default
                  </Badge>
                  기본값(전체) 설정을 수정합니다.
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
              <Input value={dailyResetHhmm} onChange={(e) => setDailyResetHhmm(e.target.value)} placeholder="09:00" />
              {!resetValid ? <div className="text-xs text-destructive">형식: HH:MM (예: 09:00)</div> : null}
            </div>
            <div className="space-y-2">
              <Label>주간 리셋 요일</Label>
              <Select value={weeklyResetDay} onChange={(e) => setWeeklyResetDay(Number(e.target.value))}>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {dayLabel(d)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
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

          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={loading || !resetValid || !resetDirty}
              onClick={async () => {
                if (!resetValid) return;
                await window.aion2Hub.planner.setSettings({ server: selectedServer, dailyResetHhmm, weeklyResetDay });
                await refresh();
              }}
            >
              Save
            </Button>
            {selectedServer && settingsBundle?.server ? (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm(`서버(${selectedServer}) 설정을 삭제하고 기본값으로 되돌릴까요?`)) return;
                  await window.aion2Hub.planner.clearServerSettings({ server: selectedServer });
                  await refresh();
                }}
              >
                기본값으로 되돌리기
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>템플릿 추가</CardTitle>
          <CardDescription>추가된 템플릿은 모든 캐릭터에 자동 할당됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>이름</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 원정 1회" />
            </div>
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as PlannerTemplateType)}>
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="CHARGE">CHARGE</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>예상(분)</Label>
              <Input
                type="number"
                min={0}
                value={estimateMinutes}
                onChange={(e) => setEstimateMinutes(Number(e.target.value))}
              />
            </div>

            {type === "CHARGE" ? (
              <>
                <div className="space-y-2">
                  <Label>충전(시간)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={rechargeHours}
                    onChange={(e) => setRechargeHours(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>최대 스택</Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxStacks}
                    onChange={(e) => setMaxStacks(Number(e.target.value))}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const trimmed = title.trim();
                if (!trimmed) return;
                await window.aion2Hub.planner.createTemplate({
                  title: trimmed,
                  type,
                  estimateMinutes,
                  rechargeHours: type === "CHARGE" ? rechargeHours : null,
                  maxStacks: type === "CHARGE" ? maxStacks : null
                });
                setTitle("");
                await refresh();
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Templates</CardTitle>
            <Badge variant="muted">
              {templateCounts.total}/{templates.length}
            </Badge>
            <span className="text-xs text-muted-foreground">
              D {templateCounts.daily} · W {templateCounts.weekly} · C {templateCounts.charge}
            </span>
          </div>
          <CardDescription>각 템플릿은 Planner Today에서 체크/충전 사용으로 반영됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? <p className="text-sm text-muted-foreground">템플릿이 없습니다.</p> : null}

          {templates.length ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>검색</Label>
                <Input value={templateQ} onChange={(e) => setTemplateQ(e.target.value)} placeholder="템플릿 이름 검색…" />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={templateTypeFilter} onChange={(e) => setTemplateTypeFilter(e.target.value as typeof templateTypeFilter)}>
                  <option value="ALL">전체</option>
                  <option value="DAILY">DAILY</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="CHARGE">CHARGE</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  disabled={!templateQ && templateTypeFilter === "ALL"}
                  onClick={() => {
                    setTemplateQ("");
                    setTemplateTypeFilter("ALL");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          {visibleTemplates.map((t) => (
            <Card key={t.id} className="bg-background/40">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{t.title}</span>
                  <Badge variant={t.type === "CHARGE" ? "secondary" : "muted"}>{t.type}</Badge>
                  <span className="text-xs text-muted-foreground">{t.estimateMinutes}m</span>
                  {t.type === "CHARGE" ? (
                    <span className="text-xs text-muted-foreground">
                      {t.maxStacks ?? "-"} stacks / {t.rechargeHours ?? "-"}h
                    </span>
                  ) : null}

                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(t.id);
                        setEditTitle(t.title);
                        setEditType(t.type);
                        setEditEstimateMinutes(t.estimateMinutes);
                        setEditRechargeHours(t.rechargeHours ?? 24);
                        setEditMaxStacks(t.maxStacks ?? 1);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm(`삭제할까요? (${t.title})`)) return;
                        await window.aion2Hub.planner.deleteTemplate(t.id);
                        await refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {templates.length > 0 && visibleTemplates.length === 0 ? (
            <div className="rounded-md border bg-background/30 px-3 py-6 text-sm text-muted-foreground">조건에 맞는 템플릿이 없습니다.</div>
          ) : null}
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit</CardTitle>
            <CardDescription>템플릿 정보를 수정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>이름</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={editType} onChange={(e) => setEditType(e.target.value as PlannerTemplateType)}>
                  <option value="DAILY">DAILY</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="CHARGE">CHARGE</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>예상(분)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editEstimateMinutes}
                  onChange={(e) => setEditEstimateMinutes(Number(e.target.value))}
                />
              </div>

              {editType === "CHARGE" ? (
                <>
                  <div className="space-y-2">
                    <Label>충전(시간)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editRechargeHours}
                      onChange={(e) => setEditRechargeHours(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>최대 스택</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editMaxStacks}
                      onChange={(e) => setEditMaxStacks(Number(e.target.value))}
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const trimmed = editTitle.trim();
                  if (!editingId || !trimmed) return;
                  await window.aion2Hub.planner.updateTemplate({
                    id: editingId,
                    title: trimmed,
                    type: editType,
                    estimateMinutes: editEstimateMinutes,
                    rechargeHours: editType === "CHARGE" ? editRechargeHours : null,
                    maxStacks: editType === "CHARGE" ? editMaxStacks : null
                  });
                  setEditingId(null);
                  await refresh();
                }}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
