import Link from "next/link";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <header>
        <h1 style={{ margin: 0 }}>Settings</h1>
      </header>

      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/settings/modules">Modules</Link>
        <Link href="/settings/backup">Backup</Link>
        <Link href="/settings/notifications">Notifications</Link>
        <Link href="/settings/safety">Safety</Link>
      </nav>

      <section>{children}</section>
    </div>
  );
}

