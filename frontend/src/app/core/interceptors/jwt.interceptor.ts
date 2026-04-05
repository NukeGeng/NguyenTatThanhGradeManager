import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const token = authService.getToken();

  const request = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 0) {
        snackBar.open('Mất kết nối. Vui lòng kiểm tra mạng hoặc backend.', 'Đóng', {
          duration: 3500,
        });
        return throwError(() => error);
      }

      // Khong can redirect 401 o route login de tranh vong lap UX.
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
        router.navigate(['/login']);
        snackBar.open('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'Đóng', {
          duration: 3500,
        });
        return throwError(() => error);
      }

      if (error.status >= 500) {
        snackBar.open('Lỗi server, thử lại sau.', 'Đóng', { duration: 3500 });
      }

      return throwError(() => error);
    }),
  );
};
