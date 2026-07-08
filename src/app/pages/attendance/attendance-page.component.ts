import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
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
  MISSING_ATTENDANCE_OPTIONS,
  SCHEDULE_MODE_OPTIONS,
  WEEKEND_PRESET_OPTIONS,
  buildDefaultSettingsForm,
  mapSettingsResponse,
  toSettingsPayload,
} from '../../core/constants/attendance-settings';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule, MonthCalendarComponent, ListPaginationComponent],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent implements OnInit {
  rows: any[] = [];
  employees: Array<{ id: number; name: string; email: string }> = [];
  employeeDirectory = new Map<number, { name: string; email: string }>();
  canOverrideAttendance = false;
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
  holidayForm = { name: '', date: '', isPaid: true };

  readonly actionOptions = ATTENDANCE_ACTION_OPTIONS;
  readonly scheduleModeOptions = SCHEDULE_MODE_OPTIONS;
  readonly weekendPresetOptions = WEEKEND_PRESET_OPTIONS;
  readonly missingAttendanceOptions = MISSING_ATTENDANCE_OPTIONS;

  selectedCalendarDate = '';
  calendarMarkers: CalendarDayMarker[] = [];
  overrideForm = { employeeId: 0, date: '', clockIn: '', clockOut: '', reason: '' };

  listFilters = { dateFrom: '', dateTo: '', status: 'ALL', search: '', employeeId: 0 };
  listPagination: PaginationMeta = defaultListPagination(10);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.canOverrideAttendance =
      roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER') || roles.includes('TEAM_LEAD');
    this.canViewAllEmployees = this.canOverrideAttendance;
    this.loadEmployeeDirectory();
    this.load();
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

  load(): void {
    this.attendanceService.list().subscribe((res: any) => {
      this.rows = res;
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

  onWeekendPresetChange(): void {
    const preset = this.weekendPresetOptions.find((row) => row.value === this.settingsForm.weekendPreset);
    if (preset && preset.value !== 'CUSTOM') {
      this.settingsForm.weekendDays = [...preset.days];
    }
  }

  saveSettings(): void {
    this.settingsBusy = true;
    this.settingsMessage = '';
    this.attendanceService.updateSettings(toSettingsPayload(this.settingsForm)).subscribe({
      next: () => {
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
      next: () => this.loadShifts(),
      error: (err: any) => {
        this.settingsMessage = err?.error?.message || 'Failed to delete shift.';
        this.settingsMessageType = 'error';
      },
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
        this.holidayForm = { name: '', date: '', isPaid: true };
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
