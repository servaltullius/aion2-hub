import type { Dispatch, SetStateAction } from "react";

import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { Label } from "../../components/ui/label.js";
import { Select } from "../../components/ui/select.js";
import { isObject } from "../../lib/guards.js";

import { applyUserPreset, asBuildScorePreset, asBuildScorePresetListItem, type BuildScorePresetListItem, type BuildScoreState } from "./model.js";

export function UserPresetsCard({
  activeCharacterId,
  state,
  presets,
  presetsLoading,
  presetsError,
  saving,
  newPresetName,
  selectedUserPresetId,
  setSaving,
  setError,
  setMessage,
  setNewPresetName,
  setSelectedUserPresetId,
  refreshPresets,
  updateState
}: {
  activeCharacterId: string | null;
  state: BuildScoreState;
  presets: BuildScorePresetListItem[];
  presetsLoading: boolean;
  presetsError: string | null;
  saving: boolean;
  newPresetName: string;
  selectedUserPresetId: string;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setNewPresetName: Dispatch<SetStateAction<string>>;
  setSelectedUserPresetId: Dispatch<SetStateAction<string>>;
  refreshPresets: () => Promise<void>;
  updateState: (fn: (s: BuildScoreState) => BuildScoreState) => void;
}) {
  return (
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
                if (!activeCharacterId || !state) return;
                const name = newPresetName.trim();
                if (!name) return;
                setSaving(true);
                setError(null);
                setMessage(null);
                try {
                  const createdRaw = await window.aion2Hub.buildScorePresets.create({
                    characterId: activeCharacterId,
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
                disabled={!activeCharacterId || presets.length === 0}
                onClick={async () => {
                  if (!activeCharacterId) return;
                  setSaving(true);
                  setError(null);
                  setMessage(null);
                  try {
                    const res = await window.aion2Hub.buildScorePresets.exportJson({ characterId: activeCharacterId, all: true });
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
                disabled={!activeCharacterId}
                onClick={async () => {
                  if (!activeCharacterId) return;
                  setSaving(true);
                  setError(null);
                  setMessage(null);
                  try {
                    const res = await window.aion2Hub.buildScorePresets.importJson({ characterId: activeCharacterId });
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
  );
}

