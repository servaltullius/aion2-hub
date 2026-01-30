import { useEffect, useMemo, useState } from "react";

import { DiffPage } from "./DiffPage.js";
import { FeedPage } from "./FeedPage.js";
import { Badge } from "./components/ui/badge.js";
import { Button } from "./components/ui/button.js";
import { Select } from "./components/ui/select.js";
import { cn } from "./lib/utils.js";
import { CharactersPage } from "./pages/CharactersPage.js";
import { BuildScorePage } from "./pages/BuildScorePage.js";
import { CollectiblesPage } from "./pages/CollectiblesPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { LinksOfficialPage } from "./pages/LinksOfficialPage.js";
import { PlannerStatsPage } from "./pages/PlannerStatsPage.js";
import { PlannerTemplatesPage } from "./pages/PlannerTemplatesPage.js";
import { PlannerTodayPage } from "./pages/PlannerTodayPage.js";
import { SettingsBackupPage } from "./pages/SettingsBackupPage.js";
import { SettingsModulesPage } from "./pages/SettingsModulesPage.js";
import { SettingsSafetyPage } from "./pages/SettingsSafetyPage.js";

type Route =
  | { name: "dashboard" }
  | { name: "collectibles" }
  | { name: "noticesFeed" }
  | { name: "noticesDiff"; id: string }
  | { name: "plannerToday" }
  | { name: "plannerTemplates" }
  | { name: "plannerStats" }
  | { name: "buildScore" }
  | { name: "linksOfficial" }
  | { name: "characters" }
  | { name: "settingsModules" }
  | { name: "settingsBackup" }
  | { name: "settingsSafety" };

function parseRoute(hash: string): Route {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart, qs] = trimmed.split("?");
  const path = pathPart || "/";

  const params = new URLSearchParams(qs ?? "");

  if (path === "/m/notices/diff") {
    const id = params.get("id");
    if (id) return { name: "noticesDiff", id };
    return { name: "noticesFeed" };
  }

  switch (path) {
    case "/":
      return { name: "dashboard" };
    case "/m/collectibles":
      return { name: "collectibles" };
    case "/m/notices/feed":
      return { name: "noticesFeed" };
    case "/m/build/score":
      return { name: "buildScore" };
    case "/m/planner/today":
      return { name: "plannerToday" };
    case "/m/planner/templates":
      return { name: "plannerTemplates" };
    case "/m/planner/stats":
      return { name: "plannerStats" };
    case "/m/links/official":
      return { name: "linksOfficial" };
    case "/characters":
      return { name: "characters" };
    case "/settings/modules":
      return { name: "settingsModules" };
    case "/settings/backup":
      return { name: "settingsBackup" };
    case "/settings/safety":
      return { name: "settingsSafety" };
    default:
      return { name: "dashboard" };
  }
}

type SchedulerStatus = {
  running: boolean;
  lastRunAt: string | null;
  lastResult: unknown | null;
  lastError: string | null;
};

function asSchedulerStatus(value: unknown): SchedulerStatus | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.running !== "boolean") return null;
  const lastError = typeof obj.lastError === "string" ? obj.lastError : null;
  const lastRunAt = typeof obj.lastRunAt === "string" ? obj.lastRunAt : null;
  return { running: obj.running, lastRunAt, lastResult: obj.lastResult ?? null, lastError };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

function asCharacters(value: unknown): AppCharacter[] | null {
  if (!Array.isArray(value)) return null;
  const out: AppCharacter[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") return null;
    const obj = v as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;
    if (typeof obj.name !== "string") return null;
    const server = obj.server === null || typeof obj.server === "string" ? (obj.server as string | null) : null;
    const klass = obj.class === null || typeof obj.class === "string" ? (obj.class as string | null) : null;
    out.push({ id: obj.id, name: obj.name, server, class: klass });
  }
  return out;
}

