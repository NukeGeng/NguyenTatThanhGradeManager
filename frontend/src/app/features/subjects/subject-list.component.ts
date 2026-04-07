import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Department, Subject } from '../../shared/models/interfaces';

type SemesterFilter = 'all' | '1' | '2';

interface SubjectFormData {
  mode: 'create' | 'edit';
  departments: Department[];
  subject: Subject | null;
}

interface SubjectUpsertPayload {
  code?: string;
  name: string;
  departmentId: string;
  semester: 1 | 2 | 'both';
  coefficient: number;
  credits: number;
  gradeLevel: number[];
  category: Subject['category'];
}

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTableModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Môn học</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản trị Admin</p>
          <h1>Quản lý môn học</h1>
          <p class="subtitle">
            Quản lý mã môn, khoa phụ trách, học kỳ và trạng thái hoạt động của môn học.
          </p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="plus" [size]="16"></lucide-icon>
          Thêm môn
        </button>
      </header>

      <mat-card class="content-card">
        <div class="filter-bar">
          <mat-form-field appearance="outline">
            <mat-label>Khoa</mat-label>
            <mat-select
              [value]="selectedDepartmentId"
              (selectionChange)="onDepartmentChange($event.value)"
            >
              <mat-option value="all">Tất cả</mat-option>
              @for (department of departments; track department._id) {
                <mat-option [value]="department._id"
                  >{{ department.code }} - {{ department.name }}</mat-option
                >
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Học kỳ</mat-label>
            <mat-select
              [value]="selectedSemester"
              (selectionChange)="onSemesterChange($event.value)"
            >
              <mat-option value="all">Tất cả</mat-option>
              <mat-option value="1">HK1</mat-option>
              <mat-option value="2">HK2</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Tìm môn học</mat-label>
            <input
              matInput
              [(ngModel)]="searchKeyword"
              (ngModelChange)="applySearchFilter()"
              placeholder="Nhập mã môn hoặc tên môn"
            />
          </mat-form-field>

          <div class="spacer"></div>

          <mat-slide-toggle [checked]="activeOnly" (change)="onActiveOnlyChange($event.checked)">
            Chỉ active
          </mat-slide-toggle>
        </div>

        @if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>Đang tải danh sách môn học...</p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="20"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
          </div>
        } @else if (filteredSubjects.length === 0) {
          <div class="empty-state">
            <lucide-icon name="book-open" [size]="44"></lucide-icon>
            <h3>Không có môn học phù hợp</h3>
            <p>Thử đổi bộ lọc hoặc thêm môn học mới.</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="filteredSubjects" class="full-table nttu-table">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Mã môn</th>
                <td mat-cell *matCellDef="let row">{{ row.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Tên môn</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>

              <ng-container matColumnDef="department">
                <th mat-header-cell *matHeaderCellDef>Khoa</th>
                <td mat-cell *matCellDef="let row">{{ getDepartmentCode(row.departmentId) }}</td>
              </ng-container>

              <ng-container matColumnDef="semester">
                <th mat-header-cell *matHeaderCellDef>Học kỳ</th>
                <td mat-cell *matCellDef="let row">{{ formatSemester(row.semester) }}</td>
              </ng-container>

              <ng-container matColumnDef="coefficient">
                <th mat-header-cell *matHeaderCellDef>Hệ số</th>
                <td mat-cell *matCellDef="let row">{{ row.coefficient ?? row.credits }}</td>
              </ng-container>

              <ng-container matColumnDef="weights">
                <th mat-header-cell *matHeaderCellDef>Trọng số</th>
                <td mat-cell *matCellDef="let row">
                  <span class="weight-display">{{ getWeightDisplay(row) }}</span>
                </td>
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
                      (click)="openEditDialog(row)"
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

                    <button
                      type="button"
                      class="action-btn action-btn--danger"
                      aria-label="Xóa môn"
                      title="Xóa môn"
                      (click)="deleteSubject(row)"
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
        .search-field {
          width: 100%;
        }
      }
    `,
  ],
})
export class SubjectListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'code',
    'name',
    'department',
    'semester',
    'coefficient',
    'weights',
    'status',
    'actions',
  ];

  departments: Department[] = [];
  subjects: Subject[] = [];
  filteredSubjects: Subject[] = [];

  selectedDepartmentId = 'all';
  selectedSemester: SemesterFilter = 'all';
  activeOnly = true;
  searchKeyword = '';

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartmentId = value;
    this.loadSubjectsOnly();
  }

  onSemesterChange(value: SemesterFilter): void {
    this.selectedSemester = value;
    this.loadSubjectsOnly();
  }

  onActiveOnlyChange(value: boolean): void {
    this.activeOnly = value;
    this.loadSubjectsOnly();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      departments: this.apiService
        .get<ApiResponse<Department[]>>('/departments')
        .pipe(map((response) => response.data ?? [])),
      subjects: this.fetchSubjects(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ departments, subjects }) => {
          this.departments = departments;
          this.subjects = subjects;
          this.applySearchFilter();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.filteredSubjects = [];
        },
      });
  }

  loadSubjectsOnly(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.fetchSubjects()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (subjects) => {
          this.subjects = subjects;
          this.applySearchFilter();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.filteredSubjects = [];
        },
      });
  }

  applySearchFilter(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();

    this.filteredSubjects = this.subjects.filter((item) => {
      if (!keyword) {
        return true;
      }

      const text = `${item.code} ${item.name}`.toLowerCase();
      return text.includes(keyword);
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubjectFormDialogComponent, {
      width: '640px',
      data: {
        mode: 'create',
        departments: this.departments,
        subject: null,
      } satisfies SubjectFormData,
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
              this.snackBar.open('Đã thêm môn học', 'Đóng', { duration: 2200 });
              this.loadSubjectsOnly();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
            },
          });
      });
  }

  openEditDialog(subject: Subject): void {
    const dialogRef = this.dialog.open(SubjectFormDialogComponent, {
      width: '640px',
      data: {
        mode: 'edit',
        departments: this.departments,
        subject,
      } satisfies SubjectFormData,
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
              this.snackBar.open('Cập nhật môn học thành công', 'Đóng', { duration: 2200 });
              this.loadSubjectsOnly();
            },
            error: (error: unknown) => {
              this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
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
          this.snackBar.open('Đã cập nhật trạng thái môn học', 'Đóng', { duration: 2200 });
          this.loadSubjectsOnly();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 2800 });
        },
      });
  }

  deleteSubject(subject: Subject): void {
    const message =
      'Môn này đã có dữ liệu điểm. Hãy TẮT thay vì XÓA để giữ lịch sử.\n\nBạn vẫn muốn xóa?';
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }

    this.apiService
      .delete<ApiResponse<Subject>>(`/subjects/${subject._id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã xóa môn học', 'Đóng', { duration: 2200 });
          this.loadSubjectsOnly();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveErrorMessage(error), 'Đóng', { duration: 3000 });
        },
      });
  }

  getDepartmentCode(value: Subject['departmentId']): string {
    if (typeof value !== 'string') {
      return value.code;
    }

    const found = this.departments.find((department) => department._id === value);
    return found?.code ?? value;
  }

  formatSemester(value: Subject['semester']): string {
    if (value === 'both') {
      return 'Cả hai';
    }

    return `HK${value}`;
  }

  getWeightDisplay(value: Subject): string {
    const weights = value.defaultWeights;
    return `TX:${weights.tx} GK:${weights.gk} TH:${weights.th} TKT:${weights.tkt}`;
  }

  private fetchSubjects() {
    const query: Record<string, string | boolean> = {};

    if (this.selectedDepartmentId !== 'all') {
      query['departmentId'] = this.selectedDepartmentId;
    }

    if (this.selectedSemester !== 'all') {
      query['semester'] = this.selectedSemester;
    }

    query['isActive'] = this.activeOnly;

    return this.apiService
      .get<ApiResponse<Subject[]>>('/subjects', query)
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
  selector: 'app-subject-form-dialog',
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
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Thêm môn học' : 'Sửa môn học' }}</h2>

    <form [formGroup]="form" mat-dialog-content class="dialog-form" (ngSubmit)="submit()">
      <div class="grid-2">
        <mat-form-field appearance="outline">
          <mat-label>Mã môn</mat-label>
          <input matInput formControlName="code" [readonly]="data.mode === 'edit'" />
          <mat-error *ngIf="form.controls.code.hasError('required')">Mã môn là bắt buộc</mat-error>
          <mat-error *ngIf="form.controls.code.hasError('pattern')"
            >Chỉ cho phép a-z và số</mat-error
          >
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
        <mat-label>Khoa</mat-label>
        <mat-select formControlName="departmentId">
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
          <mat-option value="both">Cả hai</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="checkbox-box">
        <p>Khối áp dụng</p>
        <mat-checkbox [checked]="isChecked(10)" (change)="toggleGradeLevel(10, $event.checked)"
          >10</mat-checkbox
        >
        <mat-checkbox [checked]="isChecked(11)" (change)="toggleGradeLevel(11, $event.checked)"
          >11</mat-checkbox
        >
        <mat-checkbox [checked]="isChecked(12)" (change)="toggleGradeLevel(12, $event.checked)"
          >12</mat-checkbox
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
        min-width: min(600px, 92vw);
        display: grid;
        gap: 0.75rem;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .checkbox-box {
        border: 1px dashed var(--gray-300);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .checkbox-box p {
        margin: 0;
        font-weight: 700;
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
export class SubjectFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<SubjectFormDialogComponent, SubjectUpsertPayload | undefined>,
  );
  readonly data = inject<SubjectFormData>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+$/)]],
    name: ['', [Validators.required]],
    departmentId: ['', [Validators.required]],
    semester: ['both' as 1 | 2 | 'both', [Validators.required]],
    coefficient: [1, [Validators.required, Validators.min(1), Validators.max(3)]],
    gradeLevel: [[10, 11, 12] as number[]],
  });

  constructor() {
    if (this.data.subject) {
      this.form.patchValue({
        code: this.data.subject.code,
        name: this.data.subject.name,
        departmentId:
          typeof this.data.subject.departmentId === 'string'
            ? this.data.subject.departmentId
            : this.data.subject.departmentId._id,
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

  toggleGradeLevel(grade: number, checked: boolean): void {
    const current = [...this.form.controls.gradeLevel.value];
    const index = current.indexOf(grade);

    if (checked && index < 0) {
      current.push(grade);
    }

    if (!checked && index >= 0) {
      current.splice(index, 1);
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
      departmentId: raw.departmentId,
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
