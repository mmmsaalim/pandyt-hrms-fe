import { compareLocalIsoDates, parseApiDate, toLocalIsoDate } from './local-date';

export function rowOverlapsDateRange(
  startValue: string | Date,
  endValue: string | Date,
  dateFrom: string,
  dateTo: string,
): boolean {
  const rowStart = toLocalIsoDate(parseApiDate(startValue));
  const rowEnd = toLocalIsoDate(parseApiDate(endValue));
  const from = dateFrom || rowStart;
  const to = dateTo || rowEnd;
  return compareLocalIsoDates(rowEnd, from) >= 0 && compareLocalIsoDates(rowStart, to) <= 0;
}

export function rowDateInRange(rowDateValue: string | Date, dateFrom: string, dateTo: string): boolean {
  const rowDate = toLocalIsoDate(parseApiDate(rowDateValue));
  if (dateFrom && compareLocalIsoDates(rowDate, dateFrom) < 0) {
    return false;
  }
  if (dateTo && compareLocalIsoDates(rowDate, dateTo) > 0) {
    return false;
  }
  return true;
}
