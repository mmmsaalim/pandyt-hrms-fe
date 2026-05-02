import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export type AppRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: AppRole[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'flowhr_token';
  readonly user = signal<AuthUser | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(email: string, password: string) {
    return this.http.post<{ accessToken: string; user: AuthUser }>(
      `${environment.apiUrl}/auth/login`,
      { email, password },
    );
  }

  setSession(token: string, user: AuthUser) {
    localStorage.setItem(this.tokenKey, token);
    this.user.set(user);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  hasAnyRole(roles: string[]) {
    const current = this.user();
    if (!current) return false;
    return current.roles.some((r) => roles.includes(r));
  }
}
