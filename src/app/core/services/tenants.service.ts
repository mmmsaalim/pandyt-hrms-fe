import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, PaginationRequest } from '../models/pagination.model';

type TenantListGroup = 'active' | 'archived';
type TenantLeadStatus = 'PENDING' | 'CONVERTED' | 'DELETED';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  constructor(private readonly http: HttpClient) {}

  private paginationParams(params?: PaginationRequest & { group?: TenantListGroup; status?: TenantLeadStatus }) {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params?.group) {
      httpParams = httpParams.set('group', params.group);
    }

    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return httpParams;
  }

  list(params?: PaginationRequest & { group?: TenantListGroup }) {
    return this.http.get<PaginatedResponse<any>>(`${environment.apiUrl}/tenants`, {
      params: this.paginationParams(params),
    });
  }

  billingOverview(params?: PaginationRequest) {
    return this.http.get<PaginatedResponse<any>>(`${environment.apiUrl}/tenants/payments/overview`, {
      params: this.paginationParams(params),
    });
  }

  sendOverdueReminder(tenantId: number) {
    return this.http.post(`${environment.apiUrl}/tenants/payments/${tenantId}/reminder`, {});
  }

  sendAllOverdueReminders() {
    return this.http.post(`${environment.apiUrl}/tenants/payments/reminders/overdue`, {});
  }

  runDailyBillingReminderSchedule() {
    return this.http.post(`${environment.apiUrl}/tenants/payments/reminders/daily-run`, {});
  }

  getBillingSettings(tenantId: number) {
    return this.http.get(`${environment.apiUrl}/tenants/payments/${tenantId}/settings`);
  }

  updateBillingSettings(
    tenantId: number,
    dto: {
      enabled?: boolean;
      reminderDays?: number[];
      recipientEmails?: string[];
      subjectTemplate?: string;
      bodyTemplate?: string;
    },
  ) {
    return this.http.patch(`${environment.apiUrl}/tenants/payments/${tenantId}/settings`, dto);
  }

  leads(params?: PaginationRequest & { group?: TenantListGroup; status?: TenantLeadStatus }) {
    return this.http.get<PaginatedResponse<any>>(`${environment.apiUrl}/tenants/leads`, {
      params: this.paginationParams(params),
    });
  }

  onboardCompany(dto: {
    companyName: string;
    companyCode?: string;
    adminName: string;
    adminEmail: string;
    subscriptionPlan: string;
    seats?: number;
    enabledModules?: string[];
    moduleFeatures?: Record<string, Record<string, { enabled?: boolean; required?: boolean }>>;
    config?: { locale?: string; currency?: string; fiscalYearStartMonth?: number };
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

  getTenantConfiguration(tenantId: number) {
    return this.http.get(`${environment.apiUrl}/tenants/${tenantId}/configuration`);
  }

  saveTenantConfiguration(
    tenantId: number,
    dto: {
      plan?: string;
      enabledModules?: string[];
      moduleFeatures?: Record<string, Record<string, { enabled?: boolean; required?: boolean; sortOrder?: number }>>;
      config?: { locale?: string; currency?: string; fiscalYearStartMonth?: number };
    },
  ) {
    return this.http.put(`${environment.apiUrl}/tenants/${tenantId}/configuration`, dto);
  }

  approveTenant(id: number) {
    return this.http.patch(`${environment.apiUrl}/tenants/${id}/approve`, {});
  }

  deleteTenant(id: number) {
    return this.http.delete(`${environment.apiUrl}/tenants/${id}`);
  }

  deactivateTenantForPayment(id: number) {
    return this.http.patch(`${environment.apiUrl}/tenants/${id}/deactivate-payment`, {});
  }

  reactivateTenant(id: number) {
    return this.http.patch(`${environment.apiUrl}/tenants/${id}/reactivate`, {});
  }
}
