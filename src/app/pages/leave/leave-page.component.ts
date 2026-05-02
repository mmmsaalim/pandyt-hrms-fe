import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { LeaveService, LeaveStatus } from '../../core/services/leave.service';
import { AuthService } from '../../core/services/auth.service';

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
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

@Component({
  selector: 'app-leave-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe],
  templateUrl: './leave-page.component.html',
  styleUrl: './leave-page.component.scss',
})
export class LeavePageComponent implements OnInit {
  rows: LeaveRow[] = [];
  isCompanyAdmin = false;
  busyRowId: string | null = null;

  constructor(
    private readonly leaveService: LeaveService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isCompanyAdmin = this.auth.user()?.roles.includes('COMPANY_ADMIN') ?? false;
    this.loadRows();
  }

  employeeName(row: LeaveRow): string {
    const firstName = row.employee?.user?.firstName ?? '';
    const lastName = row.employee?.user?.lastName ?? '';
    return `${firstName} ${lastName}`.trim() || 'Employee';
  }

  updateStatus(row: LeaveRow, status: LeaveStatus): void {
    if (this.busyRowId || row.status === status) {
      return;
    }

    this.busyRowId = row.id;
    this.leaveService.updateStatus(row.id, status).subscribe({
      next: () => {
        row.status = status;
        this.busyRowId = null;
      },
      error: () => {
        this.busyRowId = null;
      },
    });
  }

  private loadRows(): void {
    this.leaveService.list().subscribe((res: any) => {
      this.rows = res as LeaveRow[];
    });
  }
}
