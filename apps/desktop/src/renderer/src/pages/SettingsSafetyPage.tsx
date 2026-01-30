import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";

export function SettingsSafetyPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Safety / Non-goal</h2>
        <p className="text-sm text-muted-foreground">운영정책 리스크를 피하기 위해 아래는 명확히 금지합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>금지</CardTitle>
          <CardDescription>안전한 범위(공지/숙제 관리 등)만 제공합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>게임 클라이언트(메모리/프로세스/패킷) 접근, 후킹/변조, 자동 입력/매크로</li>
            <li>계정/보호조치 우회, VPN 우회, 하드웨어 차단 회피류</li>
            <li>정상 이용자가 할 수 없는 행위를 가능하게 하는 기능</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
