import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { BUILD_SCORE_CATALOG, type BuildScoreUnit } from "../buildScore/catalog.js";
import {
  BUILD_SCORE_CLASSES,
  detectBuildScoreClassId,
  getBuildScoreClassPresetBy,
  type BuildScoreClassId,
  type BuildScorePresetMode
} from "../buildScore/classPresets.js";

import {
  applyClassPreset,
  asBuildScorePresetList,
  asBuildScoreState,
  computeScore,
  type BuildScorePresetListItem,
  type BuildScoreState
} from "./buildScore/model.js";
import { BuildScoreHeader } from "./buildScore/BuildScoreHeader.js";
import { ClassPresetCard } from "./buildScore/ClassPresetCard.js";
import { ResultsCard } from "./buildScore/ResultsCard.js";
import { StatsTableCard } from "./buildScore/StatsTableCard.js";
import { UserPresetsCard } from "./buildScore/UserPresetsCard.js";

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
      <BuildScoreHeader
        state={state}
        isDirty={isDirty}
        saving={saving}
        loading={loading}
        onSave={() => void handleSave()}
        onReload={() => void refresh()}
        onReset={() => void handleReset()}
      />

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
          <ClassPresetCard
            presetMode={presetMode}
            presetClassId={presetClassId}
            selectedPreset={selectedPreset}
            onPresetModeChange={setPresetMode}
            onPresetClassIdChange={setPresetClassId}
            onApply={() => {
              if (!state || !selectedPreset) return;
              updateState((s) => applyClassPreset(s, selectedPreset));
              setMessage(`프리셋을 적용했습니다. (${selectedPreset.label}) Save를 눌러 저장하세요.`);
            }}
          />

          <UserPresetsCard
            activeCharacterId={props.activeCharacterId}
            state={state}
            presets={presets}
            presetsLoading={presetsLoading}
            presetsError={presetsError}
            saving={saving}
            newPresetName={newPresetName}
            selectedUserPresetId={selectedUserPresetId}
            setSaving={setSaving}
            setError={setError}
            setMessage={setMessage}
            setNewPresetName={setNewPresetName}
            setSelectedUserPresetId={setSelectedUserPresetId}
            refreshPresets={refreshPresets}
            updateState={updateState}
          />

          <ResultsCard state={state} scoreA={scoreA} scoreB={scoreB} delta={delta} />

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

          <StatsTableCard
            state={state}
            visibleStats={visibleStats}
            visibleEnabledCount={visibleEnabledCount}
            addCatalogId={addCatalogId}
            customLabel={customLabel}
            customUnit={customUnit}
            statsQuery={statsQuery}
            statsOnlyEnabled={statsOnlyEnabled}
            statsSort={statsSort}
            selectedStatId={selectedStatId}
            saving={saving}
            loading={loading}
            isDirty={isDirty}
            onAddCatalogIdChange={setAddCatalogId}
            onCustomLabelChange={setCustomLabel}
            onCustomUnitChange={setCustomUnit}
            onStatsQueryChange={setStatsQuery}
            onStatsOnlyEnabledChange={setStatsOnlyEnabled}
            onStatsSortChange={setStatsSort}
            onSelectedStatIdChange={setSelectedStatId}
            updateState={updateState}
            onSave={() => void handleSave()}
            onReload={() => void refresh()}
            onReset={() => void handleReset()}
          />

        </>
      ) : null}
    </section>
  );
}
