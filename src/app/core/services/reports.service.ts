import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface PlatformTenantUserRow {
  id: number;
  name: string;
  email: string;
  status: string;
  roles: string[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly http: HttpClient) {}

  summary() {
    return this.http.get(`${environment.apiUrl}/reports/summary`);
  }

  platformTenants() {
    return this.http.get<PlatformTenantReportRow[]>(`${environment.apiUrl}/reports/platform/tenants`);
  }

  platformTenantUsers(tenantId: number) {
    return this.http.get<{ tenant: PlatformTenantReportRow; users: PlatformTenantUserRow[] }>(
      `${environment.apiUrl}/reports/platform/tenants/${tenantId}/users`,
    );
  }
}
