import { ErrorHandler, Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly snackBar = inject(MatSnackBar);

  handleError(error: unknown): void {
    // Log chi tiet de debug, UI chi hien thong bao gon de tranh lo thong tin nhay cam.
    // eslint-disable-next-line no-console
    console.error('[GlobalErrorHandler]', error);

    this.snackBar.open('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.', 'Đóng', {
      duration: 4000,
    });
  }
}
