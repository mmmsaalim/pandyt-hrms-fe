import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export type AppRole = string;

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
    );
  }

  setSession(_token: string, user: AuthUser) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.user.set(user);
  }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe();
    localStorage.removeItem(this.userKey);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated() {
    return !!this.user();
  }

  hasAnyRole(roles: string[]) {
    const current = this.user();
    if (!current) return false;
    return current.roles.some((r) => roles.includes(r));
  }

  hasAnyPermission(permissions: string[]) {
    const current = this.user();
    if (current?.roles?.includes('SUPER_ADMIN')) return true;
    if (!current || !current.permissions?.length) return false;
    return current.permissions.some((permission) => permissions.includes(permission));
  }
}
