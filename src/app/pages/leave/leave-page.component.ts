import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService, LeaveStatus } from '../../core/services/leave.service';
import { cloneLeavePresets } from '../../core/constants/leave-presets';
import { AuthService } from '../../core/services/auth.service';
import { LeaveBalanceDisplayComponent } from './leave-balance-display.component';
import { EmployeesService } from '../../core/services/employees.service';
import { MonthCalendarComponent, CalendarDayMarker, CalendarRangeSelection } from '../../shared/month-calendar/month-calendar.component';
import { ConfirmDialogComponent } from '../../shared/dialogs/confirm-dialog.component';
import { ListPaginationComponent } from '../../shared/list-pagination/list-pagination.component';
import { PaginationMeta } from '../../core/models/pagination.model';
import { buildPaginationMeta, defaultListPagination, slicePage } from '../../core/utils/paginate-array';
import { rowOverlapsDateRange } from '../../core/utils/date-range-filter';
import {
  eachLocalIsoDate,
  localIsoDateInRange,
  countInclusiveLocalDays,
  normalizeLocalDateRange,
  compareLocalIsoDates,
  tomorrowLocalIso,
} from '../../core/utils/local-date';

interface LeaveRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  employee?: {
    employeeCode?: string;
    department?: string;
    designation?: string;
    user?: { firstName?: string; lastName?: string; email?: string };
  };
  approvedBy?: {
    designation?: string;
    user?: { firstName?: string; lastName?: string; email?: string };
  };
}

@Component({
  selector: 'app-leave-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule, LeaveBalanceDisplayComponent, MonthCalendarComponent, ConfirmDialogComponent, ListPaginationComponent],
  templateUrl: './leave-page.component.html',
  styleUrl: './leave-page.component.scss',
})
export class LeavePageComponent implements OnInit {
  rows: LeaveRow[] = [];
  balances: any[] = [];
  leaveTypes: string[] = cloneLeavePresets().map((row) => row.name);
  canApproveLeave = false;
  canManualLeave = false;
  employees: Array<{ id: number; name: string; email: string }> = [];
  busyRowId: string | null = null;
  showApplyForm = false;
  manualEntryMode = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  activeTab: 'requests' | 'balances' | 'calendar' = 'requests';
  selectedCalendarDate = '';
  calendarMarkers: CalendarDayMarker[] = [];
  currentUserEmail = '';

  showActionModal = false;
  actionModalMode: 'approve' | 'reject' = 'approve';
  actionTargetRow: LeaveRow | null = null;
  actionComment = '';

  showWithdrawDialog = false;
  withdrawTargetRow: LeaveRow | null = null;

  calendarRangeStart = '';
  calendarRangeEnd = '';

  listFilters = { status: 'ALL', dateFrom: '', dateTo: '', search: '' };
  listPagination: PaginationMeta = defaultListPagination(10);

  applyForm = { employeeId: 0, type: '', startDate: '', endDate: '', days: 1, reason: '', status: 'PENDING' as LeaveStatus };

  constructor(
    private readonly leaveService: LeaveService,
    private readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    const canManageOthers =
      roles.includes('COMPANY_ADMIN') ||
      roles.includes('HR_MANAGER') ||
      roles.includes('TEAM_LEAD');
    this.canApproveLeave = canManageOthers && this.auth.hasAnyPermission(['leave.manage']);
    this.canManualLeave = canManageOthers;
    this.currentUserEmail = this.auth.user()?.email?.trim().toLowerCase() ?? '';
    this.loadRows();
    this.loadBalances();
    this.loadLeaveTypes();
    this.loadEmployees();
  }

  openApplyForm(): void {
    this.manualEntryMode = false;
    this.showApplyForm = true;
    this.applyForm.status = 'PENDING';
    this.applyForm.employeeId = 0;
    if (!this.applyForm.type) {
      this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
    }
    this.resetApplyDatesForMode();
  }

  openApplyFormFromCalendar(): void {
    if (!this.calendarRangeStart || !this.calendarRangeEnd) {
      this.showMsg('Select a start and end date on the calendar first.', 'error');
      return;
    }
    this.openApplyForm();
    this.applyForm.startDate = this.calendarRangeStart;
    this.applyForm.endDate = this.calendarRangeEnd;
    this.syncApplyDaysFromDates();
  }

  /** Self-service leave: earliest selectable date is tomorrow. HR manual entry may backdate. */
  get minLeaveStartDate(): string {
    return this.manualEntryMode ? '' : tomorrowLocalIso();
  }

  get minLeaveEndDate(): string {
    return this.applyForm.startDate || this.minLeaveStartDate;
  }

  get calendarMinSelectableDate(): string {
    return tomorrowLocalIso();
  }

