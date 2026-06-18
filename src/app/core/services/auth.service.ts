import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

export type AppRole = string;

export interface TenantFieldRuntimeConfig {
  fieldKey: string;
  label: string;
  fieldType: string;
  options?: unknown;
  enabled: boolean;
  required: boolean;
  sortOrder: number;
  isSystem?: boolean;
}

export interface TenantRuntimeConfig {
  plan?: string;
  seats?: number | null;
  locale?: string;
  currency?: string;
  fiscalYearStartMonth?: number;
  fields?: Record<string, TenantFieldRuntimeConfig[]>;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  tenantId?: number | null;
  tenantName?: string | null;
  tenantCode?: string | null;
  roles: AppRole[];
  permissions?: string[];
  effectivePermissions?: string[];
  enabledModules?: string[];
  tenantConfig?: TenantRuntimeConfig | null;
  accessToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userKey = 'flowhr_user';
  readonly user = signal<AuthUser | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    const rawUser = localStorage.getItem(this.userKey);
    if (!rawUser) {
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as AuthUser;
      this.user.set(parsed);
    } catch {
      localStorage.removeItem(this.userKey);
    }
  }

  login(email: string, password: string, companyCode?: string) {
    return this.http.post<{ accessToken: string; user: AuthUser }>(
      `${environment.apiUrl}/auth/login`,
      { email, password, companyCode },
      { withCredentials: true },
    ).pipe(
      tap(response => this.setSession(response.accessToken, response.user))
    );
  }

  signup(dto: {
    companyName: string;
    companyCode?: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
    employeeCount?: number;
    address?: string;
    source?: string;
    notes?: string;
  }) {
    return this.http.post<{ message: string; companyCode: string; requiresApproval: boolean }>(
      `${environment.apiUrl}/auth/signup`,
      dto,
    );
  }

  requestPasswordReset(email: string) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/reset/request`, {
      email,
    });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password/reset/confirm`, {
      token,
      password,
    });
  }

  setSession(token: string, user: AuthUser) {
    const userWithToken = { ...user, accessToken: token };
    localStorage.setItem(this.userKey, JSON.stringify(userWithToken));
    this.user.set(userWithToken);
  }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe();
    localStorage.removeItem(this.userKey);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (decoded.exp === undefined) {
        return false;
      }
      const date = new Date(0);
      date.setUTCSeconds(decoded.exp);
      return !(date.valueOf() > new Date().valueOf());
    } catch (e) {
      return true;
    }
  }

  isAuthenticated(): boolean {
    const user = this.user();
    if (!user || !user.accessToken) {
      return false;
    }
    return !this.isTokenExpired(user.accessToken);
  }

  hasAnyRole(roles: string[]) {
    const current = this.user();
    if (!current) return false;
    return current.roles.some((r) => roles.includes(r));
  }

  hasAnyPermission(permissions: string[]) {
    const current = this.user();
    if (current?.roles?.includes('SUPER_ADMIN')) return true;

    const rawPermissions = current?.permissions ?? [];
    const activePermissions = current?.effectivePermissions?.length
      ? current.effectivePermissions
      : rawPermissions;

    if (!current || (!activePermissions.length && !rawPermissions.length)) return false;

    return permissions.some((permission) => {
      if (activePermissions.includes(permission)) {
        return true;
      }
      // Company Admin RBAC must stay reachable even before session refresh.
      if (
        permission === 'configuration.manage' &&
        current.roles.includes('COMPANY_ADMIN') &&
        rawPermissions.includes('configuration.manage')
      ) {
        return true;
      }
      return false;
    });
  }

  getEnabledModules(): string[] {
    return this.user()?.enabledModules ?? [];
  }

  hasModule(moduleKey: string): boolean {
    const current = this.user();
    if (current?.roles?.includes('SUPER_ADMIN')) return true;
    return (current?.enabledModules ?? []).includes(moduleKey);
  }

  getModuleFields(moduleKey: string): TenantFieldRuntimeConfig[] {
    return this.user()?.tenantConfig?.fields?.[moduleKey] ?? [];
  }

  refreshTenantConfig() {
    return this.http.get<
      TenantRuntimeConfig & {
        enabledModules?: string[];
        permissions?: string[];
        effectivePermissions?: string[];
      }
    >(`${environment.apiUrl}/auth/tenant-config`);
  }

  applyTenantConfig(
    config: TenantRuntimeConfig & {
      enabledModules?: string[];
      permissions?: string[];
      effectivePermissions?: string[];
    },
  ) {
    const current = this.user();
    if (!current) {
      return;
    }

    const nextUser: AuthUser = {
      ...current,
      enabledModules: config.enabledModules ?? current.enabledModules,
      permissions: config.permissions ?? current.permissions,
      effectivePermissions: config.effectivePermissions ?? current.effectivePermissions,
      tenantConfig: {
        ...current.tenantConfig,
        plan: config.plan,
        seats: config.seats,
        locale: config.locale,
        currency: config.currency,
        fiscalYearStartMonth: config.fiscalYearStartMonth,
        fields: config.fields,
      },
    };
    this.user.set(nextUser);
    localStorage.setItem(this.userKey, JSON.stringify(nextUser));
  }
}
