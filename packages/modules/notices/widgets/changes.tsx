"use client";

export default function NoticesChangesWidget() {
  return (
    <div>
      <div style={{ fontWeight: 700 }}>공지 변경</div>
      <div style={{ opacity: 0.8 }}>
        Feed/Diff는 <a href="/m/notices/feed">Notices → Feed</a> 에서 확인하세요.
      </div>
    </div>
  );
}