  onApplyStartDateChange(): void {
    if (this.applyForm.endDate && compareLocalIsoDates(this.applyForm.endDate, this.applyForm.startDate) < 0) {
      this.applyForm.endDate = this.applyForm.startDate;
    }
    this.syncApplyDaysFromDates();
  }

  onApplyEndDateChange(): void {
    if (
      this.applyForm.startDate &&
      this.applyForm.endDate &&
      compareLocalIsoDates(this.applyForm.endDate, this.applyForm.startDate) < 0
    ) {
      this.applyForm.startDate = this.applyForm.endDate;
    }
    this.syncApplyDaysFromDates();
  }

  onCalendarRangeChange(range: CalendarRangeSelection): void {
    this.calendarRangeStart = range.start;
    this.calendarRangeEnd = range.end;
    this.selectedCalendarDate = range.start;
  }

  private resetApplyDatesForMode(): void {
    if (this.manualEntryMode) {
      return;
    }
    const min = tomorrowLocalIso();
    this.applyForm.startDate = min;
    this.applyForm.endDate = min;
    this.applyForm.days = 1;
  }

  private syncApplyDaysFromDates(): void {
    if (!this.applyForm.startDate || !this.applyForm.endDate) {
      return;
    }
    const { start, end } = normalizeLocalDateRange(this.applyForm.startDate, this.applyForm.endDate);
    this.applyForm.startDate = start;
    this.applyForm.endDate = end;
    this.applyForm.days = countInclusiveLocalDays(start, end);
  }

  private validateApplyDates(): string | null {
    if (!this.applyForm.startDate || !this.applyForm.endDate) {
      return 'Start date and end date are required.';
    }

    const { start, end } = normalizeLocalDateRange(this.applyForm.startDate, this.applyForm.endDate);
    this.applyForm.startDate = start;
    this.applyForm.endDate = end;

    if (!this.manualEntryMode) {
      const min = tomorrowLocalIso();
      if (compareLocalIsoDates(start, min) < 0) {
        return 'Leave can only be requested from tomorrow onwards.';
      }
    }

    const calculatedDays = countInclusiveLocalDays(start, end);
    if (calculatedDays < 1) {
      return 'End date cannot be before start date.';
    }

    this.applyForm.days = calculatedDays;
    return null;
  }

  openManualEntryForm(): void {
    this.manualEntryMode = true;
    this.showApplyForm = true;
    this.applyForm.status = 'APPROVED';
    this.applyForm.employeeId = 0;
    this.applyForm.startDate = '';
    this.applyForm.endDate = '';
    this.applyForm.days = 1;
    if (!this.applyForm.type) {
      this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
    }
  }

  closeApplyForm(): void {
    this.showApplyForm = false;
    this.manualEntryMode = false;
  }

  employeeName(row: LeaveRow): string {
    const fn = row.employee?.user?.firstName ?? '';
    return fn.trim() || 'Employee';
  }

  employeeEmail(row: LeaveRow): string {
    return row.employee?.user?.email?.trim() || 'No email';
  }

  actionedByName(row: LeaveRow): string {
    const user = row.approvedBy?.user;
    if (!user) return '';
    const first = user.firstName ?? '';
    const last = user.lastName ?? '';
    return `${first} ${last}`.trim() || 'User';
  }

  canActionLeave(row: LeaveRow): boolean {
    if (row.status !== 'PENDING') {
      return false;
    }
    const end = new Date(row.endDate);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  }

  canRevertToPending(row: LeaveRow): boolean {
    if (row.status !== 'APPROVED' && row.status !== 'REJECTED') {
      return false;
    }
    const end = new Date(row.endDate);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  }

  revertToPending(row: LeaveRow): void {
    if (this.busyRowId || !this.canRevertToPending(row)) { return; }
    this.busyRowId = row.id;
    this.leaveService.updateStatus(row.id, 'PENDING').subscribe({
      next: () => {
        row.status = 'PENDING';
        row.approvalComment = null;
        row.rejectionReason = null;
        this.busyRowId = null;
        this.showMsg('Leave request reverted to PENDING.', 'success');
        this.loadBalances();
        this.loadRows();
      },
      error: (err) => {
        this.busyRowId = null;
        this.showMsg(err?.error?.message || 'Failed to revert leave request.', 'error');
      },
    });
  }

  leaveActionTitle(row: LeaveRow): string {
    if (row.status !== 'PENDING') {
      return '';
    }
    if (!this.canActionLeave(row)) {
      return 'Leave period has ended — approval is no longer available';
    }
    return '';
  }

