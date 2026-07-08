/** Visual icons for HR modules — used in subscription catalog, signup, and tenant config. */
export const MODULE_ICONS: Record<string, string> = {
  employees: '👥',
  organisation: '🏢',
  leave: '🏖️',
  attendance: '⏱️',
  payroll: '💰',
  payslips: '📄',
  recruitment: '🎯',
  reports: '📊',
  canteen: '🍽️',
};

export function moduleIcon(key: string): string {
  return MODULE_ICONS[key] ?? '📦';
}
