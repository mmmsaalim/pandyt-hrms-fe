import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService, LeaveStatus } from '../../core/services/leave.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaveBalanceDisplayComponent } from './leave-balance-display.component';

interface LeaveRow {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
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
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule, LeaveBalanceDisplayComponent],
  templateUrl: './leave-page.component.html',
  styleUrl: './leave-page.component.scss',
})
export class LeavePageComponent implements OnInit {
  rows: LeaveRow[] = [];
  balances: any[] = [];
  leaveTypes: string[] = ['Annual', 'Medical', 'Sick', 'Casual'];
  canApproveLeave = false;
  busyRowId: string | null = null;
  showApplyForm = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  activeTab: 'requests' | 'balances' = 'requests';

  applyForm = { type: '', startDate: '', endDate: '', days: 1, reason: '' };

  constructor(
    private readonly leaveService: LeaveService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const roles = this.auth.user()?.roles ?? [];
    this.canApproveLeave = roles.includes('COMPANY_ADMIN') || roles.includes('HR_MANAGER') || roles.includes('TEAM_LEAD');
    this.loadRows();
    this.loadBalances();
    this.loadLeaveTypes();
  }

  openApplyForm(): void {
    this.showApplyForm = true;
    if (!this.applyForm.type) {
      this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
    }
  }

  closeApplyForm(): void {
    this.showApplyForm = false;
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

  applyLeave(): void {
    if (!this.applyForm.type.trim() || !this.applyForm.startDate || !this.applyForm.endDate) {
      this.showMsg('Type, start date and end date are required.', 'error');
      return;
    }
    this.busy = true;
    this.leaveService.apply(this.applyForm).subscribe({
      next: () => {
        this.showMsg('Leave applied successfully.', 'success');
        this.closeApplyForm();
        this.applyForm = {
          type: this.leaveTypes[0] ?? 'Annual',
          startDate: '',
          endDate: '',
          days: 1,
          reason: '',
        };
        this.loadRows();
        this.loadBalances();
      },
      error: (err) => this.showMsg(err?.error?.message || 'Failed to apply leave.', 'error'),
      complete: () => (this.busy = false),
    });
  }

  updateStatus(row: LeaveRow, status: LeaveStatus): void {
    if (this.busyRowId || row.status === status) { return; }
    this.busyRowId = row.id;
    this.leaveService.updateStatus(row.id, status).subscribe({
      next: () => { row.status = status; this.busyRowId = null; this.loadBalances(); },
      error: () => { this.busyRowId = null; },
    });
  }

  private loadRows(): void {
    this.leaveService.list().subscribe((res: any) => (this.rows = res as LeaveRow[]));
  }

  private loadBalances(): void {
    this.leaveService.getBalances().subscribe((res: any) => (this.balances = res));
  }

  private loadLeaveTypes(): void {
    this.leaveService.getPolicies().subscribe({
      next: (policies: any) => {
        const policyNames = Array.isArray(policies)
          ? policies
              .map((p: any) => p?.name)
              .filter((name: string | undefined) => !!name)
          : [];
        const merged = [...this.leaveTypes, ...policyNames];
        this.leaveTypes = Array.from(new Set(merged));
        if (!this.applyForm.type) {
          this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
        }
      },
      error: () => {
        if (!this.applyForm.type) {
          this.applyForm.type = this.leaveTypes[0] ?? 'Annual';
        }
      },
    });
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    this.busy = false;
  }
}