  managerNote(row: LeaveRow): string {
    if (row.status === 'REJECTED' && row.rejectionReason?.trim()) {
      return row.rejectionReason.trim();
    }
    if (row.status === 'APPROVED' && row.approvalComment?.trim()) {
      return row.approvalComment.trim();
    }
    return '';
  }

  openActionModal(row: LeaveRow, mode: 'approve' | 'reject'): void {
    if (this.busyRowId || !this.canActionLeave(row)) {
      return;
    }
    this.actionTargetRow = row;
    this.actionModalMode = mode;
    this.actionComment = '';
    this.showActionModal = true;
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.actionTargetRow = null;
    this.actionComment = '';
  }

  submitActionModal(): void {
    const row = this.actionTargetRow;
    if (!row || this.busyRowId) {
      return;
    }

    const comment = this.actionComment.trim();
    if (this.actionModalMode === 'reject' && comment.length < 3) {
      this.showMsg('Please enter a rejection reason (at least 3 characters).', 'error');
      return;
    }

    const status: LeaveStatus = this.actionModalMode === 'approve' ? 'APPROVED' : 'REJECTED';
    this.busyRowId = row.id;

    this.leaveService
      .updateStatus(row.id, status, {
        rejectionReason: this.actionModalMode === 'reject' ? comment : undefined,
        approvalComment: this.actionModalMode === 'approve' ? comment || undefined : undefined,
      })
      .subscribe({
        next: () => {
          row.status = status;
          if (this.actionModalMode === 'reject') {
            row.rejectionReason = comment;
            row.approvalComment = null;
          } else {
            row.approvalComment = comment || null;
            row.rejectionReason = null;
          }
          this.busyRowId = null;
          this.closeActionModal();
          this.showMsg(
            status === 'APPROVED' ? 'Leave approved successfully.' : 'Leave rejected.',
            'success',
          );
          this.loadRows();
          this.loadBalances();
        },
        error: (err) => {
          this.busyRowId = null;
          this.showMsg(err?.error?.message || 'Failed to update leave request.', 'error');
        },
      });
  }

