import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Department, User } from '../../shared/models/interfaces';

interface UserCreatePayload {
  name: string;
  email: string;
  password: string;
  role: 'teacher';
  departmentIds: string[];
}

interface UserEditPayload {
  name: string;
  email: string;
  phone: string;
}

interface UserAssignPayload {
  departmentIds: string[];
}

interface UserDialogData {
  user: User;
}

interface DepartmentDialogData {
  user: User;
  departments: Department[];
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Giáo viên</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản trị Admin</p>
          <h1>Tài khoản giáo viên</h1>
          <p class="subtitle">
            Quản lý tài khoản, phân khoa giảng dạy và trạng thái hoạt động theo khoa.
          </p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="user-plus" [size]="16"></lucide-icon>
          Tạo tài khoản GV
        </button>
      </header>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="users" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ totalTeachers }}</p>
          <p class="stat-card__label">Tổng giáo viên</p>
        </article>

        <article class="stat-card stat-card--success">
          <div class="stat-card__icon">
            <lucide-icon name="check-circle" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ activeTeachers }}</p>
          <p class="stat-card__label">Đang hoạt động</p>
        </article>

        <article class="stat-card stat-card--danger">
          <div class="stat-card__icon">
            <lucide-icon name="x-circle" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ lockedTeachers }}</p>
          <p class="stat-card__label">Đã khóa</p>
        </article>

        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="layers" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ multiDepartmentTeachers }}</p>
          <p class="stat-card__label">Dạy nhiều khoa</p>
        </article>
      </section>

      <mat-card class="content-card">
        <div class="filter-bar">
          <mat-form-field appearance="outline">
            <mat-label>Khoa</mat-label>
            <mat-select [(ngModel)]="selectedDepartmentId" (ngModelChange)="applyFilters()">
              <mat-option value="all">Tất cả khoa</mat-option>
              @for (department of departments; track department._id) {
                <mat-option [value]="department._id"
                  >{{ department.code }} - {{ department.name }}</mat-option
                >
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Trạng thái</mat-label>
            <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
              <mat-option value="all">Tất cả</mat-option>
              <mat-option value="active">Đang hoạt động</mat-option>
              <mat-option value="inactive">Đã khóa</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="spacer"></div>

          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Tìm giáo viên</mat-label>
            <input
              matInput
              [(ngModel)]="searchKeyword"
              (ngModelChange)="applyFilters()"
              placeholder="Nhập tên hoặc email"
            />
          </mat-form-field>
        </div>
      </mat-card>

      <mat-card class="content-card">
        @if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>Đang tải danh sách giáo viên...</p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="20"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
          </div>
        } @else if (filteredUsers.length === 0) {
          <div class="empty-state">
            <lucide-icon name="user-x" [size]="44"></lucide-icon>
            <h3>Không có giáo viên phù hợp</h3>
            <p>Điều chỉnh bộ lọc hoặc tạo tài khoản giáo viên mới.</p>
            <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
              <lucide-icon name="user-plus" [size]="16"></lucide-icon>
              Tạo tài khoản GV
            </button>
          </div>
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="filteredUsers" class="full-table nttu-table">
              <ng-container matColumnDef="teacher">
                <th mat-header-cell *matHeaderCellDef>Giáo viên</th>
                <td mat-cell *matCellDef="let row">
                  <div class="teacher-cell">
                    <span class="user-avatar">{{ getInitials(row.name) }}</span>
                    <div>
                      <p class="teacher-name">{{ row.name }}</p>
                      <p class="teacher-email">{{ row.email }}</p>
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="departments">
                <th mat-header-cell *matHeaderCellDef>Khoa đang dạy</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    @for (
                      deptCode of getDepartmentCodes(row.departmentIds).slice(0, 3);
                      track deptCode
                    ) {
                      <mat-chip>{{ deptCode }}</mat-chip>
                    }
                    @if (getDepartmentCodes(row.departmentIds).length > 3) {
                      <mat-chip>+{{ getDepartmentCodes(row.departmentIds).length - 3 }}</mat-chip>
                    }
                  </mat-chip-set>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let row">
                  <span
                    class="grade-badge"
                    [class.grade-badge--a]="row.isActive !== false"
                    [class.grade-badge--f]="row.isActive === false"
                  >
                    {{ row.isActive === false ? 'Đã khóa' : 'Hoạt động' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Thao tác</th>
                <td mat-cell *matCellDef="let row" class="actions-cell">
                  <div class="actions-wrap">
                    <button
                      type="button"
                      class="action-btn"
                      aria-label="Sửa thông tin"
                      (click)="openEditDialog(row)"
                    >
                      <lucide-icon name="pencil" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn"
                      aria-label="Phân khoa"
                      (click)="openAssignDialog(row)"
                    >
                      <lucide-icon name="layers" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn"
                      [class.action-btn--danger]="row.isActive !== false"
                      aria-label="Cập nhật trạng thái"
                      (click)="toggleUser(row)"
                    >
                      <lucide-icon
                        [name]="row.isActive === false ? 'check-circle' : 'x-circle'"
                        [size]="15"
                      ></lucide-icon>
                    </button>
                  </div>
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
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
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

      .search-field {
        width: min(320px, 100%);
      }

      .table-wrap {
        overflow-x: auto;
      }

      .full-table {
        width: 100%;
      }

      .actions-cell {
        white-space: nowrap;
      }

      .actions-wrap {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        flex-wrap: nowrap;
      }

      .teacher-cell {
        display: flex;
        align-items: center;
        gap: 0.7rem;
      }

      .teacher-name {
        margin: 0;
        font-weight: 600;
        color: var(--text);
      }

      .teacher-email {
        margin: 0.1rem 0 0;
        color: var(--text-sub);
        font-size: 0.8rem;
      }

      @media (max-width: 768px) {
        .search-field {
          width: 100%;
        }
      }
    `,
  ],
})
export class UserListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['teacher', 'departments', 'status', 'actions'];

  users: User[] = [];
  filteredUsers: User[] = [];
  departments: Department[] = [];

  selectedDepartmentId = 'all';
  selectedStatus: 'all' | 'active' | 'inactive' = 'all';
  searchKeyword = '';

  isLoading = true;
  errorMessage = '';

  get totalTeachers(): number {
    return this.users.length;
  }

  get activeTeachers(): number {
    return this.users.filter((item) => item.isActive !== false).length;
  }

  get lockedTeachers(): number {
    return this.users.filter((item) => item.isActive === false).length;
  }

  get multiDepartmentTeachers(): number {
    return this.users.filter((item) => this.getDepartmentIds(item.departmentIds).length > 1).length;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.apiService
        .get<ApiResponse<User[]>>('/users')
        .pipe(map((response) => response.data ?? [])),
      departments: this.apiService
        .get<ApiResponse<Department[]>>('/departments')
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ users, departments }) => {
          this.users = users.filter((item) => item.role === 'teacher');
          this.departments = departments;
          this.applyFilters();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.filteredUsers = [];
        },
      });
  }

  applyFilters(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();

    this.filteredUsers = this.users.filter((item) => {
      const departmentIds = this.getDepartmentIds(item.departmentIds);
      const byDepartment =
        this.selectedDepartmentId === 'all'
          ? true
          : departmentIds.includes(this.selectedDepartmentId);
      const byStatus =
        this.selectedStatus === 'all'
          ? true
          : this.selectedStatus === 'active'
            ? item.isActive !== false
            : item.isActive === false;

      if (!keyword) {
        return byDepartment && byStatus;
      }

      const text = `${item.name} ${item.email}`.toLowerCase();
      return byDepartment && byStatus && text.includes(keyword);
    });
  }

  getInitials(name: string): string {
    const tokens = name
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, 2);

    return tokens.map((token) => token[0]?.toUpperCase() ?? '').join('') || 'GV';
  }

  getDepartmentCodes(values: Array<string | Department>): string[] {
    return values
      .map((item) => {
        if (typeof item === 'string') {
          const found = this.departments.find((department) => department._id === item);
          return found?.code ?? item;
        }

        return item.code;
      })
      .filter((code, index, list) => list.indexOf(code) === index);
  }

  private getDepartmentIds(values: Array<string | Department>): string[] {
    return values.map((item) => (typeof item === 'string' ? item : item._id));
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserCreateDialogComponent, {
      width: '620px',
      data: this.departments,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: UserCreatePayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .post<ApiResponse<User>, UserCreatePayload>('/users', payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Tạo tài khoản giáo viên thành công', 'Đóng', { duration: 2200 });
              this.loadData();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      width: '560px',
      data: { user } satisfies UserDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: UserEditPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .put<ApiResponse<User>, UserEditPayload>(`/users/${user._id}`, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Đã cập nhật thông tin giáo viên', 'Đóng', { duration: 2200 });
              this.loadData();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  openAssignDialog(user: User): void {
    const dialogRef = this.dialog.open(UserAssignDepartmentDialogComponent, {
      width: '620px',
      data: {
        user,
        departments: this.departments,
      } satisfies DepartmentDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: UserAssignPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .patch<ApiResponse<User>, UserAssignPayload>(`/users/${user._id}/departments`, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Cập nhật phân khoa thành công', 'Đóng', { duration: 2200 });
              this.loadData();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  toggleUser(user: User): void {
    this.apiService
      .patch<ApiResponse<{ _id: string; isActive: boolean }>, Record<string, never>>(
        `/users/${user._id}/toggle`,
        {},
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã cập nhật trạng thái tài khoản', 'Đóng', { duration: 2200 });
          this.loadData();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
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
  selector: 'app-user-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Tạo tài khoản giáo viên</h2>

    <form [formGroup]="form" mat-dialog-content class="dialog-form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Họ tên</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" placeholder="gv1@nttu.edu.vn" />
        <mat-error *ngIf="form.controls.email.hasError('pattern')"
          >Email phải có đuôi @nttu.edu.vn</mat-error
        >
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mật khẩu tạm</mat-label>
        <input matInput formControlName="password" type="password" />
      </mat-form-field>

      <div class="checkbox-box">
        <p>Phân khoa</p>
        @for (department of departments; track department._id) {
          <mat-checkbox
            [checked]="isChecked(department._id)"
            (change)="toggleDepartment(department._id, $event.checked)"
          >
            {{ department.code }} - {{ department.name }}
          </mat-checkbox>
        }
      </div>
      <p
        class="error"
        *ngIf="
          form.controls.departmentIds.hasError('required') && form.controls.departmentIds.touched
        "
      >
        Vui lòng chọn ít nhất 1 khoa.
      </p>
    </form>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button mat-flat-button type="button" class="btn-primary" (click)="submit()">
        Tạo tài khoản
      </button>
    </div>
  `,
  styles: [
    `
      .dialog-form {
        min-width: min(580px, 92vw);
        display: grid;
        gap: 0.75rem;
      }

      .checkbox-box {
        display: grid;
        gap: 0.35rem;
        border: 1px dashed var(--gray-300);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
      }

      .checkbox-box p {
        margin: 0;
        font-weight: 700;
      }

      .error {
        margin: 0;
        color: #dc2626;
        font-size: 0.82rem;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }
    `,
  ],
})
export class UserCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<UserCreateDialogComponent, UserCreatePayload | undefined>,
  );
  readonly departments = inject<Department[]>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@nttu\.edu\.vn$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    departmentIds: this.fb.nonNullable.control<string[]>([], [arrayRequiredValidator()]),
  });

  close(): void {
    this.dialogRef.close(undefined);
  }

  isChecked(id: string): boolean {
    return this.form.controls.departmentIds.value.includes(id);
  }

  toggleDepartment(id: string, checked: boolean): void {
    const current = [...this.form.controls.departmentIds.value];
    const index = current.indexOf(id);

    if (checked && index < 0) {
      current.push(id);
    }

    if (!checked && index >= 0) {
      current.splice(index, 1);
    }

    this.form.controls.departmentIds.setValue(current);
    this.form.controls.departmentIds.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      password: raw.password,
      role: 'teacher',
      departmentIds: raw.departmentIds,
    });
  }
}

