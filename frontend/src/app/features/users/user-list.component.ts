import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
import { ApiResponse, Department, Student, User } from '../../shared/models/interfaces';
import { toTenDigitStudentCode, toTenDigitTeacherCode } from '../../shared/utils/code-format.util';

interface UserCreatePayload {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'advisor';
  departmentIds: string[];
  advisingClassCodes?: string[];
}

interface UserEditPayload {
  name: string;
  email: string;
  phone: string;
}

interface UserAssignPayload {
  departmentIds: string[];
}

interface UserAssignAdvisingClassesPayload {
  advisingClassCodes: string[];
}

interface UserDialogData {
  user: User;
}

interface DepartmentDialogData {
  user: User;
  departments: Department[];
}

interface UserCreateDialogData {
  departments: Department[];
  classCodes: string[];
}

interface AdvisingClassesDialogData {
  user: User;
  classCodes: string[];
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
        <span>Giáo viên & cố vấn</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản trị Admin</p>
          <h1>Tài khoản giáo viên và cố vấn</h1>
          <p class="subtitle">
            Quản lý tài khoản, phân khoa giảng dạy và phân công sinh viên cố vấn học tập.
          </p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="user-plus" [size]="16"></lucide-icon>
          Tạo tài khoản
        </button>
      </header>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-card__icon">
            <lucide-icon name="users" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ totalTeachers }}</p>
          <p class="stat-card__label">Tổng GV/CVHT</p>
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
            <lucide-icon name="graduation-cap" [size]="18"></lucide-icon>
          </div>
          <p class="stat-card__val">{{ advisorCount }}</p>
          <p class="stat-card__label">Cố vấn học tập</p>
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
              <ng-container matColumnDef="index">
                <th mat-header-cell *matHeaderCellDef>STT</th>
                <td mat-cell *matCellDef="let row; let index = index" class="cell-center">
                  {{ index + 1 }}
                </td>
              </ng-container>

              <ng-container matColumnDef="teacherCode">
                <th mat-header-cell *matHeaderCellDef>Mã GV</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ formatTeacherCode(row) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="teacher">
                <th mat-header-cell *matHeaderCellDef>Họ tên</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>

              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Vai trò</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ row.role === 'advisor' ? 'Cố vấn học tập' : 'Giáo viên' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="departments">
                <th mat-header-cell *matHeaderCellDef>Khoa</th>
                <td
                  mat-cell
                  *matCellDef="let row"
                  class="department-cell"
                  [title]="getDepartmentDisplay(row.departmentIds)"
                >
                  {{ getDepartmentDisplay(row.departmentIds) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <span class="status-chip" [class.status-chip--active]="row.isActive !== false">
                    <span
                      class="status-dot"
                      [class.status-dot--active]="row.isActive !== false"
                    ></span>
                    {{ row.isActive === false ? 'Đã khóa' : 'Hoạt động' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Thao tác</th>
                <td mat-cell *matCellDef="let row" class="actions-cell cell-center">
                  <div class="actions-wrap">
                    <button
                      type="button"
                      class="action-btn"
                      aria-label="Xem hồ sơ giảng viên"
                      title="Xem hồ sơ"
                      (click)="openProfile(row)"
                    >
                      <lucide-icon name="eye" [size]="15"></lucide-icon>
                    </button>

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

                    @if (row.role === 'advisor') {
                      <button
                        type="button"
                        class="action-btn"
                        aria-label="Phân sinh viên cố vấn"
                        title="Phân SV cố vấn"
                        (click)="openAssignAdvisingStudentsDialog(row)"
                      >
                        <lucide-icon name="graduation-cap" [size]="15"></lucide-icon>
                      </button>
                    }

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

      .content-card {
        padding: 1rem 1.1rem 1.1rem;
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
        border: 1px solid #c8d0d8;
        border-radius: 4px;
        background: #fff;
      }

      .full-table {
        width: 100%;
        border-collapse: collapse;
      }

      .full-table .mat-mdc-header-row {
        height: 58px;
        background: #d8e1e8;
      }

      .full-table .mat-mdc-header-cell {
        color: #1da1f2;
        font-weight: 700;
        font-size: 0.9rem;
        border-bottom: 1px solid #bcc8d2;
        border-right: 1px solid #c7d1da;
        text-align: center;
      }

      .full-table .mat-mdc-cell {
        height: 52px;
        color: #4f6679;
        font-size: 0.9rem;
        border-bottom: 1px solid #d1d8de;
        border-right: 1px solid #d1d8de;
      }

      .full-table .mat-mdc-header-cell:first-child,
      .full-table .mat-mdc-cell:first-child {
        border-left: 1px solid #c7d1da;
      }

      .full-table .mat-mdc-row:last-child .mat-mdc-cell {
        border-bottom: 0;
      }

      .cell-center {
        text-align: center;
        justify-content: center;
      }

      .full-table .mat-column-index {
        width: 64px;
      }

      .full-table .mat-column-teacherCode {
        width: 130px;
      }

      .full-table .mat-column-teacher {
        width: 220px;
      }

      .full-table .mat-column-role {
        width: 150px;
      }

      .full-table .mat-column-departments {
        width: 220px;
      }

      .full-table .mat-column-status {
        width: 130px;
      }

      .full-table .mat-column-actions {
        width: 220px;
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

      .department-cell {
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.73rem;
        font-weight: 700;
        background: #fee2e2;
        color: #dc2626;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      .status-chip--active {
        background: #dcfce7;
        color: #16a34a;
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'index',
    'teacherCode',
    'teacher',
    'departments',
    'role',
    'status',
    'actions',
  ];

  users: User[] = [];
  filteredUsers: User[] = [];
  departments: Department[] = [];
  classCodes: string[] = [];

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

  get advisorCount(): number {
    return this.users.filter((item) => item.role === 'advisor').length;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load users + departments first so the page (and create-dialog) is usable immediately.
    // Students are only needed for the advisor-assignment section — load them independently
    // to avoid blocking the page while fetching all 2911+ students.
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
          this.users = users.filter((item) => item.role === 'teacher' || item.role === 'advisor');
          this.departments = departments;
          this.applyFilters();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.filteredUsers = [];
        },
      });

    // Load home class codes for advisor dialog — non-blocking.
    this.apiService
      .get<ApiResponse<string[]>>('/students/home-class-codes')
      .pipe(
        map((response) => (Array.isArray(response.data) ? response.data : [])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (codes) => {
          this.classCodes = codes;
        },
      });
  }

  applyFilters(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();
    const codeKeyword = keyword.replace(/\D/g, '');

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
      const codeText = this.formatTeacherCode(item);
      const byKeyword =
        text.includes(keyword) || (codeKeyword.length > 0 && codeText.includes(codeKeyword));

      return byDepartment && byStatus && byKeyword;
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

  getDepartmentDisplay(values: Array<string | Department>): string {
    const codes = this.getDepartmentCodes(values);
    return codes.length ? codes.join(', ') : '-';
  }

  formatTeacherCode(user: User): string {
    return toTenDigitTeacherCode(user._id, user.teacherCode);
  }

  openProfile(user: User): void {
    this.router.navigate(['/users', user._id]);
  }

  private getDepartmentIds(values: Array<string | Department>): string[] {
    return values.map((item) => (typeof item === 'string' ? item : item._id));
  }

  openCreateDialog(): void {
    this.apiService
      .get<ApiResponse<string[]>>('/students/home-class-codes')
      .pipe(
        map((response) => (Array.isArray(response.data) ? response.data : [])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((codes) => {
        this.classCodes = codes;
        this._openCreateDialogWithCodes(codes);
      });
  }

  private _openCreateDialogWithCodes(codes: string[]): void {
    const dialogRef = this.dialog.open(UserCreateDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        departments: this.departments,
        classCodes: codes,
      } satisfies UserCreateDialogData,
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
              this.snackBar.open('Tạo tài khoản thành công', 'Đóng', { duration: 2200 });
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
      width: '700px',
      maxWidth: '95vw',
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
      width: '760px',
      maxWidth: '95vw',
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

  openAssignAdvisingStudentsDialog(user: User): void {
    this.apiService
      .get<ApiResponse<string[]>>('/students/home-class-codes')
      .pipe(
        map((response) => (Array.isArray(response.data) ? response.data : [])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((codes) => {
        this.classCodes = codes;
        this._openAssignAdvisingDialogWithCodes(user, codes);
      });
  }

  private _openAssignAdvisingDialogWithCodes(user: User, codes: string[]): void {
    const dialogRef = this.dialog.open(UserAssignAdvisingStudentsDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        user,
        classCodes: codes,
      } satisfies AdvisingClassesDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: UserAssignAdvisingClassesPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .patch<ApiResponse<User>, UserAssignAdvisingClassesPayload>(
            `/users/${user._id}/advising-classes`,
            payload,
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Cập nhật lớp cố vấn thành công', 'Đóng', {
                duration: 2200,
              });
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
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Tạo tài khoản giáo viên/cố vấn</h2>

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

      <mat-form-field appearance="outline">
        <mat-label>Vai trò</mat-label>
        <mat-select formControlName="role">
          <mat-option value="teacher">Giáo viên</mat-option>
          <mat-option value="advisor">Cố vấn học tập</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="checkbox-box">
        <p>Phân khoa</p>
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
        *ngIf="
          form.controls.departmentIds.hasError('required') && form.controls.departmentIds.touched
        "
      >
        Vui lòng chọn ít nhất 1 khoa.
      </p>

      @if (form.controls.role.value === 'advisor') {
        <div class="checkbox-box checkbox-box--students">
          <p>Phân lớp sinh hoạt cố vấn (tùy chọn)</p>
          @for (code of data.classCodes; track code) {
            <mat-checkbox
              [checked]="isClassCodeChecked(code)"
              (change)="toggleClassCode(code, $event.checked)"
            >
              {{ code }}
            </mat-checkbox>
          }
          @if (data.classCodes.length === 0) {
            <span class="no-data">Chưa có lớp sinh hoạt nào</span>
          }
        </div>
      }
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
        width: 100%;
        min-width: 0;
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

      .checkbox-box--students {
        max-height: 240px;
        overflow: auto;
      }

      .checkbox-box p {
        margin: 0;
        font-weight: 700;
      }

      .no-data {
        font-size: 0.82rem;
        color: var(--text-sub);
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
  readonly data = inject<UserCreateDialogData>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@nttu\.edu\.vn$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['teacher' as 'teacher' | 'advisor', [Validators.required]],
    departmentIds: this.fb.nonNullable.control<string[]>([], [arrayRequiredValidator()]),
    advisingClassCodes: this.fb.nonNullable.control<string[]>([]),
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

  isClassCodeChecked(code: string): boolean {
    return this.form.controls.advisingClassCodes.value.includes(code);
  }

  toggleClassCode(code: string, checked: boolean): void {
    const current = [...this.form.controls.advisingClassCodes.value];
    const index = current.indexOf(code);

    if (checked && index < 0) {
      current.push(code);
    }

    if (!checked && index >= 0) {
      current.splice(index, 1);
    }

    this.form.controls.advisingClassCodes.setValue(current);
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
      role: raw.role,
      departmentIds: raw.departmentIds,
      advisingClassCodes: raw.role === 'advisor' ? raw.advisingClassCodes : [],
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
        width: 100%;
        min-width: 0;
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
        width: 100%;
        min-width: 0;
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

@Component({
  selector: 'app-user-assign-advising-students-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Phân lớp sinh hoạt cố vấn</h2>

    <div mat-dialog-content class="dialog-form">
      <p class="desc">
        Cố vấn: <strong>{{ data.user.name }}</strong>
      </p>

      <div class="checkbox-box checkbox-box--students">
        @for (code of data.classCodes; track code) {
          <mat-checkbox
            [checked]="isChecked(code)"
            (change)="toggleClassCode(code, $event.checked)"
          >
            {{ code }}
          </mat-checkbox>
        }
        @if (data.classCodes.length === 0) {
          <span class="no-data">Chưa có lớp sinh hoạt nào trong hệ thống</span>
        }
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button mat-flat-button type="button" class="btn-primary" (click)="submit()">
        Lưu phân công
      </button>
    </div>
  `,
  styles: [
    `
      .dialog-form {
        width: 100%;
        min-width: 0;
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

      .checkbox-box--students {
        max-height: 320px;
        overflow: auto;
      }

      .no-data {
        font-size: 0.82rem;
        color: var(--text-sub);
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }
    `,
  ],
})
export class UserAssignAdvisingStudentsDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<
      UserAssignAdvisingStudentsDialogComponent,
      UserAssignAdvisingClassesPayload | undefined
    >,
  );
  readonly data = inject<AdvisingClassesDialogData>(MAT_DIALOG_DATA);

  advisingClassCodesControl = this.fb.nonNullable.control<string[]>(
    this.data.user.advisingClassCodes ?? [],
  );

  close(): void {
    this.dialogRef.close(undefined);
  }

  isChecked(code: string): boolean {
    return this.advisingClassCodesControl.value.includes(code);
  }

  toggleClassCode(code: string, checked: boolean): void {
    const current = [...this.advisingClassCodesControl.value];
    const index = current.indexOf(code);

    if (checked && index < 0) {
      current.push(code);
    }

    if (!checked && index >= 0) {
      current.splice(index, 1);
    }

    this.advisingClassCodesControl.setValue(current);
  }

  submit(): void {
    this.dialogRef.close({
      advisingClassCodes: this.advisingClassCodesControl.value,
    });
  }
}

function arrayRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { required: true };
  };
}
