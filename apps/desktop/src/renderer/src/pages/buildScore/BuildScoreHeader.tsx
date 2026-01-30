import type { BuildScoreState } from "./model.js";

import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";

export function BuildScoreHeader({
  state,
  isDirty,
  saving,
  loading,
  onSave,
  onReload,
  onReset
}: {
  state: BuildScoreState | null;
  isDirty: boolean;
  saving: boolean;
  loading: boolean;
  onSave: () => void;
  onReload: () => void;
  onReset: () => void;
}) {
  return (
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
        <Button type="button" variant="secondary" size="sm" disabled={!state || saving || !isDirty} onClick={onSave}>
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onReload}>
          Reload
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!state || saving} onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

