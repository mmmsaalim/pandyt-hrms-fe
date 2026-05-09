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

  onboardCompany(dto: {
    companyName: string;
    adminName: string;
    adminEmail: string;
    subscriptionPlan: string;
    seats?: number;
  }) {
    return this.http.post(`${environment.apiUrl}/tenants/onboard`, dto);
  }
}
