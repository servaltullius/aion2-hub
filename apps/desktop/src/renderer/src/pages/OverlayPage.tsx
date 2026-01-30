import type { CSSProperties } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Select } from "../components/ui/select.js";
import { cn } from "../lib/utils.js";

import { OverlayPlanner } from "./overlay/OverlayPlanner.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

export function OverlayPage(props: {
  tab: "planner" | "loot";
  characters: AppCharacter[];
  activeCharacterId: string | null;
  onChangeActiveCharacterId: (id: string | null) => Promise<void> | void;
}) {
  const dragStyle = { WebkitAppRegion: "drag" } as unknown as CSSProperties;
  const noDragStyle = { WebkitAppRegion: "no-drag" } as unknown as CSSProperties;

  const active = props.activeCharacterId
    ? props.characters.find((c) => c.id === props.activeCharacterId) ?? null
    : null;

  function TabLink(input: { tab: "planner" | "loot"; label: string }) {
    const activeTab = props.tab === input.tab;
    return (
      <a
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          activeTab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
        href={`#/overlay?tab=${input.tab}`}
      >
        {input.label}
      </a>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 text-foreground">
      <header className="mb-3 flex items-center justify-between gap-3" style={dragStyle}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold tracking-tight">AION2 HUB</div>
            <Badge variant="muted">Overlay</Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">{active ? `${active.name}${active.server ? ` · ${active.server}` : ""}` : "캐릭터 없음"}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            style={noDragStyle}
            onClick={async () => {
              await window.aion2Hub.app.toggleOverlay();
            }}
          >
            Hide
          </Button>
          <Button
            size="sm"
            variant="outline"
            style={noDragStyle}
            onClick={async () => {
              const hash = props.tab === "loot" ? "#/m/loot/logbook" : "#/m/planner/today";
              await window.aion2Hub.app.showMainWindow({ hash });
            }}
          >
            Open Main
          </Button>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <TabLink tab="planner" label="Planner" />
        <TabLink tab="loot" label="Loot" />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted-foreground">Active character</label>
        <Select
          value={props.activeCharacterId ?? ""}
          onChange={(e) => void props.onChangeActiveCharacterId(e.target.value || null)}
        >
          {props.characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.server ? ` (${c.server})` : ""}
              {c.class ? ` · ${c.class}` : ""}
            </option>
          ))}
        </Select>
      </div>

      {props.tab === "planner" ? (
        <OverlayPlanner activeCharacterId={props.activeCharacterId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Quick Loot Log</CardTitle>
            <CardDescription>예정: 원정/토벌 드랍 빠른 기록</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">다음 커밋에서 구현합니다.</CardContent>
        </Card>
      )}
    </div>
  );
}
