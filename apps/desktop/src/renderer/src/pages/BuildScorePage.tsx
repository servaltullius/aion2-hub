import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select } from "../components/ui/select.js";
import { BUILD_SCORE_CATALOG, type BuildScoreUnit } from "../buildScore/catalog.js";
import { isObject } from "../lib/guards.js";
import {
  BUILD_SCORE_CLASSES,
  detectBuildScoreClassId,
  getBuildScoreClassPresetBy,
  type BuildScoreClassId,
  type BuildScorePresetMode
} from "../buildScore/classPresets.js";

import {
  applyClassPreset,
  applyUserPreset,
  asBuildScorePreset,
  asBuildScorePresetList,
  asBuildScorePresetListItem,
  asBuildScoreState,
  computeScore,
  numberOrZero,
  type BuildScorePreset,
  type BuildScorePresetListItem,
  type BuildScoreState
} from "./buildScore/model.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

function stateSignature(state: BuildScoreState) {
  return JSON.stringify({ ...state, updatedAt: "" });
}

export function BuildScorePage(props: { activeCharacterId: string | null; characters: AppCharacter[] }) {
  const [state, setState] = useState<BuildScoreState | null>(null);
  const [baselineSig, setBaselineSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [presets, setPresets] = useState<BuildScorePresetListItem[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const active = props.activeCharacterId
    ? props.characters.find((c) => c.id === props.activeCharacterId) ?? null
    : null;

  const refresh = useMemo(
    () => async () => {
      if (!props.activeCharacterId) {
        setState(null);
        setBaselineSig(null);
        return;
      }
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const raw = await window.aion2Hub.buildScore.get({ characterId: props.activeCharacterId });
        const parsed = asBuildScoreState(raw);
        if (!parsed) throw new Error("unexpected_response");
        setState(parsed);
        setBaselineSig(stateSignature(parsed));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "error");
        setState(null);
        setBaselineSig(null);
      } finally {
        setLoading(false);
      }
    },
    [props.activeCharacterId]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshPresets = useMemo(
    () => async () => {
      if (!props.activeCharacterId) {
        setPresets([]);
        return;
      }
      setPresetsLoading(true);
      setPresetsError(null);
      try {
        const raw = await window.aion2Hub.buildScorePresets.list({ characterId: props.activeCharacterId });
        setPresets(asBuildScorePresetList(raw));
      } catch (e: unknown) {
        setPresetsError(e instanceof Error ? e.message : "error");
        setPresets([]);
      } finally {
        setPresetsLoading(false);
      }
    },
    [props.activeCharacterId]
  );

  useEffect(() => {
    void refreshPresets();
  }, [refreshPresets]);

  const [presetMode, setPresetMode] = useState<BuildScorePresetMode>("pve");
  const [presetClassId, setPresetClassId] = useState<BuildScoreClassId>(() => {
    const detected = detectBuildScoreClassId(active?.class ?? null);
    return detected ?? BUILD_SCORE_CLASSES[0]?.id ?? "gladiator";
  });

  useEffect(() => {
    const detected = detectBuildScoreClassId(active?.class ?? null);
    if (detected) setPresetClassId(detected);
  }, [active?.id, active?.class]);

  const selectedPreset = useMemo(() => getBuildScoreClassPresetBy(presetMode, presetClassId), [presetMode, presetClassId]);

  const [addCatalogId, setAddCatalogId] = useState(() => BUILD_SCORE_CATALOG[0]?.id ?? "");
  const [customLabel, setCustomLabel] = useState("");
  const [customUnit, setCustomUnit] = useState<BuildScoreUnit>("flat");
  const [newPresetName, setNewPresetName] = useState("내 프리셋");
  const [selectedUserPresetId, setSelectedUserPresetId] = useState("");

  const scoreA = useMemo(() => (state ? computeScore(state, "A") : 0), [state]);
  const scoreB = useMemo(() => (state ? computeScore(state, "B") : 0), [state]);
  const delta = scoreB - scoreA;
  const isDirty = useMemo(() => (state && baselineSig ? stateSignature(state) !== baselineSig : false), [baselineSig, state]);

  function updateState(fn: (s: BuildScoreState) => BuildScoreState) {
    setState((prev) => (prev ? fn(prev) : prev));
  }

  useEffect(() => {
    if (!newPresetName.trim()) {
      setNewPresetName("내 프리셋");
    }
  }, [active?.id]);

  useEffect(() => {
    const first = presets[0];
    if (!selectedUserPresetId && first) {
      setSelectedUserPresetId(first.id);
      return;
    }
    if (selectedUserPresetId && first && !presets.some((p) => p.id === selectedUserPresetId)) {
      setSelectedUserPresetId(first.id);
    }
  }, [presets, selectedUserPresetId]);

  const [statsQuery, setStatsQuery] = useState("");
  const [statsOnlyEnabled, setStatsOnlyEnabled] = useState(false);
  const [statsSort, setStatsSort] = useState<"default" | "enabled" | "label" | "delta">("default");
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);

  const visibleStats = useMemo(() => {
    if (!state) return [];
    const query = statsQuery.trim().toLowerCase();
    const list = state.stats.filter((st) => {
      if (statsOnlyEnabled && !st.enabled) return false;
      if (!query) return true;
      return st.label.toLowerCase().includes(query) || st.id.toLowerCase().includes(query);
    });

    const valueA = (id: string) => state.setA.values[id] ?? 0;
    const valueB = (id: string) => state.setB.values[id] ?? 0;
    const deltaContribution = (id: string, weight: number) => (valueB(id) - valueA(id)) * weight;

    if (statsSort === "enabled") {
      return [...list].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.label.localeCompare(b.label, "ko"));
    }
    if (statsSort === "label") {
      return [...list].sort((a, b) => a.label.localeCompare(b.label, "ko"));
    }
    if (statsSort === "delta") {
      return [...list].sort((a, b) => Math.abs(deltaContribution(b.id, b.weight)) - Math.abs(deltaContribution(a.id, a.weight)));
    }
    return list;
  }, [state, statsOnlyEnabled, statsQuery, statsSort]);

  const visibleEnabledCount = useMemo(() => visibleStats.reduce((acc, st) => acc + (st.enabled ? 1 : 0), 0), [visibleStats]);

  async function handleSave() {
    if (!props.activeCharacterId || !state) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await window.aion2Hub.buildScore.set({ characterId: props.activeCharacterId, state });
      setMessage("저장했습니다.");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!props.activeCharacterId) return;
    if (!confirm("이 캐릭터의 세팅 점수를 초기화할까요?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await window.aion2Hub.buildScore.reset({ characterId: props.activeCharacterId });
      setMessage("초기화했습니다.");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">세팅 점수 (가중치)</h2>
          <p className="text-sm text-muted-foreground">캐릭터별로 “내 기준” 가중치를 저장하고, 세팅 A/B를 숫자로 비교합니다.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {state ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isDirty ? <Badge variant="secondary">unsaved</Badge> : <Badge variant="muted">saved</Badge>}
              <span className="hidden sm:inline">updated {new Date(state.updatedAt).toLocaleString()}</span>
            </div>
          ) : null}
          <Button type="button" variant="secondary" size="sm" disabled={!state || saving || !isDirty} onClick={() => void handleSave()}>
            Save
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}>
            Reload
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!state || saving} onClick={() => void handleReset()}>
            Reset
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
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {state ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>직업 프리셋 (추천)</CardTitle>
              <CardDescription>가중치 “시작점”입니다. 적용 후 수정 가능하며, 저장하려면 Save를 눌러야 합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>모드</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    variant={presetMode === "pve" ? "secondary" : "outline"}
                    onClick={() => setPresetMode("pve")}
                  >
                    PvE
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    variant={presetMode === "pvp" ? "secondary" : "outline"}
                    onClick={() => setPresetMode("pvp")}
                  >
                    PvP
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>직업</Label>
                <Select value={presetClassId} onChange={(e) => setPresetClassId(e.target.value as BuildScoreClassId)}>
                  {BUILD_SCORE_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={!selectedPreset}
                  onClick={() => {
                    if (!state || !selectedPreset) return;
                    updateState((s) => applyClassPreset(s, selectedPreset));
                    setMessage(`프리셋을 적용했습니다. (${selectedPreset.label}) Save를 눌러 저장하세요.`);
                  }}
                >
                  적용
                </Button>
              </div>

              {selectedPreset ? <p className="text-sm text-muted-foreground md:col-span-3">{selectedPreset.description}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>내 프리셋</CardTitle>
                <Badge variant="muted">{presets.length}</Badge>
              </div>
              <CardDescription>현재 “항목(가중치)” 설정을 이름으로 저장해두고, 필요할 때 불러올 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {presetsError ? <p className="text-sm text-destructive">{presetsError}</p> : null}
              {presetsLoading ? <p className="text-sm text-muted-foreground">Loading presets…</p> : null}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>새 프리셋 이름</Label>
                  <Input value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="예: 내 PvE 가중치" />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={saving || presetsLoading}
                    onClick={async () => {
                      if (!props.activeCharacterId || !state) return;
                      const name = newPresetName.trim();
                      if (!name) return;
                      setSaving(true);
                      setError(null);
                      setMessage(null);
                      try {
                        const createdRaw = await window.aion2Hub.buildScorePresets.create({
                          characterId: props.activeCharacterId,
                          name,
                          state
                        });
                        const created = asBuildScorePresetListItem(createdRaw);
                        setMessage(created ? `프리셋을 저장했습니다. (${created.name})` : "프리셋을 저장했습니다.");
                        await refreshPresets();
                        if (created) setSelectedUserPresetId(created.id);
                      } catch (e: unknown) {
                        setError(e instanceof Error ? e.message : "error");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    현재 가중치 저장
                  </Button>
                </div>
              </div>

              {presets.length ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>저장된 프리셋</Label>
                      <Select value={selectedUserPresetId} onChange={(e) => setSelectedUserPresetId(e.target.value)}>
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.statCount})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        className="flex-1"
                        variant="secondary"
                        disabled={!selectedUserPresetId}
                        onClick={async () => {
                          if (!state || !selectedUserPresetId) return;
                          setSaving(true);
                          setError(null);
                          setMessage(null);
                          try {
                            const raw = await window.aion2Hub.buildScorePresets.get({ presetId: selectedUserPresetId });
                            const preset = asBuildScorePreset(raw);
                            if (!preset) throw new Error("unexpected_response");
                            updateState((s) => applyUserPreset(s, preset));
                            setMessage(`프리셋을 적용했습니다. (${preset.name}) Save를 눌러 저장하세요.`);
                          } catch (e: unknown) {
                            setError(e instanceof Error ? e.message : "error");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        적용
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        disabled={!selectedUserPresetId}
                        onClick={async () => {
                          if (!selectedUserPresetId) return;
                          const current = presets.find((p) => p.id === selectedUserPresetId);
                          const nextName = prompt("새 이름", current?.name ?? "");
                          if (!nextName || !nextName.trim()) return;
                          setSaving(true);
                          setError(null);
                          setMessage(null);
                          try {
                            const updatedRaw = await window.aion2Hub.buildScorePresets.update({
                              presetId: selectedUserPresetId,
                              name: nextName.trim()
                            });
                            const updated = asBuildScorePresetListItem(updatedRaw);
                            setMessage(updated ? `이름을 변경했습니다. (${updated.name})` : "이름을 변경했습니다.");
                            await refreshPresets();
                          } catch (e: unknown) {
                            setError(e instanceof Error ? e.message : "error");
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        이름변경
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={!selectedUserPresetId}
                      onClick={async () => {
                        if (!selectedUserPresetId) return;
                        const current = presets.find((p) => p.id === selectedUserPresetId);
                        const suggestedName = current ? `${current.name} (복사)` : "";
                        const nextName = prompt("복사본 이름", suggestedName);
                        if (nextName === null) return;
                        setSaving(true);
                        setError(null);
                        setMessage(null);
                        try {
                          const clonedRaw = await window.aion2Hub.buildScorePresets.clone({
                            presetId: selectedUserPresetId,
                            name: nextName.trim() ? nextName.trim() : null
                          });
                          const cloned = asBuildScorePresetListItem(clonedRaw);
                          setMessage(cloned ? `복사했습니다. (${cloned.name})` : "복사했습니다.");
                          await refreshPresets();
                          if (cloned) setSelectedUserPresetId(cloned.id);
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      복제
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!selectedUserPresetId}
                      onClick={async () => {
                        if (!selectedUserPresetId) return;
                        setSaving(true);
                        setError(null);
                        setMessage(null);
                        try {
                          const res = await window.aion2Hub.buildScorePresets.exportJson({ presetId: selectedUserPresetId });
                          const filePath = isObject(res) && typeof res.filePath === "string" ? res.filePath : null;
                          setMessage(filePath ? `내보냈습니다. (${filePath})` : "내보냈습니다.");
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      선택 내보내기(JSON)
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!props.activeCharacterId || presets.length === 0}
                      onClick={async () => {
                        if (!props.activeCharacterId) return;
                        setSaving(true);
                        setError(null);
                        setMessage(null);
                        try {
                          const res = await window.aion2Hub.buildScorePresets.exportJson({ characterId: props.activeCharacterId, all: true });
                          const filePath = isObject(res) && typeof res.filePath === "string" ? res.filePath : null;
                          setMessage(filePath ? `전체 내보냈습니다. (${filePath})` : "전체 내보냈습니다.");
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      전체 내보내기(JSON)
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!props.activeCharacterId}
                      onClick={async () => {
                        if (!props.activeCharacterId) return;
                        setSaving(true);
                        setError(null);
                        setMessage(null);
                        try {
                          const res = await window.aion2Hub.buildScorePresets.importJson({ characterId: props.activeCharacterId });
                          const canceled = isObject(res) && typeof res.canceled === "boolean" ? res.canceled : true;
                          if (canceled) {
                            setMessage("가져오기를 취소했습니다.");
                          } else {
                            const imported = isObject(res) && typeof res.imported === "number" ? res.imported : null;
                            setMessage(imported !== null ? `가져왔습니다. (+${imported})` : "가져왔습니다.");
                            await refreshPresets();
                          }
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      가져오기(JSON)
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={!selectedUserPresetId}
                      onClick={async () => {
                        if (!selectedUserPresetId) return;
                        const current = presets.find((p) => p.id === selectedUserPresetId);
                        if (!confirm(`프리셋을 삭제할까요?\n\n${current?.name ?? selectedUserPresetId}`)) return;
                        setSaving(true);
                        setError(null);
                        setMessage(null);
                        try {
                          await window.aion2Hub.buildScorePresets.delete({ presetId: selectedUserPresetId });
                          setMessage("삭제했습니다.");
                          setSelectedUserPresetId("");
                          await refreshPresets();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "error");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 저장된 프리셋이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>결과</CardTitle>
              <CardDescription>점수 = Σ(가중치 × 값)</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border bg-background/30 p-3">
                <div className="text-xs text-muted-foreground">A</div>
                <div className="text-lg font-semibold">{scoreA.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{state.setA.name}</div>
              </div>
              <div className="rounded-md border bg-background/30 p-3">
                <div className="text-xs text-muted-foreground">B</div>
                <div className="text-lg font-semibold">{scoreB.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{state.setB.name}</div>
              </div>
              <div className="rounded-md border bg-background/30 p-3">
                <div className="text-xs text-muted-foreground">B - A</div>
                <div className={delta >= 0 ? "text-lg font-semibold text-primary" : "text-lg font-semibold text-destructive"}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">delta</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>세팅 이름</CardTitle>
              <CardDescription>표시용 이름입니다. (예: PvE / PvP)</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>A</Label>
                <Input value={state.setA.name} onChange={(e) => updateState((s) => ({ ...s, setA: { ...s.setA, name: e.target.value } }))} />
              </div>
              <div className="space-y-2">
                <Label>B</Label>
                <Input value={state.setB.name} onChange={(e) => updateState((s) => ({ ...s, setB: { ...s.setB, name: e.target.value } }))} />
              </div>
            </CardContent>
          </Card>

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
                  <Select value={addCatalogId} onChange={(e) => setAddCatalogId(e.target.value)}>
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
                  <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="예: 보스 피해 증폭" />
                </div>
                <div className="space-y-2">
                  <Label>단위</Label>
                  <Select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as BuildScoreUnit)}>
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
                      const id = (globalThis.crypto?.randomUUID ? `custom:${globalThis.crypto.randomUUID()}` : `custom:${Date.now()}`) as string;
                      updateState((s) => ({
                        ...s,
                        stats: [...s.stats, { id, label, unit: customUnit, enabled: true, weight: 1 }]
                      }));
                      setCustomLabel("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>필터</Label>
                  <Input value={statsQuery} onChange={(e) => setStatsQuery(e.target.value)} placeholder="항목 검색…" />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={statsOnlyEnabled}
                      onChange={(e) => setStatsOnlyEnabled(e.target.checked)}
                    />
                    On만 보기
                  </label>
                </div>
                <div className="space-y-2">
                  <Label>정렬</Label>
                  <Select value={statsSort} onChange={(e) => setStatsSort(e.target.value as typeof statsSort)}>
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
                          onClick={() => setSelectedStatId(st.id)}
                          onFocusCapture={() => setSelectedStatId(st.id)}
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
                                    stats: s.stats.map((x) =>
                                      x.id === st.id ? { ...x, weight: numberOrZero(e.target.value) } : x
                                    )
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
                                    setSelectedStatId(null);
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
                    {visibleStats.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-muted-foreground">표시할 항목이 없습니다.</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" disabled={saving || !isDirty} onClick={() => void handleSave()}>
                  Save
                </Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => void refresh()}>
                  Reload
                </Button>
                <Button type="button" variant="outline" disabled={saving} onClick={() => void handleReset()}>
                  Reset
                </Button>
                <div className="text-xs text-muted-foreground">
                  {isDirty ? "변경사항이 있습니다. Save를 눌러 저장하세요." : "저장됨"}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
