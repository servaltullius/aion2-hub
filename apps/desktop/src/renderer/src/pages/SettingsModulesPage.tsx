import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";

export function SettingsModulesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Modules</h2>
        <p className="text-sm text-muted-foreground">모듈 on/off는 다음 단계에서 추가합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>현재 포함</CardTitle>
          <CardDescription>Discord/Legion은 스코프에서 제외합니다.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Notices / Planner / Collectibles / Links / Characters / Backup
        </CardContent>
      </Card>
    </section>
  );
}
