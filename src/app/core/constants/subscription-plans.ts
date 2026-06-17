export interface SubscriptionPlanDefinition {
  key: string;
  label: string;
  seats: number | null;
  description: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    key: 'FREEMIUM',
    label: 'Freemium',
    seats: 10,
    description: 'Up to 10 employees — Core HR + Leave',
  },
  {
    key: 'STARTER',
    label: 'Starter',
    seats: 50,
    description: 'Up to 50 employees — Core HR, Leave, Attendance, Reports',
  },
  {
    key: 'GROWTH',
    label: 'Growth',
    seats: 200,
    description: 'Up to 200 employees — Starter + ATS, Payroll, Organisation',
  },
  {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    seats: null,
    description: 'Unlimited employees — all modules',
  },
];

export const PLAN_MODULE_PRESETS: Record<string, string[]> = {
  FREEMIUM: ['employees', 'leave'],
  STARTER: ['employees', 'leave', 'attendance', 'reports'],
  GROWTH: ['employees', 'leave', 'attendance', 'payroll', 'payslips', 'recruitment', 'organisation', 'reports'],
  ENTERPRISE: ['employees', 'organisation', 'leave', 'attendance', 'payroll', 'payslips', 'recruitment', 'reports'],
};

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

export function seatsForPlan(plan: string): number {
  const normalized = plan.trim().toUpperCase();
  const match = SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized);
  if (!match || match.seats === null) {
    return 999999;
  }
  return match.seats;
}

export function modulesForPlan(plan: string): string[] {
  const normalized = plan.trim().toUpperCase();
  return PLAN_MODULE_PRESETS[normalized] ?? PLAN_MODULE_PRESETS['STARTER'];
}

export function planLabel(plan: string): string {
  const normalized = plan.trim().toUpperCase();
  return SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized)?.label ?? plan;
}

export function seatsDisplay(plan: string, seats?: number): string {
  const normalized = plan.trim().toUpperCase();
  const definition = SUBSCRIPTION_PLANS.find((entry) => entry.key === normalized);
  if (definition?.seats === null) {
    return 'Unlimited';
  }
  return String(seats ?? seatsForPlan(plan));
}
