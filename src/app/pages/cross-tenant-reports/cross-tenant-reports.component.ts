import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrossTenantReportsService } from '../../core/services/cross-tenant-reports.service';
import { TenantsService } from '../../core/services/tenants.service';

@Component({
  selector: 'app-cross-tenant-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cross-tenant-reports.component.html'
})
export class CrossTenantReportsComponent implements OnInit {
  availableTenants: any[] = [];
  selectedTenantIds: number[] = [];
  reportType: 'leave' | 'attendance' | 'payroll' = 'leave';
  reportData: any[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private crossTenantReportsService: CrossTenantReportsService,
    private tenantsService: TenantsService
  ) {}

  ngOnInit(): void {
    this.tenantsService.list().subscribe({
      next: (data: any) => {
        this.availableTenants = data;
        // Pre-select all by default if needed, or leave empty
      },
      error: () => this.error = 'Failed to load tenants.'
    });
  }

  toggleTenantSelection(id: number): void {
    const index = this.selectedTenantIds.indexOf(id);
    if (index > -1) {
      this.selectedTenantIds.splice(index, 1);
    } else {
      this.selectedTenantIds.push(id);
    }
  }

  onTenantSelectionChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedTenantIds = Array.from(selectElement.options)
      .filter(o => o.selected)
      .map(o => Number(o.value));
  }

  generateReport(): void {
    this.loading = true;
    this.error = null;
    
    let obs;
    if (this.reportType === 'leave') obs = this.crossTenantReportsService.getLeaveSummary(this.selectedTenantIds);
    else if (this.reportType === 'attendance') obs = this.crossTenantReportsService.getAttendanceSummary(this.selectedTenantIds);
    else obs = this.crossTenantReportsService.getPayrollSummary(this.selectedTenantIds);

    obs.subscribe({
      next: (data) => { this.reportData = data; this.loading = false; },
      error: () => { this.error = 'Failed to generate report.'; this.loading = false; }
    });
  }

  exportToExcel(): void {
    let exportObs;
    const fileName = `${this.reportType}_report_${new Date().getTime()}.xlsx`;

    if (this.reportType === 'leave') {
      exportObs = this.crossTenantReportsService.exportLeaveSummaryExcel(this.selectedTenantIds);
    } else if (this.reportType === 'attendance') {
      exportObs = this.crossTenantReportsService.exportAttendanceSummaryExcel(this.selectedTenantIds);
    } else {
      exportObs = this.crossTenantReportsService.exportPayrollSummaryExcel(this.selectedTenantIds);
    }

    exportObs.subscribe({
      next: (data: Blob) => {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.error = 'Excel export failed.'
    });
  }
}