function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function getDailyPeriodKey(now: Date, resetHour: number): string {
  const shifted = new Date(now);
  shifted.setHours(shifted.getHours() - resetHour);
  return toDateKey(shifted);
}

export function getWeeklyPeriodKey(now: Date, resetDay: number, resetHour: number): string {
  const shifted = new Date(now);
  shifted.setHours(shifted.getHours() - resetHour);

  const day = shifted.getDay(); // 0(Sun)~6(Sat)
  const diff = (day - resetDay + 7) % 7;
  shifted.setDate(shifted.getDate() - diff);
  shifted.setHours(0, 0, 0, 0);

  return toDateKey(shifted);
}

export function getNextDailyResetAt(now: Date, resetHour: number): Date {
  const next = new Date(now);
  next.setHours(resetHour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

export function getNextWeeklyResetAt(now: Date, resetDay: number, resetHour: number): Date {
  const next = new Date(now);
  next.setHours(resetHour, 0, 0, 0);

  const day = next.getDay();
  let diff = (resetDay - day + 7) % 7;
  if (diff === 0 && next <= now) diff = 7;

  next.setDate(next.getDate() + diff);
  return next;
}

