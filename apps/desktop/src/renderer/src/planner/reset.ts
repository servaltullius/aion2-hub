export function dayLabel(day: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? String(day);
}

export function parseHhmm(hhmm: string): { ok: boolean; hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return { ok: false, hour: 9, minute: 0 };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { ok: false, hour: 9, minute: 0 };
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { ok: false, hour: 9, minute: 0 };
  return { ok: true, hour, minute };
}

export function nextDailyResetAt(now: Date, dailyResetHhmm: string) {
  const { hour, minute } = parseHhmm(dailyResetHhmm);
  const reset = new Date(now);
  reset.setHours(hour, minute, 0, 0);
  if (now.getTime() < reset.getTime()) return reset;
  reset.setDate(reset.getDate() + 1);
  return reset;
}

function weeklyResetStartAt(now: Date, dailyResetHhmm: string, weeklyResetDay: number) {
  const { hour, minute } = parseHhmm(dailyResetHhmm);
  const resetDay = Number.isFinite(weeklyResetDay) ? Math.max(0, Math.min(6, weeklyResetDay)) : 1;

  const start = new Date(now);
  const nowDay = start.getDay();
  const daysSinceReset = (nowDay - resetDay + 7) % 7;
  start.setDate(start.getDate() - daysSinceReset);
  start.setHours(hour, minute, 0, 0);
  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 7);
  return start;
}

export function nextWeeklyResetAt(now: Date, dailyResetHhmm: string, weeklyResetDay: number) {
  const start = weeklyResetStartAt(now, dailyResetHhmm, weeklyResetDay);
  const next = new Date(start);
  next.setDate(next.getDate() + 7);
  return next;
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const hh = h % 24;
  const mm = m % 60;
  if (d > 0) return `${d}d ${hh}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${m}m`;
}

