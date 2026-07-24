import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PlatformTenantReportRow {
  id: number;
  name: string;
  companyCode: string;
  plan: string;
  status: string;
  seats: number;
  activeUsers: number;
  inactiveUsers: number;
  activeEmployees: number;
  createdAt: string;
}

export type TenantReportKind = 'employees' | 'leave' | 'attendance' | 'payroll';

export interface TenantReportDateRange {
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly http: HttpClient) {}

  summary() {
    return this.http.get(`${environment.apiUrl}/reports/summary`);
  }

  // ---------------------------------------------------------------------
  // Platform report (SUPER_ADMIN) — counts only, no per-tenant user detail.
  // ---------------------------------------------------------------------

  platformTenants() {
    return this.http.get<PlatformTenantReportRow[]>(`${environment.apiUrl}/reports/platform/tenants`);
  }

  exportPlatformTenantsExcel(tenantIds?: number[]) {
    let params = new HttpParams();
    if (tenantIds && tenantIds.length > 0) {
      params = params.set('tenantIds', tenantIds.join(','));
    }
    return this.http.get(`${environment.apiUrl}/reports/platform/tenants/export-excel`, {
      params,
      responseType: 'blob',
    });
  }

  // ---------------------------------------------------------------------
  // Tenant-scoped reports (COMPANY_ADMIN / HR_MANAGER).
  // ---------------------------------------------------------------------

  private rangeParams(range?: TenantReportDateRange): HttpParams {
    let params = new HttpParams();
    if (range?.from) {
      params = params.set('from', range.from);
    }
    if (range?.to) {
      params = params.set('to', range.to);
    }
    return params;
  }

  tenantReport(kind: TenantReportKind, range?: TenantReportDateRange) {
    return this.http.get<Record<string, unknown>[]>(`${environment.apiUrl}/reports/tenant/${kind}`, {
      params: this.rangeParams(range),
    });
  }

  exportTenantReportExcel(kind: TenantReportKind, range?: TenantReportDateRange) {
    return this.http.get(`${environment.apiUrl}/reports/tenant/${kind}/export-excel`, {
      params: this.rangeParams(range),
      responseType: 'blob',
    });
  }
}
