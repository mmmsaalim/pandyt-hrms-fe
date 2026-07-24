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
  // NOTE: the JWT access token is intentionally NOT part of this object and is
  // never written to localStorage (BRD §19.4). Authentication is carried by the
  // HttpOnly `flowhr_access_token` cookie the backend sets on login. Only
  // non-credential profile data lives here, for menu/role rendering.
}

/**
 * Shape persisted to localStorage. Holds only non-credential profile data plus a
 * plain session-expiry timestamp (derived once from the JWT `exp` claim at login).
 * The JWT itself is never stored.
 */
interface PersistedSession {
  user: AuthUser;
  expiresAt: number; // epoch ms
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionKey = 'flowhr_session';
  private readonly legacyUserKey = 'flowhr_user';
  readonly user = signal<AuthUser | null>(null);
  private sessionExpiresAt: number | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.restoreSession();
  }

  private restoreSession(): void {
    // Remove any legacy session that may still contain a stored JWT.
    localStorage.removeItem(this.legacyUserKey);

    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedSession;
      if (!parsed?.user || typeof parsed.expiresAt !== 'number') {
        localStorage.removeItem(this.sessionKey);
        return;
      }

      this.user.set(parsed.user);
      this.sessionExpiresAt = parsed.expiresAt;
    } catch {
      localStorage.removeItem(this.sessionKey);
    }
  }

  private persistSession(user: AuthUser): void {
    const session: PersistedSession = {
      user,
      expiresAt: this.sessionExpiresAt ?? Date.now() + 8 * 60 * 60 * 1000,
    };
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /** Extracts the non-sensitive `exp` claim (ms) from the JWT, then discards the token. */
  private expiryFromToken(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      if (typeof payload.exp === 'number') {
        return payload.exp * 1000;
      }
    } catch {
      // fall through to default
    }
    return Date.now() + 8 * 60 * 60 * 1000;
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
    requestedPlan?: string;
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

  /**
   * Records the session after login. The `token` is used only to derive the
   * client-side expiry timestamp and is then discarded — it is never persisted.
   * Real request authentication rides on the HttpOnly cookie set by the backend.
   */
  setSession(token: string, user: AuthUser) {
    this.sessionExpiresAt = this.expiryFromToken(token);
    this.user.set(user);
    this.persistSession(user);
  }

  /** Clears local session state without a network call (used on 401 or logout). */
  clearSession() {
    this.sessionExpiresAt = null;
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.legacyUserKey);
    this.user.set(null);
  }

  logout() {
    this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({ next: () => undefined, error: () => undefined });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** True when a session exists and its client-side expiry has not passed. */
  isAuthenticated(): boolean {
    if (!this.user() || this.sessionExpiresAt === null) {
      return false;
    }
    return this.sessionExpiresAt > Date.now();
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

  /** True when the user was assigned a tenant module role (e.g. ATTENDANCE for attendance). */
  hasAssignedModuleRole(moduleKey: string): boolean {
    const roleName = moduleKey.trim().toUpperCase();
    return (this.user()?.roles ?? []).includes(roleName);
  }

  /** Module is reachable when tenant module is on and user has read permission or the module role. */
  canAccessModule(moduleKey: string, readPermissions: string[] = [`${moduleKey}.read`]): boolean {
    if (!this.hasModule(moduleKey)) {
      return false;
    }
    if (this.hasAnyPermission(readPermissions)) {
      return true;
    }
    return this.hasAssignedModuleRole(moduleKey);
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
        roles?: string[];
      }
    >(`${environment.apiUrl}/auth/tenant-config`);
  }

  applyTenantConfig(
    config: TenantRuntimeConfig & {
      enabledModules?: string[];
      permissions?: string[];
      effectivePermissions?: string[];
      roles?: string[];
    },
  ) {
    const current = this.user();
    if (!current) {
      return;
    }

    const nextUser: AuthUser = {
      ...current,
      roles: config.roles ?? current.roles,
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
    this.persistSession(nextUser);
  }
}
