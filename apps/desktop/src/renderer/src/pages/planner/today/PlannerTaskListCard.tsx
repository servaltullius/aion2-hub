import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";

type ChecklistRow = {
  templateId: string;
  title: string;
  estimateMinutes: number;
  completed: boolean;
};

export function PlannerTaskListCard(props: {
  title: string;
  description: string;
  totalCount: number;
  doneCount: number;
  visible: ChecklistRow[];
  onToggle: (input: { templateId: string; completed: boolean }) => Promise<void> | void;
  onStart: (input: { templateId: string; title: string }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{props.title}</CardTitle>
          <Badge variant="muted">
            {props.doneCount}/{props.totalCount}
          </Badge>
        </div>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.totalCount === 0 ? <p className="text-sm text-muted-foreground">템플릿이 없습니다.</p> : null}
        {props.visible.map((t) => (
          <div key={t.templateId} className="flex items-center gap-3 rounded-md border bg-background/30 px-3 py-2 text-sm">
            <input
              className="h-4 w-4 accent-primary"
              type="checkbox"
              checked={t.completed}
              onChange={(e) => void props.onToggle({ templateId: t.templateId, completed: e.target.checked })}
            />
            <span className="flex-1">{t.title}</span>
            <span className="text-xs text-muted-foreground">{t.estimateMinutes}m</span>
            <Button size="sm" variant="outline" onClick={() => props.onStart({ templateId: t.templateId, title: t.title })}>
              Start
            </Button>
          </div>
        ))}
        {props.totalCount > 0 && props.visible.length === 0 ? (
          <div className="rounded-md border bg-background/30 px-3 py-6 text-sm text-muted-foreground">표시할 항목이 없습니다.</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