export function App() {
  const api = (window as unknown as { aion2Hub?: Window["aion2Hub"] }).aion2Hub;
  if (!api) {
    return (
      <div className="min-h-screen bg-background p-6 text-foreground">
        <h1 className="mb-2 text-lg font-semibold tracking-tight">AION2 HUB</h1>
        <p className="text-sm text-muted-foreground">
          초기화에 실패했습니다 (preload/IPC bridge). `aion2-hub.log` 파일을 확인해 주세요.
        </p>
      </div>
    );
  }

  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [characters, setCharacters] = useState<AppCharacter[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const refreshStatus = useMemo(
    () => async () => {
      const raw = await api.getStatus();
      setStatus(asSchedulerStatus(raw));
    },
    [api]
  );

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 5000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  const refreshCharacters = useMemo(
    () => async () => {
      const [rawCharacters, currentActive] = await Promise.all([api.characters.list(), api.app.getActiveCharacterId()]);
      const parsed = asCharacters(rawCharacters) ?? [];
      setCharacters(parsed);
      setActiveCharacterId(currentActive);
      if (!currentActive && parsed.length > 0) {
        const next = parsed[0]?.id;
        if (next) {
          await api.app.setActiveCharacterId(next);
          setActiveCharacterId(next);
        }
      }
    },
    [api]
  );

  useEffect(() => {
    void refreshCharacters();
    const timer = window.setInterval(() => void refreshCharacters(), 10_000);
    return () => window.clearInterval(timer);
  }, [refreshCharacters]);

  function SidebarLink(props: { href: string; label: string; active: boolean }) {
    return (
      <a
        href={props.href}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
          props.active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        {props.label}
      </a>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="font-semibold tracking-tight">AION2 HUB</div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">캐릭터</span>
          <Select
            className="w-64"
            value={activeCharacterId ?? ""}
            onChange={async (e) => {
              const next = e.target.value || null;
              await api.app.setActiveCharacterId(next);
              setActiveCharacterId(next);
            }}
          >
            <option value="">(없음)</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.server ? ` · ${c.server}` : ""}
                {c.class ? ` · ${c.class}` : ""}
              </option>
            ))}
          </Select>

          <a href="#/characters" className="text-sm text-muted-foreground hover:text-foreground">
            관리
          </a>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {status ? (
              <span>
                <Badge variant={status.running ? "secondary" : "muted"} className="mr-2">
                  {status.running ? "syncing" : "idle"}
                </Badge>
                <span>last: {formatDate(status.lastRunAt)}</span>
                {status.lastError ? (
                  <>
                    <span className="mx-2 opacity-60">·</span>
                    <Badge variant="destructive">error</Badge>
                    <span className="ml-2">{status.lastError}</span>
                  </>
                ) : null}
              </span>
            ) : (
              <span>status: -</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={syncing || status?.running}
            onClick={async () => {
              setSyncing(true);
              try {
                await api.notices.syncNow();
                await refreshStatus();
              } finally {
                setSyncing(false);
              }
            }}
          >
            Sync now
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r bg-muted/10 p-3">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">MAIN</div>
          <SidebarLink href="#/" label="Dashboard" active={route.name === "dashboard"} />
          <SidebarLink href="#/characters" label="Characters" active={route.name === "characters"} />
          <SidebarLink href="#/m/collectibles" label="Collectibles" active={route.name === "collectibles"} />

          <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">PLANNER</div>
          <SidebarLink href="#/m/planner/today" label="Today" active={route.name === "plannerToday"} />
          <SidebarLink href="#/m/planner/templates" label="Templates" active={route.name === "plannerTemplates"} />
          <SidebarLink href="#/m/planner/stats" label="Stats" active={route.name === "plannerStats"} />

          <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">BUILD</div>
          <SidebarLink href="#/m/build/score" label="Score" active={route.name === "buildScore"} />

          <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">NOTICES</div>
          <SidebarLink href="#/m/notices/feed" label="Feed" active={route.name === "noticesFeed"} />

          <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">LINKS</div>
          <SidebarLink href="#/m/links/official" label="Official" active={route.name === "linksOfficial"} />

          <div className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">SETTINGS</div>
          <SidebarLink href="#/settings/modules" label="Modules" active={route.name === "settingsModules"} />
          <SidebarLink href="#/settings/backup" label="Backup" active={route.name === "settingsBackup"} />
          <SidebarLink href="#/settings/safety" label="Safety" active={route.name === "settingsSafety"} />
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted/5 p-6">
          {route.name === "dashboard" ? <DashboardPage /> : null}
          {route.name === "collectibles" ? (
            <CollectiblesPage activeCharacterId={activeCharacterId} characters={characters} />
          ) : null}

          {route.name === "noticesFeed" ? <FeedPage /> : null}
          {route.name === "noticesDiff" ? <DiffPage id={route.id} /> : null}

          {route.name === "plannerToday" ? (
            <PlannerTodayPage activeCharacterId={activeCharacterId} characters={characters} />
          ) : null}
          {route.name === "plannerTemplates" ? <PlannerTemplatesPage /> : null}
          {route.name === "plannerStats" ? <PlannerStatsPage activeCharacterId={activeCharacterId} characters={characters} /> : null}

          {route.name === "buildScore" ? (
            <BuildScorePage activeCharacterId={activeCharacterId} characters={characters} />
          ) : null}

          {route.name === "linksOfficial" ? <LinksOfficialPage /> : null}

          {route.name === "characters" ? (
            <CharactersPage
              characters={characters}
              activeCharacterId={activeCharacterId}
              onChanged={() => void refreshCharacters()}
            />
          ) : null}

          {route.name === "settingsModules" ? <SettingsModulesPage /> : null}
          {route.name === "settingsBackup" ? <SettingsBackupPage /> : null}
          {route.name === "settingsSafety" ? <SettingsSafetyPage /> : null}
        </main>
      </div>
    </div>
  );
}
