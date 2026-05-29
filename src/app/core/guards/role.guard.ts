import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = route.data?.['roles'] as string[] | undefined;
  const permissions = route.data?.['permissions'] as string[] | undefined;

  const roleAllowed = !roles || authService.hasAnyRole(roles);
  const permissionAllowed = !permissions || authService.hasAnyPermission(permissions);

  if (roleAllowed && permissionAllowed) {
    return true;
  }

  return router.parseUrl('/dashboard');
};
