export function computeDurationSeconds(startMs: number, endMs: number): number {
  const delta = endMs - startMs;
  if (!Number.isFinite(delta)) return 1;
  return Math.max(1, Math.round(delta / 1000));
}

export function formatDurationSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}m ${seconds}s`;
}

