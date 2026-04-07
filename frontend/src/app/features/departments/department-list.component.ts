import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Department, User } from '../../shared/models/interfaces';

interface DepartmentStats {
  subjects: number;
  classes: number;
  teachers: number;
  students: number;
}

interface DepartmentRow extends Department {
  subjectCount: number;
  classCount: number;
  teacherCount: number;
}

interface DepartmentDialogData {
  mode: 'create' | 'edit';
  department: Department | null;
  teachers: User[];
}

interface DepartmentUpsertPayload {
  code?: string;
  name: string;
  description: string;
  headId: string | null;
}

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Khoa</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý hệ thống</p>
          <h1>Danh sách khoa</h1>
          <p class="subtitle">Theo dõi nhanh quy mô môn học, lớp học phần và đội ngũ giáo viên.</p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="plus" [size]="16"></lucide-icon>
          Thêm khoa
        </button>
      </header>

      <section class="stats-grid" *ngIf="!isLoading && !errorMessage">
        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="building-2" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ rows.length }}</p>
          <p class="stat-card__label">Tổng khoa</p>
        </article>

        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="book-open" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ totalSubjects }}</p>
          <p class="stat-card__label">Tổng môn học</p>
        </article>

        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="school" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ totalClasses }}</p>
          <p class="stat-card__label">Tổng lớp học phần</p>
        </article>

        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="users" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ totalTeachers }}</p>
          <p class="stat-card__label">Tổng giáo viên</p>
        </article>
      </section>

      <mat-card class="content-card">
        @if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>Đang tải dữ liệu khoa...</p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="20"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadDepartments()">Thử lại</button>
          </div>
        } @else if (rows.length === 0) {
          <div class="empty-state">
            <lucide-icon name="building-2" [size]="44"></lucide-icon>
            <h3>Chưa có khoa nào</h3>
            <p>Tạo khoa đầu tiên để bắt đầu cấu hình môn học và phân quyền giảng dạy.</p>
            <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
              <lucide-icon name="plus" [size]="16"></lucide-icon>
              Thêm khoa
            </button>
          </div>
        } @else {
          <div class="dept-grid">
            @for (row of rows; track row._id) {
              <article class="dept-card">
                <div class="dept-card__head">
                  <div>
                    <p class="dept-code">{{ row.code }}</p>
                    <h3>{{ row.name }}</h3>
                  </div>
                  <span
                    class="grade-badge"
                    [class.grade-badge--a]="row.isActive !== false"
                    [class.grade-badge--f]="row.isActive === false"
                  >
                    {{ row.isActive === false ? 'Đã tắt' : 'Đang bật' }}
                  </span>
                </div>

                <p class="dept-head">
                  <strong>Trưởng khoa:</strong>
                  {{ getHeadName(row.headId) }}
                </p>

                <div class="dept-metrics">
                  <div>
                    <strong>{{ row.subjectCount }}</strong>
                    <span>Môn học</span>
                  </div>
                  <div>
                    <strong>{{ row.classCount }}</strong>
                    <span>Lớp HP</span>
                  </div>
                  <div>
                    <strong>{{ row.teacherCount }}</strong>
                    <span>Giáo viên</span>
                  </div>
                </div>

                <div class="actions-cell">
                  <a
                    class="action-btn"
                    [routerLink]="['/departments', row._id]"
                    aria-label="Chi tiết khoa"
                  >
                    <lucide-icon name="eye" [size]="15"></lucide-icon>
                  </a>

                  <button
                    type="button"
                    class="action-btn"
                    aria-label="Sửa khoa"
                    (click)="openEditDialog(row)"
                  >
                    <lucide-icon name="pencil" [size]="15"></lucide-icon>
                  </button>

                  <button
                    type="button"
                    class="action-btn action-btn--danger"
                    aria-label="Xóa khoa"
                    (click)="deleteDepartment(row)"
                  >
                    <lucide-icon name="trash-2" [size]="15"></lucide-icon>
                  </button>
                </div>
              </article>
            }
          </div>
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
        padding: 0.95rem 1rem 1rem;
      }

      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--blue);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      h1 {
        margin: 0.25rem 0;
        color: var(--navy);
      }

      .subtitle {
        margin: 0;
        color: var(--text-sub);
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .stats-grid {
        margin-top: -0.1rem;
      }

      .dept-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .dept-card {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        padding: 1rem;
        display: grid;
        gap: 0.85rem;
      }

      .dept-card__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .dept-code {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--blue);
        letter-spacing: 0.03em;
      }

      h3 {
        margin: 0.2rem 0 0;
        font-size: 1rem;
        color: var(--navy);
      }

      .dept-head {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.84rem;
      }

      .dept-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.6rem;
      }

      .dept-metrics div {
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.55rem;
        text-align: center;
      }

      .dept-metrics strong {
        display: block;
        color: var(--navy);
        font-size: 1rem;
      }

      .dept-metrics span {
        color: var(--text-sub);
        font-size: 0.75rem;
      }

      .actions-cell {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }

      @media (max-width: 768px) {
        .dept-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .dept-grid {
          grid-template-columns: 1fr;
        }

        .dept-metrics {
          grid-template-columns: 1fr 1fr 1fr;
        }
      }
    `,
  ],
})
export class DepartmentListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  rows: DepartmentRow[] = [];
  teachers: User[] = [];

  isLoading = true;
  errorMessage = '';

  get totalSubjects(): number {
    return this.rows.reduce((sum, item) => sum + item.subjectCount, 0);
  }

  get totalClasses(): number {
    return this.rows.reduce((sum, item) => sum + item.classCount, 0);
  }

  get totalTeachers(): number {
    return this.rows.reduce((sum, item) => sum + item.teacherCount, 0);
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      departments: this.apiService
        .get<ApiResponse<Department[]>>('/departments')
        .pipe(map((response) => response.data ?? [])),
      teachers: this.apiService
        .get<ApiResponse<User[]>>('/users')
        .pipe(map((response) => (response.data ?? []).filter((item) => item.role === 'teacher'))),
    })
      .pipe(
        switchMap(({ departments, teachers }) => {
          this.teachers = teachers;

          if (departments.length === 0) {
            return of([] as DepartmentRow[]);
          }

          const statsRequests = departments.map((department) =>
            this.apiService
              .get<ApiResponse<DepartmentStats>>(`/departments/${department._id}/stats`)
              .pipe(
                map((response) => ({ id: department._id, stats: response.data })),
                catchError(() =>
                  of({
                    id: department._id,
                    stats: { subjects: 0, classes: 0, teachers: 0, students: 0 },
                  }),
                ),
              ),
          );

          return forkJoin(statsRequests).pipe(
            map((statsRows) => {
              const statsMap = new Map<string, DepartmentStats>();
              statsRows.forEach((item) => statsMap.set(item.id, item.stats));

              return departments.map((department) => {
                const stats = statsMap.get(department._id);
                return {
                  ...department,
                  subjectCount: stats?.subjects ?? 0,
                  classCount: stats?.classes ?? 0,
                  teacherCount: stats?.teachers ?? 0,
                };
              });
            }),
          );
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.rows = rows;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  getHeadName(value: Department['headId']): string {
    if (!value) {
      return 'Chưa gán';
    }

    if (typeof value !== 'string') {
      return value.name;
    }

    const found = this.teachers.find((item) => item._id === value);
    return found?.name ?? 'Chưa gán';
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '560px',
      data: {
        mode: 'create',
        department: null,
        teachers: this.teachers,
      } satisfies DepartmentDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: DepartmentUpsertPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .post<ApiResponse<Department>, DepartmentUpsertPayload>('/departments', payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Tạo khoa thành công', 'Đóng', { duration: 2000 });
              this.loadDepartments();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  openEditDialog(row: Department): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '560px',
      data: {
        mode: 'edit',
        department: row,
        teachers: this.teachers,
      } satisfies DepartmentDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: DepartmentUpsertPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .put<ApiResponse<Department>, DepartmentUpsertPayload>(`/departments/${row._id}`, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Cập nhật khoa thành công', 'Đóng', { duration: 2000 });
              this.loadDepartments();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  deleteDepartment(row: Department): void {
    const confirmed = window.confirm(`Xóa khoa ${row.code} - ${row.name}?`);
    if (!confirmed) {
      return;
    }

    this.apiService
      .delete<ApiResponse<Department>>(`/departments/${row._id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã xóa khoa', 'Đóng', { duration: 2000 });
          this.loadDepartments();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
        },
      });
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

