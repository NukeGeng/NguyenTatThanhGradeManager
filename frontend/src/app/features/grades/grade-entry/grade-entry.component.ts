import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiResponse,
  Class,
  DefaultWeights,
  Grade,
  GradeLetter,
  SchoolYear,
  Student,
} from '../../../shared/models/interfaces';
import { toTenDigitStudentCode } from '../../../shared/utils/code-format.util';

interface GradeUpsertPayload {
  studentId: string;
  classId: string;
  subjectId: string;
  departmentId: string;
  schoolYearId: string;
  semester: 1 | 2 | 3;
  weights: DefaultWeights;
  txScores: Array<number | null>;
  gkScore: number | null;
  thScores: Array<number | null>;
  tktScore: number | null;
  isDuThi: boolean;
  isVangThi: boolean;
}

interface GradePreview {
  finalScore: number | null;
  gpa4: number | null;
  letterGrade: GradeLetter | null;
  resultText: string;
}

interface WeightDialogData {
  weights: DefaultWeights;
}

interface RegistrationTermOption {
  key: string;
  schoolYearId: string;
  semester: 1 | 2 | 3;
  label: string;
}

interface DepartmentFilterOption {
  id: string;
  code: string;
  name: string;
  label: string;
}

interface PredictClassSummary {
  processed: number;
  failed: number;
}

