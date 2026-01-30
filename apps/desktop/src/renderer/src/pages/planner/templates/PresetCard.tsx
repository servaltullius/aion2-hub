import type { PlannerPreset } from "../../../planner/presets.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { Label } from "../../../components/ui/label.js";
import { Select } from "../../../components/ui/select.js";

export type PresetCounts = { daily: number; weekly: number; charge: number; total: number };

export function PresetCard({
  presetId,
  presets,
  preset,
  counts,
  message,
  applying,
  loading,
  onPresetIdChange,
  onApplyMerge,
  onApplyReplace
}: {
  presetId: string;
  presets: PlannerPreset[];
  preset: PlannerPreset | undefined;
  counts: PresetCounts;
  message: string | null;
  applying: boolean;
  loading: boolean;
  onPresetIdChange: (id: string) => void;
  onApplyMerge: () => void;
  onApplyReplace: () => void;
}) {
  if (!preset) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>프리셋</CardTitle>
          <Badge variant="muted">{counts.total}</Badge>
        </div>
        <CardDescription>{preset.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>프리셋 선택</Label>
            <Select value={presetId} onChange={(e) => onPresetIdChange(e.target.value)}>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>구성</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary">DAILY {counts.daily}</Badge>
              <Badge variant="secondary">WEEKLY {counts.weekly}</Badge>
              <Badge variant="secondary">CHARGE {counts.charge}</Badge>
            </div>
          </div>
        </div>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={applying || loading} onClick={onApplyMerge}>
            프리셋 추가(기존 유지)
          </Button>
          <Button variant="destructive" disabled={applying || loading} onClick={onApplyReplace}>
            초기화 후 적용
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

