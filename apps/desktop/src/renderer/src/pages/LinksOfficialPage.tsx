import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";

type LinkItem = { label: string; url: string; note?: string };

const LINKS: LinkItem[] = [
  { label: "AION2 공식 사이트", url: "https://aion2.plaync.com/ko-kr" },
  { label: "공식 공지", url: "https://aion2.plaync.com/ko-kr/board/notice" },
  { label: "업데이트", url: "https://aion2.plaync.com/ko-kr/board/update" },
  { label: "고객센터/정책", url: "https://help.plaync.com/" }
];

export function LinksOfficialPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Official Links</h2>
        <p className="text-sm text-muted-foreground">자주 쓰는 공식 링크를 모아둡니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>클릭 시 기본 브라우저로 열립니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {LINKS.map((it) => (
              <li key={it.url} className="flex flex-wrap items-center justify-between gap-2">
                <a className="text-sm text-primary hover:underline" href={it.url} target="_blank" rel="noreferrer">
                  {it.label}
                </a>
                {it.note ? <span className="text-xs text-muted-foreground">{it.note}</span> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
