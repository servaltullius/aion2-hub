import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Select } from "../components/ui/select.js";
import { isObject } from "../lib/guards.js";

import { CollectiblesMapCanvas } from "./collectibles/CollectiblesMapCanvas.js";
import {
  asCollectibleList,
  asCollectibleMaps,
  displayName,
  humanizeToken,
  type CollectibleFaction,
  type CollectibleKind,
  type CollectibleListItem,
  type CollectibleMap,
  type CollectibleScope
} from "./collectibles/model.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

export function CollectiblesPage(props: { activeCharacterId: string | null; characters: AppCharacter[] }) {
  const api = (window as unknown as { aion2Hub?: Window["aion2Hub"] }).aion2Hub;
  if (!api) return null;

  const [kind, setKind] = useState<"ALL" | CollectibleKind>("ALL");
  const [faction, setFaction] = useState<"ALL" | CollectibleFaction>("ALL");
  const [scope, setScope] = useState<CollectibleScope>(() => (props.activeCharacterId ? "CHARACTER" : "ACCOUNT"));
  const [view, setView] = useState<"GROUPED" | "ALL" | "MAP">("GROUPED");
  const [q, setQ] = useState("");
  const [onlyRemaining, setOnlyRemaining] = useState(false);

  const [maps, setMaps] = useState<CollectibleMap[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string>("");

  const [items, setItems] = useState<CollectibleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [lastImportStats, setLastImportStats] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<string | null>(null);

  const activeCharacter = props.characters.find((c) => c.id === props.activeCharacterId) ?? null;

  useEffect(() => {
    if (scope === "CHARACTER" && !props.activeCharacterId) setScope("ACCOUNT");
  }, [scope, props.activeCharacterId]);

  const refreshMaps = useMemo(
    () => async () => {
      setMapsLoading(true);
      setMapsError(null);
      try {
        const raw = await api.collectibles.listMaps();
        const parsed = asCollectibleMaps(raw);
        if (!parsed) throw new Error("bad_response");
        setMaps(parsed);
      } catch (e: unknown) {
        setMaps([]);
        setMapsError(e instanceof Error ? e.message : String(e));
      } finally {
        setMapsLoading(false);
      }
    },
    [api.collectibles]
  );

  useEffect(() => {
    void refreshMaps();
  }, [refreshMaps]);

  useEffect(() => {
    if (maps.length === 0) return;
    if (!selectedMap || !maps.some((m) => m.name === selectedMap)) setSelectedMap(maps[0]?.name ?? "");
  }, [maps, selectedMap]);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = { scope };
        if (scope === "CHARACTER") payload.characterId = props.activeCharacterId;
        if (kind !== "ALL") payload.kind = kind;
        if (faction !== "ALL") payload.faction = faction;
        if (q.trim()) payload.q = q.trim();
        if (onlyRemaining) payload.onlyRemaining = true;

        const raw = await api.collectibles.list(payload);
        const parsed = asCollectibleList(raw);
        if (!parsed) throw new Error("bad_response");
        setItems(parsed);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [api.collectibles, faction, kind, onlyRemaining, props.activeCharacterId, q, scope]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const total = items.length;
  const doneCount = items.reduce((acc, it) => acc + (it.done ? 1 : 0), 0);

  const byMap = useMemo(() => {
    const map = new Map<string, CollectibleListItem[]>();
    for (const it of items) {
      const arr = map.get(it.map);
      if (arr) arr.push(it);
      else map.set(it.map, [it]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Collectibles</h2>
        <p className="text-sm text-muted-foreground">주신의 흔적 / 히든 큐브 / 모노리스 재료 수집 진행도 (로컬 저장)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
          <CardDescription>검색 + 지역/맵별 그룹(3번 옵션)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">종류</div>
              <Select value={kind} onChange={(e) => setKind(e.target.value as "ALL" | CollectibleKind)}>
                <option value="ALL">전체</option>
                <option value="TRACE">주신의 흔적</option>
                <option value="CUBE">히든 큐브</option>
                <option value="MATERIAL">모노리스 재료</option>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">종족</div>
              <Select value={faction} onChange={(e) => setFaction(e.target.value as "ALL" | CollectibleFaction)}>
                <option value="ALL">전체</option>
                <option value="ELYOS">천족(공통 포함)</option>
                <option value="ASMO">마족(공통 포함)</option>
                <option value="BOTH">공통만</option>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">스코프</div>
              <Select
                value={scope}
                onChange={(e) => setScope(e.target.value as CollectibleScope)}
                title={props.activeCharacterId ? "" : "활성 캐릭터가 없어서 계정 스코프만 가능합니다."}
              >
                <option value="ACCOUNT">계정</option>
                <option value="CHARACTER" disabled={!props.activeCharacterId}>
                  캐릭터(활성)
                </option>
              </Select>
              {scope === "CHARACTER" ? (
                <div className="text-xs text-muted-foreground">
                  {activeCharacter ? `${activeCharacter.name}${activeCharacter.server ? ` · ${activeCharacter.server}` : ""}` : "(선택 필요)"}
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">보기</div>
              <Select value={view} onChange={(e) => setView(e.target.value as "GROUPED" | "ALL" | "MAP")}>
                <option value="GROUPED">지역/맵별 그룹</option>
                <option value="ALL">전체</option>
                <option value="MAP">지도(그리드)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">검색</div>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름/지역/맵 검색…" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={onlyRemaining}
                onChange={(e) => setOnlyRemaining(e.target.checked)}
              />
              미완료만
            </label>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
            <div className="text-xs text-muted-foreground">
              {loading ? "loading…" : `${doneCount}/${total}`}
              {error ? <span className="ml-2 text-destructive">{error}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {view === "MAP" ? (
        <Card>
          <CardHeader>
            <CardTitle>지도</CardTitle>
            <CardDescription>그리드+마커 지도화</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">맵</div>
                <Select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
                  {maps.map((m) => (
                    <option key={m.name} value={m.name}>
                      {humanizeToken(m.name)}
                    </option>
                  ))}
                </Select>
                {mapsLoading ? <div className="text-xs text-muted-foreground">맵 목록 로딩…</div> : null}
                {mapsError ? <div className="text-xs text-destructive">{mapsError}</div> : null}
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-xs font-medium text-muted-foreground">현재 필터 기준</div>
                <div className="text-sm text-muted-foreground">
                  {loading ? "loading…" : `${doneCount}/${total}`} ·{" "}
                  {kind === "ALL" ? "전체" : kind === "TRACE" ? "주신의 흔적" : kind === "CUBE" ? "히든 큐브" : "모노리스 재료"} ·{" "}
                  {faction === "ALL" ? "종족 전체" : faction === "ELYOS" ? "천족" : faction === "ASMO" ? "마족" : "공통만"} ·{" "}
                  {scope === "ACCOUNT" ? "계정" : "캐릭터"} · {onlyRemaining ? "미완료만" : "전체"}
                </div>
              </div>
            </div>

            {(() => {
              const meta = maps.find((m) => m.name === selectedMap) ?? null;
              if (!meta) return <div className="text-sm text-muted-foreground">맵 메타데이터를 불러오지 못했습니다.</div>;
              const mapItems = items.filter((it) => it.map === selectedMap);
              return (
                <CollectiblesMapCanvas
                  map={meta}
                  items={mapItems}
                  loading={loading}
                  onToggleDone={async (itemId, done) => {
                    await api.collectibles.toggleDone({
                      scope,
                      characterId: scope === "CHARACTER" ? props.activeCharacterId : null,
                      itemId,
                      done
                    });
                    await refresh();
                  }}
                />
              );
            })()}
          </CardContent>
        </Card>
      ) : view === "ALL" ? (
        <Card>
          <CardHeader>
            <CardTitle>목록</CardTitle>
            <CardDescription>전체 보기</CardDescription>
          </CardHeader>
          <CardContent className="divide-y rounded-md border">
            {items.map((it) => (
              <div key={it.id} className="flex items-start gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-primary"
                  checked={it.done}
                  onChange={async (e) => {
                    await api.collectibles.toggleDone({
                      scope,
                      characterId: scope === "CHARACTER" ? props.activeCharacterId : null,
                      itemId: it.id,
                      done: e.target.checked
                    });
                    await refresh();
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium">{displayName(it)}</div>
                    <Badge variant="muted">{it.kind === "CUBE" ? "cube" : it.kind === "MATERIAL" ? "material" : "trace"}</Badge>
                    {it.faction === "ELYOS" ? <Badge variant="secondary">elyos</Badge> : null}
                    {it.faction === "ASMO" ? <Badge variant="secondary">asmo</Badge> : null}
                    {it.faction === "BOTH" ? <Badge variant="secondary">both</Badge> : null}
                    <span className="text-xs text-muted-foreground">{humanizeToken(it.map)}</span>
                    {it.region ? <span className="text-xs text-muted-foreground">· {humanizeToken(it.region)}</span> : null}
                  </div>
                  {it.note ? <div className="mt-0.5 text-xs text-muted-foreground">{it.note}</div> : null}
                </div>
                {it.x !== null && it.y !== null ? (
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(it.x)}, {Math.round(it.y)}
                  </div>
                ) : null}
              </div>
            ))}
            {items.length === 0 && !loading ? <div className="px-3 py-6 text-sm text-muted-foreground">표시할 항목이 없습니다.</div> : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byMap.map(([mapName, mapItems]) => {
            const mapDone = mapItems.reduce((acc, it) => acc + (it.done ? 1 : 0), 0);
            const byRegion = new Map<string, CollectibleListItem[]>();
            for (const it of mapItems) {
              const key = it.region ?? "Other";
              const arr = byRegion.get(key);
              if (arr) arr.push(it);
              else byRegion.set(key, [it]);
            }
            const regions = [...byRegion.entries()].sort(([a], [b]) => a.localeCompare(b));

            return (
              <Card key={mapName}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{humanizeToken(mapName)}</CardTitle>
                      <CardDescription>맵별 그룹</CardDescription>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {mapDone}/{mapItems.length}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {regions.map(([regionName, regionItems]) => {
                    const regionDone = regionItems.reduce((acc, it) => acc + (it.done ? 1 : 0), 0);
                    return (
                      <div key={regionName} className="rounded-md border">
                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="font-medium">{humanizeToken(regionName)}</div>
                          <div className="text-xs text-muted-foreground">
                            {regionDone}/{regionItems.length}
                          </div>
                        </div>
                        <div className="divide-y">
                          {regionItems.map((it) => (
                            <div key={it.id} className="flex items-start gap-3 px-3 py-2">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 accent-primary"
                                checked={it.done}
                                onChange={async (e) => {
                                  await api.collectibles.toggleDone({
                                    scope,
                                    characterId: scope === "CHARACTER" ? props.activeCharacterId : null,
                                    itemId: it.id,
                                    done: e.target.checked
                                  });
                                  await refresh();
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate text-sm font-medium">{displayName(it)}</div>
                                  <Badge variant="muted">{it.kind === "CUBE" ? "cube" : it.kind === "MATERIAL" ? "material" : "trace"}</Badge>
                                  {it.faction === "ELYOS" ? <Badge variant="secondary">elyos</Badge> : null}
                                  {it.faction === "ASMO" ? <Badge variant="secondary">asmo</Badge> : null}
                                  {it.faction === "BOTH" ? <Badge variant="secondary">both</Badge> : null}
                                </div>
                                {it.note ? <div className="mt-0.5 text-xs text-muted-foreground">{it.note}</div> : null}
                              </div>
                              {it.x !== null && it.y !== null ? (
                                <div className="text-xs tabular-nums text-muted-foreground">
                                  {Math.round(it.x)}, {Math.round(it.y)}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && !loading ? <div className="text-sm text-muted-foreground">표시할 항목이 없습니다.</div> : null}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>데이터/라이선스</CardTitle>
          <CardDescription>내장 수집 데이터 출처</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            이 화면의 기본 수집 데이터는 커뮤니티 데이터셋을 참고하여 포함했습니다. 출처: aion2-interactive-map/aion2-interactive-map
            (Data: CC BY-NC 4.0 — 비상업적 사용 + 출처 표기 필요).
          </div>

          {datasetError ? <div className="text-sm text-destructive">{datasetError}</div> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                setDatasetError(null);
                try {
                  const raw = await api.collectibles.exportItemsJson();
                  const filePath = isObject(raw) && typeof raw.filePath === "string" ? raw.filePath : null;
                  setLastExport(filePath);
                } catch (e: unknown) {
                  setDatasetError(e instanceof Error ? e.message : "export_failed");
                }
              }}
            >
              Export items JSON
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setDatasetError(null);
                try {
                  const raw = await api.collectibles.importItemsJson();
                  const canceled = isObject(raw) && typeof raw.canceled === "boolean" ? raw.canceled : false;
                  const filePath = isObject(raw) && typeof raw.filePath === "string" ? raw.filePath : null;
                  const inserted = isObject(raw) && typeof raw.inserted === "number" ? raw.inserted : null;
                  const updated = isObject(raw) && typeof raw.updated === "number" ? raw.updated : null;
                  if (canceled) return;
                  setLastImport(filePath);
                  setLastImportStats(
                    inserted !== null && updated !== null ? `inserted ${inserted}, updated ${updated}` : "imported"
                  );
                  await refreshMaps();
                  await refresh();
                } catch (e: unknown) {
                  setDatasetError(e instanceof Error ? e.message : "import_failed");
                }
              }}
            >
              Import items JSON (merge)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setDatasetError(null);
                setLastSyncStats(null);
                try {
                  const raw = await api.collectibles.syncAion2Im();
                  const inserted = isObject(raw) && typeof raw.inserted === "number" ? raw.inserted : null;
                  const updated = isObject(raw) && typeof raw.updated === "number" ? raw.updated : null;
                  const fetchedFiles = isObject(raw) && typeof raw.fetchedFiles === "number" ? raw.fetchedFiles : null;
                  setLastSyncStats(
                    inserted !== null && updated !== null
                      ? `fetched ${fetchedFiles ?? "?"} files, inserted ${inserted}, updated ${updated}`
                      : "synced"
                  );
                  await refreshMaps();
                  await refresh();
                } catch (e: unknown) {
                  setDatasetError(e instanceof Error ? e.message : "sync_failed");
                }
              }}
            >
              Sync dataset (aion2-interactive-map)
            </Button>
          </div>

          {lastExport ? (
            <div className="text-xs text-muted-foreground">
              last export: <code className="font-mono">{lastExport}</code>
            </div>
          ) : null}

          {lastImport ? (
            <div className="text-xs text-muted-foreground">
              last import: <code className="font-mono">{lastImport}</code> {lastImportStats ? <span>({lastImportStats})</span> : null}
            </div>
          ) : null}

          {lastSyncStats ? <div className="text-xs text-muted-foreground">last sync: {lastSyncStats}</div> : null}
        </CardContent>
      </Card>
    </section>
  );
}
