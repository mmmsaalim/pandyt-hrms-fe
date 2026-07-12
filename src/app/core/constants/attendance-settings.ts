export const ATTENDANCE_ACTION_OPTIONS = [
  { value: 'FLAG', label: 'Flag only (no deduction)' },
  { value: 'WARN', label: 'Warning only' },
  { value: 'DEDUCT_FIXED', label: 'Fixed salary deduction' },
  { value: 'DEDUCT_HOURLY', label: 'Hourly salary deduction' },
  { value: 'DEDUCT_HALF_DAY', label: 'Half-day deduction' },
  { value: 'DEDUCT_FULL_DAY', label: 'Full-day deduction' },
  { value: 'DEDUCT_LEAVE', label: 'Automatic leave deduction' },
];

export const SCHEDULE_MODE_OPTIONS = [
  { value: 'FIXED', label: 'Fixed company hours' },
  { value: 'FLEXIBLE', label: 'Flexible hours' },
  { value: 'SHIFT', label: 'Shift-based schedule' },
];

export const WEEKEND_PRESET_OPTIONS = [
  { value: 'SAT_SUN', label: 'Saturday & Sunday', days: [6, 0] },
  { value: 'FRI_SAT', label: 'Friday & Saturday', days: [5, 6] },
  { value: 'SUN_ONLY', label: 'Sunday only', days: [0] },
  { value: 'CUSTOM', label: 'Custom', days: [] },
];

export const MISSING_ATTENDANCE_OPTIONS = [
  { value: 'FLAG', label: 'Flag only' },
  { value: 'ABSENT', label: 'Mark absent' },
  { value: 'REQUEST_CORRECTION', label: 'Request employee correction' },
  { value: 'MANAGER_APPROVAL', label: 'Require manager approval' },
  { value: 'AUTO_LEAVE_DEDUCTION', label: 'Auto deduct Casual/Annual leave' },
];

export const DEDUCTION_PAY_MODE_OPTIONS = [
  { value: 'SALARY', label: 'Based on employee salary' },
  { value: 'FIXED', label: 'Fixed LKR amount (same for all employees)' },
];

export const DEFAULT_OVERTIME_RULES = {
  enabled: false,
  startAfterScheduledEnd: true,
  minimumMinutes: 15,
  roundToMinutes: 15,
  weekdayMultiplier: 1.5,
  weekendMultiplier: 2,
  holidayMultiplier: 2.5,
  compensationMode: 'PAY',
  requiresApproval: false,
  payMode: 'SALARY',
  fixedRateLkr: 0,
};

