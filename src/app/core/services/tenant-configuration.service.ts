import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TenantFieldConfigInput {
  enabled?: boolean;
  required?: boolean;
  sortOrder?: number;
}

export interface TenantConfigurationModuleField {
  fieldKey: string;
  label: string;
  fieldType: string;
  options?: unknown;
  isSystem: boolean;
  enabled: boolean;
  required: boolean;
  sortOrder: number;
}

export interface TenantConfigurationModule {
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  fields: TenantConfigurationModuleField[];
}

export interface TenantConfigurationResponse {
  tenantId: number;
  plan: string;
  seats?: number;
  planSeatLimit?: number;
  planDefaultModules: string[];
  config: Record<string, unknown>;
  modules: TenantConfigurationModule[];
}

export interface PlatformPlanDefinition {
  key: string;
  label: string;
  seats: number | null;
  priceLkr: number | null;
  description: string;
  defaultModules: string[];
}

export interface PlatformBillingPlanConfig {
  monthlyPriceLkr: number | null;
  seats: number | null;
}

export interface PlatformBillingConfig {
  taxRate: number;
  overageSeatPriceLkr: number;
  plans: Record<string, PlatformBillingPlanConfig>;
}

export interface PlatformModuleDefinition {
  id: number;
  key: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  fields?: Array<{
    id: number;
    fieldKey: string;
    label: string;
    fieldType: string;
    options?: unknown;
    isSystem: boolean;
    isActive: boolean;
  }>;
}

@Injectable({ providedIn: 'root' })
export class TenantConfigurationService {
  constructor(private readonly http: HttpClient) {}

  listPlatformModules() {
    return this.http.get<PlatformModuleDefinition[]>(`${environment.apiUrl}/platform/modules`);
  }

  getPlatformModuleFields(moduleKey: string) {
    return this.http.get(`${environment.apiUrl}/platform/modules/${moduleKey}/fields`);
  }

  listPlatformPlans() {
    return this.http.get<PlatformPlanDefinition[]>(`${environment.apiUrl}/platform/plans`);
  }

  getPlatformBilling() {
    return this.http.get<PlatformBillingConfig>(`${environment.apiUrl}/platform/billing`);
  }

  savePlatformBilling(dto: PlatformBillingConfig) {
    return this.http.put(`${environment.apiUrl}/platform/billing`, dto);
  }

  createPlatformModule(dto: { key: string; label: string; description?: string; sortOrder?: number }) {
    return this.http.post(`${environment.apiUrl}/platform/modules`, dto);
  }

  createPlatformField(
    moduleKey: string,
    dto: { fieldKey: string; label: string; fieldType: string; options?: Record<string, unknown> },
  ) {
    return this.http.post(`${environment.apiUrl}/platform/modules/${moduleKey}/fields`, dto);
  }

  getTenantConfiguration(tenantId: number) {
    return this.http.get<TenantConfigurationResponse>(`${environment.apiUrl}/tenants/${tenantId}/configuration`);
  }

  saveTenantConfiguration(
    tenantId: number,
    dto: {
      plan?: string;
      enabledModules?: string[];
      moduleFeatures?: Record<string, Record<string, TenantFieldConfigInput>>;
      config?: { locale?: string; currency?: string; fiscalYearStartMonth?: number };
    },
  ) {
    return this.http.put(`${environment.apiUrl}/tenants/${tenantId}/configuration`, dto);
  }
}