  applyLeave(): void {
    if (!this.applyForm.type.trim()) {
      this.showMsg('Leave type is required.', 'error');
      return;
    }
    const dateError = this.validateApplyDates();
    if (dateError) {
      this.showMsg(dateError, 'error');
      return;
    }
    if (this.manualEntryMode && !this.applyForm.employeeId) {
      this.showMsg('Select an employee for manual leave entry.', 'error');
      return;
    }
    this.busy = true;
    const payload = {
      ...this.applyForm,
      employeeId: this.canManualLeave && this.applyForm.employeeId ? this.applyForm.employeeId : undefined,
      status: this.canManualLeave ? this.applyForm.status : undefined,
    };

    this.leaveService.apply(payload).subscribe({
      next: () => {
        this.showMsg('Leave applied successfully.', 'success');
        this.closeApplyForm();
        this.applyForm = {
          type: this.leaveTypes[0] ?? 'Annual',
          employeeId: 0,
          startDate: '',
          endDate: '',
          days: 1,
          reason: '',
          status: 'PENDING',
        };
        this.calendarRangeStart = '';
        this.calendarRangeEnd = '';
        this.loadRows();
        this.loadBalances();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Failed to apply leave.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  isOwnLeave(row: LeaveRow): boolean {
    const email = row.employee?.user?.email?.trim().toLowerCase();
    return !!email && email === this.currentUserEmail;
  }

  updateStatus(row: LeaveRow, status: LeaveStatus): void {
    if (!this.canManagerActionLeave(row)) {
      return;
    }
    if (status === 'APPROVED') {
      this.openActionModal(row, 'approve');
      return;
    }
    if (status === 'REJECTED') {
      this.openActionModal(row, 'reject');
    }
  }

  canManagerActionLeave(row: LeaveRow): boolean {
    return this.canApproveLeave && !this.isOwnLeave(row) && row.status === 'PENDING' && this.canActionLeave(row);
  }

  canWithdrawLeave(row: LeaveRow): boolean {
    return row.status === 'PENDING' && this.isOwnLeave(row);
  }

  hasRowActions(row: LeaveRow): boolean {
    return (
      this.canManagerActionLeave(row) ||
      this.canRevertToPending(row) ||
      this.canWithdrawLeave(row)
    );
  }

  openWithdrawDialog(row: LeaveRow): void {
    if (!this.canWithdrawLeave(row) || this.busyRowId) {
      return;
    }
    this.withdrawTargetRow = row;
    this.showWithdrawDialog = true;
  }

  closeWithdrawDialog(): void {
    if (this.busyRowId) {
      return;
    }
    this.showWithdrawDialog = false;
    this.withdrawTargetRow = null;
  }

  confirmWithdrawLeave(): void {
    const row = this.withdrawTargetRow;
    if (!row || !this.canWithdrawLeave(row) || this.busyRowId) {
      return;
    }

    this.busyRowId = row.id;
    this.leaveService.delete(row.id).subscribe({
      next: () => {
        this.busyRowId = null;
        this.closeWithdrawDialog();
        this.showMsg('Leave request cancelled.', 'success');
        this.loadRows();
        this.loadBalances();
      },
      error: (err) => {
        this.busyRowId = null;
        this.showMsg(err?.error?.message || 'Failed to withdraw leave request.', 'error');
      },
    });
  }

  get filteredListRows(): LeaveRow[] {
    const search = this.listFilters.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      if (this.listFilters.status !== 'ALL' && row.status !== this.listFilters.status) {
        return false;
      }
      if (this.listFilters.dateFrom || this.listFilters.dateTo) {
        if (!rowOverlapsDateRange(row.startDate, row.endDate, this.listFilters.dateFrom, this.listFilters.dateTo)) {
          return false;
        }
      }
      if (search) {
        const haystack = `${this.employeeName(row)} ${this.employeeEmail(row)} ${row.type}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }

  get paginatedListRows(): LeaveRow[] {
    return slicePage(this.filteredListRows, this.listPagination.page, this.listPagination.limit);
  }

  onListFilterChange(): void {
    this.listPagination = buildPaginationMeta(
      this.filteredListRows.length,
      1,
      this.listPagination.limit,
    );
  }

  clearListFilters(): void {
    this.listFilters = { status: 'ALL', dateFrom: '', dateTo: '', search: '' };
    this.onListFilterChange();
  }

  onListPageChange(page: number): void {
    this.listPagination = buildPaginationMeta(this.filteredListRows.length, page, this.listPagination.limit);
  }

  onListLimitChange(limit: number): void {
    this.listPagination = buildPaginationMeta(this.filteredListRows.length, 1, limit);
  }

  private syncListPagination(): void {
    this.listPagination = buildPaginationMeta(
      this.filteredListRows.length,
      this.listPagination.page,
      this.listPagination.limit,
    );
  }

  get filteredRows(): LeaveRow[] {
    if (this.activeTab !== 'calendar' || !this.selectedCalendarDate) {
      return [];
    }
    return this.rows.filter((row) => this.coversDate(row, this.selectedCalendarDate));
  }

  onCalendarDateSelected(date: string): void {
    this.selectedCalendarDate = date;
  }

  private coversDate(row: LeaveRow, isoDate: string): boolean {
    return localIsoDateInRange(isoDate, row.startDate, row.endDate);
  }

  private rebuildCalendarMarkers(): void {
    const markers: CalendarDayMarker[] = [];
    for (const row of this.rows) {
      for (const iso of eachLocalIsoDate(row.startDate, row.endDate)) {
        markers.push({
          date: iso,
          label: `${row.type} (${row.status})`,
          tone:
            row.status === 'APPROVED'
              ? 'approved'
              : row.status === 'REJECTED'
                ? 'rejected'
                : 'pending',
        });
      }
    }
    this.calendarMarkers = markers;
  }

  private loadRows(): void {
    this.leaveService.list().subscribe((res: any) => {
      this.rows = res as LeaveRow[];
      this.rebuildCalendarMarkers();
      this.syncListPagination();
    });
  }

  private loadBalances(): void {
    this.leaveService.getBalances().subscribe((res: any) => (this.balances = res));
  }

  private loadEmployees(): void {
    if (!this.canManualLeave) {
      return;
    }

    this.employeesService.list().subscribe({
      next: (rows: any) => {
        this.employees = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: Number(row.id),
          name: `${row?.user?.firstName ?? ''} ${row?.user?.lastName ?? ''}`.trim() || `Employee #${row.id}`,
          email: row?.user?.email ?? 'No email',
        }));
      },
      error: () => {
        this.employees = [];
      },
    });
  }

  private loadLeaveTypes(): void {
    this.leaveService.getPolicies().subscribe({
      next: (policies: any) => {
        const policyNames = Array.isArray(policies)
          ? policies
              .map((p: any) => p?.name)
              .filter((name: string | undefined) => !!name)
          : [];
        this.leaveTypes = policyNames.length
          ? policyNames
          : cloneLeavePresets().map((row) => row.name);
        if (!this.applyForm.type) {
          this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
        }
      },
      error: () => {
        this.leaveTypes = cloneLeavePresets().map((row) => row.name);
        if (!this.applyForm.type) {
          this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
        }
      },
    });
  }

  readonly countLeaveDays = countInclusiveLocalDays;

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    this.busy = false;
  }
}
