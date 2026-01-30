function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseHhmm(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return { hour: 9, minute: 0 };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: 9, minute: 0 };
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: 9, minute: 0 };
  return { hour, minute };
}

export function dailyPeriodKey(now: Date, dailyResetHhmm: string) {
  const { hour, minute } = parseHhmm(dailyResetHhmm);
  const start = new Date(now);
  start.setHours(hour, minute, 0, 0);
  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
  return `D:${formatLocalDateKey(start)}`;
}

export function weeklyPeriodKey(now: Date, dailyResetHhmm: string, weeklyResetDay: number) {
  const { hour, minute } = parseHhmm(dailyResetHhmm);
  const resetDay = Number.isFinite(weeklyResetDay) ? Math.max(0, Math.min(6, weeklyResetDay)) : 1;

  const start = new Date(now);
  const nowDay = start.getDay();
  const daysSinceReset = (nowDay - resetDay + 7) % 7;
  start.setDate(start.getDate() - daysSinceReset);
  start.setHours(hour, minute, 0, 0);

  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 7);
  return `W:${formatLocalDateKey(start)}`;
}

