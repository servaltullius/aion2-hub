import type { BuildScoreClassId, BuildScoreClassPreset, BuildScorePresetMode } from "../../buildScore/classPresets.js";
import { BUILD_SCORE_CLASSES } from "../../buildScore/classPresets.js";

import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Label } from "../../components/ui/label.js";
import { Select } from "../../components/ui/select.js";

export function ClassPresetCard({
  presetMode,
  presetClassId,
  selectedPreset,
  onPresetModeChange,
  onPresetClassIdChange,
  onApply
}: {
  presetMode: BuildScorePresetMode;
  presetClassId: BuildScoreClassId;
  selectedPreset: BuildScoreClassPreset | null;
  onPresetModeChange: (mode: BuildScorePresetMode) => void;
  onPresetClassIdChange: (classId: BuildScoreClassId) => void;
  onApply: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>직업 프리셋 (추천)</CardTitle>
        <CardDescription>가중치 “시작점”입니다. 적용 후 수정 가능하며, 저장하려면 Save를 눌러야 합니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label>모드</Label>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" variant={presetMode === "pve" ? "secondary" : "outline"} onClick={() => onPresetModeChange("pve")}>
              PvE
            </Button>
            <Button size="sm" className="flex-1" variant={presetMode === "pvp" ? "secondary" : "outline"} onClick={() => onPresetModeChange("pvp")}>
              PvP
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>직업</Label>
          <Select value={presetClassId} onChange={(e) => onPresetClassIdChange(e.target.value as BuildScoreClassId)}>
            {BUILD_SCORE_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end">
          <Button className="w-full" variant="secondary" disabled={!selectedPreset} onClick={onApply}>
            적용
          </Button>
        </div>

        {selectedPreset ? <p className="text-sm text-muted-foreground md:col-span-3">{selectedPreset.description}</p> : null}
      </CardContent>
    </Card>
  );
}

