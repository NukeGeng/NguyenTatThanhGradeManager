import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Neu chua dang nhap thi dieu huong ve /login va luu returnUrl.
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
