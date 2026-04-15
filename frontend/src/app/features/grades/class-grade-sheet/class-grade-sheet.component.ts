import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin, map } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiResponse,
  Class,
  Grade,
  GradeLetter,
  SchoolYear,
  Student,
} from '../../../shared/models/interfaces';

interface RegistrationTermOption {
  key: string;
  schoolYearId: string;
  semester: 1 | 2 | 3;
  label: string;
}

@Component({
  selector: 'app-class-grade-sheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Nhập điểm</span>
        <span class="breadcrumb-sep">/</span>
        <span>Bảng điểm cả lớp</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Tổng hợp điểm lớp</p>
          <h1 class="page-title">Bảng điểm theo lớp học phần</h1>
          <p class="subtitle">Xem toàn bộ điểm sinh viên trong một lớp theo dạng bảng tổng hợp.</p>
        </div>

        <a mat-stroked-button [routerLink]="['/grades']">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lại nhập điểm
        </a>
      </header>

      <mat-card class="content-card card-block">
        <form [formGroup]="selectionForm" class="filters-grid filter-bar">
          <mat-form-field appearance="outline">
            <mat-label>Đợt đăng ký</mat-label>
            <mat-select
              formControlName="registrationTerm"
              (selectionChange)="onRegistrationTermChange()"
            >
              <mat-option value="">Chọn đợt đăng ký</mat-option>
              @for (term of registrationTerms; track term.key) {
                <mat-option [value]="term.key">{{ term.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Lớp học phần</mat-label>
            <mat-select formControlName="classId" (selectionChange)="onClassChange()">
              <mat-option value="">Chọn lớp học phần</mat-option>
              @for (classItem of filteredClasses; track classItem._id) {
                <mat-option [value]="classItem._id">
                  {{ classItem.code }} - {{ classItem.name || classItem.code }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </form>

        @if (selectedClass) {
          <div class="class-meta">
            <p>
              <strong>Lớp:</strong> {{ selectedClass.code }} -
              {{ selectedClass.name || selectedClass.code }}
            </p>
            <p>
              <strong>Trọng số:</strong>
              TX({{ selectedClass.weights.tx }}%) · GK({{ selectedClass.weights.gk }}%) · TH({{
                selectedClass.weights.th
              }}%) · TKT({{ selectedClass.weights.tkt }}%)
            </p>
          </div>
        }
      </mat-card>

      <mat-card class="content-card card-block">
        @if (!selectedClass) {
          <div class="state-block">
            <lucide-icon name="info" [size]="18"></lucide-icon>
            <p>Vui lòng chọn lớp để xem bảng điểm.</p>
          </div>
        } @else if (isLoading) {
          <div class="state-block">
            <mat-spinner [diameter]="32"></mat-spinner>
            <p>Đang tải bảng điểm...</p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="18"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadClassContext()">Thử lại</button>
          </div>
        } @else {
          <div class="summary-row">
            <span
              >Tổng sinh viên: <strong>{{ students.length }}</strong></span
            >
            <span
              >Tỉ lệ đạt: <strong>{{ classPassRate | number: '1.0-1' }}%</strong></span
            >
          </div>

          <div class="score-sheet-wrap">
            <table class="score-sheet score-sheet--wide">
              <thead>
                <tr>
                  <th rowspan="3" class="left-col">STT</th>
                  <th rowspan="3" class="name-col">Họ tên sinh viên</th>
                  <th [attr.colspan]="txHeaderIndexes.length" class="group-col">
                    Đánh giá thường xuyên
                  </th>
                  <th rowspan="3" class="group-col">TL/BTL</th>
                  <th [attr.colspan]="showThColumns ? thHeaderIndexes.length : 1" class="group-col">
                    Điểm thực hành
                  </th>
                  <th rowspan="3" class="group-col">Được dự thi kết thúc HP</th>
                  <th rowspan="3" class="group-col">Điểm thi kết thúc HP</th>
                  <th rowspan="3" class="group-col">Vắng thi</th>
                  <th rowspan="3" class="group-col">Điểm tổng kết</th>
                  <th rowspan="3" class="group-col">Thang điểm 4</th>
                  <th rowspan="3" class="group-col">Điểm chữ</th>
                  <th rowspan="3" class="group-col">Xếp loại</th>
                  <th rowspan="3" class="group-col">Ghi chú</th>
                  <th rowspan="3" class="group-col">Lý do cấm thi kết thúc HP</th>
                  <th rowspan="3" class="group-col">Đạt</th>
                </tr>

                <tr>
                  <th [attr.colspan]="txHeaderIndexes.length" class="group-col">LT Hệ số 1</th>
                  <th [attr.colspan]="showThColumns ? thHeaderIndexes.length : 1" class="group-col">
                    {{ showThColumns ? 'TH' : 'Không áp dụng' }}
                  </th>
                </tr>

                <tr>
                  @for (index of txHeaderIndexes; track index) {
                    <th class="num-col">Điểm TX {{ index }}</th>
                  }

                  @if (showThColumns) {
                    @for (index of thHeaderIndexes; track index) {
                      <th class="num-col">Điểm TH {{ index }}</th>
                    }
                  } @else {
                    <th class="num-col">-</th>
                  }
                </tr>
              </thead>

              <tbody>
                @for (student of students; track student._id; let i = $index) {
                  @let grade = getStudentGrade(student._id);

                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td class="name-col">{{ student.fullName }}</td>

                    @for (index of txHeaderIndexes; track index) {
                      <td>{{ formatScore(scoreAt(grade?.txScores, index - 1)) }}</td>
                    }

                    <td>-</td>

                    @if (showThColumns) {
                      @for (index of thHeaderIndexes; track index) {
                        <td>{{ formatScore(scoreAt(grade?.thScores, index - 1)) }}</td>
                      }
                    } @else {
                      <td>-</td>
                    }

                    <td>
                      <span class="status-dot" [class.ok]="grade?.isDuThi !== false">
                        <lucide-icon
                          [name]="grade?.isDuThi === false ? 'x' : 'check'"
                          [size]="11"
                        ></lucide-icon>
                      </span>
                    </td>

                    <td>
                      <span [class.score-danger]="grade?.tktScore === 4">
                        {{ formatScore(grade?.tktScore) }}
                      </span>
                    </td>

                    <td>
                      <span class="status-dot" [class.ok]="grade?.isVangThi === true">
                        <lucide-icon
                          [name]="grade?.isVangThi ? 'check' : 'x'"
                          [size]="11"
                        ></lucide-icon>
                      </span>
                    </td>

                    <td>{{ formatScore(grade?.finalScore) }}</td>
                    <td>{{ formatScore(grade?.gpa4) }}</td>
                    <td>{{ grade?.letterGrade || '-' }}</td>
                    <td class="rank-col">{{ rankByLetter(grade?.letterGrade) }}</td>
                    <td>-</td>
                    <td>-</td>

                    <td>
                      <span class="status-dot" [class.ok]="isPassGrade(grade)">
                        <lucide-icon
                          [name]="isPassGrade(grade) ? 'check' : 'x'"
                          [size]="11"
                        ></lucide-icon>
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
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

      .card-block {
        border: 1px solid var(--gray-200);
        box-shadow: var(--shadow);
        border-radius: var(--radius);
        padding: 1rem 1.1rem 1.1rem;
      }

      .filters-grid {
        gap: 0.75rem;
      }

      .filters-grid.filter-bar {
        padding: 0;
      }

      .class-meta {
        margin-top: 0.65rem;
        display: grid;
        gap: 0.2rem;
        color: var(--text-sub);
      }

      .class-meta p {
        margin: 0;
      }

      .summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 0.65rem;
        color: var(--text-sub);
      }

      .state-block {
        min-height: 190px;
        display: grid;
        place-content: center;
        justify-items: center;
        text-align: center;
        gap: 0.65rem;
        color: var(--text-sub);
      }

      .state-block.error {
        color: var(--red);
      }

      @media (max-width: 960px) {
        .filters-grid {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class ClassGradeSheetComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectionForm = this.fb.group({
    registrationTerm: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    schoolYearId: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    semester: this.fb.control<1 | 2 | 3 | null>(null, { validators: [Validators.required] }),
    classId: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  schoolYears: SchoolYear[] = [];
  registrationTerms: RegistrationTermOption[] = [];
  classes: Class[] = [];
  filteredClasses: Class[] = [];

  students: Student[] = [];
  classGrades: Grade[] = [];

  selectedClass: Class | null = null;

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadMasterData();
  }

  get txHeaderIndexes(): number[] {
    const txCount = Math.max(1, this.selectedClass?.txCount || 3);
    return Array.from({ length: txCount }, (_, index) => index + 1);
  }

  get thHeaderIndexes(): number[] {
    return [1, 2, 3];
  }

  get showThColumns(): boolean {
    return Number(this.selectedClass?.weights?.th ?? 0) > 0;
  }

  get classPassRate(): number {
    if (!this.students.length) {
      return 0;
    }

    const passCount = this.students.filter((student) =>
      this.isPassGrade(this.getStudentGrade(student._id)),
    ).length;

    return (passCount / this.students.length) * 100;
  }

  onRegistrationTermChange(): void {
    const selectedTermKey = this.selectionForm.controls.registrationTerm.value;
    const selectedTerm = this.registrationTerms.find((item) => item.key === selectedTermKey);

    if (!selectedTerm) {
      this.selectionForm.controls.schoolYearId.setValue('');
      this.selectionForm.controls.semester.setValue(null);
      this.filterClasses();
      return;
    }

    this.selectionForm.controls.schoolYearId.setValue(selectedTerm.schoolYearId);
    this.selectionForm.controls.semester.setValue(selectedTerm.semester);
    this.filterClasses();

    const selectedClassId = this.selectionForm.controls.classId.value;
    if (!selectedClassId || !this.filteredClasses.some((item) => item._id === selectedClassId)) {
      this.selectionForm.controls.classId.setValue('');
      this.selectedClass = null;
      this.students = [];
      this.classGrades = [];
      this.errorMessage = '';
    }
  }

  onClassChange(): void {
    const classId = this.selectionForm.controls.classId.value;
    this.selectedClass = this.classes.find((item) => item._id === classId) || null;

    this.students = [];
    this.classGrades = [];

    if (!this.selectedClass) {
      return;
    }

    this.loadClassContext();
  }

  loadClassContext(): void {
    if (!this.selectedClass) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      students: this.apiService
        .get<ApiResponse<Student[]>>(`/classes/${this.selectedClass._id}/students`)
        .pipe(map((response) => response.data ?? [])),
      grades: this.apiService
        .get<ApiResponse<Grade[]>>(`/grades/class/${this.selectedClass._id}`)
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ students, grades }) => {
          this.students = students;
          this.classGrades = grades;
          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveError(error);
          this.isLoading = false;
        },
      });
  }

  getStudentGrade(studentId: string): Grade | null {
    return (
      this.classGrades.find((item) => {
        const refId = this.resolveRefId(item.studentId);
        return refId === studentId;
      }) || null
    );
  }

  scoreAt(values: Array<number | null> | undefined, index: number): number | null {
    if (!Array.isArray(values) || index < 0 || index >= values.length) {
      return null;
    }

    const value = values[index];
    if (value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }

  formatScore(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return '';
    }

    return numeric.toFixed(2).replace('.', ',');
  }

  rankByLetter(letter: GradeLetter | null | undefined): string {
    if (letter === 'A') {
      return 'Giỏi';
    }

    if (letter === 'B') {
      return 'Khá';
    }

    if (letter === 'C') {
      return 'Trung bình';
    }

    if (letter === 'F') {
      return 'Yếu';
    }

    return '-';
  }

  isPassGrade(grade: Grade | null): boolean {
    if (!grade) {
      return false;
    }

    if (grade.isVangThi) {
      return false;
    }

    const tkt = grade.tktScore;
    if (tkt === null || tkt === undefined || tkt < 4) {
      return false;
    }

    if (tkt === 4) {
      return true;
    }

    return grade.finalScore !== null && grade.finalScore >= 5;
  }

  private loadMasterData(): void {
    forkJoin({
      schoolYears: this.apiService
        .get<ApiResponse<SchoolYear[]>>('/school-years')
        .pipe(map((response) => response.data ?? [])),
      classes: this.apiService
        .get<ApiResponse<Class[]>>('/classes', { hasStudents: true })
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ schoolYears, classes }) => {
          this.schoolYears = schoolYears;
          this.registrationTerms = this.buildRegistrationTerms(schoolYears);
          this.classes = classes;

          if (this.registrationTerms.length > 0) {
            this.selectionForm.controls.registrationTerm.setValue(this.registrationTerms[0].key);
            this.onRegistrationTermChange();
          }

          this.filterClasses();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveError(error);
        },
      });
  }

  private filterClasses(): void {
    const schoolYearId = this.selectionForm.controls.schoolYearId.value;
    const semester = this.selectionForm.controls.semester.value;

    this.filteredClasses = this.classes.filter((classItem) => {
      const classYearId = this.resolveRefId(classItem.schoolYearId);
      const sameYear = schoolYearId ? classYearId === schoolYearId : true;
      const sameSemester = semester ? classItem.semester === semester : true;
      return sameYear && sameSemester;
    });
  }

  private buildRegistrationTerms(schoolYears: SchoolYear[]): RegistrationTermOption[] {
    const sortedYears = [...schoolYears].sort((a, b) => {
      const aStart = Number(String(a.name || '').split('-')[0] || 0);
      const bStart = Number(String(b.name || '').split('-')[0] || 0);
      return bStart - aStart;
    });

    const options: RegistrationTermOption[] = [];
    for (const year of sortedYears) {
      for (const semester of [3, 2, 1] as const) {
        options.push({
          key: `${year._id}:${semester}`,
          schoolYearId: year._id,
          semester,
          label: `HK ${semester} NH ${year.name}`,
        });
      }
    }

    return options;
  }

  private resolveRefId(value: string | { _id: string } | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value._id;
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Không thể kết nối server. Vui lòng kiểm tra backend.';
      }

      const payload = error.error as { message?: unknown };
      if (typeof payload?.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
    }

    return 'Đã có lỗi xảy ra, vui lòng thử lại.';
  }
}
