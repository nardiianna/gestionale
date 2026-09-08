const WEEKDAY_LABELS = ["LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO", "DOMENICA"];
const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function weekdayLabels() {
  return WEEKDAY_LABELS;
}

export function monthLabel(year: number, month: number) {
  return `${MONTH_LABELS[month]} ${year}`;
}

export function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Monday-first grid of dates covering the full weeks of the given month. */
export function monthGridDates(year: number, month: number) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    days.push(d);
  }
  return days;
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const weekday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - weekday);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Converts a business's local wall-clock date+time (e.g. "2026-09-08" +
 * "10:00" in Europe/Rome) into the correct UTC instant. Needed because this
 * runs in server actions on infra whose process timezone is UTC, not the
 * business's -- a naive `new Date(`${date}T${time}`)` would silently be off
 * by the Rome/UTC offset (1-2h depending on DST).
 */
export function zonedWallTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const offsetMinutes = tzOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}

export function minutesSinceMidnightInZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function dateKeyInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso)); // en-CA => YYYY-MM-DD
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}
