import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map, of } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class, Student } from '../../shared/models/interfaces';

interface StudentUpsertPayload {
  fullName: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | null;
  classId: string;
  parentPhone: string;
  parentName: string;
  parentEmail: string;
  status: 'active' | 'inactive' | 'transferred';
  address: string;
  notes: string;
}

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Học sinh</span>
        <span class="breadcrumb-sep">/</span>
        <span>{{ isEditMode ? 'Cập nhật' : 'Thêm mới' }}</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý học sinh</p>
          <h1 class="page-title">{{ isEditMode ? 'Cập nhật học sinh' : 'Thêm học sinh mới' }}</h1>
          <p class="subtitle">
            {{
              isEditMode
                ? 'Chỉnh sửa thông tin học sinh hiện có.'
                : 'Mã học sinh sẽ được tự động sinh khi lưu.'
            }}
          </p>
        </div>

        <button mat-stroked-button type="button" (click)="goBack()">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lại danh sách học sinh
        </button>
      </header>

      <mat-card class="content-card">
        @if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>Đang tải dữ liệu biểu mẫu...</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Mã HS</mat-label>
                <input matInput [value]="studentCodeHint" readonly />
                <mat-hint>Tự sinh theo định dạng HS0001</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Họ tên</mat-label>
                <input matInput formControlName="fullName" />
                <mat-error *ngIf="form.controls.fullName.hasError('required')"
                  >Họ tên là bắt buộc</mat-error
                >
              </mat-form-field>
            </div>

            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Ngày sinh</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="dateOfBirth" />
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Giới tính</mat-label>
                <mat-select formControlName="gender">
                  <mat-option value="">Chưa chọn</mat-option>
                  <mat-option value="male">Nam</mat-option>
                  <mat-option value="female">Nữ</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Lớp</mat-label>
                <mat-select formControlName="classId">
                  @for (classItem of classes; track classItem._id) {
                    <mat-option [value]="classItem._id">{{
                      classItem.name || classItem.code
                    }}</mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="form.controls.classId.hasError('required')"
                  >Vui lòng chọn lớp</mat-error
                >
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Trạng thái</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="active">Đang học</mat-option>
                  <mat-option value="inactive">Tạm dừng</mat-option>
                  <mat-option value="transferred">Chuyển lớp</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>SĐT phụ huynh</mat-label>
                <input matInput formControlName="parentPhone" />
                <mat-error *ngIf="form.controls.parentPhone.hasError('pattern')">
                  Số điện thoại không đúng định dạng.
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email phụ huynh</mat-label>
                <input matInput formControlName="parentEmail" />
                <mat-error *ngIf="form.controls.parentEmail.hasError('email')"
                  >Email không hợp lệ.</mat-error
                >
              </mat-form-field>
            </div>

            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Tên phụ huynh</mat-label>
                <input matInput formControlName="parentName" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Địa chỉ</mat-label>
                <input matInput formControlName="address" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Ghi chú</mat-label>
              <textarea matInput rows="3" formControlName="notes"></textarea>
            </mat-form-field>

            @if (errorMessage) {
              <p class="error-message">{{ errorMessage }}</p>
            }

            <div class="actions">
              <button mat-stroked-button type="button" (click)="goBack()">Hủy</button>
              <button mat-flat-button type="submit" class="btn-primary" [disabled]="isSubmitting">
                @if (isSubmitting) {
                  <mat-spinner [diameter]="18"></mat-spinner>
                }
                <span>{{ isEditMode ? 'Lưu thay đổi' : 'Tạo học sinh' }}</span>
              </button>
            </div>
          </form>
        }
      </mat-card>
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
      }

      .content-card {
        padding: 1rem 1.1rem 1.1rem;
      }

      .card-header {
        margin-bottom: 1rem;
      }

      .eyebrow {
        margin: 0;
        color: var(--blue);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 0.8rem;
        font-weight: 700;
      }

      h1 {
        margin: 0.25rem 0;
        color: var(--navy);
      }

      .card-header p {
        margin: 0;
        color: var(--text-sub);
      }

      .form-grid {
        display: grid;
        gap: 0.75rem;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        align-items: center;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .error-message {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
      }

      .state-block {
        min-height: 240px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
      }

      @media (max-width: 768px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StudentFormComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  classes: Class[] = [];

  isEditMode = false;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';

  studentId = '';
  studentCodeHint = 'HSxxxx';

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    dateOfBirth: [null as Date | null],
    gender: [''],
    classId: ['', [Validators.required]],
    parentPhone: ['', [Validators.pattern(/^$|^(0|\+84)\d{9,10}$/)]],
    parentName: [''],
    parentEmail: ['', [Validators.email]],
    status: ['active' as 'active' | 'inactive' | 'transferred', [Validators.required]],
    address: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditMode = Boolean(this.studentId);

    const classIdFromQuery = this.route.snapshot.queryParamMap.get('classId') ?? '';

    const classesRequest = this.apiService
      .get<ApiResponse<Class[]>>('/classes')
      .pipe(map((response) => response.data ?? []));

    const studentRequest = this.isEditMode
      ? this.apiService
          .get<ApiResponse<Student>>(`/students/${this.studentId}`)
          .pipe(map((response) => response.data))
      : of(null);

    forkJoin({
      classes: classesRequest,
      student: studentRequest,
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ classes, student }) => {
          this.classes = classes;

          if (student) {
            this.studentCodeHint = student.studentCode;
            this.form.patchValue({
              fullName: student.fullName,
              dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
              gender: student.gender ?? '',
              classId: this.resolveClassId(student.classId),
              parentPhone: student.parentPhone ?? '',
              parentName: student.parentName ?? '',
              parentEmail: student.parentEmail ?? '',
              status: student.status ?? 'active',
              address: student.address ?? '',
              notes: student.notes ?? '',
            });
          } else if (classIdFromQuery) {
            this.form.controls.classId.setValue(classIdFromQuery);
          }
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.getRawValue();

    const payload: StudentUpsertPayload = {
      fullName: raw.fullName.trim(),
      dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth).toISOString() : null,
      gender: raw.gender ? (raw.gender as 'male' | 'female') : null,
      classId: raw.classId,
      parentPhone: raw.parentPhone.trim(),
      parentName: raw.parentName.trim(),
      parentEmail: raw.parentEmail.trim(),
      status: raw.status,
      address: raw.address.trim(),
      notes: raw.notes.trim(),
    };

    const request$ = this.isEditMode
      ? this.apiService.put<ApiResponse<Student>, StudentUpsertPayload>(
          `/students/${this.studentId}`,
          payload,
        )
      : this.apiService.post<ApiResponse<Student>, StudentUpsertPayload>('/students', payload);

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.snackBar.open(
            this.isEditMode ? 'Đã cập nhật học sinh' : 'Đã tạo học sinh mới',
            'Đóng',
            { duration: 2200 },
          );
          this.router.navigate(['/students', response.data._id]);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/students']);
  }

  private resolveClassId(value: Student['classId']): string {
    return typeof value === 'string' ? value : value._id;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if (error.status === 0) {
        return 'Không thể kết nối tới backend.';
      }
    }

    return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