@Component({
  selector: 'app-department-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Tạo khoa mới' : 'Sửa thông tin khoa' }}</h2>

    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-form">
      <mat-form-field appearance="outline">
        <mat-label>Mã khoa</mat-label>
        <input matInput formControlName="code" [readonly]="data.mode === 'edit'" />
        <mat-error *ngIf="form.controls.code.hasError('required')">Mã khoa là bắt buộc</mat-error>
        <mat-error *ngIf="form.controls.code.hasError('pattern')">Chỉ nhập chữ và số</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Tên khoa</mat-label>
        <input matInput formControlName="name" />
        <mat-error *ngIf="form.controls.name.hasError('required')">Tên khoa là bắt buộc</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mô tả</mat-label>
        <textarea matInput rows="3" formControlName="description"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Trưởng khoa</mat-label>
        <mat-select formControlName="headId">
          <mat-option value="">Chưa gán</mat-option>
          @for (teacher of data.teachers; track teacher._id) {
            <mat-option [value]="teacher._id">{{ teacher.name }} ({{ teacher.email }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </form>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button mat-flat-button type="button" class="btn-primary" (click)="submit()">
        {{ data.mode === 'create' ? 'Tạo khoa' : 'Lưu thay đổi' }}
      </button>
    </div>
  `,
  styles: [
    `
      .dialog-form {
        display: grid;
        gap: 0.75rem;
        padding-top: 0.5rem;
        min-width: min(520px, 92vw);
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }
    `,
  ],
})
export class DepartmentFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<DepartmentFormDialogComponent, DepartmentUpsertPayload | undefined>,
  );
  readonly data = inject<DepartmentDialogData>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]+$/)]],
    name: ['', [Validators.required]],
    description: [''],
    headId: [''],
  });

  constructor() {
    if (this.data.department) {
      const currentHeadId = this.resolveHeadId(this.data.department.headId);
      this.form.patchValue({
        code: this.data.department.code,
        name: this.data.department.name,
        description: this.data.department.description ?? '',
        headId: currentHeadId,
      });
    }
  }

  close(): void {
    this.dialogRef.close(undefined);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: DepartmentUpsertPayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      headId: raw.headId ? raw.headId : null,
    };

    if (this.data.mode === 'create') {
      payload.code = raw.code.trim().toUpperCase();
    }

    this.dialogRef.close(payload);
  }

  private resolveHeadId(value: Department['headId']): string {
    if (!value) {
      return '';
    }

    return typeof value === 'string' ? value : value._id;
  }
}
