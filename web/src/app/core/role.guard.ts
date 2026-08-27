import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasAnyRole, type AppRole } from './app-role';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = (route.data['roles'] as AppRole[] | undefined) ?? [];
  if (!allowed.length || hasAnyRole(auth.role(), allowed)) return true;
  return router.createUrlTree(['/forbidden']);
};
