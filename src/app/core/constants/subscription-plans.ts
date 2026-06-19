/**
 * Fallback plan definitions used until the API catalog loads.
 * Source of truth: BE `PLAN_CATALOG` in tenant-configuration.constants.ts
 * To add a new plan, update PLAN_CATALOG on the backend only.
 */
export interface SubscriptionPlanDefinition {
  key: string;
  label: string;
  seats: number | null;
  priceLkr?: number | null;
  description: string;
  defaultModules?: string[];
}

export const FALLBACK_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    key: 'FREEMIUM',
    label: 'Freemium',
    seats: 10,
    priceLkr: 0,
    description: 'Up to 10 employees — Core HR + Leave',
    defaultModules: ['employees', 'leave'],
  },
  {
    key: 'STARTER',
    label: 'Starter',
    seats: 50,
    priceLkr: 4000,
    description: 'Up to 50 employees — Core HR, Leave, Attendance, Reports',
    defaultModules: ['employees', 'leave', 'attendance', 'reports'],
  },
  {
    key: 'GROWTH',
    label: 'Growth',
    seats: 200,
    priceLkr: 12000,
    description: 'Up to 200 employees — Starter + ATS, Payroll, Organisation, Canteen',
    defaultModules: [
      'employees',
      'leave',
      'attendance',
      'payroll',
      'payslips',
      'recruitment',
      'organisation',
      'reports',
      'canteen',
    ],
  },
  {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    seats: null,
    priceLkr: null,
    description: 'Unlimited employees — all modules',
    defaultModules: [
      'employees',
      'organisation',
      'leave',
      'attendance',
      'payroll',
      'payslips',
      'recruitment',
      'reports',
      'canteen',
    ],
  },
];

/** @deprecated Use TenantConfigurationService.loadPlatformPlans() instead */
export const SUBSCRIPTION_PLANS = FALLBACK_SUBSCRIPTION_PLANS;

const PLAN_ALIASES: Record<string, string> = {
  BASIC: 'STARTER',
  STANDARD: 'STARTER',
  PRO: 'GROWTH',
};

export function normalizePlanKey(plan: string): string {
  const normalized = plan.trim().toUpperCase();
  return PLAN_ALIASES[normalized] ?? normalized;
}

export function seatsForPlan(plan: string): number {
  const normalized = normalizePlanKey(plan);
  const match = FALLBACK_SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized);
  if (!match || match.seats === null) {
    return 999999;
  }
  return match.seats;
}

export function modulesForPlan(plan: string): string[] {
  const normalized = normalizePlanKey(plan);
  const match = FALLBACK_SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized);
  return match?.defaultModules ?? FALLBACK_SUBSCRIPTION_PLANS[1].defaultModules ?? [];
}

export function planLabel(plan: string): string {
  const normalized = normalizePlanKey(plan);
  return FALLBACK_SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized)?.label ?? plan.trim();
}

export function seatsDisplay(plan: string, seats?: number): string {
  const normalized = normalizePlanKey(plan);
  const definition = FALLBACK_SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized);
  if (definition?.seats === null) {
    return 'Unlimited';
  }
  return String(seats ?? seatsForPlan(plan));
}

export const DEFAULT_EMPLOYEE_PROFILE_FIELDS = [
  'nic',
  'epfNo',
  'etfNo',
  'dateOfBirth',
  'phone',
  'gender',
  'emergencyContact',
  'employmentType',
];
