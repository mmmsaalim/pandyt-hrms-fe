import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FALLBACK_SUBSCRIPTION_PLANS, normalizePlanKey } from '../constants/subscription-plans';

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
  isCustom?: boolean;
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
  sortOrder?: number;
  isActive?: boolean;
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
  private cachedPlans: PlatformPlanDefinition[] = [];
  private plansLoaded = false;

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

  loadPlatformPlans(): Observable<PlatformPlanDefinition[]> {
    if (this.plansLoaded && this.cachedPlans.length) {
      return of(this.cachedPlans);
    }

    return this.listPlatformPlans().pipe(
      tap((rows) => {
        if (rows.length) {
          this.cachedPlans = rows;
          this.plansLoaded = true;
        }
      }),
    );
  }

  getPlatformPlans(): PlatformPlanDefinition[] {
    if (this.cachedPlans.length) {
      return this.cachedPlans;
    }

    return FALLBACK_SUBSCRIPTION_PLANS.map((plan) => ({
      key: plan.key,
      label: plan.label,
      seats: plan.seats,
      priceLkr: plan.priceLkr ?? null,
      description: plan.description,
      defaultModules: plan.defaultModules ?? [],
    }));
  }

  planLabel(plan: string): string {
    const normalized = normalizePlanKey(plan);
    const match = this.getPlatformPlans().find((entry) => entry.key === normalized);
    return match?.label ?? plan.trim();
  }

  modulesForPlan(plan: string): string[] {
    const normalized = normalizePlanKey(plan);
    const match = this.getPlatformPlans().find((entry) => entry.key === normalized);
    return match?.defaultModules?.length ? match.defaultModules : [];
  }

  seatsForPlan(plan: string): number {
    const normalized = normalizePlanKey(plan);
    const match = this.getPlatformPlans().find((entry) => entry.key === normalized);
    if (!match || match.seats === null) {
      return 999999;
    }
    return match.seats;
  }

  seatsDisplay(plan: string, seats?: number): string {
    const normalized = normalizePlanKey(plan);
    const definition = this.getPlatformPlans().find((entry) => entry.key === normalized);
    if (definition?.seats === null) {
      return 'Unlimited';
    }
    return String(seats ?? this.seatsForPlan(plan));
  }

  savePlatformPlans(plans: PlatformPlanDefinition[]) {
    return this.http.put<PlatformPlanDefinition[]>(`${environment.apiUrl}/platform/plans`, { plans }).pipe(
      tap(() => {
        this.invalidatePlanCache();
      }),
    );
  }

  getPlatformBilling() {
    return this.http.get<PlatformBillingConfig>(`${environment.apiUrl}/platform/billing`);
  }

  savePlatformBilling(dto: PlatformBillingConfig) {
    return this.http.put(`${environment.apiUrl}/platform/billing`, dto).pipe(
      tap(() => {
        this.invalidatePlanCache();
      }),
    );
  }

  /** Clears cached plan catalog so the next read reflects billing/catalog API changes. */
  invalidatePlanCache(): void {
    this.plansLoaded = false;
    this.cachedPlans = [];
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

  getOwnTenantConfiguration() {
    return this.http.get<TenantConfigurationResponse & { config: Record<string, unknown> }>(
      `${environment.apiUrl}/tenant/configuration`,
    );
  }

  saveOwnTenantConfiguration(dto: {
    moduleFeatures?: Record<string, Record<string, TenantFieldConfigInput>>;
    letterhead?: Record<string, string>;
    reportTemplates?: Array<{ id: string; name: string; type: string; content?: string }>;
    payslipTemplateKey?: string;
  }) {
    return this.http.put<TenantConfigurationResponse & { config: Record<string, unknown> }>(
      `${environment.apiUrl}/tenant/configuration`,
      dto,
    );
  }

  createTenantCustomField(
    moduleKey: string,
    dto: { fieldKey: string; label: string; fieldType: string; options?: Record<string, unknown> },
  ) {
    return this.http.post<TenantConfigurationResponse & { config: Record<string, unknown> }>(
      `${environment.apiUrl}/tenant/modules/${moduleKey}/fields`,
      dto,
    );
  }
}
