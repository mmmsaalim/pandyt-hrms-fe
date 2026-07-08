export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocalIso(): string {
  return toLocalIsoDate(new Date());
}

export function tomorrowLocalIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalIsoDate(date);
}

export function addLocalDays(iso: string, days: number): string {
  const date = parseLocalIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

export function compareLocalIsoDates(a: string, b: string): number {
  return parseLocalIsoDate(a).getTime() - parseLocalIsoDate(b).getTime();
}

export function countInclusiveLocalDays(startIso: string, endIso: string): number {
  const start = parseLocalIsoDate(startIso);
  const end = parseLocalIsoDate(endIso);
  if (end < start) {
    return 0;
  }
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function normalizeLocalDateRange(startIso: string, endIso: string): { start: string; end: string } {
  if (compareLocalIsoDates(startIso, endIso) <= 0) {
    return { start: startIso, end: endIso };
  }
  return { start: endIso, end: startIso };
}

export function parseLocalIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseApiDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseLocalIsoDate(trimmed);
  }

  const parsed = new Date(trimmed);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function eachLocalIsoDate(startValue: string | Date, endValue: string | Date): string[] {
  const normalized =
    typeof startValue === 'string' && typeof endValue === 'string'
      ? normalizeLocalDateRange(startValue, endValue)
      : null;
  const start = normalized ? parseLocalIsoDate(normalized.start) : parseApiDate(startValue);
  const end = normalized ? parseLocalIsoDate(normalized.end) : parseApiDate(endValue);
  const dates: string[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toLocalIsoDate(cursor));
  }

  return dates;
}

export function localIsoDateInRange(targetIso: string, startValue: string | Date, endValue: string | Date): boolean {
  const startIso =
    typeof startValue === 'string' ? startValue : toLocalIsoDate(parseApiDate(startValue));
  const endIso = typeof endValue === 'string' ? endValue : toLocalIsoDate(parseApiDate(endValue));
  const { start, end } = normalizeLocalDateRange(startIso, endIso);
  const target = parseLocalIsoDate(targetIso).getTime();
  const rangeStart = parseLocalIsoDate(start).getTime();
  const rangeEnd = parseLocalIsoDate(end).getTime();
  return target >= rangeStart && target <= rangeEnd;
}
