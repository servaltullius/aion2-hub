import type { PlannerTemplate, PlannerTemplateType } from "./model.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import { Select } from "../../../components/ui/select.js";

export type TemplatesCounts = { daily: number; weekly: number; charge: number; total: number };

export function TemplatesList({
  templates,
  visibleTemplates,
  counts,
  query,
  typeFilter,
  onQueryChange,
  onTypeFilterChange,
  onClearFilters,
  onEditTemplate,
  onDeleteTemplate
}: {
  templates: PlannerTemplate[];
  visibleTemplates: PlannerTemplate[];
  counts: TemplatesCounts;
  query: string;
  typeFilter: "ALL" | PlannerTemplateType;
  onQueryChange: (q: string) => void;
  onTypeFilterChange: (filter: "ALL" | PlannerTemplateType) => void;
  onClearFilters: () => void;
  onEditTemplate: (template: PlannerTemplate) => void;
  onDeleteTemplate: (template: PlannerTemplate) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Templates</CardTitle>
          <Badge variant="muted">
            {counts.total}/{templates.length}
          </Badge>
          <span className="text-xs text-muted-foreground">
            D {counts.daily} · W {counts.weekly} · C {counts.charge}
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
              <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="템플릿 이름 검색…" />
            </div>
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value as typeof typeFilter)}>
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
                disabled={!query && typeFilter === "ALL"}
                onClick={onClearFilters}
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
                  <Button size="sm" variant="outline" onClick={() => onEditTemplate(t)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDeleteTemplate(t)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length > 0 && visibleTemplates.length === 0 ? (
          <div className="rounded-md border bg-background/30 px-3 py-6 text-sm text-muted-foreground">
            조건에 맞는 템플릿이 없습니다.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

