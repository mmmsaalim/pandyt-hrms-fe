import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  superAdmin() {
    return this.http.get(`${environment.apiUrl}/dashboard/super-admin`);
  }

  companyAdmin(tenantId?: string) {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return this.http.get(`${environment.apiUrl}/dashboard/company-admin${query}`);
  }

  employeeMe() {
    return this.http.get(`${environment.apiUrl}/dashboard/employee/me`);
  }
}
