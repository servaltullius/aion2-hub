import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";

import { worldBoundsForViewport } from "../collectiblesMapViewport.js";

import { displayName, humanizeToken, type CollectibleListItem, type CollectibleMap } from "./model.js";
import { nearestNeighborRoute, routeDistance, twoOptImproveRoute, type RoutePoint } from "./route.js";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function CollectiblesMapCanvas(props: {
  map: CollectibleMap;
  items: CollectibleListItem[];
  loading: boolean;
  onToggleDone: (itemId: string, done: boolean) => Promise<void>;
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [enableClustering, setEnableClustering] = useState(true);
  const [routeStartId, setRouteStartId] = useState<string | null>(null);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; panX: number; panY: number; pointerId: number | null }>({
    active: false,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    pointerId: null
  });
  const panRafRef = useRef<number | null>(null);
  const panPendingRef = useRef<{ x: number; y: number } | null>(null);

  const markers = useMemo(() => props.items.filter((it) => it.x !== null && it.y !== null), [props.items]);
  const markersById = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers]);
  const visibleMarkers = useMemo(() => {
    if (viewportSize.w <= 0 || viewportSize.h <= 0) return markers;

    const bounds = worldBoundsForViewport({
      viewportWidthPx: viewportSize.w,
      viewportHeightPx: viewportSize.h,
      panX: pan.x,
      panY: pan.y,
      scale,
      paddingPx: 48
    });

    return markers.filter((it) => {
      const x = it.x ?? 0;
      const y = it.y ?? 0;
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    });
  }, [markers, pan.x, pan.y, scale, viewportSize.h, viewportSize.w]);
  const selected = selectedId ? markers.find((m) => m.id === selectedId) ?? null : null;
  const visibleDoneCount = useMemo(() => visibleMarkers.reduce((acc, it) => acc + (it.done ? 1 : 0), 0), [visibleMarkers]);
  const totalDoneCount = useMemo(() => markers.reduce((acc, it) => acc + (it.done ? 1 : 0), 0), [markers]);
  const markerInverse = 1 / scale;

  const routeCandidates = useMemo(() => markers.filter((m) => !m.done), [markers]);
  const routeSteps = useMemo(() => routeIds.map((id) => markersById.get(id)).filter((v): v is CollectibleListItem => Boolean(v)), [markersById, routeIds]);
  const routeCurrent = routeSteps[routeIndex] ?? null;
  const routeStart = routeStartId ? markersById.get(routeStartId) ?? null : null;

  const routePathD = useMemo(() => {
    if (!routeStart) return null;
    if (routeSteps.length === 0) return null;
    const pts = routeSteps[0]?.id === routeStart.id ? routeSteps : [routeStart, ...routeSteps];
    return pts
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${Math.round(p.x ?? 0)} ${Math.round(p.y ?? 0)}`)
      .join(" ");
  }, [routeStart, routeSteps]);

  const routeDistanceTotal = useMemo(() => {
    if (!routeStart || routeSteps.length === 0) return null;
    const points: RoutePoint[] = routeSteps.map((s) => ({ id: s.id, x: s.x ?? 0, y: s.y ?? 0 }));
    const pointsById = new Map(points.map((p) => [p.id, p]));
    return routeDistance({
      start: { x: routeStart.x ?? 0, y: routeStart.y ?? 0 },
      order: routeSteps.map((s) => s.id),
      pointsById,
      fixedStart: routeSteps[0]?.id === routeStart.id
    });
  }, [routeStart, routeSteps]);

  const clustered = useMemo(() => {
    const shouldCluster = enableClustering && (scale < 0.35 || visibleMarkers.length > 600);
    if (!shouldCluster) return { singles: visibleMarkers, clusters: [] as Array<{ key: string; x: number; y: number; count: number; done: number }> };

    const cellPx = 34;
    const groups = new Map<
      string,
      { key: string; count: number; done: number; sumX: number; sumY: number; sample: CollectibleListItem | null }
    >();

    for (const it of visibleMarkers) {
      const x = it.x ?? 0;
      const y = it.y ?? 0;
      const sx = pan.x + x * scale;
      const sy = pan.y + y * scale;
      const cx = Math.floor(sx / cellPx);
      const cy = Math.floor(sy / cellPx);
      const key = `${cx}:${cy}`;
      const prev = groups.get(key);
      if (prev) {
        prev.count += 1;
        prev.done += it.done ? 1 : 0;
        prev.sumX += x;
        prev.sumY += y;
        if (!prev.sample) prev.sample = it;
      } else {
        groups.set(key, { key, count: 1, done: it.done ? 1 : 0, sumX: x, sumY: y, sample: it });
      }
    }

    const singles: CollectibleListItem[] = [];
    const clusters: Array<{ key: string; x: number; y: number; count: number; done: number }> = [];
    for (const g of groups.values()) {
      if (g.count === 1 && g.sample) {
        singles.push(g.sample);
        continue;
      }
      clusters.push({
        key: g.key,
        x: g.sumX / g.count,
        y: g.sumY / g.count,
        count: g.count,
        done: g.done
      });
    }

    return { singles, clusters };
  }, [enableClustering, pan.x, pan.y, scale, visibleMarkers]);

  const fit = useMemo(
    () => () => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const vw = Math.max(1, rect.width);
      const vh = Math.max(1, rect.height);
      const padding = 24;
      const s = Math.min((vw - padding) / props.map.width, (vh - padding) / props.map.height);
      const nextScale = clamp(Number.isFinite(s) ? s : 1, 0.05, 6);
      const panX = (vw - props.map.width * nextScale) / 2;
      const panY = (vh - props.map.height * nextScale) / 2;
      setScale(nextScale);
      setPan({ x: panX, y: panY });
    },
    [props.map.height, props.map.width]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (typeof ResizeObserver === "undefined") {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ w: rect.width, h: rect.height });
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const rect = entry.contentRect;
      setViewportSize({ w: rect.width, h: rect.height });
    });

    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setSelectedId(null);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setRouteStartId(null);
    setRouteIds([]);
    setRouteIndex(0);
    setRouteError(null);
    requestAnimationFrame(() => fit());
  }, [fit, props.map.name]);

  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) cancelAnimationFrame(panRafRef.current);
    };
  }, []);

  const centerOn = useMemo(
    () => (x: number, y: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setPan({ x: centerX - x * scale, y: centerY - y * scale });
    },
    [scale]
  );

  const buildRoute = useMemo(
    () => () => {
      setRouteError(null);
      const start = selectedId ? markersById.get(selectedId) ?? null : null;
      if (!start) {
        setRouteError("시작점 마커를 먼저 선택하세요.");
        return;
      }

      if (routeCandidates.length === 0) {
        setRouteStartId(start.id);
        setRouteIds([]);
        setRouteIndex(0);
        setRouteError("미완료 마커가 없습니다.");
        return;
      }

      if (routeCandidates.length > 200) {
        setRouteError(`미완료 마커가 너무 많습니다 (${routeCandidates.length}). 필터를 더 좁혀주세요. (최대 200)`);
        return;
      }

      const points: RoutePoint[] = routeCandidates.map((p) => ({ id: p.id, x: p.x ?? 0, y: p.y ?? 0 }));
      const initial = nearestNeighborRoute({ startId: start.id, start: { x: start.x ?? 0, y: start.y ?? 0 }, points });
      const improved = twoOptImproveRoute({ start: { x: start.x ?? 0, y: start.y ?? 0 }, order: initial.order, pointsById: initial.pointsById, fixedStart: initial.fixedStart, passes: 2 });

      setRouteStartId(start.id);
      setRouteIds(improved);
      setRouteIndex(0);
      const first = improved[0] ? markersById.get(improved[0]) ?? null : null;
      if (first) {
        setSelectedId(first.id);
        centerOn(first.x ?? 0, first.y ?? 0);
      }
    },
    [centerOn, markersById, routeCandidates, selectedId]
  );

  const gotoRouteIndex = useMemo(
    () => (idx: number) => {
      const next = routeSteps[idx] ?? null;
      if (!next) return;
      setRouteIndex(idx);
      setSelectedId(next.id);
      centerOn(next.x ?? 0, next.y ?? 0);
    },
    [centerOn, routeSteps]
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => fit()} disabled={props.loading}>
            Fit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => clamp(s * 1.15, 0.05, 6))}
            disabled={props.loading}
          >
            +
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => clamp(s / 1.15, 0.05, 6))}
            disabled={props.loading}
          >
            -
          </Button>
          <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            Grid
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground" title="줌아웃 시 마커가 많으면 자동으로 묶어서 표시합니다.">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={enableClustering}
              onChange={(e) => setEnableClustering(e.target.checked)}
            />
            Cluster
          </label>
          <div className="ml-auto text-xs text-muted-foreground">{isDragging ? "dragging…" : "drag to pan"}</div>
        </div>

        <div className="relative h-[520px] overflow-hidden rounded-md border bg-slate-950/30">
          <div
            ref={viewportRef}
            className="absolute inset-0 touch-none select-none"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY;
              const factor = delta > 0 ? 0.92 : 1.08;
              const nextScale = clamp(scale * factor, 0.05, 6);

              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;

              const worldX = (mx - pan.x) / scale;
              const worldY = (my - pan.y) / scale;

              const nextPanX = mx - worldX * nextScale;
              const nextPanY = my - worldY * nextScale;
              setScale(nextScale);
              setPan({ x: nextPanX, y: nextPanY });
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              setIsDragging(true);
              dragRef.current.active = true;
              dragRef.current.startX = e.clientX;
              dragRef.current.startY = e.clientY;
              dragRef.current.panX = pan.x;
              dragRef.current.panY = pan.y;
              dragRef.current.pointerId = e.pointerId;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
              const dx = e.clientX - dragRef.current.startX;
              const dy = e.clientY - dragRef.current.startY;
              panPendingRef.current = { x: dragRef.current.panX + dx, y: dragRef.current.panY + dy };
              if (panRafRef.current !== null) return;
              panRafRef.current = requestAnimationFrame(() => {
                panRafRef.current = null;
                const next = panPendingRef.current;
                if (!next) return;
                setPan(next);
              });
            }}
            onPointerUp={(e) => {
              if (dragRef.current.pointerId !== e.pointerId) return;
              dragRef.current.active = false;
              dragRef.current.pointerId = null;
              const finalPan = panPendingRef.current;
              if (panRafRef.current !== null) cancelAnimationFrame(panRafRef.current);
              panRafRef.current = null;
              panPendingRef.current = null;
              if (finalPan) setPan(finalPan);
              setIsDragging(false);
            }}
            onPointerCancel={(e) => {
              if (dragRef.current.pointerId !== e.pointerId) return;
              dragRef.current.active = false;
              dragRef.current.pointerId = null;
              const finalPan = panPendingRef.current;
              if (panRafRef.current !== null) cancelAnimationFrame(panRafRef.current);
              panRafRef.current = null;
              panPendingRef.current = null;
              if (finalPan) setPan(finalPan);
              setIsDragging(false);
            }}
          >
            <div className="absolute left-3 top-3 z-10 text-xs text-muted-foreground">
              배경 없이 그리드/좌표로 표시됩니다. (마커 클릭 = 완료 체크)
            </div>
            <div className="absolute right-3 top-3 z-10 text-right text-xs text-muted-foreground">
              <div>
                표시: {visibleDoneCount}/{visibleMarkers.length}
              </div>
              <div className="opacity-70">
                전체: {totalDoneCount}/{markers.length}
              </div>
            </div>

            <div className="absolute left-0 top-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                <div
                  className="relative"
                  style={{
                    width: props.map.width,
                    height: props.map.height
                  }}
                >
                  {/* grid */}
                  {showGrid ? (
                    <>
                      {Array.from({ length: props.map.tilesCountX + 1 }).map((_, idx) => {
                        const x = idx * props.map.tileWidth;
                        return (
                          <div
                            key={`vx-${x}`}
                            className="absolute top-0 h-full border-l border-white/10"
                            style={{
                              left: x
                            }}
                          />
                        );
                      })}
                      {Array.from({ length: props.map.tilesCountY + 1 }).map((_, idx) => {
                        const y = idx * props.map.tileHeight;
                        return (
                          <div
                            key={`hy-${y}`}
                            className="absolute left-0 w-full border-t border-white/10"
                            style={{
                              top: y
                            }}
                          />
                        );
                      })}
                    </>
                  ) : null}

                  {/* route path */}
                  {routePathD ? (
                    <svg className="pointer-events-none absolute inset-0" width={props.map.width} height={props.map.height}>
                      <path d={routePathD} fill="none" stroke="rgba(99, 102, 241, 0.55)" strokeWidth={6} strokeLinecap="round" />
                      <path d={routePathD} fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  ) : null}

                  {/* markers */}
                  {clustered.clusters.map((c) => {
                    const isAllDone = c.done === c.count;
                    const isNoneDone = c.done === 0;
                    const cls = isAllDone
                      ? "bg-emerald-500/90 border-emerald-200/70"
                      : isNoneDone
                        ? "bg-rose-500/80 border-rose-200/70"
                        : "bg-amber-500/85 border-amber-200/70";
                    return (
                      <button
                        key={`cluster-${c.key}`}
                        type="button"
                        className={`absolute flex items-center justify-center rounded-full border shadow-sm ${cls}`}
                        style={{
                          left: c.x,
                          top: c.y,
                          width: 26,
                          height: 26,
                          transform: `translate(-50%, -50%) scale(${Number.isFinite(markerInverse) ? markerInverse : 1})`,
                          transformOrigin: "center"
                        }}
                        title={`cluster: ${c.done}/${c.count} done`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const viewport = viewportRef.current;
                          if (!viewport) return;
                          const rect = viewport.getBoundingClientRect();
                          const nextScale = clamp(scale * 1.6, 0.05, 6);
                          const centerX = rect.width / 2;
                          const centerY = rect.height / 2;
                          setScale(nextScale);
                          setPan({ x: centerX - c.x * nextScale, y: centerY - c.y * nextScale });
                        }}
                      >
                        <span className="select-none text-[11px] font-semibold text-white">{c.count}</span>
                      </button>
                    );
                  })}
                  {clustered.singles.map((it) => {
                    const x = it.x ?? 0;
                    const y = it.y ?? 0;
                    const done = it.done;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        className={`absolute rounded-full border shadow-sm ${
                          done ? "bg-emerald-500/90 border-emerald-200/70" : "bg-slate-950/60 border-rose-300/80"
                        } ${selectedId === it.id ? "ring-2 ring-white/80" : ""}`}
                        style={{
                          left: x,
                          top: y,
                          width: 12,
                          height: 12,
                          transform: `translate(-50%, -50%) scale(${Number.isFinite(markerInverse) ? markerInverse : 1})`,
                          transformOrigin: "center"
                        }}
                        title={`${displayName(it)} (${Math.round(x)}, ${Math.round(y)})`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setSelectedId(it.id);
                          await props.onToggleDone(it.id, !it.done);
                        }}
                      />
                    );
                  })}

                  {/* route markers */}
                  {routeSteps.map((it, idx) => {
                    const x = it.x ?? 0;
                    const y = it.y ?? 0;
                    const isCurrent = idx === routeIndex;
                    return (
                      <button
                        key={`route-${it.id}`}
                        type="button"
                        className={`absolute flex items-center justify-center rounded-full border shadow-md ${
                          it.done ? "bg-emerald-500/90 border-emerald-200/70" : "bg-indigo-500/90 border-indigo-200/70"
                        } ${isCurrent ? "ring-2 ring-white/90" : ""}`}
                        style={{
                          left: x,
                          top: y,
                          width: 18,
                          height: 18,
                          transform: `translate(-50%, -50%) scale(${Number.isFinite(markerInverse) ? markerInverse : 1})`,
                          transformOrigin: "center"
                        }}
                        title={`#${idx + 1} ${displayName(it)}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          gotoRouteIndex(idx);
                        }}
                      >
                        <span className="select-none text-[10px] font-semibold text-white">{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>선택</CardTitle>
          <CardDescription>마커 상세</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <>
              <div className="text-sm font-medium">{displayName(selected)}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="muted">{selected.kind === "CUBE" ? "cube" : selected.kind === "MATERIAL" ? "material" : "trace"}</Badge>
                <span>{humanizeToken(selected.map)}</span>
                {selected.region ? <span>· {humanizeToken(selected.region)}</span> : null}
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">
                x={Math.round(selected.x ?? 0)}, y={Math.round(selected.y ?? 0)}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={selected.done ? "outline" : "default"} onClick={() => props.onToggleDone(selected.id, !selected.done)} disabled={props.loading}>
                  {selected.done ? "미완료로" : "완료로"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">지도에서 마커를 선택하세요.</div>
          )}

          <div className="pt-2 text-xs text-muted-foreground">
            표시 마커: {markers.filter((m) => m.done).length}/{markers.length}
          </div>

          <div className="border-t pt-3">
            <div className="text-sm font-medium">루트</div>
            <div className="mt-1 text-xs text-muted-foreground">대상(미완료): {routeCandidates.length} · 시작점: {routeStart ? displayName(routeStart) : "(선택 필요)"}</div>
            {routeError ? <div className="mt-2 text-xs text-destructive">{routeError}</div> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => buildRoute()} disabled={props.loading || !selectedId}>
                루트 생성
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setRouteStartId(null);
                  setRouteIds([]);
                  setRouteIndex(0);
                  setRouteError(null);
                }}
                disabled={props.loading || (routeIds.length === 0 && !routeStartId && !routeError)}
              >
                초기화
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => gotoRouteIndex(Math.max(0, routeIndex - 1))} disabled={props.loading || routeIds.length === 0 || routeIndex <= 0}>
                이전
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => gotoRouteIndex(Math.min(routeSteps.length - 1, routeIndex + 1))} disabled={props.loading || routeIds.length === 0 || routeIndex >= routeSteps.length - 1}>
                다음
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => (routeCurrent ? centerOn(routeCurrent.x ?? 0, routeCurrent.y ?? 0) : null)} disabled={props.loading || !routeCurrent}>
                센터
              </Button>
            </div>

            {routeDistanceTotal !== null ? (
              <div className="mt-2 text-xs text-muted-foreground">
                거리(직선): {Math.round(routeDistanceTotal).toLocaleString()} · {routeSteps.length} steps
              </div>
            ) : null}

            {routeSteps.length ? (
              <div className="mt-2 max-h-72 overflow-auto rounded-md border">
                {routeSteps.map((it, idx) => (
                  <button
                    key={`route-row-${it.id}`}
                    type="button"
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs ${
                      idx === routeIndex ? "bg-primary/10" : "hover:bg-muted/40"
                    }`}
                    onClick={() => gotoRouteIndex(idx)}
                    disabled={props.loading}
                  >
                    <div className="w-8 tabular-nums text-muted-foreground">#{idx + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{displayName(it)}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {humanizeToken(it.map)}
                        {it.region ? ` · ${humanizeToken(it.region)}` : ""}
                      </div>
                    </div>
                    <div className="tabular-nums text-muted-foreground">
                      {Math.round(it.x ?? 0)}, {Math.round(it.y ?? 0)}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
