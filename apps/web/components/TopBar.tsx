export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="topBar">
      <button className="iconButton" type="button" onClick={onMenuClick} aria-label="Toggle menu">
        ☰
      </button>
      <div className="topBarTitle">AION2 HUB</div>
      <div className="topBarRight">
        <input className="searchInput" placeholder="Search (coming soon)" aria-label="Search" />
      </div>
    </header>
  );
}

