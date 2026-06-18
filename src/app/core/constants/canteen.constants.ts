export interface CanteenMealTypeConfig {
  key: string;
  label: string;
  defaultCost: number;
  enabled: boolean;
}

export const DEFAULT_CANTEEN_MEAL_TYPES: CanteenMealTypeConfig[] = [
  { key: 'breakfast', label: 'Breakfast', defaultCost: 0, enabled: true },
  { key: 'lunch', label: 'Lunch', defaultCost: 150, enabled: true },
  { key: 'dinner', label: 'Dinner', defaultCost: 0, enabled: false },
  { key: 'morningTea', label: 'Morning Tea & Snacks', defaultCost: 30, enabled: true },
  { key: 'eveningTea', label: 'Evening Tea & Short Eats', defaultCost: 30, enabled: true },
];

export const DEFAULT_MEAL_COUNTS: Record<string, number> = {
  lunch: 1,
};

export type MealBreakdown = Record<string, { count: number; cost: number }>;

export function resolveMealTypes(raw: unknown): CanteenMealTypeConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CANTEEN_MEAL_TYPES.map((row) => ({ ...row }));
  }

  return raw
    .filter((row): row is CanteenMealTypeConfig => {
      return (
        typeof row === 'object' &&
        row !== null &&
        typeof (row as CanteenMealTypeConfig).key === 'string' &&
        typeof (row as CanteenMealTypeConfig).label === 'string'
      );
    })
    .map((row) => ({
      key: row.key,
      label: row.label,
      defaultCost: Number(row.defaultCost ?? 0),
      enabled: row.enabled !== false,
    }));
}

export function resolveDefaultMealCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_MEAL_COUNTS };
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
      key,
      Math.max(0, Math.floor(Number(value))),
    ]),
  );
}
