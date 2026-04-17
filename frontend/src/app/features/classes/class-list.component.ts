import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  Class,
  Department,
  SchoolYear,
  Subject,
  User,
} from '../../shared/models/interfaces';

interface ClassDialogData {
  mode: 'create' | 'edit';
  classData: Class | null;
  departments: Department[];
  schoolYears: SchoolYear[];
  subjects: Subject[];
  teachers: User[];
}

interface ClassUpsertPayload {
  code: string;
  name: string;
  subjectId: string;
  departmentId: string;
  schoolYearId: string;
  semester: 1 | 2 | 3;
  teacherId: string | null;
}

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
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
        <span>Trang chủ</span>
        <span class="breadcrumb-sep">/</span>
        <span>Lớp học</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý học vụ</p>
          <h1>{{ selectedClassType === 'homeroom' ? 'Lớp sinh hoạt' : 'Lớp học phần' }}</h1>
          <p class="subtitle">Theo dõi theo năm học, học kỳ, khoa và trạng thái mở lớp.</p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="plus" [size]="16"></lucide-icon>
          Thêm lớp
        </button>
      </header>

      <mat-card class="content-card">
        <div class="filter-bar">
          <mat-form-field appearance="outline">
            <mat-label>Loại lớp</mat-label>
            <mat-select [(ngModel)]="selectedClassType" (ngModelChange)="applyFilters()">
              <mat-option value="subject">Lớp học phần</mat-option>
              <mat-option value="homeroom">Lớp sinh hoạt</mat-option>
              <mat-option value="all">Tất cả</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Năm học</mat-label>
            <mat-select [(ngModel)]="selectedSchoolYearId" (ngModelChange)="applyFilters()">
              <mat-option value="all">Tất cả năm học</mat-option>
              @for (year of schoolYears; track year._id) {
                <mat-option [value]="year._id">{{ year.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Học kỳ</mat-label>
            <mat-select [(ngModel)]="selectedSemester" (ngModelChange)="applyFilters()">
              <mat-option value="all">Tất cả học kỳ</mat-option>
              <mat-option value="1">Học kỳ 1 (T9-T12)</mat-option>
              <mat-option value="2">Học kỳ 2 (T1-T4)</mat-option>
              <mat-option value="3">Học kỳ 3 - Hè (T5-T8)</mat-option>
            </mat-select>
          </mat-form-field>

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

          <div class="spacer"></div>

          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Tìm lớp học phần</mat-label>
            <input
              matInput
              [(ngModel)]="searchKeyword"
              (ngModelChange)="applyFilters()"
              placeholder="Nhập mã lớp hoặc tên lớp"
            />
          </mat-form-field>
        </div>
      </mat-card>

      <mat-card class="content-card">
        @if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>Đang tải danh sách lớp...</p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="20"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
          </div>
        } @else if (filteredClasses.length === 0) {
          <div class="empty-state">
            <lucide-icon name="book-open" [size]="44"></lucide-icon>
            <h3>Không có lớp phù hợp</h3>
            <p>Thử thay đổi bộ lọc hoặc thêm lớp mới để bắt đầu.</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="filteredClasses" class="full-table nttu-table">
              <ng-container matColumnDef="index">
                <th mat-header-cell *matHeaderCellDef>STT</th>
                <td mat-cell *matCellDef="let row; index as i" class="cell-center">{{ i + 1 }}</td>
              </ng-container>

              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Mã lớp</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <button type="button" class="link-btn" (click)="openDetail(row)">
                    {{ row.code }}
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Tên lớp</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ row.name || row.code }}
                </td>
              </ng-container>

              <ng-container matColumnDef="department">
                <th mat-header-cell *matHeaderCellDef>Khoa</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ getDepartmentCode(row.departmentId) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="schoolYear">
                <th mat-header-cell *matHeaderCellDef>Năm học</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ getSchoolYearName(row.schoolYearId) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="semester">
                <th mat-header-cell *matHeaderCellDef>Học kỳ</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <span class="sem-badge" [class.sem-badge--summer]="row.semester === 3">
                    HK{{ row.semester }}{{ row.semester === 3 ? ' - Hè' : '' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="credits">
                <th mat-header-cell *matHeaderCellDef>Tín chỉ</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ getSubjectCredits(row.subjectId) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="studentCount">
                <th mat-header-cell *matHeaderCellDef>Sĩ số</th>
                <td mat-cell *matCellDef="let row" class="cell-center">{{ row.studentCount }}</td>
              </ng-container>

              <ng-container matColumnDef="weights">
                <th mat-header-cell *matHeaderCellDef>Trọng số</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <span class="weight-display">{{ getWeightDisplay(row) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="teacher">
                <th mat-header-cell *matHeaderCellDef>Giáo viên</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ getTeacherName(row.teacherId) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <span class="status-chip" [class.status-chip--active]="row.isActive">
                    {{ row.isActive ? 'Mở lớp' : 'Đã khóa' }}
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
                      aria-label="Chi tiết lớp"
                      title="Chi tiết lớp"
                      (click)="openDetail(row)"
                    >
                      <lucide-icon name="eye" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn"
                      aria-label="Sửa lớp"
                      title="Sửa lớp"
                      (click)="openEditDialog(row)"
                    >
                      <lucide-icon name="pencil" [size]="15"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="action-btn action-btn--danger"
                      aria-label="Xóa lớp"
                      title="Xóa lớp"
                      (click)="deleteClass(row)"
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

      .full-table .mat-column-code {
        width: 120px;
      }

      .full-table .mat-column-department {
        width: 130px;
      }

      .full-table .mat-column-schoolYear {
        width: 130px;
      }

      .full-table .mat-column-semester {
        width: 120px;
      }

      .full-table .mat-column-credits {
        width: 90px;
      }

      .full-table .mat-column-studentCount {
        width: 90px;
      }

      .full-table .mat-column-weights {
        width: 180px;
      }

      .full-table .mat-column-teacher {
        width: 180px;
      }

      .full-table .mat-column-status {
        width: 130px;
      }

      .full-table .mat-column-actions {
        width: 150px;
      }

      .link-btn {
        border: none;
        background: transparent;
        color: var(--blue);
        text-decoration: none;
        cursor: pointer;
        font: inherit;
        padding: 0;
        font-weight: 600;
      }

      .actions-cell {
        white-space: nowrap;
      }

      .sem-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: #e8efff;
        color: #1d4ed8;
        padding: 0.16rem 0.5rem;
        font-size: 0.74rem;
        font-weight: 700;
      }

      .sem-badge--summer {
        background: #fff5cc;
        color: #9a6700;
      }

      .actions-wrap {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        flex-wrap: nowrap;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.73rem;
        font-weight: 700;
        background: #fee2e2;
        color: #dc2626;
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
export class ClassListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  get displayedColumns(): string[] {
    if (this.selectedClassType === 'homeroom') {
      return [
        'index',
        'code',
        'name',
        'department',
        'schoolYear',
        'semester',
        'studentCount',
        'status',
        'actions',
      ];
    }
    return [
      'index',
      'code',
      'name',
      'department',
      'schoolYear',
      'semester',
      'credits',
      'studentCount',
      'weights',
      'teacher',
      'status',
      'actions',
    ];
  }

  classes: Class[] = [];
  filteredClasses: Class[] = [];
  departments: Department[] = [];
  schoolYears: SchoolYear[] = [];
  subjects: Subject[] = [];
  teachers: User[] = [];

  selectedSchoolYearId = 'all';
  selectedSemester: 'all' | '1' | '2' | '3' = 'all';
  selectedDepartmentId = 'all';
  selectedClassType: 'all' | 'subject' | 'homeroom' = 'subject';
  searchKeyword = '';

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      classes: this.apiService
        .get<ApiResponse<Class[]>>('/classes')
        .pipe(map((response) => response.data ?? [])),
      departments: this.apiService
        .get<ApiResponse<Department[]>>('/departments')
        .pipe(map((response) => response.data ?? [])),
      schoolYears: this.apiService
        .get<ApiResponse<SchoolYear[]>>('/school-years')
        .pipe(map((response) => response.data ?? [])),
      subjects: this.apiService
        .get<ApiResponse<Subject[]>>('/subjects', { isActive: false })
        .pipe(map((response) => response.data ?? [])),
      users: this.apiService
        .get<ApiResponse<User[]>>('/users')
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ classes, departments, schoolYears, subjects, users }) => {
          this.classes = classes;
          this.departments = departments;
          this.schoolYears = schoolYears;
          this.subjects = subjects;
          this.teachers = users.filter((item) => item.role === 'teacher');
          this.applyFilters();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.filteredClasses = [];
        },
      });
  }

  isHomeroomClass(classItem: Class): boolean {
    return !String(classItem.code || '').includes('-');
  }

  applyFilters(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();

    this.filteredClasses = this.classes.filter((item) => {
      const schoolYearId = this.resolveRefId(item.schoolYearId);
      const departmentId = this.resolveRefId(item.departmentId);
      const semesterText = String(item.semester);
      const homeroom = this.isHomeroomClass(item);

      const byType =
        this.selectedClassType === 'all'
          ? true
          : this.selectedClassType === 'homeroom'
            ? homeroom
            : !homeroom;
      const byYear =
        this.selectedSchoolYearId === 'all' ? true : schoolYearId === this.selectedSchoolYearId;
      const bySemester =
        this.selectedSemester === 'all' ? true : semesterText === this.selectedSemester;
      const byDepartment =
        this.selectedDepartmentId === 'all' ? true : departmentId === this.selectedDepartmentId;

      if (!keyword) {
        return byType && byYear && bySemester && byDepartment;
      }

      const text = [
        item.code,
        item.name,
        this.getTeacherName(item.teacherId),
        this.getDepartmentCode(item.departmentId),
      ]
        .join(' ')
        .toLowerCase();

      return byType && byYear && bySemester && byDepartment && text.includes(keyword);
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ClassFormDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      data: {
        mode: 'create',
        classData: null,
        departments: this.departments,
        schoolYears: this.schoolYears,
        subjects: this.subjects,
        teachers: this.teachers,
      } satisfies ClassDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: ClassUpsertPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .post<ApiResponse<Class>, ClassUpsertPayload>('/classes', payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Tạo lớp học phần thành công', 'Đóng', { duration: 2200 });
              this.loadData();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
            },
          });
      });
  }

  openEditDialog(row: Class): void {
    const dialogRef = this.dialog.open(ClassFormDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      data: {
        mode: 'edit',
        classData: row,
        departments: this.departments,
        schoolYears: this.schoolYears,
        subjects: this.subjects,
        teachers: this.teachers,
      } satisfies ClassDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: ClassUpsertPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .put<ApiResponse<Class>, ClassUpsertPayload>(`/classes/${row._id}`, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Cập nhật lớp học phần thành công', 'Đóng', { duration: 2200 });
              this.loadData();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
            },
          });
      });
  }

  deleteClass(row: Class): void {
    const confirmed = window.confirm(`Xóa lớp ${row.code}?`);
    if (!confirmed) {
      return;
    }

    this.apiService
      .delete<ApiResponse<Class>>(`/classes/${row._id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã xóa lớp học phần', 'Đóng', { duration: 2200 });
          this.loadData();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
        },
      });
  }

  openDetail(row: Class): void {
    this.router.navigate(['/classes', row._id]);
  }

  getGradeLevelLabel(subjectValue: Class['subjectId']): string {
    const subject = this.resolveSubject(subjectValue);
    if (!subject || !subject.gradeLevel || subject.gradeLevel.length === 0) {
      return 'N/A';
    }

    return `Khối ${subject.gradeLevel.join(', ')}`;
  }

  getSchoolYearName(value: Class['schoolYearId']): string {
    if (!value) {
      return '-';
    }

    if (typeof value !== 'string') {
      return value.name;
    }

    const found = this.schoolYears.find((item) => item._id === value);
    return found?.name ?? value;
  }

  getTeacherName(value: Class['teacherId']): string {
    if (!value) {
      return 'Chưa gán';
    }

    if (typeof value !== 'string') {
      return value.name;
    }

    const found = this.teachers.find((item) => item._id === value);
    return found?.name ?? 'Chưa gán';
  }

  getDepartmentCode(value: Class['departmentId']): string {
    if (typeof value !== 'string') {
      return value.code;
    }

    const found = this.departments.find((item) => item._id === value);
    return found?.code ?? '-';
  }

  getSubjectCredits(value: Class['subjectId']): number {
    const subject = this.resolveSubject(value);
    return Number(subject?.credits ?? 0);
  }

  getWeightDisplay(row: Class): string {
    const weights = row.weights;
    return `TX:${weights.tx} GK:${weights.gk} TH:${weights.th} TKT:${weights.tkt}`;
  }

  private resolveSubject(value: Class['subjectId']): Subject | null {
    if (typeof value !== 'string') {
      return value;
    }

    return this.subjects.find((subject) => subject._id === value) ?? null;
  }

  private resolveRefId(value: string | { _id: string } | null | undefined): string | null {
    if (!value) {
      return null;
    }

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

@Component({
  selector: 'app-class-form-dialog',
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
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Thêm lớp học phần' : 'Sửa lớp học phần' }}
    </h2>

    <form [formGroup]="form" mat-dialog-content class="dialog-form" (ngSubmit)="submit()">
      <div class="grid-2">
        <mat-form-field appearance="outline">
          <mat-label>Mã lớp</mat-label>
          <input matInput formControlName="code" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tên lớp</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
      </div>

      <div class="grid-2">
        <mat-form-field appearance="outline">
          <mat-label>Khối</mat-label>
          <mat-select formControlName="gradeLevel" (selectionChange)="onGradeLevelChange()">
            <mat-option [value]="10">10</mat-option>
            <mat-option [value]="11">11</mat-option>
            <mat-option [value]="12">12</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Năm học</mat-label>
          <mat-select formControlName="schoolYearId">
            @for (year of data.schoolYears; track year._id) {
              <mat-option [value]="year._id">{{ year.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="grid-2">
        <mat-form-field appearance="outline">
          <mat-label>Khoa</mat-label>
          <mat-select formControlName="departmentId" (selectionChange)="onDepartmentChange()">
            @for (department of data.departments; track department._id) {
              <mat-option [value]="department._id"
                >{{ department.code }} - {{ department.name }}</mat-option
              >
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Học kỳ</mat-label>
          <mat-select formControlName="semester">
            <mat-option [value]="1">HK1</mat-option>
            <mat-option [value]="2">HK2</mat-option>
            <mat-option [value]="3">HK3 - Hè</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Môn học</mat-label>
        <mat-select formControlName="subjectId">
          @for (subject of filteredSubjects; track subject._id) {
            <mat-option [value]="subject._id">{{ subject.code }} - {{ subject.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Giáo viên phụ trách</mat-label>
        <mat-select formControlName="teacherId">
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
        {{ data.mode === 'create' ? 'Tạo lớp' : 'Lưu thay đổi' }}
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

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      @media (max-width: 640px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ClassFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<ClassFormDialogComponent, ClassUpsertPayload | undefined>,
  );
  readonly data = inject<ClassDialogData>(MAT_DIALOG_DATA);

  filteredSubjects: Subject[] = [];

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    gradeLevel: [10, [Validators.required]],
    schoolYearId: ['', [Validators.required]],
    departmentId: ['', [Validators.required]],
    semester: [1 as 1 | 2 | 3, [Validators.required]],
    subjectId: ['', [Validators.required]],
    teacherId: [''],
  });

  constructor() {
    if (this.data.classData) {
      const currentDepartmentId =
        typeof this.data.classData.departmentId === 'string'
          ? this.data.classData.departmentId
          : this.data.classData.departmentId._id;

      const currentSubject = this.resolveSubject(this.data.classData.subjectId);

      this.form.patchValue({
        code: this.data.classData.code,
        name: this.data.classData.name || this.data.classData.code,
        gradeLevel: currentSubject?.gradeLevel?.[0] ?? 10,
        schoolYearId:
          typeof this.data.classData.schoolYearId === 'string'
            ? this.data.classData.schoolYearId
            : this.data.classData.schoolYearId._id,
        departmentId: currentDepartmentId,
        semester: this.data.classData.semester,
        subjectId:
          typeof this.data.classData.subjectId === 'string'
            ? this.data.classData.subjectId
            : this.data.classData.subjectId._id,
        teacherId: this.resolveTeacherId(this.data.classData.teacherId),
      });
    } else {
      this.form.patchValue({
        schoolYearId: this.data.schoolYears.find((item) => item.isCurrent)?._id ?? '',
      });
    }

    this.filterSubjects();
  }

  close(): void {
    this.dialogRef.close(undefined);
  }

  onDepartmentChange(): void {
    this.filterSubjects();
  }

  onGradeLevelChange(): void {
    this.filterSubjects();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      code: raw.code.trim(),
      name: raw.name.trim(),
      subjectId: raw.subjectId,
      departmentId: raw.departmentId,
      schoolYearId: raw.schoolYearId,
      semester: raw.semester,
      teacherId: raw.teacherId ? raw.teacherId : null,
    });
  }

  private filterSubjects(): void {
    const departmentId = this.form.controls.departmentId.value;
    const gradeLevel = Number(this.form.controls.gradeLevel.value);

    this.filteredSubjects = this.data.subjects.filter((subject) => {
      const subjectDepartmentId =
        typeof subject.departmentId === 'string' ? subject.departmentId : subject.departmentId._id;
      const gradeLevels = subject.gradeLevel?.length ? subject.gradeLevel : [10, 11, 12];
      return subjectDepartmentId === departmentId && gradeLevels.includes(gradeLevel);
    });

    const selectedSubjectId = this.form.controls.subjectId.value;
    if (
      selectedSubjectId &&
      !this.filteredSubjects.some((item) => item._id === selectedSubjectId)
    ) {
      this.form.controls.subjectId.setValue('');
    }
  }

  private resolveSubject(value: Class['subjectId']): Subject | null {
    if (typeof value !== 'string') {
      return value;
    }

    return this.data.subjects.find((subject) => subject._id === value) ?? null;
  }

  private resolveTeacherId(value: Class['teacherId']): string {
    if (!value) {
      return '';
    }

    return typeof value === 'string' ? value : value._id;
  }
}
