export interface LeavePolicyPreset {
  code: string;
  name: string;
  days: number;
  carryForwardLimit: number;
  accrualRate: number;
  sortOrder: number;
  description?: string;
  genderScope?: 'ALL' | 'FEMALE' | 'MALE';
}

export const SRI_LANKA_LEAVE_POLICIES: LeavePolicyPreset[] = [
  {
    code: 'annual',
    name: 'Annual',
    days: 14,
    carryForwardLimit: 7,
    accrualRate: 14 / 12,
    sortOrder: 1,
    description: 'Annual leave — 14 days per year.',
    genderScope: 'ALL',
  },
  {
    code: 'casual',
    name: 'Casual',
    days: 7,
    carryForwardLimit: 0,
    accrualRate: 7 / 12,
    sortOrder: 2,
    description: 'Casual leave for short personal matters.',
    genderScope: 'ALL',
  },
  {
    code: 'sick',
    name: 'Sick',
    days: 7,
    carryForwardLimit: 0,
    accrualRate: 0,
    sortOrder: 3,
    description: 'Sick leave.',
    genderScope: 'ALL',
  },
  {
    code: 'medical',
    name: 'Medical',
    days: 7,
    carryForwardLimit: 0,
    accrualRate: 0,
    sortOrder: 4,
    description: 'Medical / hospitalisation leave.',
    genderScope: 'ALL',
  },
  {
    code: 'maternity',
    name: 'Maternity',
    days: 84,
    carryForwardLimit: 0,
    accrualRate: 0,
    sortOrder: 5,
    description: 'Maternity — 12 weeks.',
    genderScope: 'FEMALE',
  },
];

export function cloneLeavePresets(): LeavePolicyPreset[] {
  return SRI_LANKA_LEAVE_POLICIES.map((row) => ({ ...row }));
}
