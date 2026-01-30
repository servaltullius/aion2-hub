export type WorldBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function normalizeZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

export function worldBoundsForViewport(params: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  panX: number;
  panY: number;
  scale: number;
  paddingPx?: number;
}): WorldBounds {
  const safeScaleRaw = Number.isFinite(params.scale) ? Math.abs(params.scale) : 1;
  const safeScale = Math.max(1e-6, safeScaleRaw);
  const invScale = 1 / safeScale;

  const paddingPx = Number.isFinite(params.paddingPx) ? Math.max(0, params.paddingPx ?? 0) : 0;
  const padWorld = paddingPx * invScale;

  const viewportWidthPx = Number.isFinite(params.viewportWidthPx) ? params.viewportWidthPx : 0;
  const viewportHeightPx = Number.isFinite(params.viewportHeightPx) ? params.viewportHeightPx : 0;

  const panX = Number.isFinite(params.panX) ? params.panX : 0;
  const panY = Number.isFinite(params.panY) ? params.panY : 0;

  return {
    left: normalizeZero((-panX) * invScale - padWorld),
    top: normalizeZero((-panY) * invScale - padWorld),
    right: normalizeZero((viewportWidthPx - panX) * invScale + padWorld),
    bottom: normalizeZero((viewportHeightPx - panY) * invScale + padWorld)
  };
}
