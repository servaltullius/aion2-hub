export type RouteCoord = { x: number; y: number };

export type RoutePoint = RouteCoord & { id: string };

function dist(a: RouteCoord, b: RouteCoord) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function routeDistance(params: { start: RouteCoord; order: string[]; pointsById: Map<string, RoutePoint>; fixedStart: boolean }) {
  const { start, order, pointsById, fixedStart } = params;
  let total = 0;
  for (let i = 0; i < order.length; i += 1) {
    const curr = pointsById.get(order[i] ?? "");
    if (!curr) continue;
    if (i === 0) {
      if (!fixedStart) total += dist(start, curr);
      continue;
    }
    const prev = pointsById.get(order[i - 1] ?? "");
    if (!prev) continue;
    total += dist(prev, curr);
  }
  return total;
}

export function nearestNeighborRoute(params: { startId: string | null; start: RouteCoord; points: RoutePoint[] }) {
  const pointsById = new Map<string, RoutePoint>();
  for (const p of params.points) pointsById.set(p.id, p);

  const fixedStart = Boolean(params.startId && pointsById.has(params.startId));
  const remaining = params.points.slice();

  const order: string[] = [];
  let current: RouteCoord = params.start;
  if (fixedStart && params.startId) {
    order.push(params.startId);
    current = pointsById.get(params.startId) ?? current;
    const idx = remaining.findIndex((p) => p.id === params.startId);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const p = remaining[i];
      if (!p) continue;
      const d = dist(current, p);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
        continue;
      }
      if (d === bestD) {
        const best = remaining[bestIdx];
        if (best && p.id.localeCompare(best.id) < 0) bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    if (!next) break;
    order.push(next.id);
    current = next;
  }

  return { order, fixedStart, pointsById };
}

export function twoOptImproveRoute(params: { start: RouteCoord; order: string[]; pointsById: Map<string, RoutePoint>; fixedStart: boolean; passes?: number }) {
  const maxPasses = params.passes ?? 2;
  const order = params.order.slice();

  const get = (id: string) => params.pointsById.get(id);

  const startI = params.fixedStart ? 1 : 0;
  if (order.length < startI + 3) return order;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;

    for (let i = startI; i < order.length - 1; i += 1) {
      const aId = order[i];
      const a = aId ? get(aId) : null;
      if (!a) continue;

      const prev: RouteCoord | null =
        i === 0 && !params.fixedStart ? params.start : (order[i - 1] ? get(order[i - 1]!) ?? null : null);
      if (!prev) continue;

      for (let k = i + 1; k < order.length; k += 1) {
        const bId = order[k];
        const b = bId ? get(bId) : null;
        if (!b) continue;

        const next = k + 1 < order.length ? (order[k + 1] ? get(order[k + 1]!) ?? null : null) : null;

        const oldCost = dist(prev, a) + (next ? dist(b, next) : 0);
        const newCost = dist(prev, b) + (next ? dist(a, next) : 0);
        if (newCost + 1e-9 < oldCost) {
          const left = order.slice(0, i);
          const mid = order.slice(i, k + 1).reverse();
          const right = order.slice(k + 1);
          order.splice(0, order.length, ...left, ...mid, ...right);
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return order;
}

