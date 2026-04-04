import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  semester: 1 | 2;
  teacherId: string | null;
}

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [
    CommonModule,
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
          <p class="eyebrow">Quản lý đào tạo</p>
          <h1>Danh sách lớp học phần</h1>
          <p class="subtitle">Theo dõi lớp theo năm học, sĩ số và giáo viên phụ trách.</p>
        </div>

        <button mat-flat-button type="button" class="btn-primary" (click)="openCreateDialog()">
          <lucide-icon name="plus" [size]="16"></lucide-icon>
          Thêm lớp
        </button>
      </header>

      <mat-card>
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
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="classes" class="full-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Tên lớp</th>
                <td mat-cell *matCellDef="let row">
                  <button type="button" class="link-btn" (click)="openDetail(row)">
                    {{ row.name || row.code }}
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="gradeLevel">
                <th mat-header-cell *matHeaderCellDef>Khối</th>
                <td mat-cell *matCellDef="let row">{{ getGradeLevelLabel(row.subjectId) }}</td>
              </ng-container>

              <ng-container matColumnDef="schoolYear">
                <th mat-header-cell *matHeaderCellDef>Năm học</th>
                <td mat-cell *matCellDef="let row">{{ getSchoolYearName(row.schoolYearId) }}</td>
              </ng-container>

              <ng-container matColumnDef="studentCount">
                <th mat-header-cell *matHeaderCellDef>Sĩ số</th>
                <td mat-cell *matCellDef="let row">{{ row.studentCount }}</td>
              </ng-container>

              <ng-container matColumnDef="teacher">
                <th mat-header-cell *matHeaderCellDef>Giáo viên</th>
                <td mat-cell *matCellDef="let row">{{ getTeacherName(row.teacherId) }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Thao tác</th>
                <td mat-cell *matCellDef="let row" class="actions-cell">
                  <button mat-stroked-button type="button" (click)="openEditDialog(row)">
                    <lucide-icon name="pencil" [size]="16"></lucide-icon>
                    Sửa
                  </button>
                  <button
                    mat-stroked-button
                    type="button"
                    class="danger"
                    (click)="deleteClass(row)"
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

      .table-wrap {
        overflow-x: auto;
      }

      .full-table {
        width: 100%;
      }

      .link-btn {
        border: none;
        background: transparent;
        color: var(--blue);
        text-decoration: underline;
        cursor: pointer;
        font: inherit;
        padding: 0;
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
      }

      .state-block.error {
        color: #dc2626;
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

  readonly displayedColumns = [
    'name',
    'gradeLevel',
    'schoolYear',
    'studentCount',
    'teacher',
    'actions',
  ];

  classes: Class[] = [];
  departments: Department[] = [];
  schoolYears: SchoolYear[] = [];
  subjects: Subject[] = [];
  teachers: User[] = [];

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
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ClassFormDialogComponent, {
      width: '680px',
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
      width: '680px',
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

  private resolveSubject(value: Class['subjectId']): Subject | null {
    if (typeof value !== 'string') {
      return value;
    }

    return this.subjects.find((subject) => subject._id === value) ?? null;
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
        min-width: min(640px, 92vw);
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
    semester: [1 as 1 | 2, [Validators.required]],
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
