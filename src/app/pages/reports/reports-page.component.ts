import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import {
  PlatformTenantReportRow,
  PlatformTenantUserRow,
  ReportsService,
} from '../../core/services/reports.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent implements OnInit {
  isSuperAdmin = false;
  cards = [
    { label: 'Employees', value: 0 },
    { label: 'Leaves', value: 0 },
    { label: 'Payroll Runs', value: 0 },
  ];
  tenantRows: PlatformTenantReportRow[] = [];
  selectedTenantId: number | null = null;
  selectedTenantName = '';
  tenantUsers: PlatformTenantUserRow[] = [];
  loadingTenants = false;
  loadingUsers = false;
  errorMessage = '';
  selectedTenantIds = new Set<number>();

  constructor(
    private readonly reportsService: ReportsService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.auth.user()?.roles?.includes('SUPER_ADMIN') ?? false;

    if (this.isSuperAdmin) {
      this.loadPlatformTenants();
      return;
    }

    this.reportsService.summary().subscribe((res: any) => {
      this.cards = [
        { label: 'Employees', value: res.employees ?? 0 },
        { label: 'Leaves', value: res.leaves ?? 0 },
        { label: 'Payroll Runs', value: res.payrollRuns ?? 0 },
      ];
    });
  }

  loadPlatformTenants(): void {
    this.loadingTenants = true;
    this.errorMessage = '';
    this.reportsService.platformTenants().subscribe({
      next: (rows) => {
        this.tenantRows = rows;
        this.loadingTenants = false;
      },
      error: (err) => {
        this.loadingTenants = false;
        this.errorMessage = err?.error?.message || 'Failed to load platform tenant report.';
      },
    });
  }

  viewTenantUsers(row: PlatformTenantReportRow): void {
    if (this.selectedTenantId === row.id) {
      this.selectedTenantId = null;
      this.tenantUsers = [];
      this.selectedTenantName = '';
      return;
    }

    this.selectedTenantId = row.id;
    this.selectedTenantName = row.name;
    this.loadingUsers = true;
    this.tenantUsers = [];

    this.reportsService.platformTenantUsers(row.id).subscribe({
      next: (res) => {
        this.tenantUsers = res.users ?? [];
        this.loadingUsers = false;
      },
      error: (err) => {
        this.loadingUsers = false;
        this.errorMessage = err?.error?.message || 'Failed to load tenant users.';
      },
    });
  }

  totalUsers(): number {
    return this.tenantRows.reduce((sum, row) => sum + row.activeUsers + row.inactiveUsers, 0);
  }

  totalEmployees(): number {
    return this.tenantRows.reduce((sum, row) => sum + row.activeEmployees, 0);
  }

  get allTenantsSelected(): boolean {
    return this.tenantRows.length > 0 && this.selectedTenantIds.size === this.tenantRows.length;
  }

  isTenantSelected(tenantId: number): boolean {
    return this.selectedTenantIds.has(tenantId);
  }

  toggleTenantSelection(tenantId: number): void {
    if (this.selectedTenantIds.has(tenantId)) {
      this.selectedTenantIds.delete(tenantId);
    } else {
      this.selectedTenantIds.add(tenantId);
    }
  }

  toggleAllTenants(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.tenantRows.forEach((row) => this.selectedTenantIds.add(row.id));
    } else {
      this.selectedTenantIds.clear();
    }
  }

  printReport(): void {
    const originalTenantRows = this.tenantRows;
    const originalSelectedTenantId = this.selectedTenantId;

    if (this.selectedTenantIds.size > 0) {
      this.tenantRows = this.tenantRows.filter((row) => this.selectedTenantIds.has(row.id));
      this.selectedTenantId = null; // Hide individual user list during print
    }

    window.print();

    // Restore original state after printing
    this.tenantRows = originalTenantRows;
    this.selectedTenantId = originalSelectedTenantId;
  }
}
