import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  Class,
  Department,
  Student,
  StudentStatus,
} from '../../shared/models/interfaces';
import { toTenDigitStudentCode } from '../../shared/utils/code-format.util';

interface DepartmentOption {
  id: string;
  label: string;
  name: string;
}

interface StudentListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StudentListPayload {
  items: Student[];
  pagination: StudentListPagination;
}

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Học sinh</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý học sinh</p>
          <h1 class="page-title">Danh sách học sinh</h1>
          <p class="subtitle">Tìm kiếm theo tên, lọc theo khoa, lớp và trạng thái.</p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="createStudent()">
          <lucide-icon name="user-plus" [size]="16"></lucide-icon>
          Thêm học sinh
        </button>
      </header>

      <mat-card class="content-card">
        <div class="filter-bar filters">
          <mat-form-field appearance="outline">
            <mat-label>Tìm theo tên</mat-label>
            <input
              matInput
              [(ngModel)]="searchText"
              (ngModelChange)="onSearchChange()"
              placeholder="Nhập họ tên"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Khoa</mat-label>
            <mat-select [(ngModel)]="selectedDepartmentId" (selectionChange)="onDepartmentChange()">
              <mat-option value="all">Tất cả khoa</mat-option>
              @for (department of departmentOptions; track department.id) {
                <mat-option [value]="department.id">{{ department.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Lớp</mat-label>
            <mat-select [(ngModel)]="selectedClassId" (selectionChange)="onClassChange()">
              <mat-option value="all">Tất cả lớp</mat-option>
              @for (classItem of classOptions; track classItem._id) {
                <mat-option [value]="classItem._id">{{
                  classItem.name || classItem.code
                }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Trạng thái</mat-label>
            <mat-select [(ngModel)]="selectedStatus" (selectionChange)="onStatusChange()">
              <mat-option value="all">Tất cả</mat-option>
              <mat-option value="active">Đang học</mat-option>
              <mat-option value="inactive">Tạm dừng</mat-option>
              <mat-option value="transferred">Chuyển lớp</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>Đang tải danh sách học sinh...</p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="20"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
          </div>
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="dataSource" matSort class="full-table nttu-table">
              <ng-container matColumnDef="index">
                <th mat-header-cell *matHeaderCellDef>STT</th>
                <td mat-cell *matCellDef="let row; let index = index" class="cell-center">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
              </ng-container>

              <ng-container matColumnDef="studentCode">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Mã HS</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ formatStudentCode(row) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Họ tên</th>
                <td mat-cell *matCellDef="let row">{{ row.fullName }}</td>
              </ng-container>

              <ng-container matColumnDef="class">
                <th mat-header-cell *matHeaderCellDef>Lớp</th>
                <td mat-cell *matCellDef="let row">{{ getClassName(row.classId) }}</td>
              </ng-container>

              <ng-container matColumnDef="gender">
                <th mat-header-cell *matHeaderCellDef>Giới tính</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ formatGender(row.gender) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <span class="status-chip" [class.status-chip--active]="row.status === 'active'">
                    <span
                      class="status-dot"
                      [class.status-dot--active]="row.status === 'active'"
                    ></span>
                    {{ formatStatus(row.status) }}
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
                      aria-label="Xem chi tiết học sinh"
                      title="Xem chi tiết"
                      (click)="viewStudent(row)"
                    >
                      <lucide-icon name="eye" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn action-btn--predict"
                      aria-label="Dự đoán học lực"
                      title="Dự đoán AI"
                      (click)="predictStudent(row)"
                    >
                      <lucide-icon name="brain-circuit" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn"
                      aria-label="Sửa học sinh"
                      title="Sửa"
                      (click)="editStudent(row)"
                    >
                      <lucide-icon name="pencil" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn action-btn--danger"
                      aria-label="Xóa học sinh"
                      title="Xóa"
                      (click)="deleteStudent(row)"
                    >
                      <lucide-icon name="trash-2" [size]="15"></lucide-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalStudents"
            [pageIndex]="currentPage - 1"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 20, 50, 100]"
            (page)="onPageChange($event)"
            showFirstLastButtons
          ></mat-paginator>
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

      .filters {
        display: grid;
        grid-template-columns: 1.5fr 1fr 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 0;
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
        color: #1f8fe4;
        font-weight: 700;
        font-size: 0.92rem;
        border-bottom: 1px solid #bcc8d2;
        border-right: 1px solid #c7d1da;
        text-align: center;
      }

      .full-table .mat-mdc-cell {
        height: 52px;
        color: #4f6679;
        font-size: 0.95rem;
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

      .full-table .mat-column-studentCode {
        width: 140px;
      }

      .full-table .mat-column-gender {
        width: 110px;
      }

      .full-table .mat-column-status {
        width: 140px;
      }

      .full-table .mat-column-actions {
        width: 196px;
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

      .action-btn--predict {
        color: var(--navy, #1e3a5f) !important;
      }

      .action-btn--predict:hover {
        background: rgba(30, 58, 95, 0.08);
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.2rem 0.6rem;
        font-size: 0.75rem;
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

      .state-block {
        min-height: 240px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        color: var(--text-sub);
      }

      .state-block.error {
        color: #dc2626;
      }

      mat-paginator {
        margin-top: 0.45rem;
      }

      @media (max-width: 768px) {
        .filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StudentListComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private sort?: MatSort;

  @ViewChild(MatSort)
  set matSort(value: MatSort | undefined) {
    this.sort = value;
    this.dataSource.sort = value ?? null;
  }

  readonly displayedColumns = [
    'index',
    'studentCode',
    'fullName',
    'class',
    'gender',
    'status',
    'actions',
  ];
  readonly dataSource = new MatTableDataSource<Student>([]);

  students: Student[] = [];
  classes: Class[] = [];
  departmentOptions: DepartmentOption[] = [];

  searchText = '';
  selectedDepartmentId = 'all';
  selectedClassId = 'all';
  selectedStatus: StudentStatus | 'all' = 'all';
  currentPage = 1;
  pageSize = 20;
  totalStudents = 0;
  totalPages = 0;

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  get classOptions(): Class[] {
    if (this.selectedDepartmentId === 'all') {
      return this.classes;
    }

    return this.classes.filter((classItem) => {
      const departmentId = this.resolveDepartmentId(classItem.departmentId);
      return departmentId === this.selectedDepartmentId;
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      classes: this.apiService
        .get<ApiResponse<Class[]>>('/classes', { hasStudents: true })
        .pipe(map((response) => response.data ?? [])),
      students: this.fetchStudentsRequest(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ classes, students }) => {
          this.classes = classes;
          this.departmentOptions = this.buildDepartmentOptions(classes);
          this.applyStudentPayload(students);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  onDepartmentChange(): void {
    if (!this.classOptions.some((classItem) => classItem._id === this.selectedClassId)) {
      this.selectedClassId = 'all';
    }

    this.loadStudents(true);
  }

  onClassChange(): void {
    this.loadStudents(true);
  }

  onStatusChange(): void {
    this.loadStudents(true);
  }

  onSearchChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.loadStudents(true);
    }, 300);
  }

  onPageChange(event: PageEvent): void {
    const nextPage = Number(event.pageIndex) + 1;
    const nextSize = Number(event.pageSize);
    const pageChanged = nextPage !== this.currentPage;
    const sizeChanged = nextSize !== this.pageSize;

    if (!pageChanged && !sizeChanged) {
      return;
    }

    this.currentPage = nextPage;
    this.pageSize = nextSize;
    this.loadStudents();
  }

  createStudent(): void {
    this.router.navigate(['/students/new']);
  }

  editStudent(student: Student): void {
    this.router.navigate(['/students', student._id, 'edit']);
  }

  viewStudent(student: Student): void {
    this.router.navigate(['/students', student._id]);
  }

  predictStudent(student: Student): void {
    this.router.navigate(['/students', student._id], {
      fragment: 'predict',
    });
  }

  deleteStudent(student: Student): void {
    const confirmed = window.confirm(`Xóa học sinh ${student.fullName}?`);
    if (!confirmed) {
      return;
    }

    this.apiService
      .delete<ApiResponse<Student>>(`/students/${student._id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã xóa học sinh', 'Đóng', { duration: 2200 });
          this.loadStudents(true);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
        },
      });
  }

  getClassName(value: Student['classId']): string {
    if (typeof value !== 'string') {
      return value.name || value.code;
    }

    const found = this.classes.find((item) => item._id === value);
    return found?.name || found?.code || value;
  }

  formatGender(value: Student['gender']): string {
    if (value === 'male') {
      return 'Nam';
    }

    if (value === 'female') {
      return 'Nữ';
    }

    return '-';
  }

  formatStatus(value: Student['status']): string {
    if (value === 'inactive') {
      return 'Tạm dừng';
    }

    if (value === 'transferred') {
      return 'Chuyển lớp';
    }

    return 'Đang học';
  }

  formatStudentCode(student: Student): string {
    return toTenDigitStudentCode(student.studentCode, student._id);
  }

  private resolveDepartmentId(value: Class['departmentId']): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value._id;
  }

  private buildDepartmentOptions(classes: Class[]): DepartmentOption[] {
    const optionsMap = new Map<string, DepartmentOption>();

    classes.forEach((classItem) => {
      const department = classItem.departmentId;
      const departmentId = this.resolveDepartmentId(department);
      if (!departmentId || optionsMap.has(departmentId)) {
        return;
      }

      if (typeof department === 'string') {
        optionsMap.set(departmentId, {
          id: departmentId,
          name: departmentId,
          label: departmentId,
        });
        return;
      }

      const code = String((department as Department).code || '').trim();
      const name = String((department as Department).name || code || departmentId).trim();
      optionsMap.set(departmentId, {
        id: departmentId,
        name,
        label: code ? `${code} - ${name}` : name,
      });
    });

    return Array.from(optionsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }),
    );
  }

  private loadStudents(resetToFirstPage = false): void {
    if (resetToFirstPage) {
      this.currentPage = 1;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.fetchStudentsRequest()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (payload) => {
          this.applyStudentPayload(payload);
        },
        error: (error: unknown) => {
          this.students = [];
          this.dataSource.data = [];
          this.totalStudents = 0;
          this.totalPages = 0;
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private fetchStudentsRequest() {
    const query: Record<string, string | number | boolean> = {
      fromClasses: true,
      paged: true,
      page: this.currentPage,
      limit: this.pageSize,
    };

    const keyword = this.searchText.trim();
    if (keyword) {
      query['search'] = keyword;
    }

    if (this.selectedStatus !== 'all') {
      query['status'] = this.selectedStatus;
    }

    if (this.selectedDepartmentId !== 'all') {
      query['departmentId'] = this.selectedDepartmentId;
    }

    if (this.selectedClassId !== 'all') {
      query['classId'] = this.selectedClassId;
    }

    return this.apiService
      .get<ApiResponse<StudentListPayload>>('/students', query)
      .pipe(map((response) => response.data ?? this.emptyStudentPayload()));
  }

  private applyStudentPayload(payload: StudentListPayload): void {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const pagination = payload.pagination || this.emptyStudentPayload().pagination;

    this.students = items;
    this.dataSource.data = items;
    this.totalStudents = Number(pagination.total || 0);
    this.totalPages = Number(pagination.totalPages || 0);
    this.currentPage = Number(pagination.page || this.currentPage);
    this.pageSize = Number(pagination.limit || this.pageSize);
  }

  private emptyStudentPayload(): StudentListPayload {
    return {
      items: [],
      pagination: {
        page: this.currentPage,
        limit: this.pageSize,
        total: 0,
        totalPages: 0,
      },
    };
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