@Component({
  selector: 'app-user-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Sửa thông tin giáo viên</h2>

    <form [formGroup]="form" mat-dialog-content class="dialog-form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Họ tên</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" />
        <mat-error *ngIf="form.controls.email.hasError('pattern')"
          >Email phải có đuôi @nttu.edu.vn</mat-error
        >
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Số điện thoại</mat-label>
        <input matInput formControlName="phone" />
      </mat-form-field>
    </form>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button mat-flat-button type="button" class="btn-primary" (click)="submit()">Lưu</button>
    </div>
  `,
  styles: [
    `
      .dialog-form {
        min-width: min(520px, 92vw);
        display: grid;
        gap: 0.75rem;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }
    `,
  ],
})
export class UserEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<UserEditDialogComponent, UserEditPayload | undefined>,
  );
  readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    name: [this.data.user.name, [Validators.required]],
    email: [
      this.data.user.email,
      [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@nttu\.edu\.vn$/)],
    ],
    phone: [this.data.user.phone ?? ''],
  });

  close(): void {
    this.dialogRef.close(undefined);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      phone: raw.phone.trim(),
    });
  }
}

@Component({
  selector: 'app-user-assign-department-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Phân khoa giảng dạy</h2>

    <div mat-dialog-content class="dialog-form">
      <p class="desc">
        Giáo viên: <strong>{{ data.user.name }}</strong>
      </p>

      <div class="checkbox-box">
        @for (department of data.departments; track department._id) {
          <mat-checkbox
            [checked]="isChecked(department._id)"
            (change)="toggleDepartment(department._id, $event.checked)"
          >
            {{ department.code }} - {{ department.name }}
          </mat-checkbox>
        }
      </div>
      <p
        class="error"
        *ngIf="departmentIdsControl.hasError('required') && departmentIdsControl.touched"
      >
        Vui lòng chọn ít nhất 1 khoa.
      </p>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button mat-flat-button type="button" class="btn-primary" (click)="submit()">
        Lưu phân khoa
      </button>
    </div>
  `,
  styles: [
    `
      .dialog-form {
        min-width: min(560px, 92vw);
        display: grid;
        gap: 0.75rem;
      }

      .desc {
        margin: 0;
        color: var(--text-sub);
      }

      .checkbox-box {
        display: grid;
        gap: 0.35rem;
        border: 1px dashed var(--gray-300);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
      }

      .error {
        margin: 0;
        color: #dc2626;
        font-size: 0.82rem;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }
    `,
  ],
})
export class UserAssignDepartmentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<UserAssignDepartmentDialogComponent, UserAssignPayload | undefined>,
  );
  readonly data = inject<DepartmentDialogData>(MAT_DIALOG_DATA);

  departmentIdsControl = this.fb.nonNullable.control<string[]>(this.extractCurrentDepartmentIds(), {
    validators: [arrayRequiredValidator()],
  });

  close(): void {
    this.dialogRef.close(undefined);
  }

  isChecked(id: string): boolean {
    return this.departmentIdsControl.value.includes(id);
  }

  toggleDepartment(id: string, checked: boolean): void {
    const current = [...this.departmentIdsControl.value];
    const index = current.indexOf(id);

    if (checked && index < 0) {
      current.push(id);
    }

    if (!checked && index >= 0) {
      current.splice(index, 1);
    }

    this.departmentIdsControl.setValue(current);
    this.departmentIdsControl.markAsTouched();
  }

  submit(): void {
    if (this.departmentIdsControl.invalid) {
      this.departmentIdsControl.markAsTouched();
      return;
    }

    this.dialogRef.close({
      departmentIds: this.departmentIdsControl.value,
    });
  }

  private extractCurrentDepartmentIds(): string[] {
    return this.data.user.departmentIds.map((item) => (typeof item === 'string' ? item : item._id));
  }
}

function arrayRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { required: true };
  };
}
