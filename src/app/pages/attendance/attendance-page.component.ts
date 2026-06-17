import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeesService } from '../../core/services/employees.service';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent implements OnInit {
  rows: any[] = [];
  employeeDirectory = new Map<number, { name: string; email: string }>();
  canOverrideAttendance = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  showOverrideForm = false;
  overrideForm = { employeeId: 0, date: '', clockIn: '', clockOut: '', reason: '' };

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly auth: AuthService,
    private readonly employeesService: EmployeesService,
  ) {}

  ngOnInit(): void {
    this.canOverrideAttendance = this.auth.hasAnyPermission(['attendance.read']);
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
    this.attendanceService.list().subscribe((res: any) => (this.rows = res));
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
      },
      error: () => {
        this.employeeDirectory = new Map();
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

  submitOverride(): void {
    if (!this.overrideForm.reason.trim() || !this.overrideForm.date || !this.overrideForm.employeeId) {
      this.showMsg('Employee ID, date, and reason are required.', 'error');
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

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    this.busy = false;
  }
}