export const DEFAULT_PAYROLL_INTEGRATION = {
  useAttendanceForPayableHours: true,
  ignoreApprovedLeave: true,
  ignoreCompanyHolidays: true,
  ignoreWeekends: true,
  deductLateArrivals: false,
  deductEarlyDepartures: false,
  deductAbsences: true,
  includeOvertime: false,
  missingClockOutPolicy: 'USE_SCHEDULED_END',
  workingDaysPerMonth: 22,
  standardHoursPerDay: 8,
  lateDeductionMode: 'SALARY',
  lateFixedAmountLkr: 0,
  earlyDeductionMode: 'SALARY',
  earlyFixedAmountLkr: 0,
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export type WeekdayWorkKind = 'FULL' | 'HALF' | 'OFF';

export const WEEKDAY_WORK_KIND_OPTIONS: { value: WeekdayWorkKind; label: string; hint: string }[] = [
  { value: 'FULL', label: 'Full work day', hint: 'Counts as 1.0 leave day if leave taken' },
  { value: 'HALF', label: 'Half work day', hint: 'Counts as 0.5 leave day; uses half-day end time' },
  { value: 'OFF', label: 'Full day off', hint: 'No attendance expected; 0 leave days' },
];

/** Quick-start templates — each tenant can override after applying. */
export const WORK_CALENDAR_TEMPLATES = [
  {
    key: 'SAT_SUN',
    label: 'Saturday & Sunday off (office)',
    weekendDays: [6, 0],
    halfWorkingDays: [] as number[],
  },
  {
    key: 'SUN_ONLY',
    label: 'Sunday off only',
    weekendDays: [0],
    halfWorkingDays: [] as number[],
  },
  {
    key: 'SL_SUN_SAT_HALF',
    label: 'Sri Lanka common — Sunday off + Saturday half day',
    weekendDays: [0],
    halfWorkingDays: [6],
  },
  {
    key: 'FRI_SAT',
    label: 'Friday & Saturday off',
    weekendDays: [5, 6],
    halfWorkingDays: [] as number[],
  },
  {
    key: 'SUN_SAT_WORK',
    label: 'Sunday off — Saturday full work (retail)',
    weekendDays: [0],
    halfWorkingDays: [] as number[],
  },
  {
    key: 'CUSTOM',
    label: 'Custom — set each day below',
    weekendDays: [] as number[],
    halfWorkingDays: [] as number[],
  },
];

export function getWeekdayKind(
  day: number,
  weekendDays: number[],
  halfWorkingDays: number[],
): WeekdayWorkKind {
  if (weekendDays.includes(day)) {
    return 'OFF';
  }
  if (halfWorkingDays.includes(day)) {
    return 'HALF';
  }
  return 'FULL';
}

export function setWeekdayKind(
  day: number,
  kind: WeekdayWorkKind,
  weekendDays: number[],
  halfWorkingDays: number[],
): { weekendDays: number[]; halfWorkingDays: number[] } {
  const nextWeekend = weekendDays.filter((d) => d !== day);
  const nextHalf = halfWorkingDays.filter((d) => d !== day);

  if (kind === 'OFF') {
    return { weekendDays: [...nextWeekend, day].sort((a, b) => a - b), halfWorkingDays: nextHalf };
  }
  if (kind === 'HALF') {
    return { weekendDays: nextWeekend, halfWorkingDays: [...nextHalf, day].sort((a, b) => a - b) };
  }
  return { weekendDays: nextWeekend, halfWorkingDays: nextHalf };
}

export function detectWorkCalendarTemplate(
  weekendDays: number[],
  halfWorkingDays: number[],
): string {
  const match = WORK_CALENDAR_TEMPLATES.find(
    (row) =>
      JSON.stringify([...row.weekendDays].sort()) === JSON.stringify([...weekendDays].sort()) &&
      JSON.stringify([...row.halfWorkingDays].sort()) === JSON.stringify([...halfWorkingDays].sort()),
  );
  return match?.key ?? 'CUSTOM';
}

export function weekdayKindLabel(kind: WeekdayWorkKind): string {
  return WEEKDAY_WORK_KIND_OPTIONS.find((row) => row.value === kind)?.label ?? kind;
}

export type AttendanceSettingsForm = {
  scheduleMode: string;
  workStartTime: string;
  workEndTime: string;
  lateArrivalGraceMinutes: number;
  lateArrivalAction: string;
  lateArrivalRepeatedThreshold: number;
  lateArrivalEscalationAction: string;
  earlyDepartureGraceMinutes: number;
  earlyDepartureAction: string;
  weekendPreset: string;
  weekendDays: number[];
  halfWorkingDays: number[];
  halfDayEndTime: string;
  workCalendarTemplate: string;
  overtimeEnabled: boolean;
  overtimeRules: typeof DEFAULT_OVERTIME_RULES;
  missingClockInAction: string;
  missingClockOutAction: string;
  missingBothAction: string;
  autoAbsentEnabled: boolean;
  requireManagerApproval: boolean;
  payrollIntegration: typeof DEFAULT_PAYROLL_INTEGRATION;
};

export function buildDefaultSettingsForm(): AttendanceSettingsForm {
  return {
    scheduleMode: 'FIXED',
    workStartTime: '09:00',
    workEndTime: '17:00',
    lateArrivalGraceMinutes: 0,
    lateArrivalAction: 'FLAG',
    lateArrivalRepeatedThreshold: 3,
    lateArrivalEscalationAction: 'WARN',
    earlyDepartureGraceMinutes: 0,
    earlyDepartureAction: 'FLAG',
    weekendPreset: 'SAT_SUN',
    weekendDays: [6, 0],
    halfWorkingDays: [],
    halfDayEndTime: '13:00',
    workCalendarTemplate: 'SAT_SUN',
    overtimeEnabled: false,
    overtimeRules: { ...DEFAULT_OVERTIME_RULES },
    missingClockInAction: 'FLAG',
    missingClockOutAction: 'FLAG',
    missingBothAction: 'ABSENT',
    autoAbsentEnabled: true,
    requireManagerApproval: false,
    payrollIntegration: { ...DEFAULT_PAYROLL_INTEGRATION },
  };
}

export function mapSettingsResponse(data: any): AttendanceSettingsForm {
  const defaults = buildDefaultSettingsForm();
  const weekendDays = Array.isArray(data?.weekendDays) ? data.weekendDays : defaults.weekendDays;
  const halfWorkingDays = Array.isArray(data?.halfWorkingDays)
    ? data.halfWorkingDays.filter((day: number) => !weekendDays.includes(day))
    : defaults.halfWorkingDays;
  const preset =
    WEEKEND_PRESET_OPTIONS.find(
      (row) => row.value !== 'CUSTOM' && JSON.stringify(row.days) === JSON.stringify(weekendDays),
    )?.value ?? 'CUSTOM';
  const workCalendarTemplate = detectWorkCalendarTemplate(weekendDays, halfWorkingDays);

  return {
    ...defaults,
    scheduleMode: data?.scheduleMode ?? defaults.scheduleMode,
    workStartTime: data?.workStartTime ?? defaults.workStartTime,
    workEndTime: data?.workEndTime ?? defaults.workEndTime,
    lateArrivalGraceMinutes: data?.lateArrivalGraceMinutes ?? defaults.lateArrivalGraceMinutes,
    lateArrivalAction: data?.lateArrivalAction ?? defaults.lateArrivalAction,
    lateArrivalRepeatedThreshold: data?.lateArrivalRepeatedThreshold ?? defaults.lateArrivalRepeatedThreshold,
    lateArrivalEscalationAction: data?.lateArrivalEscalationAction ?? defaults.lateArrivalEscalationAction,
    earlyDepartureGraceMinutes: data?.earlyDepartureGraceMinutes ?? defaults.earlyDepartureGraceMinutes,
    earlyDepartureAction: data?.earlyDepartureAction ?? defaults.earlyDepartureAction,
    weekendPreset: preset,
    weekendDays,
    halfWorkingDays,
    halfDayEndTime: data?.halfDayEndTime ?? defaults.halfDayEndTime,
    workCalendarTemplate,
    overtimeEnabled: data?.overtimeEnabled ?? defaults.overtimeEnabled,
    overtimeRules: { ...defaults.overtimeRules, ...(data?.overtimeRules ?? {}) },
    missingClockInAction: data?.missingClockInAction ?? defaults.missingClockInAction,
    missingClockOutAction: data?.missingClockOutAction ?? defaults.missingClockOutAction,
    missingBothAction: data?.missingBothAction ?? defaults.missingBothAction,
    autoAbsentEnabled: data?.autoAbsentEnabled ?? defaults.autoAbsentEnabled,
    requireManagerApproval: data?.requireManagerApproval ?? defaults.requireManagerApproval,
    payrollIntegration: { ...defaults.payrollIntegration, ...(data?.payrollIntegration ?? {}) },
  };
}

export function toSettingsPayload(form: AttendanceSettingsForm) {
  return {
    scheduleMode: form.scheduleMode,
    workStartTime: form.workStartTime,
    workEndTime: form.workEndTime,
    lateArrivalGraceMinutes: Number(form.lateArrivalGraceMinutes),
    lateArrivalAction: form.lateArrivalAction,
    lateArrivalRepeatedThreshold: Number(form.lateArrivalRepeatedThreshold),
    lateArrivalEscalationAction: form.lateArrivalEscalationAction,
    earlyDepartureGraceMinutes: Number(form.earlyDepartureGraceMinutes),
    earlyDepartureAction: form.earlyDepartureAction,
    weekendDays: form.weekendDays,
    halfWorkingDays: form.halfWorkingDays.filter((day) => !form.weekendDays.includes(day)),
    halfDayEndTime: form.halfDayEndTime,
    overtimeEnabled: form.overtimeEnabled,
    overtimeRules: {
      ...form.overtimeRules,
      enabled: form.overtimeEnabled,
      fixedRateLkr: Number(form.overtimeRules.fixedRateLkr),
    },
    missingClockInAction: form.missingClockInAction,
    missingClockOutAction: form.missingClockOutAction,
    missingBothAction: form.missingBothAction,
    autoAbsentEnabled: form.autoAbsentEnabled,
    requireManagerApproval: form.requireManagerApproval,
    payrollIntegration: {
      ...form.payrollIntegration,
      workingDaysPerMonth: Number(form.payrollIntegration.workingDaysPerMonth),
      standardHoursPerDay: Number(form.payrollIntegration.standardHoursPerDay),
      lateFixedAmountLkr: Number(form.payrollIntegration.lateFixedAmountLkr),
      earlyFixedAmountLkr: Number(form.payrollIntegration.earlyFixedAmountLkr),
    },
  };
}
