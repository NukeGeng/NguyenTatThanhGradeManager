import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class, Student, StudentStatus } from '../../shared/models/interfaces';

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
          <p class="subtitle">Tìm kiếm nhanh theo tên, lọc theo lớp và trạng thái.</p>
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
              (ngModelChange)="applyFilters()"
              placeholder="Nhập họ tên"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Lớp</mat-label>
            <mat-select [(ngModel)]="selectedClassId" (selectionChange)="applyFilters()">
              <mat-option value="all">Tất cả lớp</mat-option>
              @for (classItem of classes; track classItem._id) {
                <mat-option [value]="classItem._id">{{
                  classItem.name || classItem.code
                }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Trạng thái</mat-label>
            <mat-select [(ngModel)]="selectedStatus" (selectionChange)="applyFilters()">
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
              <ng-container matColumnDef="studentCode">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Mã HS</th>
                <td mat-cell *matCellDef="let row">{{ row.studentCode }}</td>
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
                <td mat-cell *matCellDef="let row">{{ formatGender(row.gender) }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let row">
                  <span
                    class="badge"
                    [class.badge-active]="row.status === 'active'"
                    [class.badge-off]="row.status !== 'active'"
                  >
                    {{ formatStatus(row.status) }}
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
                      aria-label="Xem chi tiết học sinh"
                      title="Xem chi tiết"
                      (click)="viewStudent(row)"
                    >
                      <lucide-icon name="eye" [size]="15"></lucide-icon>
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
            [pageSize]="10"
            [pageSizeOptions]="[10, 20, 50]"
            showFirstLastButtons
          ></mat-paginator>
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
        grid-template-columns: 1.5fr 1fr 1fr;
        gap: 0.75rem;
        padding: 0.3rem;
        margin-bottom: 0.4rem;
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

      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.73rem;
        font-weight: 700;
      }

      .badge-active {
        background: #f0fdf4;
        color: #16a34a;
      }

      .badge-off {
        background: #fef2f2;
        color: #dc2626;
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
export class StudentListComponent implements OnInit, AfterViewInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  readonly displayedColumns = ['studentCode', 'fullName', 'class', 'gender', 'status', 'actions'];
  readonly dataSource = new MatTableDataSource<Student>([]);

  students: Student[] = [];
  classes: Class[] = [];

  searchText = '';
  selectedClassId = 'all';
  selectedStatus: StudentStatus | 'all' = 'all';

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator ?? null;
    this.dataSource.sort = this.sort ?? null;
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      students: this.apiService
        .get<ApiResponse<Student[]>>('/students')
        .pipe(map((response) => response.data ?? [])),
      classes: this.apiService
        .get<ApiResponse<Class[]>>('/classes')
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ students, classes }) => {
          this.students = students;
          this.classes = classes;
          this.applyFilters();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  applyFilters(): void {
    const normalizedKeyword = this.searchText.trim().toLowerCase();

    const filtered = this.students.filter((student) => {
      const matchName = student.fullName.toLowerCase().includes(normalizedKeyword);

      const classId = this.resolveClassId(student.classId);
      const matchClass = this.selectedClassId === 'all' || classId === this.selectedClassId;

      const status = student.status ?? 'active';
      const matchStatus = this.selectedStatus === 'all' || status === this.selectedStatus;

      return matchName && matchClass && matchStatus;
    });

    this.dataSource.data = filtered;

    if (this.paginator) {
      this.paginator.firstPage();
    }
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
          this.loadData();
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
