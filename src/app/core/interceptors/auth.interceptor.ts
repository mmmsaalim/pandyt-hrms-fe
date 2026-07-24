import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const headers: Record<string, string> = {};
  const user = authService.user();
  if (user?.tenantId) {
    headers['X-Tenant-ID'] = String(user.tenantId);
  }

  const authReq = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      // A 401 means the server rejected the auth cookie (expired/invalid). For a
      // logged-in session, clear local state and send the user back to login.
      // Auth endpoints (login/signup/password) are excluded so a failed login
      // does not trigger a redirect loop. 403 (valid session, no permission) is
      // left untouched.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authService.user() &&
        !req.url.includes('/auth/')
      ) {
        authService.clearSession();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
