import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent implements OnInit {
  rows: any[] = [];
  isCompanyAdmin = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  showOverrideForm = false;
  overrideForm = { employeeId: 0, date: '', clockIn: '', clockOut: '', reason: '' };

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isCompanyAdmin = this.auth.user()?.roles.includes('COMPANY_ADMIN') ?? false;
    this.load();
  }

  load(): void {
    this.attendanceService.list().subscribe((res: any) => (this.rows = res));
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
