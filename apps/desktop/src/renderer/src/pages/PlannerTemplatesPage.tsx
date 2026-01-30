import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { PLANNER_PRESETS } from "../planner/presets.js";
import { parseHhmm } from "../planner/reset.js";

import {
  asApplyPresetResult,
  asServersFromCharacters,
  asSettingsBundle,
  asTemplates
} from "./planner/templates/model.js";
import type { PlannerSettingsBundle, PlannerTemplate, PlannerTemplateType } from "./planner/templates/model.js";
import { EditTemplateCard } from "./planner/templates/EditTemplateCard.js";
import { PresetCard } from "./planner/templates/PresetCard.js";
import { ResetSettingsCard } from "./planner/templates/ResetSettingsCard.js";
import { TemplatesList } from "./planner/templates/TemplatesList.js";

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

  const applyPresetMerge = async () => {
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
  };

  const applyPresetReplace = async () => {
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
  };

  const saveResetSettings = async () => {
    if (!resetValid) return;
    await window.aion2Hub.planner.setSettings({ server: selectedServer, dailyResetHhmm, weeklyResetDay });
    await refresh();
  };

  const clearServerOverride = async () => {
    if (!selectedServer) return;
    if (!confirm(`서버(${selectedServer}) 설정을 삭제하고 기본값으로 되돌릴까요?`)) return;
    await window.aion2Hub.planner.clearServerSettings({ server: selectedServer });
    await refresh();
  };

  const startEditTemplate = (t: PlannerTemplate) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditType(t.type);
    setEditEstimateMinutes(t.estimateMinutes);
    setEditRechargeHours(t.rechargeHours ?? 24);
    setEditMaxStacks(t.maxStacks ?? 1);
  };

  const deleteTemplate = async (t: PlannerTemplate) => {
    if (!confirm(`삭제할까요? (${t.title})`)) return;
    await window.aion2Hub.planner.deleteTemplate(t.id);
    await refresh();
  };

  const saveEditedTemplate = async () => {
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
  };

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

      <PresetCard
        presetId={presetId}
        presets={PLANNER_PRESETS}
        preset={preset}
        counts={presetCounts}
        message={presetMessage}
        applying={presetApplying}
        loading={loading}
        onPresetIdChange={setPresetId}
        onApplyMerge={() => void applyPresetMerge()}
        onApplyReplace={() => void applyPresetReplace()}
      />

      <ResetSettingsCard
        selectedServer={selectedServer}
        servers={servers}
        settingsBundle={settingsBundle}
        dailyResetHhmm={dailyResetHhmm}
        weeklyResetDay={weeklyResetDay}
        resetValid={resetValid}
        resetDirty={resetDirty}
        loading={loading}
        onSelectedServerChange={setSelectedServer}
        onDailyResetHhmmChange={setDailyResetHhmm}
        onWeeklyResetDayChange={setWeeklyResetDay}
        onSave={() => void saveResetSettings()}
        onClearServerOverride={() => void clearServerOverride()}
      />

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

      <TemplatesList
        templates={templates}
        visibleTemplates={visibleTemplates}
        counts={templateCounts}
        query={templateQ}
        typeFilter={templateTypeFilter}
        onQueryChange={setTemplateQ}
        onTypeFilterChange={setTemplateTypeFilter}
        onClearFilters={() => {
          setTemplateQ("");
          setTemplateTypeFilter("ALL");
        }}
        onEditTemplate={startEditTemplate}
        onDeleteTemplate={(t) => void deleteTemplate(t)}
      />

      {editing ? (
        <EditTemplateCard
          editTitle={editTitle}
          editType={editType}
          editEstimateMinutes={editEstimateMinutes}
          editRechargeHours={editRechargeHours}
          editMaxStacks={editMaxStacks}
          onEditTitleChange={setEditTitle}
          onEditTypeChange={setEditType}
          onEditEstimateMinutesChange={setEditEstimateMinutes}
          onEditRechargeHoursChange={setEditRechargeHours}
          onEditMaxStacksChange={setEditMaxStacks}
          onSave={() => void saveEditedTemplate()}
          onCancel={() => setEditingId(null)}
        />
      ) : null}
    </section>
  );
}
