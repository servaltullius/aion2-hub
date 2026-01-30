import { buttonVariants } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { cn } from "../lib/utils.js";

export function DashboardPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          로컬-퍼스트 HUB (Planner + Notices diff). 데이터는 이 EXE 옆 `./data/`에 저장됩니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Planner</CardTitle>
            <CardDescription>멀티 캐릭 숙제/충전 타이머/타임버짓 추천</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <a className={cn(buttonVariants({ variant: "secondary", size: "sm" }))} href="#/m/planner/today">
              Open Today
            </a>
            <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href="#/m/planner/templates">
              Templates
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notices</CardTitle>
            <CardDescription>공식 공지/업데이트 Feed + Diff</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <a className={cn(buttonVariants({ variant: "secondary", size: "sm" }))} href="#/m/notices/feed">
              Open Feed
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Characters</CardTitle>
            <CardDescription>캐릭터 등록/선택(활성 캐릭터)</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <a className={cn(buttonVariants({ variant: "secondary", size: "sm" }))} href="#/characters">
              Manage
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup</CardTitle>
            <CardDescription>JSON 내보내기/가져오기(현재 replace)</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <a className={cn(buttonVariants({ variant: "secondary", size: "sm" }))} href="#/settings/backup">
              Open Backup
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
