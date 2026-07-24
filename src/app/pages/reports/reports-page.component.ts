import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PlatformTenantReportRow,
  ReportsService,
  TenantReportKind,
} from '../../core/services/reports.service';
import { AuthService } from '../../core/services/auth.service';
import { EditDialogShellComponent } from '../../shared/dialogs/edit-dialog-shell.component';

interface ReportColumn {
  key: string;
  label: string;
  type?: 'date' | 'datetime' | 'number';
}

const TENANT_REPORT_TABS: { kind: TenantReportKind; label: string; columns: ReportColumn[] }[] = [
  {
    kind: 'employees',
    label: 'Employees',
    columns: [
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'joinedDate', label: 'Joined', type: 'date' },
      { key: 'employmentStatus', label: 'Status' },
    ],
  },
  {
    kind: 'leave',
    label: 'Leave',
    columns: [
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'employeeName', label: 'Employee' },
      { key: 'type', label: 'Type' },
      { key: 'startDate', label: 'Start', type: 'date' },
      { key: 'endDate', label: 'End', type: 'date' },
      { key: 'days', label: 'Days', type: 'number' },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    kind: 'attendance',
    label: 'Attendance',
    columns: [
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'employeeName', label: 'Employee' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'hours', label: 'Hours', type: 'number' },
      { key: 'status', label: 'Status' },
      { key: 'lateMinutes', label: 'Late (min)', type: 'number' },
      { key: 'overtimeHours', label: 'Overtime (hrs)', type: 'number' },
    ],
  },
  {
    kind: 'payroll',
    label: 'Payroll',
    columns: [
      { key: 'period', label: 'Period' },
      { key: 'grossAmount', label: 'Gross Amount', type: 'number' },
      { key: 'netAmount', label: 'Net Amount', type: 'number' },
      { key: 'status', label: 'Status' },
      { key: 'processedAt', label: 'Processed', type: 'datetime' },
    ],
  },
];

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, FormsModule, EditDialogShellComponent],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent implements OnInit {
  isSuperAdmin = false;

  // Non-superadmin: tenant-scoped reports.
  tabs = TENANT_REPORT_TABS;
  activeTab: TenantReportKind = 'employees';
  rangeMode: 'month' | 'custom' = 'month';
  monthValue = new Date().toISOString().slice(0, 7); // yyyy-MM
  customFrom = '';
  customTo = '';
  tenantReportRows: Record<string, unknown>[] = [];
  loadingTenantReport = false;
  exportingTenantReport = false;

  cards = [
    { label: 'Employees', value: 0 },
    { label: 'Leaves', value: 0 },
    { label: 'Payroll Runs', value: 0 },
  ];

  // Superadmin: platform report.
  tenantRows: PlatformTenantReportRow[] = [];
  loadingTenants = false;
  errorMessage = '';
  selectedTenantIds = new Set<number>();
  detailTenant: PlatformTenantReportRow | null = null;
  exportingPlatformReport = false;

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

    this.loadTenantReport();
  }

  // ---------------------------------------------------------------------
  // Platform report (SUPER_ADMIN)
  // ---------------------------------------------------------------------

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

  viewTenantDetail(row: PlatformTenantReportRow): void {
    this.detailTenant = row;
  }

  closeTenantDetail(): void {
    this.detailTenant = null;
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

  /** Exports the selected tenants, or all tenants if none are selected. */
  exportPlatformReport(): void {
    const tenantIds = this.selectedTenantIds.size > 0 ? Array.from(this.selectedTenantIds) : undefined;
    this.downloadPlatformExcel(tenantIds, 'tenant-report.xlsx');
  }

  /** Exports just the tenant currently shown in the detail popup. */
  exportDetailTenant(): void {
    if (!this.detailTenant) {
      return;
    }
    this.downloadPlatformExcel([this.detailTenant.id], `${this.detailTenant.companyCode || 'tenant'}-report.xlsx`);
  }

  private downloadPlatformExcel(tenantIds: number[] | undefined, fileName: string): void {
    this.exportingPlatformReport = true;
    this.reportsService.exportPlatformTenantsExcel(tenantIds).subscribe({
      next: (blob) => {
        this.exportingPlatformReport = false;
        this.downloadBlob(blob, fileName);
      },
      error: (err) => {
        this.exportingPlatformReport = false;
        this.errorMessage = err?.error?.message || 'Failed to export report.';
      },
    });
  }

  printReport(): void {
    const originalTenantRows = this.tenantRows;

    if (this.selectedTenantIds.size > 0) {
      this.tenantRows = this.tenantRows.filter((row) => this.selectedTenantIds.has(row.id));
    }

    window.print();

    this.tenantRows = originalTenantRows;
  }

  // ---------------------------------------------------------------------
  // Tenant-scoped reports (COMPANY_ADMIN / HR_MANAGER)
  // ---------------------------------------------------------------------

  get activeTabDefinition() {
    return this.tabs.find((tab) => tab.kind === this.activeTab)!;
  }

  selectTab(kind: TenantReportKind): void {
    this.activeTab = kind;
    this.loadTenantReport();
  }

  setRangeMode(mode: 'month' | 'custom'): void {
    this.rangeMode = mode;
    this.loadTenantReport();
  }

  private resolveRange(): { from?: string; to?: string } {
    if (this.rangeMode === 'custom') {
      return { from: this.customFrom || undefined, to: this.customTo || undefined };
    }

    if (!this.monthValue) {
      return {};
    }

    const [year, month] = this.monthValue.split('-').map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return { from, to };
  }

  loadTenantReport(): void {
    this.loadingTenantReport = true;
    this.errorMessage = '';
    const range = this.resolveRange();

    this.reportsService.tenantReport(this.activeTab, range).subscribe({
      next: (rows) => {
        this.tenantReportRows = rows;
        this.loadingTenantReport = false;
      },
      error: (err) => {
        this.loadingTenantReport = false;
        this.errorMessage = err?.error?.message || 'Failed to load report.';
      },
    });
  }

  exportTenantReport(): void {
    this.exportingTenantReport = true;
    const range = this.resolveRange();

    this.reportsService.exportTenantReportExcel(this.activeTab, range).subscribe({
      next: (blob) => {
        this.exportingTenantReport = false;
        this.downloadBlob(blob, `${this.activeTab}-report.xlsx`);
      },
      error: (err) => {
        this.exportingTenantReport = false;
        this.errorMessage = err?.error?.message || 'Failed to export report.';
      },
    });
  }

  cellValue(row: Record<string, unknown>, column: ReportColumn): string | number | Date | null {
    return (row[column.key] as string | number | Date | null) ?? null;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
