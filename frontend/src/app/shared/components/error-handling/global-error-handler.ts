import { ErrorHandler, Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly snackBar = inject(MatSnackBar);
  private isShowingError = false;

  handleError(error: unknown): void {
    // Always log every error — do not suppress from console.
    // eslint-disable-next-line no-console
    console.error('[GlobalErrorHandler]', error);

    // Deduplicate snackbars: show at most one error notification at a time.
    // This prevents a snackbar → CD → error → snackbar feedback loop.
    if (this.isShowingError) return;
    this.isShowingError = true;

    const ref = this.snackBar.open('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.', 'Đóng', {
      duration: 4000,
    });
    ref.afterDismissed().subscribe(() => {
      this.isShowingError = false;
    });
  }
}
