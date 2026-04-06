import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Class, SchoolYear } from '../../../shared/models/interfaces';

interface ImportPreviewValidRow {
  row: number;
  studentCode: string;
  studentName: string;
}

interface ImportPreviewErrorRow {
  row: number;
  studentCode: string;
  studentName?: string;
  error: string;
}

interface ImportPreviewResponse {
  success: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
  validRows: ImportPreviewValidRow[];
  errorRows: ImportPreviewErrorRow[];
}

interface ImportExecuteResponse {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: Array<{ row: number; studentCode: string; error: string }>;
  errors: ImportPreviewErrorRow[];
}

interface PredictClassResponse {
  processed: number;
  failed: number;
  failures: Array<{ gradeId: string; studentId: string; message: string }>;
}

@Component({
  selector: 'app-grade-import',
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
    MatSnackBarModule,
    MatStepperModule,
    MatTableModule,
    MatTabsModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Nhập điểm</span>
        <span class="breadcrumb-sep">/</span>
        <span>Import Excel/CSV</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Ngày 11 - Import điểm</p>
          <h1>Import Excel/CSV</h1>
          <p class="subtitle">Quy trình 4 bước: chọn lớp, upload file, preview, xác nhận import.</p>
        </div>

        <a mat-stroked-button [routerLink]="['/grades']">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Về trang nhập điểm
        </a>
      </header>

      <mat-card class="card-block">
        <mat-stepper #stepper [linear]="false">
          <mat-step [completed]="setupForm.valid">
            <ng-template matStepLabel>Bước 1: Chọn lớp & học kỳ</ng-template>

            <form [formGroup]="setupForm" class="filters-grid">
              <mat-form-field appearance="outline">
                <mat-label>Năm học</mat-label>
                <mat-select formControlName="schoolYearId" (selectionChange)="onFilterChange()">
                  <mat-option value="">Chọn năm học</mat-option>
                  <mat-option *ngFor="let year of schoolYears" [value]="year._id">{{
                    year.name
                  }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Học kỳ</mat-label>
                <mat-select formControlName="semester" (selectionChange)="onFilterChange()">
                  <mat-option [value]="null">Chọn học kỳ</mat-option>
                  <mat-option [value]="1">Học kỳ 1</mat-option>
                  <mat-option [value]="2">Học kỳ 2</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Lớp học phần</mat-label>
                <mat-select formControlName="classId">
                  <mat-option value="">Chọn lớp học phần</mat-option>
                  <mat-option *ngFor="let classItem of filteredClasses" [value]="classItem._id">
                    {{ classItem.code }} - {{ classItem.name || classItem.code }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </form>

            <div class="actions-row">
              <button
                mat-stroked-button
                type="button"
                (click)="downloadTemplate()"
                [disabled]="isDownloadingTemplate"
              >
                <lucide-icon name="arrow-right" [size]="16"></lucide-icon>
                {{ isDownloadingTemplate ? 'Đang tải mẫu...' : 'Tải file mẫu' }}
              </button>
              <button
                mat-flat-button
                class="btn-primary"
                type="button"
                [disabled]="!setupForm.valid"
                (click)="nextStep(1)"
              >
                Tiếp tục
              </button>
            </div>
          </mat-step>

          <mat-step [completed]="selectedFile !== null">
            <ng-template matStepLabel>Bước 2: Upload file</ng-template>

            <div class="upload-zone" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
              <lucide-icon name="plus" [size]="20"></lucide-icon>
              <p>Kéo thả file vào đây hoặc chọn file từ máy.</p>
              <p class="hint">Chỉ nhận .xlsx hoặc .csv, dung lượng tối đa 5MB.</p>

              <input
                #fileInput
                type="file"
                accept=".xlsx,.csv"
                hidden
                (change)="onFileSelected($event)"
              />

              <button mat-stroked-button type="button" (click)="fileInput.click()">
                Chọn file
              </button>
            </div>

            <div class="file-meta" *ngIf="selectedFile">
              <p><strong>Tên file:</strong> {{ selectedFile.name }}</p>
              <p><strong>Dung lượng:</strong> {{ formatFileSize(selectedFile.size) }}</p>
            </div>

            <div class="actions-row">
              <button mat-stroked-button type="button" (click)="prevStep(0)">Quay lại</button>
              <button
                mat-flat-button
                class="btn-primary"
                type="button"
                [disabled]="!selectedFile || !setupForm.valid || isPreviewLoading"
                (click)="previewImport()"
              >
                {{ isPreviewLoading ? 'Đang đọc file...' : 'Xem trước' }}
              </button>
            </div>
          </mat-step>

          <mat-step [completed]="importResult !== null">
            <ng-template matStepLabel>Bước 3: Xem trước kết quả</ng-template>

            <div *ngIf="!previewResult" class="state-block">
              <lucide-icon name="info" [size]="18"></lucide-icon>
              <p>Chưa có dữ liệu preview. Vui lòng quay lại bước upload.</p>
            </div>

            <ng-container *ngIf="previewResult as preview">
              <mat-tab-group>
                <mat-tab [label]="'Hợp lệ (' + preview.validCount + ')'">
                  <div class="preview-table-wrap">
                    <table mat-table [dataSource]="preview.validRows" class="full-table">
                      <ng-container matColumnDef="row">
                        <th mat-header-cell *matHeaderCellDef>Dòng</th>
                        <td mat-cell *matCellDef="let row">{{ row.row }}</td>
                      </ng-container>

                      <ng-container matColumnDef="studentCode">
                        <th mat-header-cell *matHeaderCellDef>Mã HS</th>
                        <td mat-cell *matCellDef="let row">{{ row.studentCode }}</td>
                      </ng-container>

                      <ng-container matColumnDef="studentName">
                        <th mat-header-cell *matHeaderCellDef>Họ tên</th>
                        <td mat-cell *matCellDef="let row">{{ row.studentName }}</td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="validColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: validColumns"></tr>
                    </table>
                  </div>
                </mat-tab>

                <mat-tab [label]="'Lỗi (' + preview.errorCount + ')'">
                  <div class="preview-table-wrap">
                    <table mat-table [dataSource]="preview.errorRows" class="full-table">
                      <ng-container matColumnDef="row">
                        <th mat-header-cell *matHeaderCellDef>Dòng số</th>
                        <td mat-cell *matCellDef="let row">{{ row.row }}</td>
                      </ng-container>

                      <ng-container matColumnDef="studentCode">
                        <th mat-header-cell *matHeaderCellDef>Mã HS</th>
                        <td mat-cell *matCellDef="let row">{{ row.studentCode || '-' }}</td>
                      </ng-container>

                      <ng-container matColumnDef="error">
                        <th mat-header-cell *matHeaderCellDef>Lý do lỗi</th>
                        <td mat-cell *matCellDef="let row" class="error-text">{{ row.error }}</td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="errorColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: errorColumns"></tr>
                    </table>
                  </div>
                </mat-tab>
              </mat-tab-group>

              <p class="summary-text">
                Sẽ import {{ preview.validCount }} học sinh, bỏ qua {{ preview.errorCount }} dòng
                lỗi.
              </p>

              <div class="actions-row">
                <button mat-stroked-button type="button" (click)="prevStep(1)">Quay lại</button>
                <button
                  mat-flat-button
                  class="btn-primary"
                  type="button"
                  [disabled]="isImporting"
                  (click)="executeImport()"
                >
                  {{ isImporting ? 'Đang import...' : 'Xác nhận Import' }}
                </button>
              </div>
            </ng-container>
          </mat-step>

          <mat-step>
            <ng-template matStepLabel>Bước 4: Kết quả</ng-template>

            <div *ngIf="!importResult" class="state-block">
              <lucide-icon name="info" [size]="18"></lucide-icon>
              <p>Chưa có kết quả import.</p>
            </div>

            <ng-container *ngIf="importResult as result">
              <div class="result-head">
                <lucide-icon name="check-circle" [size]="24"></lucide-icon>
                <div>
                  <h3>Import hoàn tất</h3>
                  <p>Đã lưu {{ result.imported }} dòng, bỏ qua {{ result.skipped }} dòng.</p>
                </div>
              </div>

              <div *ngIf="result.errors.length" class="preview-table-wrap">
                <table mat-table [dataSource]="result.errors" class="full-table">
                  <ng-container matColumnDef="row">
                    <th mat-header-cell *matHeaderCellDef>Dòng số</th>
                    <td mat-cell *matCellDef="let row">{{ row.row }}</td>
                  </ng-container>

                  <ng-container matColumnDef="studentCode">
                    <th mat-header-cell *matHeaderCellDef>Mã HS</th>
                    <td mat-cell *matCellDef="let row">{{ row.studentCode || '-' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="error">
                    <th mat-header-cell *matHeaderCellDef>Lý do lỗi</th>
                    <td mat-cell *matCellDef="let row" class="error-text">{{ row.error }}</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="errorColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: errorColumns"></tr>
                </table>
              </div>

              <div class="actions-row">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="runPredictClass()"
                  [disabled]="isPredictingClass"
                >
                  <lucide-icon name="chart-column-increasing" [size]="16"></lucide-icon>
                  {{ isPredictingClass ? 'Đang chạy AI...' : 'Chạy AI dự đoán cả lớp' }}
                </button>

                <button
                  mat-flat-button
                  class="btn-primary"
                  type="button"
                  (click)="goBackToGrades()"
                >
                  Về trang điểm
                </button>
              </div>
            </ng-container>
          </mat-step>
        </mat-stepper>
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

      .card-block {
        border: 1px solid var(--gray-200);
        box-shadow: var(--shadow);
        border-radius: var(--radius);
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .upload-zone {
        border: 2px dashed var(--gray-300);
        border-radius: var(--radius-sm);
        padding: 1rem;
        text-align: center;
        display: grid;
        justify-items: center;
        gap: 0.45rem;
        color: var(--text-sub);
        background: var(--gray-50);
      }

      .hint {
        margin: 0;
        font-size: 0.83rem;
      }

      .file-meta {
        margin-top: 0.75rem;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
        background: var(--gray-50);
      }

      .file-meta p {
        margin: 0.2rem 0;
      }

      .actions-row {
        margin-top: 1rem;
        display: flex;
        gap: 0.65rem;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .state-block {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        color: var(--text-sub);
      }

      .summary-text {
        margin: 0.85rem 0 0;
        color: var(--text-sub);
      }

      .preview-table-wrap {
        overflow-x: auto;
        margin-top: 0.75rem;
      }

      .full-table {
        width: 100%;
      }

      .error-text {
        color: var(--red);
      }

      .result-head {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        color: var(--green);
      }

      .result-head h3 {
        margin: 0;
        color: var(--green);
      }

      .result-head p {
        margin: 0.2rem 0 0;
        color: var(--text-sub);
      }

      @media (max-width: 960px) {
        .filters-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class GradeImportComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('stepper') private stepper?: MatStepper;

  readonly validColumns: string[] = ['row', 'studentCode', 'studentName'];
  readonly errorColumns: string[] = ['row', 'studentCode', 'error'];

  readonly setupForm = this.fb.group({
    schoolYearId: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    semester: this.fb.control<1 | 2 | null>(null, { validators: [Validators.required] }),
    classId: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  schoolYears: SchoolYear[] = [];
  classes: Class[] = [];
  filteredClasses: Class[] = [];

  selectedFile: File | null = null;
  previewResult: ImportPreviewResponse | null = null;
  importResult: ImportExecuteResponse | null = null;

  isPreviewLoading = false;
  isImporting = false;
  isDownloadingTemplate = false;
  isPredictingClass = false;

  ngOnInit(): void {
    this.loadMasterData();
  }

  onFilterChange(): void {
    const schoolYearId = this.setupForm.controls.schoolYearId.value;
    const semester = this.setupForm.controls.semester.value;

    this.filteredClasses = this.classes.filter((classItem) => {
      const classYear = this.resolveRefId(classItem.schoolYearId);
      const sameYear = schoolYearId ? classYear === schoolYearId : true;
      const sameSemester = semester ? classItem.semester === semester : true;
      return sameYear && sameSemester;
    });

    const classId = this.setupForm.controls.classId.value;
    if (!classId || !this.filteredClasses.some((item) => item._id === classId)) {
      this.setupForm.controls.classId.setValue('');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] || null;
    this.setSelectedFile(file);
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;
    this.setSelectedFile(file);
    target.value = '';
  }

  nextStep(index: number): void {
    if (this.stepper) {
      this.stepper.selectedIndex = index;
    }
  }

  prevStep(index: number): void {
    if (this.stepper) {
      this.stepper.selectedIndex = index;
    }
  }

  downloadTemplate(): void {
    this.isDownloadingTemplate = true;

    // Tải template dạng blob để browser tự tải file .xlsx.
    this.http
      .get('http://localhost:3000/api/grades/import/template', {
        responseType: 'blob',
      })
      .pipe(
        finalize(() => {
          this.isDownloadingTemplate = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'grade_import_template.xlsx';
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  previewImport(): void {
    if (!this.selectedFile || this.setupForm.invalid) {
      return;
    }

    const formData = this.buildFormData();

    this.isPreviewLoading = true;
    this.previewResult = null;
    this.importResult = null;

    this.apiService
      .post<ImportPreviewResponse, FormData>('/grades/import/preview', formData)
      .pipe(
        finalize(() => {
          this.isPreviewLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.previewResult = response;
          this.nextStep(2);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  executeImport(): void {
    if (!this.selectedFile || this.setupForm.invalid) {
      return;
    }

    const formData = this.buildFormData();

    this.isImporting = true;

    this.apiService
      .post<ImportExecuteResponse, FormData>('/grades/import/excel', formData)
      .pipe(
        finalize(() => {
          this.isImporting = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.importResult = response;
          this.nextStep(3);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  runPredictClass(): void {
    const classId = this.setupForm.controls.classId.value;
    if (!classId) {
      return;
    }

    this.isPredictingClass = true;

    this.apiService
      .post<ApiResponse<PredictClassResponse>, { classId: string }>('/predictions/predict-class', {
        classId,
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
            duration: 3000,
          });
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  goBackToGrades(): void {
    this.router.navigate(['/grades']);
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  private loadMasterData(): void {
    forkJoin({
      schoolYears: this.apiService
        .get<ApiResponse<SchoolYear[]>>('/school-years')
        .pipe(map((response) => response.data ?? [])),
      classes: this.apiService
        .get<ApiResponse<Class[]>>('/classes')
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ schoolYears, classes }) => {
          this.schoolYears = schoolYears;
          this.classes = classes;
          this.onFilterChange();
        },
        error: (error: unknown) => {
          this.snackBar.open(this.resolveError(error), 'Đóng', {
            duration: 3200,
          });
        },
      });
  }

  private setSelectedFile(file: File | null): void {
    if (!file) {
      this.selectedFile = null;
      return;
    }

    const allowed = /\.(xlsx|csv)$/i.test(file.name);
    if (!allowed) {
      this.snackBar.open('Chỉ nhận file .xlsx hoặc .csv.', 'Đóng', {
        duration: 2600,
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('File vượt quá 5MB.', 'Đóng', {
        duration: 2600,
      });
      return;
    }

    this.selectedFile = file;
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    formData.append('file', this.selectedFile as Blob);
    formData.append('classId', this.setupForm.controls.classId.value);
    formData.append('semester', String(this.setupForm.controls.semester.value));
    formData.append('schoolYearId', this.setupForm.controls.schoolYearId.value);
    return formData;
  }

  private resolveRefId(value: string | { _id: string } | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return typeof value === 'string' ? value : value._id;
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
