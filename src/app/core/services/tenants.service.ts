import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiUrl}/tenants`);
  }

  billingOverview() {
    return this.http.get(`${environment.apiUrl}/tenants/payments/overview`);
  }

  leads(status?: 'PENDING' | 'CONVERTED' | 'DELETED') {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<any[]>(`${environment.apiUrl}/tenants/leads${query}`);
  }

  onboardCompany(dto: {
    companyName: string;
    companyCode?: string;
    adminName: string;
    adminEmail: string;
    subscriptionPlan: string;
    seats?: number;
  }) {
    return this.http.post(`${environment.apiUrl}/tenants/onboard`, dto);
  }

  updateTenant(
    id: number,
    dto: {
      name?: string;
      companyCode?: string;
      plan?: string;
      seats?: number;
      status?: 'ACTIVE' | 'SUSPENDED';
      leadStatus?: 'PENDING' | 'CONVERTED' | 'DELETED';
    },
  ) {
    return this.http.patch(`${environment.apiUrl}/tenants/${id}`, dto);
  }

  approveTenant(id: number) {
    return this.http.patch(`${environment.apiUrl}/tenants/${id}/approve`, {});
  }

  deleteTenant(id: number) {
    return this.http.delete(`${environment.apiUrl}/tenants/${id}`);
  }
}
