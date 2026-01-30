import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card.js";

import { formatDate, type ChargeItem } from "./model.js";

export function PlannerChargesCard(props: {
  allCount: number;
  visible: ChargeItem[];
  onUse: (input: { templateId: string }) => Promise<void> | void;
  onUndo: (input: { templateId: string }) => Promise<void> | void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>CHARGE (티켓/충전)</CardTitle>
          <Badge variant="muted">
            {props.visible.length}/{props.allCount}
          </Badge>
        </div>
        <CardDescription>남은 스택과 다음 충전 시간을 표시합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.allCount === 0 ? <p className="text-sm text-muted-foreground">충전형 템플릿이 없습니다.</p> : null}
        {props.visible.map((c) => (
          <div key={c.templateId} className="flex flex-wrap items-center gap-2 rounded-md border bg-background/30 px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">
                {c.available}/{c.maxStacks} · recharge {c.rechargeHours}h · next {formatDate(c.nextRechargeAt)}
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={c.available <= 0}
                onClick={() => void props.onUse({ templateId: c.templateId })}
              >
                Use 1
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={c.available >= c.maxStacks}
                onClick={() => void props.onUndo({ templateId: c.templateId })}
              >
                Undo
              </Button>
            </div>
          </div>
        ))}
        {props.allCount > 0 && props.visible.length === 0 ? (
          <div className="rounded-md border bg-background/30 px-3 py-6 text-sm text-muted-foreground">표시할 항목이 없습니다.</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

