"use client";

const OFFICIAL_LINKS = [
  { id: "notice", title: "공지", url: "https://aion2.plaync.com/ko-kr/board/notice/list" },
  { id: "update", title: "업데이트", url: "https://aion2.plaync.com/ko-kr/board/update/list" },
  { id: "ranking", title: "랭킹", url: "https://aion2.plaync.com/ko-kr/ranking/index" },
  { id: "chars", title: "캐릭터 정보실", url: "https://aion2.plaync.com/ko-kr/characters/index" }
];

export default function LinksOfficialPage() {
  return (
    <main>
      <h1>Official Links</h1>
      <ul>
        {OFFICIAL_LINKS.map((link) => (
          <li key={link.id}>
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

