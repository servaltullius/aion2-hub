import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { formatDurationSeconds } from "../../../planner/duration.js";

export function PlannerTimerCard(props: {
  title: string;
  elapsedSeconds: number;
  onStopSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>타이머</CardTitle>
        <CardDescription>앱을 종료하면 타이머는 리셋됩니다. (저장은 Stop 시에만)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{props.title}</div>
          <div className="text-xs text-muted-foreground">elapsed: {formatDurationSeconds(Math.max(0, props.elapsedSeconds))}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={props.onStopSave}>
            Stop & Save
          </Button>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

