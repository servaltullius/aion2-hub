import Link from "next/link";

export default function SettingsIndexPage() {
  return (
    <main>
      <p>Select a settings section:</p>
      <ul>
        <li>
          <Link href="/settings/modules">Modules</Link>
        </li>
        <li>
          <Link href="/settings/backup">Backup</Link>
        </li>
        <li>
          <Link href="/settings/notifications">Notifications</Link>
        </li>
        <li>
          <Link href="/settings/safety">Safety</Link>
        </li>
      </ul>
    </main>
  );
}

