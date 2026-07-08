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
  { value: 'AUTO_LEAVE_DEDUCTION', label: 'Auto leave deduction' },
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
};

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
  const preset =
    WEEKEND_PRESET_OPTIONS.find(
      (row) => row.value !== 'CUSTOM' && JSON.stringify(row.days) === JSON.stringify(weekendDays),
    )?.value ?? 'CUSTOM';

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
    overtimeEnabled: form.overtimeEnabled,
    overtimeRules: form.overtimeRules,
    missingClockInAction: form.missingClockInAction,
    missingClockOutAction: form.missingClockOutAction,
    missingBothAction: form.missingBothAction,
    autoAbsentEnabled: form.autoAbsentEnabled,
    requireManagerApproval: form.requireManagerApproval,
    payrollIntegration: form.payrollIntegration,
  };
}
