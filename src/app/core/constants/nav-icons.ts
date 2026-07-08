/** Sidebar navigation icons keyed by route path or group label. */
export const NAV_ICONS: Record<string, string> = {
  '/dashboard': '📊',
  '/tenants': '🏢',
  '/leads': '🎯',
  '/company-payments': '💳',
  '/reports': '📈',
  '/employees': '👥',
  '/organisation': '🏛️',
  '/leave': '🏖️',
  '/attendance': '⏱️',
  '/canteen': '🍽️',
  '/payroll': '💰',
  '/payslips': '📄',
  '/recruitment': '📝',
  '/platform/catalog': '💳',
  '/invitations': '✉️',
  '/configuration/users-permissions': '👤',
  '/configuration/access-configuration': '🔐',
  '/configuration/module-settings': '⚙️',
  Configuration: '⚙️',
};

export function navIcon(pathOrKey: string): string {
  return NAV_ICONS[pathOrKey] ?? '•';
}
