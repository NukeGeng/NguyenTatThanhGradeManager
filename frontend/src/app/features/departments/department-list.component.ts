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
import { MatTableModule } from '@angular/material/table';
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
    MatTableModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý hệ thống</p>
          <h1>Danh sách khoa</h1>
          <p class="subtitle">Quản lý thông tin khoa, giáo viên phụ trách và số liệu tổng quan.</p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="plus" [size]="16"></lucide-icon>
          Thêm khoa
        </button>
      </header>

      <mat-card>
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
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="rows" class="full-table">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Mã khoa</th>
                <td mat-cell *matCellDef="let row">{{ row.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Tên khoa</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>

              <ng-container matColumnDef="subjectCount">
                <th mat-header-cell *matHeaderCellDef>Số môn</th>
                <td mat-cell *matCellDef="let row">{{ row.subjectCount }}</td>
              </ng-container>

              <ng-container matColumnDef="classCount">
                <th mat-header-cell *matHeaderCellDef>Số lớp</th>
                <td mat-cell *matCellDef="let row">{{ row.classCount }}</td>
              </ng-container>

              <ng-container matColumnDef="teacherCount">
                <th mat-header-cell *matHeaderCellDef>Số GV</th>
                <td mat-cell *matCellDef="let row">{{ row.teacherCount }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Thao tác</th>
                <td mat-cell *matCellDef="let row" class="actions-cell">
                  <a mat-stroked-button [routerLink]="['/departments', row._id]">
                    <lucide-icon name="chevron-right" [size]="16"></lucide-icon>
                    Chi tiết
                  </a>

                  <button mat-stroked-button type="button" (click)="openEditDialog(row)">
                    <lucide-icon name="pencil" [size]="16"></lucide-icon>
                    Sửa
                  </button>

                  <button
                    mat-stroked-button
                    type="button"
                    class="danger"
                    (click)="deleteDepartment(row)"
                  >
                    <lucide-icon name="trash-2" [size]="16"></lucide-icon>
                    Xóa
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>
        }
      </mat-card>
    </section>
  `,
  styles: [
    `
      .page-wrap {
        padding-block: 1.5rem;
        display: grid;
        gap: 1rem;
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

      mat-card {
        border-radius: var(--radius);
        border: 1px solid var(--gray-200);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .table-wrap {
        overflow-x: auto;
      }

      .full-table {
        width: 100%;
      }

      .actions-cell {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        padding-block: 0.75rem;
      }

      .danger {
        border-color: #dc2626 !important;
        color: #dc2626 !important;
      }

      .state-block {
        min-height: 240px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        color: var(--text-sub);
        text-align: center;
        padding: 1rem;
      }

      .state-block.error {
        color: #dc2626;
      }

      @media (max-width: 768px) {
        .actions-cell {
          min-width: 280px;
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

  displayedColumns = ['code', 'name', 'subjectCount', 'classCount', 'teacherCount', 'actions'];
  rows: DepartmentRow[] = [];
  teachers: User[] = [];

  isLoading = true;
  errorMessage = '';

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