@Component({
  selector: 'app-grade-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
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
        <span>Nhập điểm</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý điểm số</p>
          <h1 class="page-title">Grade Entry</h1>
          <p class="subtitle">
            Chọn lớp học phần, chọn sinh viên và nhập điểm theo hệ đại học NTTU.
          </p>
        </div>

        <div class="btn-row">
          <a mat-stroked-button [routerLink]="['/grades/class-sheet']">
            <lucide-icon name="table" [size]="16"></lucide-icon>
            Xem điểm cả lớp
          </a>

          <button
            mat-flat-button
            class="btn-primary"
            type="button"
            (click)="openBulkImportAllClasses()"
          >
            <lucide-icon name="layers" [size]="16"></lucide-icon>
            Nhập điểm hàng loạt
          </button>
        </div>
      </header>

      <mat-card class="content-card card-block">
        <div class="step-title">
          <span class="step-index">Bước 1</span>
          <h2 class="section-title">Chọn lớp học phần</h2>
        </div>

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
            <mat-label>Khoa</mat-label>
            <mat-select formControlName="departmentId" (selectionChange)="onFilterChange()">
              <mat-option value="all">Tất cả khoa</mat-option>
              @for (department of departmentOptions; track department.id) {
                <mat-option [value]="department.id">{{ department.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Lớp học phần</mat-label>
            <mat-select formControlName="classId" (selectionChange)="onClassChange()">
              <mat-option value="">Chọn lớp học phần</mat-option>
              <mat-option *ngFor="let classItem of filteredClasses" [value]="classItem._id">
                {{ classItem.code }} - {{ classItem.name || classItem.code }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </form>

        <ng-container *ngIf="selectedClass as classData">
          <div class="class-meta">
            <div>
              <p><strong>Tên môn:</strong> {{ getSubjectName(classData) }}</p>
              <p><strong>Số tín chỉ:</strong> {{ getSubjectCredits(classData) }}</p>
              <p>
                <strong>Trọng số:</strong>
                TX({{ currentWeights.tx }}%) · GK({{ currentWeights.gk }}%) · TH({{
                  currentWeights.th
                }}%) · TKT({{ currentWeights.tkt }}%)
              </p>
            </div>

            <div class="class-meta__actions">
              <button mat-stroked-button type="button" (click)="openBulkImportForSelectedClass()">
                <lucide-icon name="arrow-right" [size]="16"></lucide-icon>
                Nhập điểm hàng loạt lớp này
              </button>

              <button
                mat-stroked-button
                type="button"
                [disabled]="isPredictingClass"
                (click)="predictSelectedClass()"
              >
                <lucide-icon name="chart-column-increasing" [size]="16"></lucide-icon>
                {{ isPredictingClass ? 'Đang chạy AI...' : 'Chạy AI dự đoán cả lớp' }}
              </button>

              <button mat-stroked-button type="button" (click)="openWeightDialog()">
                <lucide-icon name="pencil" [size]="16"></lucide-icon>
                Chỉnh trọng số
              </button>
            </div>
          </div>
        </ng-container>
      </mat-card>

      <mat-card class="content-card card-block card-block--table">
        <div class="step-title">
          <span class="step-index">Bước 2</span>
          <h2 class="section-title">Chọn sinh viên</h2>
        </div>

        <ng-container *ngIf="!selectedClass">
          <div class="state-block">
            <lucide-icon name="info" [size]="18"></lucide-icon>
            <p>Vui lòng chọn lớp học phần ở Bước 1 để tải danh sách sinh viên.</p>
          </div>
        </ng-container>

        <ng-container *ngIf="selectedClass">
          <div *ngIf="isLoadingStudents" class="state-block">
            <mat-spinner [diameter]="30"></mat-spinner>
            <p>Đang tải danh sách sinh viên và bảng điểm...</p>
          </div>

          <div *ngIf="!isLoadingStudents && loadErrorMessage" class="state-block error">
            <lucide-icon name="x-circle" [size]="18"></lucide-icon>
            <p>{{ loadErrorMessage }}</p>
            <button mat-stroked-button type="button" (click)="loadClassContext()">Thử lại</button>
          </div>

          <div *ngIf="!isLoadingStudents && !loadErrorMessage" class="score-sheet-wrap">
            <table class="score-sheet score-sheet--compact">
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
                  <th rowspan="3" class="group-col">Đạt</th>
                  <th rowspan="3" class="group-col">Nhập điểm</th>
                </tr>

                <tr>
                  <th [attr.colspan]="txHeaderIndexes.length" class="group-col">LT Hệ số 1</th>
                  <th [attr.colspan]="showThColumns ? thHeaderIndexes.length : 1" class="group-col">
                    {{ showThColumns ? 'TH' : 'Không áp dụng' }}
                  </th>
                </tr>

                <tr>
                  @for (index of txHeaderIndexes; track index) {
                    <th class="num-col tx-col">Điểm TX {{ index }}</th>
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
                  <tr [class.row-active]="selectedStudent?._id === student._id">
                    <td>{{ i + 1 }}</td>
                    <td class="name-col">{{ student.fullName }}</td>

                    @for (index of txHeaderIndexes; track index) {
                      <td class="tx-col">
                        {{
                          formatScore(scoreAt(getStudentGrade(student._id)?.txScores, index - 1))
                        }}
                      </td>
                    }

                    <td>-</td>

                    @if (showThColumns) {
                      @for (index of thHeaderIndexes; track index) {
                        <td>
                          {{
                            formatScore(scoreAt(getStudentGrade(student._id)?.thScores, index - 1))
                          }}
                        </td>
                      }
                    } @else {
                      <td>-</td>
                    }

                    <td>
                      <span
                        class="status-dot"
                        [class.ok]="getStudentGrade(student._id)?.isDuThi !== false"
                      >
                        <lucide-icon
                          [name]="getStudentGrade(student._id)?.isDuThi === false ? 'x' : 'check'"
                          [size]="11"
                        ></lucide-icon>
                      </span>
                    </td>

                    <td>
                      <span
                        [class.score-danger]="
                          scoreAt([getStudentGrade(student._id)?.tktScore ?? null], 0) === 4
                        "
                      >
                        {{ formatScore(getStudentGrade(student._id)?.tktScore) }}
                      </span>
                    </td>

                    <td>
                      <span
                        class="status-dot"
                        [class.ok]="getStudentGrade(student._id)?.isVangThi === true"
                      >
                        <lucide-icon
                          [name]="getStudentGrade(student._id)?.isVangThi ? 'check' : 'x'"
                          [size]="11"
                        ></lucide-icon>
                      </span>
                    </td>

                    <td>{{ formatScore(getStudentGrade(student._id)?.finalScore) }}</td>
                    <td>{{ formatScore(getStudentGrade(student._id)?.gpa4) }}</td>
                    <td>{{ getStudentGrade(student._id)?.letterGrade || '-' }}</td>
                    <td class="rank-col">
                      {{ rankByLetter(getStudentGrade(student._id)?.letterGrade) }}
                    </td>

                    <td>
                      <span class="status-dot" [class.ok]="isPassForStudent(student._id)">
                        <lucide-icon
                          [name]="isPassForStudent(student._id) ? 'check' : 'x'"
                          [size]="11"
                        ></lucide-icon>
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        class="action-btn"
                        aria-label="Nhập điểm sinh viên"
                        title="Nhập điểm sinh viên"
                        (click)="selectStudent(student)"
                      >
                        <lucide-icon name="pencil" [size]="14"></lucide-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="table-summary" *ngIf="students.length > 0">
              <span>Đã nhập điểm: {{ gradedStudentsCount }} / {{ students.length }}</span>
              <span>Điểm TB lớp: {{ classAverageScore | number: '1.2-2' }}</span>
              <span>Tỉ lệ đạt: {{ classPassRate | number: '1.0-1' }}%</span>
            </div>
          </div>
        </ng-container>
      </mat-card>

      <mat-card class="content-card card-block">
        <div class="step-title">
          <span class="step-index">Bước 3</span>
          <h2 class="section-title">Nhập điểm 1 sinh viên</h2>
        </div>

        <ng-container *ngIf="!selectedStudent">
          <div class="state-block">
            <lucide-icon name="users" [size]="18"></lucide-icon>
            <p>Chọn 1 sinh viên ở Bước 2 để bắt đầu nhập điểm.</p>
          </div>
        </ng-container>

        <ng-container *ngIf="selectedStudent">
          <div class="student-head">
            <p>
              <strong>Sinh viên:</strong> {{ selectedStudent.fullName }} ({{
                formatStudentCode(selectedStudent)
              }})
            </p>
          </div>

          <form [formGroup]="gradeForm" class="entry-grid">
            <div class="score-sheet-wrap">
              <table class="score-sheet score-sheet--entry">
                <thead>
                  <tr>
                    @for (index of txHeaderIndexes; track index) {
                      <th class="num-col">TX{{ index }}</th>
                    }
                    <th class="num-col">GK</th>
                    @if (showThColumns) {
                      @for (index of thHeaderIndexes; track index) {
                        <th class="num-col">TH{{ index }}</th>
                      }
                    }
                    <th class="num-col">TKT</th>
                    <th class="group-col">Được dự thi HP</th>
                    <th class="group-col">Vắng thi</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <ng-container formArrayName="txScores">
                      @for (ctrl of txScoresArray.controls; track $index; let i = $index) {
                        <td>
                          <input
                            class="score-edit-input"
                            type="number"
                            [formControlName]="i"
                            min="0"
                            max="10"
                          />
                        </td>
                      }
                    </ng-container>

                    <td>
                      <input
                        class="score-edit-input"
                        type="number"
                        formControlName="gkScore"
                        min="0"
                        max="10"
                      />
                    </td>

                    @if (showThColumns) {
                      <ng-container formArrayName="thScores">
                        @for (ctrl of thScoresArray.controls; track $index; let i = $index) {
                          <td>
                            <input
                              class="score-edit-input"
                              type="number"
                              [formControlName]="i"
                              min="0"
                              max="10"
                            />
                          </td>
                        }
                      </ng-container>
                    }

                    <td>
                      <input
                        class="score-edit-input"
                        type="number"
                        formControlName="tktScore"
                        min="0"
                        max="10"
                      />
                    </td>

                    <td>
                      <mat-checkbox formControlName="isDuThi"></mat-checkbox>
                    </td>

                    <td>
                      <mat-checkbox formControlName="isVangThi" (change)="onVangThiChanged()">
                      </mat-checkbox>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="entry-hints">
              <p class="avg-text">Trung bình TX: {{ txAverage | number: '1.2-2' }}</p>
              @if (showThColumns) {
                <p class="avg-text">Trung bình TH: {{ thAverage | number: '1.2-2' }}</p>
              }

              <p class="hint" *ngIf="gradeForm.controls.isVangThi.value">
                Sinh viên đang ở trạng thái vắng thi, ô TKT đã khóa.
              </p>
            </div>
          </form>

          <div class="preview-box">
            <div>
              <p class="label">Điểm tổng kết</p>
              <p class="value">
                {{ preview.finalScore !== null ? (preview.finalScore | number: '1.2-2') : '--' }}
              </p>
            </div>
            <div>
              <p class="label">Thang 4</p>
              <p class="value">
                {{ preview.gpa4 !== null ? (preview.gpa4 | number: '1.1-1') : '--' }}
              </p>
            </div>
            <div>
              <p class="label">Xếp loại chữ</p>
              <p class="value">{{ preview.letterGrade || '--' }}</p>
            </div>
            <div>
              <p class="label">Kết quả</p>
              <p class="value">{{ preview.resultText }}</p>
            </div>
            <p class="rule-note">
              Quy tắc đặc biệt: nếu TKT = 4 thì xếp loại C dù điểm tổng kết cao.
            </p>
          </div>

          <div class="actions-row">
            <button
              mat-flat-button
              class="btn-primary"
              type="button"
              [disabled]="isSaving"
              (click)="saveGrade()"
            >
              <lucide-icon name="check-circle" [size]="16"></lucide-icon>
              {{ isSaving ? 'Đang lưu...' : 'Lưu điểm' }}
            </button>
          </div>
        </ng-container>
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
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
      }

      h1 {
        margin: 0.25rem 0;
        color: var(--navy-dark);
      }

      .subtitle {
        margin: 0;
        color: var(--text-sub);
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .card-block {
        border: 1px solid var(--gray-200);
        box-shadow: var(--shadow);
        border-radius: var(--radius);
        padding: 1rem 1.1rem 1.1rem;
      }

      .card-block--table {
        padding-inline: 0.6rem;
      }

      .step-title {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        margin-bottom: 0.8rem;
      }

      .step-title h2 {
        margin: 0;
        color: var(--navy-dark);
        font-size: 1.05rem;
        border-left: 0;
        padding-left: 0;
      }

      .step-index {
        min-height: 26px;
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
        background: var(--blue-pale);
        color: var(--blue);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.72rem;
        line-height: 1;
        white-space: nowrap;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .filters-grid.filter-bar {
        padding: 0.75rem;
      }

      .class-meta {
        margin-top: 0.5rem;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.85rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        background: var(--gray-50);
      }

      .class-meta p {
        margin: 0.25rem 0;
      }

      .class-meta__actions {
        display: flex;
        gap: 0.55rem;
        flex-wrap: wrap;
      }

      .state-block {
        min-height: 180px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.65rem;
        color: var(--text-sub);
        text-align: center;
      }

      .state-block.error {
        color: var(--red);
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

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .status-done {
        background: var(--green-pale);
        color: var(--green);
      }

      .status-partial {
        background: var(--yellow-pale);
        color: var(--yellow);
      }

      .status-empty {
        background: var(--gray-100);
        color: var(--gray-600);
      }

      .row-active {
        background: var(--blue-pale);
      }

      .table-summary {
        border-top: 1px dashed var(--gray-300);
        margin-top: 0.5rem;
        padding-top: 0.65rem;
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        color: var(--text-sub);
        font-size: 0.82rem;
      }

      .student-head {
        margin-bottom: 0.5rem;
      }

      .student-head p {
        margin: 0;
      }

      .entry-grid {
        display: grid;
        gap: 1rem;
      }

      h3 {
        margin: 0 0 0.5rem;
        color: var(--navy-dark);
        font-size: 0.98rem;
      }

      .score-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.65rem;
      }

      .single-field {
        width: min(340px, 100%);
      }

      .avg-text {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.85rem;
      }

      .hint {
        margin: 0;
        color: var(--yellow);
        font-size: 0.82rem;
      }

      .check-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .preview-box {
        margin-top: 1rem;
        border: 1px dashed var(--blue);
        background: var(--blue-pale);
        border-radius: var(--radius-sm);
        padding: 0.85rem;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.7rem;
      }

      .label {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.78rem;
      }

      .value {
        margin: 0.2rem 0 0;
        color: var(--navy-dark);
        font-size: 1.05rem;
        font-weight: 700;
      }

      .rule-note {
        grid-column: 1 / -1;
        margin: 0;
        color: var(--yellow);
        font-size: 0.82rem;
      }

      .actions-row {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
      }

      @media (max-width: 960px) {
        .filters-grid {
          grid-template-columns: 1fr;
        }

        .score-grid {
          grid-template-columns: 1fr;
        }

        .preview-box {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .preview-box {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class GradeEntryComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectionForm = this.fb.group({
    registrationTerm: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    departmentId: this.fb.control<string>('all', {
      nonNullable: true,
    }),
    schoolYearId: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    semester: this.fb.control<1 | 2 | 3 | null>(null, { validators: [Validators.required] }),
    classId: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly gradeForm = this.fb.group({
    txScores: this.fb.array<FormControl<number | null>>([]),
    gkScore: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10)]),
    thScores: this.fb.array<FormControl<number | null>>([]),
    tktScore: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10)]),
    isDuThi: this.fb.control<boolean>(true, { nonNullable: true }),
    isVangThi: this.fb.control<boolean>(false, { nonNullable: true }),
  });

  schoolYears: SchoolYear[] = [];
  registrationTerms: RegistrationTermOption[] = [];
  departmentOptions: DepartmentFilterOption[] = [];
  classes: Class[] = [];
  filteredClasses: Class[] = [];

  students: Student[] = [];
  classGrades: Grade[] = [];

  selectedClass: Class | null = null;
  selectedStudent: Student | null = null;
  selectedGrade: Grade | null = null;

  currentWeights: DefaultWeights = {
    tx: 10,
    gk: 30,
    th: 0,
    tkt: 60,
  };

  isLoadingStudents = false;
  isSaving = false;
  isPredictingClass = false;
  loadErrorMessage = '';

  ngOnInit(): void {
    this.loadMasterData();
  }

  get txScoresArray(): FormArray<FormControl<number | null>> {
    return this.gradeForm.controls.txScores;
  }

  get thScoresArray(): FormArray<FormControl<number | null>> {
    return this.gradeForm.controls.thScores;
  }

  get txAverage(): number {
    return this.meanScore(this.txScoresArray.getRawValue());
  }

  get thAverage(): number {
    return this.meanScore(this.thScoresArray.getRawValue());
  }

  get txHeaderIndexes(): number[] {
    const txCount = Math.max(1, this.selectedClass?.txCount || 3);
    return Array.from({ length: txCount }, (_, index) => index + 1);
  }

  get thHeaderIndexes(): number[] {
    return [1, 2, 3];
  }

  get showThColumns(): boolean {
    return this.currentWeights.th > 0;
  }

  get preview(): GradePreview {
    const isVangThi = this.gradeForm.controls.isVangThi.value;
    const tktScore = this.gradeForm.controls.tktScore.value;

    if (isVangThi) {
      return {
        finalScore: null,
        gpa4: 0,
        letterGrade: 'F',
        resultText: 'Không đạt',
      };
    }

    if (tktScore === null || tktScore === undefined) {
      return {
        finalScore: null,
        gpa4: null,
        letterGrade: null,
        resultText: 'Chưa đủ dữ liệu',
      };
    }

    const gkScore = this.gradeForm.controls.gkScore.value ?? 0;
    const finalScore =
      this.txAverage * (this.currentWeights.tx / 100) +
      gkScore * (this.currentWeights.gk / 100) +
      this.thAverage * (this.currentWeights.th / 100) +
      tktScore * (this.currentWeights.tkt / 100);

    const rounded = Number(finalScore.toFixed(2));

    if (tktScore < 4) {
      return {
        finalScore: rounded,
        gpa4: 0,
        letterGrade: 'F',
        resultText: 'Không đạt',
      };
    }

    if (tktScore === 4) {
      return {
        finalScore: rounded,
        gpa4: 2,
        letterGrade: 'C',
        resultText: 'Đạt',
      };
    }

    if (rounded >= 8.5) {
      return { finalScore: rounded, gpa4: 4, letterGrade: 'A', resultText: 'Đạt' };
    }

    if (rounded >= 7.0) {
      return { finalScore: rounded, gpa4: 3, letterGrade: 'B', resultText: 'Đạt' };
    }

    if (rounded >= 5.0) {
      return { finalScore: rounded, gpa4: 2, letterGrade: 'C', resultText: 'Đạt' };
    }

    return {
      finalScore: rounded,
      gpa4: 0,
      letterGrade: 'F',
      resultText: 'Không đạt',
    };
  }

  get gradedStudentsCount(): number {
    return this.classGrades.filter((item) => this.isGradeCompleted(item)).length;
  }

  get classAverageScore(): number {
    const values = this.classGrades
      .map((item) => item.finalScore)
      .filter((item): item is number => item !== null && item !== undefined);

    if (!values.length) {
      return 0;
    }

    const total = values.reduce((sum, item) => sum + Number(item), 0);
    return total / values.length;
  }

  get classPassRate(): number {
    if (!this.students.length) {
      return 0;
    }

    const passCount = this.classGrades.filter((item) => this.isPassGrade(item)).length;
    return (passCount / this.students.length) * 100;
  }

  onFilterChange(): void {
    this.filterClasses();

    const selectedClassId = this.selectionForm.controls.classId.value;
    if (!selectedClassId || !this.filteredClasses.some((item) => item._id === selectedClassId)) {
      this.selectionForm.controls.classId.setValue('');
      this.selectedClass = null;
      this.students = [];
      this.classGrades = [];
      this.selectedStudent = null;
      this.selectedGrade = null;
      this.loadErrorMessage = '';
    }
  }

  onRegistrationTermChange(): void {
    const selectedTermKey = this.selectionForm.controls.registrationTerm.value;
    const selectedTerm = this.registrationTerms.find((item) => item.key === selectedTermKey);

    if (!selectedTerm) {
      this.selectionForm.controls.schoolYearId.setValue('');
      this.selectionForm.controls.semester.setValue(null);
      this.onFilterChange();
      return;
    }

    this.selectionForm.controls.schoolYearId.setValue(selectedTerm.schoolYearId);
    this.selectionForm.controls.semester.setValue(selectedTerm.semester);
    this.onFilterChange();
  }

  onClassChange(): void {
    const classId = this.selectionForm.controls.classId.value;
    this.selectedClass = this.classes.find((item) => item._id === classId) || null;

    this.students = [];
    this.classGrades = [];
    this.selectedStudent = null;
    this.selectedGrade = null;

    if (!this.selectedClass) {
      return;
    }

    this.currentWeights = this.normalizeWeights(this.selectedClass.weights);
    this.resetGradeForm(this.selectedClass.txCount || 3, this.currentWeights.th > 0 ? 3 : 0);
    this.loadClassContext();
  }

  onVangThiChanged(): void {
    const isVangThi = this.gradeForm.controls.isVangThi.value;

    if (isVangThi) {
      this.gradeForm.controls.tktScore.setValue(null);
      this.gradeForm.controls.tktScore.disable({ emitEvent: false });
      return;
    }

    this.gradeForm.controls.tktScore.enable({ emitEvent: false });
  }

  openWeightDialog(): void {
    const dialogRef = this.dialog.open(GradeWeightDialogComponent, {
      width: '700px',
      maxWidth: '94vw',
      panelClass: 'grade-weight-dialog-panel',
      data: {
        weights: this.currentWeights,
      } satisfies WeightDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: DefaultWeights | undefined) => {
        if (!result) {
          return;
        }

        this.currentWeights = result;

        const thCount = result.th > 0 ? 3 : 0;
        const txExisting = this.txScoresArray.getRawValue();
        const thExisting = this.thScoresArray.getRawValue();
        this.resetGradeForm(this.selectedClass?.txCount || 3, thCount, txExisting, thExisting);
      });
  }

  loadClassContext(): void {
    if (!this.selectedClass) {
      return;
    }

    this.isLoadingStudents = true;
    this.loadErrorMessage = '';

    forkJoin({
      students: this.apiService
        .get<ApiResponse<Student[]>>(`/classes/${this.selectedClass._id}/students`)
        .pipe(map((response) => response.data ?? [])),
      grades: this.apiService
        .get<ApiResponse<Grade[]>>(`/grades/class/${this.selectedClass._id}`)
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoadingStudents = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ students, grades }) => {
          this.students = students;
          this.classGrades = grades;
        },
        error: (error: unknown) => {
          this.loadErrorMessage = this.resolveError(error);
        },
      });
  }

  openBulkImportAllClasses(): void {
    const schoolYearId = this.selectionForm.get('schoolYearId')?.value || null;
    const semester = this.selectionForm.get('semester')?.value ?? null;
    const queryParams: Record<string, string | number> = {};
    if (schoolYearId) queryParams['schoolYearId'] = schoolYearId;
    if (semester) queryParams['semester'] = semester;
    this.router.navigate(['/grades/import'], { queryParams });
  }

  openBulkImportForSelectedClass(): void {
    if (!this.selectedClass) {
      return;
    }

    const schoolYearId = this.resolveRefId(this.selectedClass.schoolYearId);
    if (!schoolYearId) {
      this.snackBar.open('Không tìm thấy năm học của lớp đã chọn.', 'Đóng', {
        duration: 2800,
      });
      return;
    }

    this.router.navigate(['/grades/import'], {
      queryParams: {
        schoolYearId,
        semester: this.selectedClass.semester,
        classId: this.selectedClass._id,
        autoPredict: 'true',
      },
    });
  }

  predictSelectedClass(): void {
    if (!this.selectedClass || this.isPredictingClass) {
      return;
    }

    this.isPredictingClass = true;

    this.apiService
      .post<ApiResponse<PredictClassSummary>, { classId: string }>('/predictions/predict-class', {
        classId: this.selectedClass._id,
      })
      .pipe(
        finalize(() => {
          this.isPredictingClass = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const processed = Number(response.data?.processed || 0);
          const failed = Number(response.data?.failed || 0);

          this.snackBar.open(`AI đã xử lý ${processed} bảng điểm, lỗi ${failed}.`, 'Đóng', {
            duration: 3200,
          });
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.selectedGrade = this.findStudentGrade(student._id);

    const selectedWeights = this.selectedGrade?.weights || this.currentWeights;
    this.currentWeights = this.normalizeWeights(selectedWeights);

    const txValues = this.selectedGrade?.txScores ?? [];
    const thValues = this.selectedGrade?.thScores ?? [];

    this.resetGradeForm(
      this.selectedClass?.txCount || 3,
      this.currentWeights.th > 0 ? 3 : 0,
      txValues,
      thValues,
    );

    this.gradeForm.patchValue({
      gkScore: this.selectedGrade?.gkScore ?? null,
      tktScore: this.selectedGrade?.tktScore ?? null,
      isDuThi: this.selectedGrade?.isDuThi ?? true,
      isVangThi: this.selectedGrade?.isVangThi ?? false,
    });

    if (this.gradeForm.controls.isVangThi.value) {
      this.gradeForm.controls.tktScore.disable({ emitEvent: false });
    } else {
      this.gradeForm.controls.tktScore.enable({ emitEvent: false });
    }
  }

  saveGrade(): void {
    if (!this.selectedClass || !this.selectedStudent) {
      return;
    }

    if (this.gradeForm.invalid) {
      this.gradeForm.markAllAsTouched();
      this.snackBar.open('Vui lòng kiểm tra dữ liệu điểm hợp lệ (0-10).', 'Đóng', {
        duration: 2500,
      });
      return;
    }

    const subjectId = this.resolveRefId(this.selectedClass.subjectId);
    const departmentId = this.resolveRefId(this.selectedClass.departmentId);
    const schoolYearId = this.resolveRefId(this.selectedClass.schoolYearId);

    if (!subjectId || !departmentId || !schoolYearId) {
      this.snackBar.open('Thiếu thông tin lớp học phần để lưu điểm.', 'Đóng', {
        duration: 2800,
      });
      return;
    }

    const payload: GradeUpsertPayload = {
      studentId: this.selectedStudent._id,
      classId: this.selectedClass._id,
      subjectId,
      departmentId,
      schoolYearId,
      semester: this.selectedClass.semester,
      weights: this.currentWeights,
      txScores: this.normalizeNullableScoreArray(this.txScoresArray.getRawValue()),
      gkScore: this.normalizeNullableScore(this.gradeForm.controls.gkScore.value),
      thScores:
        this.currentWeights.th > 0
          ? this.normalizeNullableScoreArray(this.thScoresArray.getRawValue())
          : [],
      tktScore: this.gradeForm.controls.isVangThi.value
        ? null
        : this.normalizeNullableScore(this.gradeForm.controls.tktScore.value),
      isDuThi: this.gradeForm.controls.isDuThi.value,
      isVangThi: this.gradeForm.controls.isVangThi.value,
    };

    const request$ = this.selectedGrade
      ? this.apiService.put<ApiResponse<Grade>, GradeUpsertPayload>(
          `/grades/${this.selectedGrade._id}`,
          payload,
        )
      : this.apiService.post<ApiResponse<Grade>, GradeUpsertPayload>('/grades', payload);

    this.isSaving = true;

    request$
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const savedGrade = response.data;
          this.selectedGrade = savedGrade;
          this.upsertGrade(savedGrade);

          this.snackBar.open('Đã lưu điểm thành công.', 'Đóng', {
            duration: 2200,
          });

          this.callPredictAfterSave(savedGrade._id);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  getStudentGradeStatus(student: Student): { _className: string; _label: string } {
    const grade = this.findStudentGrade(student._id);

    if (!grade) {
      return { _className: 'status-empty', _label: 'Chưa nhập' };
    }

    if (grade.tktScore !== null && grade.tktScore !== undefined) {
      return { _className: 'status-done', _label: 'Đã có điểm TKT' };
    }

    const hasTx = Array.isArray(grade.txScores) && grade.txScores.some((value) => value !== null);
    const hasTh = Array.isArray(grade.thScores) && grade.thScores.some((value) => value !== null);
    const hasPartial = hasTx || hasTh || grade.gkScore !== null;

    return hasPartial
      ? { _className: 'status-partial', _label: 'Nhập một phần' }
      : { _className: 'status-empty', _label: 'Chưa nhập' };
  }

  getSubjectName(classData: Class): string {
    const subject = classData.subjectId;
    if (typeof subject === 'string') {
      return 'Môn học';
    }

    return subject.name || subject.code;
  }

  getSubjectCredits(classData: Class): number {
    const subject = classData.subjectId;
    if (typeof subject === 'string') {
      return 0;
    }

    return Number(subject.credits || 0);
  }

  getStudentGrade(studentId: string): Grade | null {
    return this.findStudentGrade(studentId);
  }

  formatStudentCode(student: Student): string {
    return toTenDigitStudentCode(student.studentCode, student._id);
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

  isPassForStudent(studentId: string): boolean {
    const grade = this.findStudentGrade(studentId);
    if (!grade) {
      return false;
    }

    return this.isPassGrade(grade);
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
          this.departmentOptions = this.buildDepartmentOptions(classes);

          if (this.registrationTerms.length > 0) {
            this.selectionForm.controls.registrationTerm.setValue(this.registrationTerms[0].key);
            this.onRegistrationTermChange();
          } else {
            this.filterClasses();
          }

          this.filterClasses();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  private filterClasses(): void {
    const schoolYearId = this.selectionForm.controls.schoolYearId.value;
    const semester = this.selectionForm.controls.semester.value;
    const departmentId = this.selectionForm.controls.departmentId.value;

    this.filteredClasses = this.classes.filter((classItem) => {
      const classYearId = this.resolveRefId(classItem.schoolYearId);
      const classDepartmentId = this.resolveRefId(classItem.departmentId);
      const sameYear = schoolYearId ? classYearId === schoolYearId : true;
      const sameSemester = semester ? classItem.semester === semester : true;
      const sameDepartment = departmentId === 'all' ? true : classDepartmentId === departmentId;
      return sameYear && sameSemester && sameDepartment;
    });
  }

  private buildDepartmentOptions(classes: Class[]): DepartmentFilterOption[] {
    const optionsById = new Map<string, DepartmentFilterOption>();

    for (const classItem of classes) {
      const departmentId = this.resolveRefId(classItem.departmentId);
      if (!departmentId || optionsById.has(departmentId)) {
        continue;
      }

      if (typeof classItem.departmentId === 'string') {
        optionsById.set(departmentId, {
          id: departmentId,
          code: '',
          name: departmentId,
          label: departmentId,
        });
        continue;
      }

      const code = String(classItem.departmentId.code || '').trim();
      const name = String(classItem.departmentId.name || code || departmentId).trim();

      optionsById.set(departmentId, {
        id: departmentId,
        code,
        name,
        label: code ? `${code} - ${name}` : name,
      });
    }

    return Array.from(optionsById.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }),
    );
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
        const key = `${year._id}:${semester}`;
        options.push({
          key,
          schoolYearId: year._id,
          semester,
          label: `HK ${semester} NH ${year.name}`,
        });
      }
    }

    return options;
  }

  private findStudentGrade(studentId: string): Grade | null {
    return (
      this.classGrades.find((item) => {
        const refId = this.resolveRefId(item.studentId);
        return refId === studentId;
      }) || null
    );
  }

  private resetGradeForm(
    txCount: number,
    thCount: number,
    txValues: Array<number | null> = [],
    thValues: Array<number | null> = [],
  ): void {
    const txArray = this.fb.array<FormControl<number | null>>([]);
    const finalTxCount = Math.max(1, txCount);

    for (let index = 0; index < finalTxCount; index += 1) {
      txArray.push(this.createScoreControl(txValues[index] ?? null));
    }

    const thArray = this.fb.array<FormControl<number | null>>([]);
    for (let index = 0; index < thCount; index += 1) {
      thArray.push(this.createScoreControl(thValues[index] ?? null));
    }

    this.gradeForm.setControl('txScores', txArray);
    this.gradeForm.setControl('thScores', thArray);
  }

  private createScoreControl(initialValue: number | null): FormControl<number | null> {
    return this.fb.control<number | null>(initialValue, [Validators.min(0), Validators.max(10)]);
  }

  private meanScore(values: Array<number | null>): number {
    const valid = values
      .filter((item): item is number => item !== null && item !== undefined)
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));

    if (!valid.length) {
      return 0;
    }

    const total = valid.reduce((sum, item) => sum + item, 0);
    return Number((total / valid.length).toFixed(2));
  }

  private normalizeWeights(weights: DefaultWeights | undefined): DefaultWeights {
    return {
      tx: Number(weights?.tx ?? 10),
      gk: Number(weights?.gk ?? 30),
      th: Number(weights?.th ?? 0),
      tkt: Number(weights?.tkt ?? 60),
    };
  }

  private normalizeNullableScore(value: number | null): number | null {
    if (value === null || value === undefined || value === Number.NaN) {
      return null;
    }

    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }

  private normalizeNullableScoreArray(values: Array<number | null>): Array<number | null> {
    return values.map((item) => this.normalizeNullableScore(item));
  }

  private isGradeCompleted(grade: Grade): boolean {
    return grade.tktScore !== null || grade.isVangThi === true;
  }

  private isPassGrade(grade: Grade): boolean {
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

  private callPredictAfterSave(gradeId: string): void {
    this.apiService
      .post<ApiResponse<unknown>, { gradeId: string }>('/predictions/predict', { gradeId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Đã gọi AI dự đoán cho sinh viên.', 'Đóng', {
            duration: 2200,
          });
        },
        error: (error: unknown) => {
          this.snackBar.open(
            `Lưu điểm thành công nhưng gọi AI thất bại: ${this.resolveError(error)}`,
            'Đóng',
            {
              duration: 3600,
            },
          );
        },
      });
  }

  private upsertGrade(savedGrade: Grade): void {
    const index = this.classGrades.findIndex((item) => item._id === savedGrade._id);
    if (index >= 0) {
      this.classGrades[index] = savedGrade;
      return;
    }

    this.classGrades = [savedGrade, ...this.classGrades];
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

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Đã có lỗi xảy ra, vui lòng thử lại.';
  }
}

@Component({
  selector: 'app-grade-weight-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title class="weight-dialog-title">Chỉnh trọng số điểm</h2>

    <div mat-dialog-content class="weight-dialog-content">
      <form [formGroup]="form" class="weight-grid">
        <mat-form-field appearance="outline">
          <mat-label>TX (%)</mat-label>
          <input matInput type="number" formControlName="tx" min="0" max="100" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>GK (%)</mat-label>
          <input matInput type="number" formControlName="gk" min="0" max="100" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>TH (%)</mat-label>
          <input matInput type="number" formControlName="th" min="0" max="100" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>TKT (%)</mat-label>
          <input matInput type="number" formControlName="tkt" min="0" max="100" />
        </mat-form-field>
      </form>

      <p class="sum-note" [class.invalid]="total !== 100">Tổng trọng số: {{ total }}%</p>
      <p class="help-note">Tổng TX + GK + TH + TKT bắt buộc bằng 100.</p>
    </div>

    <div mat-dialog-actions align="end" class="weight-dialog-actions">
      <button mat-button type="button" (click)="close()">Hủy</button>
      <button
        mat-flat-button
        class="btn-primary"
        type="button"
        [disabled]="form.invalid || total !== 100"
        (click)="save()"
      >
        Lưu
      </button>
    </div>
  `,
  styles: [
    `
      .weight-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }

      .weight-dialog-title {
        margin: 0;
      }

      .weight-dialog-content {
        display: grid;
        gap: 0.3rem;
      }

      .weight-dialog-content .mat-mdc-form-field {
        margin: 0;
      }

      .weight-dialog-actions {
        gap: 0.45rem;
      }

      .sum-note {
        margin: 0.25rem 0 0;
        font-weight: 700;
        color: var(--green);
      }

      .sum-note.invalid {
        color: var(--red);
      }

      .help-note {
        margin: 0.3rem 0 0;
        color: var(--text-sub);
        font-size: 0.82rem;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      @media (max-width: 600px) {
        .weight-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
class GradeWeightDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<GradeWeightDialogComponent, DefaultWeights | undefined>,
  );
  private readonly data = inject<WeightDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.group({
    tx: this.fb.control<number>(this.data.weights.tx, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    gk: this.fb.control<number>(this.data.weights.gk, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    th: this.fb.control<number>(this.data.weights.th, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    tkt: this.fb.control<number>(this.data.weights.tkt, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
  });

  get total(): number {
    return (
      Number(this.form.controls.tx.value || 0) +
      Number(this.form.controls.gk.value || 0) +
      Number(this.form.controls.th.value || 0) +
      Number(this.form.controls.tkt.value || 0)
    );
  }

  close(): void {
    this.dialogRef.close(undefined);
  }

  save(): void {
    if (this.form.invalid || this.total !== 100) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      tx: Number(this.form.controls.tx.value),
      gk: Number(this.form.controls.gk.value),
      th: Number(this.form.controls.th.value),
      tkt: Number(this.form.controls.tkt.value),
    });
  }
}
