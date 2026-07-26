import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';
import { MonthCalendarComponent, CalendarDayMarker } from '../../shared/month-calendar/month-calendar.component';
import { ListPaginationComponent } from '../../shared/list-pagination/list-pagination.component';
import { PaginationMeta } from '../../core/models/pagination.model';
import { buildPaginationMeta, defaultListPagination, slicePage } from '../../core/utils/paginate-array';
import { rowDateInRange } from '../../core/utils/date-range-filter';
import { parseApiDate, toLocalIsoDate } from '../../core/utils/local-date';
import {
  ATTENDANCE_ACTION_OPTIONS,
  AttendanceSettingsForm,
  DEDUCTION_PAY_MODE_OPTIONS,
  MISSING_ATTENDANCE_OPTIONS,
  SCHEDULE_MODE_OPTIONS,
  WORK_CALENDAR_TEMPLATES,
  WEEKDAY_OPTIONS,
  WEEKDAY_WORK_KIND_OPTIONS,
  WeekdayWorkKind,
  getWeekdayKind,
  setWeekdayKind,
  weekdayKindLabel,
  buildDefaultSettingsForm,
  mapSettingsResponse,
  toSettingsPayload,
} from '../../core/constants/attendance-settings';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, CurrencyPipe, FormsModule, MonthCalendarComponent, ListPaginationComponent],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent implements OnInit {
  rows: any[] = [];
  employees: Array<{ id: number; name: string; email: string }> = [];
  employeeDirectory = new Map<number, { name: string; email: string }>();
  canOverrideAttendance = false;
  canSaveSettings = false;
  canViewAllEmployees = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  showOverrideForm = false;
  activeTab: 'list' | 'calendar' | 'settings' = 'list';
  settingsSection: 'schedule' | 'late' | 'early' | 'overtime' | 'missing' | 'payroll' | 'shifts' | 'holidays' = 'schedule';
  settingsForm: AttendanceSettingsForm = buildDefaultSettingsForm();
  settingsBusy = false;
  settingsMessage = '';
  settingsMessageType: 'success' | 'error' = 'success';
  shifts: any[] = [];
  editingShiftId: number | null = null;
  editShiftForm = {
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
    isNightShift: false,
    isDefault: false,
    overtimeEligible: true,
  };
  holidays: any[] = [];
  shiftForm = {
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
    isNightShift: false,
    isDefault: false,
    overtimeEligible: true,
  };
  holidayForm = { name: '', date: '', isPaid: true, isHalfDay: false };

  readonly actionOptions = ATTENDANCE_ACTION_OPTIONS;
  readonly deductionPayModeOptions = DEDUCTION_PAY_MODE_OPTIONS;
  readonly scheduleModeOptions = SCHEDULE_MODE_OPTIONS;
  readonly weekdayOptions = WEEKDAY_OPTIONS;
  readonly workCalendarTemplates = WORK_CALENDAR_TEMPLATES;
  readonly weekdayWorkKindOptions = WEEKDAY_WORK_KIND_OPTIONS;
  readonly getWeekdayKind = getWeekdayKind;
  readonly weekdayKindLabel = weekdayKindLabel;
  readonly missingAttendanceOptions = MISSING_ATTENDANCE_OPTIONS;

  selectedCalendarDate = '';
  calendarMarkers: CalendarDayMarker[] = [];
  overrideForm = { employeeId: 0, date: '', clockIn: '', clockOut: '', reason: '' };

  listFilters = { dateFrom: '', dateTo: '', status: 'ALL', search: '', employeeId: 0 };
  listPagination: PaginationMeta = defaultListPagination(5);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.canOverrideAttendance =
      roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER') || roles.includes('TEAM_LEAD');
    this.canSaveSettings = roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER');
    this.canViewAllEmployees = this.canOverrideAttendance;
    this.loadEmployeeDirectory();
    this.loadAttendanceSettings();
    this.load();
  }

  private loadAttendanceSettings(): void {
    this.attendanceService.getSettings().subscribe({
      next: (data: any) => {
        this.settingsForm = mapSettingsResponse(data);
      },
    });
  }

  employeeName(row: any): string {
    const fn = row?.employee?.user?.firstName ?? '';
    const nestedName = fn.trim();
    if (nestedName) {
      return nestedName;
    }

    const mapped = this.employeeDirectory.get(Number(row?.employeeId ?? 0));
    return mapped?.name || `Employee #${row?.employeeId ?? '-'}`;
  }

  employeeEmail(row: any): string {
    const nestedEmail = row?.employee?.user?.email?.trim();
    if (nestedEmail) {
      return nestedEmail;
    }

    const mapped = this.employeeDirectory.get(Number(row?.employeeId ?? 0));
    return mapped?.email || 'No email';
  }

  attendanceDeduction(row: any): number {
    return Number(row?.payrollAdjustment ?? 0);
  }

  overtimePayEstimate(row: any): number {
    const overtimeHours = Number(row?.overtimeHours ?? 0);
    const salary = Number(row?.employee?.salary ?? 0);
    if (overtimeHours <= 0) {
      return 0;
    }

    const overtimeRules = this.settingsForm.overtimeRules;
    const payroll = this.settingsForm.payrollIntegration;
    if (overtimeRules.payMode === 'FIXED') {
      return Math.round(overtimeHours * Number(overtimeRules.fixedRateLkr ?? 0) * 100) / 100;
    }

    const workingDays = Number(payroll.workingDaysPerMonth ?? 22) || 22;
    const standardHours = Number(payroll.standardHoursPerDay ?? 8) || 8;
    if (salary <= 0) {
      return 0;
    }
    const hourlyRate = salary / (workingDays * standardHours);
    return Math.round(overtimeHours * hourlyRate * 100) / 100;
  }

  load(): void {
    this.attendanceService.list().subscribe((res: any) => {
      // Latest attendance date first (id as tie-breaker) so recent records show
      // on page 1 and the order stays stable across reloads.
      this.rows = (Array.isArray(res) ? res : []).sort((a: any, b: any) => {
        const byDate = String(b?.date ?? '').localeCompare(String(a?.date ?? ''));
        return byDate !== 0 ? byDate : Number(b?.id ?? 0) - Number(a?.id ?? 0);
      });
      this.rebuildCalendarMarkers();
      this.syncListPagination();
    });
  }

  get filteredListRows(): any[] {
    const search = this.listFilters.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      if (this.listFilters.employeeId && Number(row.employeeId) !== this.listFilters.employeeId) {
        return false;
      }
      if (this.listFilters.status !== 'ALL') {
        const statusKey = String(row.status ?? '').toUpperCase().split(':')[0].trim();
        if (statusKey !== this.listFilters.status) {
          return false;
        }
      }
      if (this.listFilters.dateFrom || this.listFilters.dateTo) {
        if (!rowDateInRange(row.date, this.listFilters.dateFrom, this.listFilters.dateTo)) {
          return false;
        }
      }
      if (search) {
        const haystack = `${this.employeeName(row)} ${this.employeeEmail(row)}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }

  get paginatedListRows(): any[] {
    return slicePage(this.filteredListRows, this.listPagination.page, this.listPagination.limit);
  }

  get calendarFilteredRows(): any[] {
    if (!this.selectedCalendarDate) {
      return [];
    }
    return this.filteredListRows.filter((row) => this.rowDate(row) === this.selectedCalendarDate);
  }

  onListFilterChange(): void {
    this.listPagination = buildPaginationMeta(this.filteredListRows.length, 1, this.listPagination.limit);
    this.rebuildCalendarMarkers();
  }

  clearListFilters(): void {
    this.listFilters = { dateFrom: '', dateTo: '', status: 'ALL', search: '', employeeId: 0 };
    this.onListFilterChange();
  }

  onListPageChange(page: number): void {
    this.listPagination = buildPaginationMeta(this.filteredListRows.length, page, this.listPagination.limit);
  }

  onListLimitChange(limit: number): void {
    this.listPagination = buildPaginationMeta(this.filteredListRows.length, 1, limit);
  }

  onCalendarDateSelected(date: string): void {
    this.selectedCalendarDate = date;
    this.overrideForm.date = date;
  }

  private syncListPagination(): void {
    this.listPagination = buildPaginationMeta(
      this.filteredListRows.length,
      this.listPagination.page,
      this.listPagination.limit,
    );
  }

  private rowDate(row: any): string {
    const value = row?.date;
    if (!value) return '';
    return toLocalIsoDate(parseApiDate(value));
  }

  private rebuildCalendarMarkers(): void {
    this.calendarMarkers = this.filteredListRows
      .map((row) => ({
        date: this.rowDate(row),
        label: `${this.employeeName(row)} · ${row.status}`,
        tone: 'attendance' as const,
      }))
      .filter((marker) => !!marker.date);
  }

  private loadEmployeeDirectory(): void {
    this.employeesService.list().subscribe({
      next: (rows: any) => {
        const nextMap = new Map<number, { name: string; email: string }>();

        for (const row of Array.isArray(rows) ? rows : []) {
          const id = Number(row?.id);
          if (!Number.isFinite(id)) {
            continue;
          }

          const fn = row?.user?.firstName ?? '';
          const name = fn.trim() || `Employee #${id}`;
          const email = row?.user?.email?.trim() || 'No email';
          nextMap.set(id, { name, email });
        }

        this.employeeDirectory = nextMap;
        this.employees = Array.from(nextMap, ([id, value]) => ({ id, ...value }));
      },
      error: () => {
        this.employeeDirectory = new Map();
        this.employees = [];
      },
    });
  }

  clockIn(): void {
    this.busy = true;
    this.attendanceService.clockIn().subscribe({
      next: () => { this.showMsg('Clocked in successfully.', 'success'); this.load(); },
      error: (err) => this.showMsg(err?.error?.message || 'Clock-in failed.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  clockOut(): void {
    this.busy = true;
    this.attendanceService.clockOut().subscribe({
      next: () => { this.showMsg('Clocked out successfully.', 'success'); this.load(); },
      error: (err) => this.showMsg(err?.error?.message || 'Clock-out failed.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  toggleManualEntry(): void {
    this.showOverrideForm = !this.showOverrideForm;
    if (!this.showOverrideForm) {
      this.overrideForm = { employeeId: 0, date: '', clockIn: '', clockOut: '', reason: '' };
    }
  }

  submitOverride(): void {
    if (!this.overrideForm.reason.trim() || !this.overrideForm.date || !this.overrideForm.employeeId) {
      this.showMsg('Employee, date, and reason are required.', 'error');
      return;
    }
    this.busy = true;
    this.attendanceService.override(this.overrideForm).subscribe({
      next: () => {
        this.showMsg('Override saved.', 'success');
        this.showOverrideForm = false;
        this.overrideForm = { employeeId: 0, date: '', clockIn: '', clockOut: '', reason: '' };
        this.load();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Override failed.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  loadSettingsTab(): void {
    this.activeTab = 'settings';
    this.attendanceService.getSettings().subscribe({
      next: (data: any) => {
        this.settingsForm = mapSettingsResponse(data);
      },
    });
    this.loadShifts();
    this.loadHolidays();
  }

  setSettingsSection(section: typeof this.settingsSection): void {
    this.settingsSection = section;
  }

  get showsAutoLeaveDeductionAlert(): boolean {
    return (
      this.settingsForm.missingBothAction === 'AUTO_LEAVE_DEDUCTION' ||
      this.settingsForm.missingClockInAction === 'AUTO_LEAVE_DEDUCTION' ||
      this.settingsForm.missingClockOutAction === 'AUTO_LEAVE_DEDUCTION'
    );
  }

  applyWorkCalendarTemplate(): void {
    const template = this.workCalendarTemplates.find(
      (row) => row.key === this.settingsForm.workCalendarTemplate,
    );
    if (!template || template.key === 'CUSTOM') {
      return;
    }
    this.settingsForm.weekendDays = [...template.weekendDays];
    this.settingsForm.halfWorkingDays = [...template.halfWorkingDays];
    this.settingsForm.weekendPreset = 'CUSTOM';
  }

  onWeekdayKindChange(day: number, kind: WeekdayWorkKind): void {
    const next = setWeekdayKind(
      day,
      kind,
      this.settingsForm.weekendDays,
      this.settingsForm.halfWorkingDays,
    );
    this.settingsForm.weekendDays = next.weekendDays;
    this.settingsForm.halfWorkingDays = next.halfWorkingDays;
    this.settingsForm.workCalendarTemplate = 'CUSTOM';
    this.settingsForm.weekendPreset = 'CUSTOM';
  }

  saveSettings(): void {
    this.settingsBusy = true;
    this.settingsMessage = '';
    this.attendanceService.updateSettings(toSettingsPayload(this.settingsForm)).subscribe({
      next: () => {
        this.attendanceService.getSettings().subscribe({
          next: (data: any) => {
            this.settingsForm = mapSettingsResponse(data);
          },
        });
        this.settingsMessage = 'Settings saved successfully.';
        this.settingsMessageType = 'success';
      },
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to save settings.';
        this.settingsMessageType = 'error';
      },
      complete: () => (this.settingsBusy = false),
    });
  }

  loadShifts(): void {
    this.attendanceService.listShifts().subscribe({
      next: (rows: any) => {
        this.shifts = Array.isArray(rows) ? rows : [];
      },
      error: () => {
        this.shifts = [];
      },
    });
  }

  addShift(): void {
    if (!this.shiftForm.name.trim()) {
      this.settingsMessage = 'Shift name is required.';
      this.settingsMessageType = 'error';
      return;
    }

    this.settingsBusy = true;
    this.attendanceService.createShift(this.shiftForm).subscribe({
      next: () => {
        this.shiftForm = {
          name: '',
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isNightShift: false,
          isDefault: false,
          overtimeEligible: true,
        };
        this.loadShifts();
        this.settingsMessage = 'Shift added.';
        this.settingsMessageType = 'success';
      },
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to add shift.';
        this.settingsMessageType = 'error';
      },
      complete: () => (this.settingsBusy = false),
    });
  }

  removeShift(id: number): void {
    this.attendanceService.deleteShift(id).subscribe({
      next: () => {
        if (this.editingShiftId === id) {
          this.cancelShiftEdit();
        }
        this.loadShifts();
      },
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to delete shift.';
        this.settingsMessageType = 'error';
      },
    });
  }

  startShiftEdit(shift: any): void {
    this.editingShiftId = shift.id;
    this.editShiftForm = {
      name: shift.name ?? '',
      startTime: shift.startTime ?? '09:00',
      endTime: shift.endTime ?? '17:00',
      breakMinutes: shift.breakMinutes ?? 0,
      isNightShift: !!shift.isNightShift,
      isDefault: !!shift.isDefault,
      overtimeEligible: shift.overtimeEligible !== false,
    };
  }

  cancelShiftEdit(): void {
    this.editingShiftId = null;
  }

  saveShiftEdit(): void {
    if (this.editingShiftId === null || !this.editShiftForm.name.trim()) {
      this.settingsMessage = 'Shift name is required.';
      this.settingsMessageType = 'error';
      return;
    }

    this.settingsBusy = true;
    this.attendanceService.updateShift(this.editingShiftId, this.editShiftForm).subscribe({
      next: () => {
        this.cancelShiftEdit();
        this.loadShifts();
        this.settingsMessage = 'Shift updated.';
        this.settingsMessageType = 'success';
      },
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to update shift.';
        this.settingsMessageType = 'error';
      },
      complete: () => (this.settingsBusy = false),
    });
  }

  loadHolidays(): void {
    this.attendanceService.listHolidays().subscribe({
      next: (rows: any) => {
        this.holidays = Array.isArray(rows) ? rows : [];
      },
      error: () => {
        this.holidays = [];
      },
    });
  }

  addHoliday(): void {
    if (!this.holidayForm.name.trim() || !this.holidayForm.date) {
      this.settingsMessage = 'Holiday name and date are required.';
      this.settingsMessageType = 'error';
      return;
    }

    this.settingsBusy = true;
    this.attendanceService.createHoliday(this.holidayForm).subscribe({
      next: () => {
        this.holidayForm = { name: '', date: '', isPaid: true, isHalfDay: false };
        this.loadHolidays();
        this.settingsMessage = 'Holiday added.';
        this.settingsMessageType = 'success';
      },
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to add holiday.';
        this.settingsMessageType = 'error';
      },
      complete: () => (this.settingsBusy = false),
    });
  }

  removeHoliday(id: number): void {
    this.attendanceService.deleteHoliday(id).subscribe({
      next: () => this.loadHolidays(),
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to delete holiday.';
        this.settingsMessageType = 'error';
      },
    });
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    this.busy = false;
  }
}
