import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../shared/models/interfaces';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    LucideAngularModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnDestroy {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  isSubmitting = false;
  isPasswordVisible = false;
  errorMessage = '';

  // OTP state
  otpSent = false;
  otpDigits = ['', '', '', '', '', ''];
  otpError = '';
  otpLoading = false;
  countdown = 0;
  resendCooldown = 0;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  get fullOtp(): string {
    return this.otpDigits.join('');
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (!this.otpSent) {
      this.otpError = 'Vui lòng gửi và nhập mã OTP trước';
      return;
    }

    if (this.fullOtp.length !== 6) {
      this.otpError = 'Vui lòng nhập đủ 6 số OTP';
      return;
    }

    const formValue = this.loginForm.getRawValue();
    this.otpError = '';
    this.isSubmitting = true;

    this.authService
      .verifyOtp(formValue.email, this.fullOtp, formValue.rememberMe)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          if (this.countdownTimer) clearInterval(this.countdownTimer);
          const role = (response as any).user?.role ?? response?.data?.user?.role;
          if (role === 'admin' || role === 'teacher' || role === 'advisor') {
            void this.router.navigate(['/dashboard']);
          } else {
            this.otpError = 'Không xác định được quyền truy cập của tài khoản.';
          }
        },
        error: (err: unknown) => {
          this.otpError =
            err instanceof HttpErrorResponse
              ? (err.error?.message ?? 'OTP không chính xác')
              : 'OTP không chính xác';
          this.otpDigits = ['', '', '', '', '', ''];
          setTimeout(() => document.getElementById('otp-0')?.focus(), 50);
        },
      });
  }

  onSendOtp(): void {
    if (this.otpLoading) return;
    const emailCtrl = this.loginForm.get('email');
    if (!emailCtrl?.valid) return;

    this.otpLoading = true;
    this.otpError = '';

    this.authService.sendOtp(emailCtrl.value).subscribe({
      next: () => {
        this.otpSent = true;
        this.otpLoading = false;
        this.startCountdown(300);
        this.startResendCooldown(60);
        setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
      },
      error: (err: unknown) => {
        this.otpError =
          err instanceof HttpErrorResponse
            ? (err.error?.message ?? 'Không thể gửi OTP, thử lại sau')
            : 'Không thể gửi OTP, thử lại sau';
        this.otpLoading = false;
      },
    });
  }

  onOtpInput(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    this.otpDigits[index] = val.slice(-1);
    this.otpError = '';
    if (val && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    if (this.fullOtp.length === 6) {
      this.onSubmit();
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (text.length === 6) {
      this.otpDigits = text.split('');
      document.getElementById('otp-5')?.focus();
      if (this.fullOtp.length === 6) {
        setTimeout(() => this.onSubmit(), 100);
      }
    }
  }

  onResendOtp(): void {
    if (this.resendCooldown > 0) return;
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';
    this.otpSent = false;
    this.onSendOtp();
  }

  startCountdown(seconds: number): void {
    this.countdown = seconds;
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer!);
        this.otpSent = false;
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpError = 'Mã OTP đã hết hạn, vui lòng gửi lại';
      }
    }, 1000);
  }

  startResendCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.resendTimer!);
    }, 1000);
  }

  formatCountdown(s: number): string {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  hasControlError(controlName: 'email' | 'password', errorKey: string): boolean {
    const control = this.loginForm.controls[controlName];
    return control.touched && control.hasError(errorKey);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const serverMessage = this.extractServerMessage(error.error);
      if (serverMessage) {
        return serverMessage;
      }

      if (error.status === 401) {
        return 'Email hoặc mật khẩu không đúng.';
      }
    }

    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }

  private extractServerMessage(errorBody: unknown): string | null {
    if (typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody) {
      const message = (errorBody as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return null;
  }
}
