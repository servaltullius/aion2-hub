import type { BuildScoreState } from "./model.js";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";

export function ResultsCard({
  state,
  scoreA,
  scoreB,
  delta
}: {
  state: BuildScoreState;
  scoreA: number;
  scoreB: number;
  delta: number;
}) {
  return (
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
  );
}

