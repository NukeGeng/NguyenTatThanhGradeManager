import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { MatTabsModule } from '@angular/material/tabs';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class, Department, Subject, User } from '../../shared/models/interfaces';

interface DepartmentDetailResponse extends Department {
  subjects: Subject[];
  teachers: User[];
}

interface SubjectDialogData {
  mode: 'create' | 'edit';
  subject: Subject | null;
  departmentId: string;
}

interface SubjectUpsertPayload {
  code?: string;
  name: string;
  departmentId: string;
  semester: 1 | 2 | 3 | 'all';
  coefficient: number;
  credits: number;
  gradeLevel: number[];
  category: Subject['category'];
}

@Component({
  selector: 'app-department-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Trang chủ</span>
        <span class="breadcrumb-sep">/</span>
        <span>Khoa</span>
        <span class="breadcrumb-sep">/</span>
        <span>Chi tiết</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý khoa</p>
          <h1>Trang chi tiết khoa</h1>
          <p class="subtitle">Theo dõi môn học, lớp học phần và giáo viên thuộc khoa.</p>
        </div>

        <button mat-stroked-button type="button" (click)="goBack()">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lại danh sách khoa
        </button>
      </header>

      @if (isLoading()) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải chi tiết khoa...</p>
        </mat-card>
      } @else if (errorMessage()) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage() }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else if (department(); as departmentData) {
        <mat-card class="hero-card">
          <div>
            <p class="eyebrow">Khoa {{ departmentData.code }}</p>
            <h1>{{ departmentData.name }}</h1>
            <p>{{ departmentData.description || 'Chưa có mô tả' }}</p>
          </div>

          <div class="meta-grid">
            <div>
              <strong>{{ subjects().length }}</strong>
              <span>Môn học</span>
            </div>
            <div>
              <strong>{{ classes().length }}</strong>
              <span>Lớp học phần</span>
            </div>
            <div>
              <strong>{{ teachers().length }}</strong>
              <span>Giáo viên</span>
            </div>
          </div>
        </mat-card>

        <mat-tab-group class="detail-tabs">
          <mat-tab label="Môn học">
            <div class="tab-pane">
              <div class="filter-bar tab-actions">
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Học kỳ</mat-label>
                  <mat-select
                    [value]="subjectSemesterFilter()"
                    (selectionChange)="onSemesterFilterChange($event.value)"
                  >
                    <mat-option value="all">Tất cả</mat-option>
                    <mat-option value="1">HK1</mat-option>
                    <mat-option value="2">HK2</mat-option>
                    <mat-option value="3">HK3 - Hè</mat-option>
                  </mat-select>
                </mat-form-field>

                <div class="spacer"></div>

                <button
                  mat-flat-button
                  type="button"
                  class="btn-primary"
                  (click)="openCreateSubjectDialog()"
                >
                  <lucide-icon name="plus" [size]="16"></lucide-icon>
                  Thêm môn
                </button>
              </div>

              <div class="table-wrap">
                <table mat-table [dataSource]="subjects()" class="full-table nttu-table">
                  <ng-container matColumnDef="code">
                    <th mat-header-cell *matHeaderCellDef>Mã môn</th>
                    <td mat-cell *matCellDef="let row">{{ row.code }}</td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Tên môn</th>
                    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="semester">
                    <th mat-header-cell *matHeaderCellDef>Học kỳ</th>
                    <td mat-cell *matCellDef="let row">
                      <span class="sem-badge" [class.sem-badge--summer]="row.semester === 3">
                        {{ formatSemester(row.semester) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="coefficient">
                    <th mat-header-cell *matHeaderCellDef>Hệ số</th>
                    <td mat-cell *matCellDef="let row">{{ row.coefficient ?? row.credits }}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                    <td mat-cell *matCellDef="let row">
                      <span
                        class="badge"
                        [class.badge-active]="row.isActive"
                        [class.badge-off]="!row.isActive"
                      >
                        {{ row.isActive ? 'Đang bật' : 'Đang tắt' }}
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
                          aria-label="Sửa môn"
                          title="Sửa môn"
                          (click)="openEditSubjectDialog(row)"
                        >
                          <lucide-icon name="pencil" [size]="15"></lucide-icon>
                        </button>
                        <button
                          type="button"
                          class="action-btn"
                          [class.action-btn--danger]="row.isActive"
                          [attr.aria-label]="row.isActive ? 'Tắt môn' : 'Bật môn'"
                          [attr.title]="row.isActive ? 'Tắt môn' : 'Bật môn'"
                          (click)="toggleSubject(row)"
                        >
                          <lucide-icon
                            [name]="row.isActive ? 'x-circle' : 'check-circle'"
                            [size]="15"
                          ></lucide-icon>
                        </button>
                      </div>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="subjectColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: subjectColumns"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Lớp học">
            <div class="tab-pane">
              <div class="filter-bar tab-actions">
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Năm học</mat-label>
                  <mat-select
                    [value]="schoolYearFilter()"
                    (selectionChange)="schoolYearFilter.set($event.value)"
                  >
                    <mat-option value="all">Tất cả</mat-option>
                    @for (year of schoolYearOptions(); track year) {
                      <mat-option [value]="year">{{ year }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="table-wrap">
                <table mat-table [dataSource]="filteredClasses()" class="full-table nttu-table">
                  <ng-container matColumnDef="code">
                    <th mat-header-cell *matHeaderCellDef>Mã lớp HP</th>
                    <td mat-cell *matCellDef="let row">{{ row.code }}</td>
                  </ng-container>

                  <ng-container matColumnDef="subject">
                    <th mat-header-cell *matHeaderCellDef>Môn học</th>
                    <td mat-cell *matCellDef="let row">{{ getSubjectName(row.subjectId) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="schoolYear">
                    <th mat-header-cell *matHeaderCellDef>Năm học</th>
                    <td mat-cell *matCellDef="let row">
                      {{ getSchoolYearName(row.schoolYearId) }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="semester">
                    <th mat-header-cell *matHeaderCellDef>Học kỳ</th>
                    <td mat-cell *matCellDef="let row">
                      <span class="sem-badge" [class.sem-badge--summer]="row.semester === 3">
                        HK{{ row.semester }}{{ row.semester === 3 ? ' - Hè' : '' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="students">
                    <th mat-header-cell *matHeaderCellDef>Sĩ số</th>
                    <td mat-cell *matCellDef="let row">{{ row.studentCount }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="classColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: classColumns"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Giáo viên">
            <div class="tab-pane">
              <div class="table-wrap">
                <table mat-table [dataSource]="teachers()" class="full-table nttu-table">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Họ tên</th>
                    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="email">
                    <th mat-header-cell *matHeaderCellDef>Email</th>
                    <td mat-cell *matCellDef="let row">{{ row.email }}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                    <td mat-cell *matCellDef="let row">
                      <span
                        class="badge"
                        [class.badge-active]="row.isActive !== false"
                        [class.badge-off]="row.isActive === false"
                      >
                        {{ row.isActive === false ? 'Tạm khóa' : 'Hoạt động' }}
                      </span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="teacherColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: teacherColumns"></tr>
                </table>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
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

      .subtitle {
        margin: 0;
        color: var(--text-sub);
      }

      .state-card {
        min-height: 260px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        color: var(--text-sub);
      }

      .state-card.error {
        color: #dc2626;
      }

      .hero-card {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        border: 1px solid var(--gray-200);
        padding: 1rem 1.2rem 1.05rem;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--blue);
        font-weight: 700;
        font-size: 0.8rem;
      }

      h1 {
        margin: 0.25rem 0;
        color: var(--navy);
      }

      .hero-card p {
        margin: 0;
        color: var(--text-sub);
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(90px, 1fr));
        gap: 0.75rem;
        text-align: center;
      }

      .meta-grid div {
        background: var(--gray-50);
        border-radius: var(--radius-sm);
        padding: 0.65rem;
      }

      .meta-grid strong {
        display: block;
        color: var(--navy);
        font-size: 1.2rem;
      }

      .meta-grid span {
        color: var(--text-sub);
        font-size: 0.82rem;
      }

      .detail-tabs {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        background: var(--white);
        overflow: hidden;
      }

      .tab-pane {
        padding: 0.95rem 1rem 1rem;
        display: grid;
        gap: 0.75rem;
      }

      .tab-actions {
        justify-content: flex-start;
        align-items: center;
      }

      .filter-field {
        width: 180px;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .table-wrap {
        overflow-x: auto;
        padding-bottom: 0.5rem;
      }

      .full-table {
        width: 100%;
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

      @media (max-width: 768px) {
        .hero-card {
          flex-direction: column;
        }

        .tab-pane {
          padding: 0.8rem;
        }

        .meta-grid {
          width: 100%;
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `,
  ],
})
export class DepartmentDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly department = signal<DepartmentDetailResponse | null>(null);
  readonly subjects = signal<Subject[]>([]);
  readonly classes = signal<Class[]>([]);
  readonly teachers = signal<User[]>([]);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly subjectSemesterFilter = signal<'all' | '1' | '2' | '3'>('all');
  readonly schoolYearFilter = signal<string>('all');

  readonly schoolYearOptions = computed(() => {
    const names = this.classes()
      .map((item) => this.getSchoolYearName(item.schoolYearId))
      .filter((name) => !!name);

    return Array.from(new Set(names));
  });

  readonly filteredClasses = computed(() => {
    const selectedYear = this.schoolYearFilter();
    if (selectedYear === 'all') {
      return this.classes();
    }

    return this.classes().filter(
      (item) => this.getSchoolYearName(item.schoolYearId) === selectedYear,
    );
  });

  readonly subjectColumns = ['code', 'name', 'semester', 'coefficient', 'status', 'actions'];
  readonly classColumns = ['code', 'subject', 'schoolYear', 'semester', 'students'];
  readonly teacherColumns = ['name', 'email', 'status'];

  private departmentId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.departmentId = params.get('id') ?? '';
      if (!this.departmentId) {
        this.errorMessage.set('Không tìm thấy mã khoa.');
        this.isLoading.set(false);
        return;
      }

      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      detail: this.apiService
        .get<ApiResponse<DepartmentDetailResponse>>(`/departments/${this.departmentId}`)
        .pipe(map((response) => response.data)),
      classes: this.apiService
        .get<ApiResponse<Class[]>>(`/departments/${this.departmentId}/classes`)
        .pipe(map((response) => response.data ?? [])),
      subjects: this.getSubjectRequest(),
    })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ detail, classes, subjects }) => {
          this.department.set(detail);
          this.classes.set(classes);
          this.subjects.set(subjects);
          this.teachers.set(detail.teachers ?? []);

          const options = this.schoolYearOptions();
          if (!options.includes(this.schoolYearFilter())) {
            this.schoolYearFilter.set('all');
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  onSemesterFilterChange(value: 'all' | '1' | '2' | '3'): void {
    this.subjectSemesterFilter.set(value);
    this.getSubjectRequest()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subjects) => {
          this.subjects.set(subjects);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
        },
      });
  }

  openCreateSubjectDialog(): void {
    const dialogRef = this.dialog.open(DepartmentSubjectDialogComponent, {
      width: '620px',
      data: {
        mode: 'create',
        subject: null,
        departmentId: this.departmentId,
      } satisfies SubjectDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: SubjectUpsertPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .post<ApiResponse<Subject>, SubjectUpsertPayload>('/subjects', payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Đã thêm môn học', 'Đóng', { duration: 2000 });
              this.onSemesterFilterChange(this.subjectSemesterFilter());
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  openEditSubjectDialog(subject: Subject): void {
    const dialogRef = this.dialog.open(DepartmentSubjectDialogComponent, {
      width: '620px',
      data: {
        mode: 'edit',
        subject,
        departmentId: this.departmentId,
      } satisfies SubjectDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: SubjectUpsertPayload | undefined) => {
        if (!payload) {
          return;
        }

        this.apiService
          .put<ApiResponse<Subject>, SubjectUpsertPayload>(`/subjects/${subject._id}`, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Cập nhật môn học thành công', 'Đóng', { duration: 2000 });
              this.onSemesterFilterChange(this.subjectSemesterFilter());
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
            },
          });
      });
  }

  toggleSubject(subject: Subject): void {
    this.apiService
      .patch<ApiResponse<{ _id: string; isActive: boolean }>, Record<string, never>>(
        `/subjects/${subject._id}/toggle`,
        {},
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã cập nhật trạng thái môn học', 'Đóng', { duration: 2000 });
          this.onSemesterFilterChange(this.subjectSemesterFilter());
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2600 });
        },
      });
  }

  getSubjectName(value: Class['subjectId']): string {
    if (!value) {
      return '-';
    }

    if (typeof value === 'string') {
      const found = this.subjects().find((item) => item._id === value);
      return found?.name ?? '-';
    }

    return value.name;
  }

  getSchoolYearName(value: Class['schoolYearId']): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.name;
  }

  formatSemester(value: Subject['semester']): string {
    if (value === 'all') {
      return 'Tất cả kỳ';
    }

    if (value === 3) {
      return 'HK3 - Hè';
    }

    return `HK${value}`;
  }

  goBack(): void {
    this.router.navigate(['/departments']);
  }

  private getSubjectRequest() {
    const semester = this.subjectSemesterFilter();
    const query = semester === 'all' ? undefined : { semester };

    return this.apiService
      .get<ApiResponse<Subject[]>>(`/departments/${this.departmentId}/subjects`, query)
      .pipe(map((response) => response.data ?? []));
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
  selector: 'app-department-subject-dialog',
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
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Thêm môn mới' : 'Sửa môn học' }}</h2>

    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-form">
      <div class="grid-2">
        <mat-form-field appearance="outline">
          <mat-label>Mã môn</mat-label>
          <input matInput formControlName="code" [readonly]="data.mode === 'edit'" />
          <mat-error *ngIf="form.controls.code.hasError('required')">Mã môn là bắt buộc</mat-error>
          <mat-error *ngIf="form.controls.code.hasError('pattern')">Chỉ a-z và số</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Hệ số</mat-label>
          <input matInput type="number" min="1" max="3" formControlName="coefficient" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Tên môn</mat-label>
        <input matInput formControlName="name" />
        <mat-error *ngIf="form.controls.name.hasError('required')">Tên môn là bắt buộc</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Học kỳ</mat-label>
        <mat-select formControlName="semester">
          <mat-option [value]="1">HK1</mat-option>
          <mat-option [value]="2">HK2</mat-option>
          <mat-option [value]="3">HK3 - Hè</mat-option>
          <mat-option value="all">Tất cả kỳ</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="grade-box">
        <p>Khối áp dụng</p>
        <label
          ><input type="checkbox" [checked]="isChecked(10)" (change)="toggleGrade(10, $event)" />
          10</label
        >
        <label
          ><input type="checkbox" [checked]="isChecked(11)" (change)="toggleGrade(11, $event)" />
          11</label
        >
        <label
          ><input type="checkbox" [checked]="isChecked(12)" (change)="toggleGrade(12, $event)" />
          12</label
        >
      </div>
    </form>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button mat-flat-button type="button" class="btn-primary" (click)="submit()">
        {{ data.mode === 'create' ? 'Thêm môn' : 'Lưu thay đổi' }}
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

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .grade-box {
        border: 1px dashed var(--gray-300);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .grade-box p {
        margin: 0;
        font-weight: 600;
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
export class DepartmentSubjectDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<DepartmentSubjectDialogComponent, SubjectUpsertPayload | undefined>,
  );
  readonly data = inject<SubjectDialogData>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+$/)]],
    name: ['', [Validators.required]],
    semester: ['all' as 1 | 2 | 3 | 'all', [Validators.required]],
    coefficient: [1, [Validators.required, Validators.min(1), Validators.max(3)]],
    gradeLevel: [[10, 11, 12] as number[]],
  });

  constructor() {
    if (this.data.subject) {
      this.form.patchValue({
        code: this.data.subject.code,
        name: this.data.subject.name,
        semester: this.data.subject.semester,
        coefficient: this.data.subject.coefficient ?? this.data.subject.credits,
        gradeLevel: this.data.subject.gradeLevel?.length
          ? this.data.subject.gradeLevel
          : [10, 11, 12],
      });
    }
  }

  close(): void {
    this.dialogRef.close(undefined);
  }

  isChecked(grade: number): boolean {
    return this.form.controls.gradeLevel.value.includes(grade);
  }

  toggleGrade(grade: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const current = [...this.form.controls.gradeLevel.value];

    if (target.checked && !current.includes(grade)) {
      current.push(grade);
    }

    if (!target.checked) {
      const index = current.indexOf(grade);
      if (index >= 0) {
        current.splice(index, 1);
      }
    }

    this.form.controls.gradeLevel.setValue(current.length ? current : [10]);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const coefficient = Number(raw.coefficient);

    const payload: SubjectUpsertPayload = {
      name: raw.name.trim(),
      departmentId: this.data.departmentId,
      semester: raw.semester,
      coefficient,
      credits: coefficient,
      gradeLevel: raw.gradeLevel,
      category: 'theory',
    };

    if (this.data.mode === 'create') {
      payload.code = raw.code.trim().toLowerCase();
    }

    this.dialogRef.close(payload);
  }
}
