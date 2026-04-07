import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  Class,
  Grade,
  Prediction,
  PredictionRiskLevel,
  Student,
} from '../../shared/models/interfaces';

interface PredictionRow {
  id: string;
  studentCode: string;
  studentName: string;
  finalScore: number | null;
  predictedRank: Prediction['predictedRank'];
  confidence: number;
  riskLevel: PredictionRiskLevel;
  gradeId: string;
  createdAt?: string;
}

@Component({
  selector: 'app-class-predictions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
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
        <span>Dự đoán AI</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Phân tích rủi ro học tập</p>
          <h1>Dự đoán cả lớp</h1>
          <p class="subtitle">
            Theo dõi kết quả AI theo lớp học phần, lọc rủi ro cao và in báo cáo.
          </p>
        </div>

        <button
          mat-stroked-button
          type="button"
          (click)="exportPdf()"
          [disabled]="!dataSource.data.length"
        >
          <lucide-icon name="file-down" [size]="16"></lucide-icon>
          Xuất PDF
        </button>
      </header>

      <mat-card class="content-card filter-card">
        <div class="filter-bar filter-grid">
          <mat-form-field appearance="outline">
            <mat-label>Lớp học phần</mat-label>
            <mat-select
              [value]="selectedClassId"
              (selectionChange)="onClassChange($event.value)"
              [disabled]="isLoadingClasses || isLoadingPredictions"
            >
              @for (classItem of classes; track classItem._id) {
                <mat-option [value]="classItem._id">
                  {{ classItem.code }} - {{ classItem.name || classItem.code }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-checkbox
            class="risk-toggle"
            [checked]="highRiskOnly"
            (change)="onRiskFilterChange($event.checked)"
          >
            Chỉ hiển thị rủi ro cao
          </mat-checkbox>
        </div>
      </mat-card>

      <mat-card class="content-card table-card">
        @if (isLoadingClasses || isLoadingPredictions) {
          <div class="state-block">
            <mat-spinner [diameter]="36"></mat-spinner>
            <p>
              {{ isLoadingClasses ? 'Đang tải danh sách lớp...' : 'Đang tải dữ liệu dự đoán...' }}
            </p>
          </div>
        } @else if (errorMessage) {
          <div class="state-block error">
            <lucide-icon name="x-circle" [size]="20"></lucide-icon>
            <p>{{ errorMessage }}</p>
            <button mat-stroked-button type="button" (click)="retryLoad()">Thử lại</button>
          </div>
        } @else if (!selectedClassId) {
          <div class="state-block">
            <lucide-icon name="info" [size]="18"></lucide-icon>
            <p>Vui lòng chọn lớp để xem dự đoán AI.</p>
          </div>
        } @else if (!dataSource.data.length) {
          <div class="state-block">
            <lucide-icon name="info" [size]="18"></lucide-icon>
            <p>{{ highRiskOnly ? 'Không có học sinh rủi ro cao.' : 'Chưa có dữ liệu dự đoán.' }}</p>
          </div>
        } @else {
          <div class="summary-row">
            <span
              >Tổng học sinh hiển thị: <strong>{{ dataSource.data.length }}</strong></span
            >
            <span>
              Rủi ro cao:
              <strong class="risk-high-text">{{ highRiskCount }}</strong>
            </span>
          </div>

          <div class="table-wrap">
            <table mat-table [dataSource]="dataSource" matSort class="full-table nttu-table">
              <ng-container matColumnDef="studentCode">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Mã SV</th>
                <td mat-cell *matCellDef="let row">{{ row.studentCode }}</td>
              </ng-container>

              <ng-container matColumnDef="studentName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Họ tên</th>
                <td mat-cell *matCellDef="let row">{{ row.studentName }}</td>
              </ng-container>

              <ng-container matColumnDef="finalScore">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Điểm TB</th>
                <td mat-cell *matCellDef="let row">{{ row.finalScore ?? '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="predictedRank">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Xếp loại dự đoán</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge" [ngClass]="rankClass(row.predictedRank)">
                    {{ row.predictedRank }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="confidence">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Confidence</th>
                <td mat-cell *matCellDef="let row">
                  {{ normalizeConfidence(row.confidence).toFixed(1) }}%
                </td>
              </ng-container>

              <ng-container matColumnDef="riskLevel">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Rủi ro</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge" [ngClass]="riskClass(row.riskLevel)">
                    {{ riskLabel(row.riskLevel) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Chi tiết</th>
                <td mat-cell *matCellDef="let row" class="actions-cell">
                  <button
                    type="button"
                    class="action-btn"
                    aria-label="Xem báo cáo"
                    title="Xem báo cáo"
                    (click)="openReport(row)"
                    [disabled]="!row.gradeId"
                  >
                    <lucide-icon name="eye" [size]="15"></lucide-icon>
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
        display: grid;
        gap: 1rem;
      }

      .filter-card {
        padding: 0.95rem 1rem 1rem;
        overflow: visible;
      }

      .table-card {
        padding: 0.95rem 1rem 1rem;
        overflow: hidden;
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

      .filter-grid {
        display: grid;
        grid-template-columns: minmax(260px, 420px) auto;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
      }

      .risk-toggle {
        color: var(--text-sub);
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
        color: var(--text-sub);
      }

      .risk-high-text {
        color: #dc2626;
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

      .state-block {
        min-height: 220px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        text-align: center;
        color: var(--text-sub);
      }

      .state-block.error {
        color: #dc2626;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        white-space: nowrap;
      }

      .rank-gioi,
      .risk-low {
        background: #f0fdf4;
        color: #16a34a;
      }

      .rank-kha {
        background: #eff6ff;
        color: #2563eb;
      }

      .rank-trung-binh,
      .risk-medium {
        background: #fffbeb;
        color: #d97706;
      }

      .rank-yeu,
      .risk-high-badge {
        background: #fef2f2;
        color: #dc2626;
      }

      @media print {
        .page-header button,
        .filter-card,
        .actions-cell,
        .mat-mdc-button {
          display: none !important;
        }

        .page-wrap {
          padding: 0;
        }
      }

      @media (max-width: 768px) {
        .filter-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ClassPredictionsComponent implements OnInit, AfterViewInit {
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = [
    'studentCode',
    'studentName',
    'finalScore',
    'predictedRank',
    'confidence',
    'riskLevel',
    'actions',
  ];

  readonly dataSource = new MatTableDataSource<PredictionRow>([]);

  classes: Class[] = [];
  selectedClassId = '';
  highRiskOnly = false;

  isLoadingClasses = true;
  isLoadingPredictions = false;
  errorMessage = '';

  private allRows: PredictionRow[] = [];

  get highRiskCount(): number {
    return this.allRows.filter((item) => item.riskLevel === 'high').length;
  }

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (
      row: PredictionRow,
      property: string,
    ): string | number => {
      switch (property) {
        case 'studentCode':
          return row.studentCode;
        case 'studentName':
          return row.studentName;
        case 'finalScore':
          return row.finalScore ?? -1;
        case 'predictedRank':
          return row.predictedRank;
        case 'confidence':
          return this.normalizeConfidence(row.confidence);
        case 'riskLevel':
          return row.riskLevel;
        default:
          return '';
      }
    };

    this.loadClasses();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  loadClasses(): void {
    this.isLoadingClasses = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<Class[]>>('/classes')
      .pipe(
        map((response) => response.data ?? []),
        finalize(() => {
          this.isLoadingClasses = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (classes) => {
          this.classes = classes;
          this.selectedClassId = classes[0]?._id ?? '';

          if (this.selectedClassId) {
            this.loadClassPredictions(this.selectedClassId);
          }
        },
        error: (error: unknown) => {
          this.handleError(error, 'Không thể tải danh sách lớp.');
        },
      });
  }

  onClassChange(classId: string): void {
    this.selectedClassId = classId;
    this.loadClassPredictions(classId);
  }

  onRiskFilterChange(checked: boolean): void {
    this.highRiskOnly = checked;
    this.applyRows();
  }

  retryLoad(): void {
    if (this.selectedClassId) {
      this.loadClassPredictions(this.selectedClassId);
      return;
    }

    this.loadClasses();
  }

  exportPdf(): void {
    if (!this.dataSource.data.length) {
      this.snackBar.open('Không có dữ liệu để xuất PDF.', 'Đóng', { duration: 2200 });
      return;
    }

    window.print();
  }

  openReport(row: PredictionRow): void {
    if (!row.gradeId) {
      this.snackBar.open('Không tìm thấy gradeId để mở báo cáo.', 'Đóng', { duration: 2200 });
      return;
    }

    this.router.navigate(['/predictions/report', row.gradeId]);
  }

  rankClass(rank: Prediction['predictedRank']): string {
    switch (rank) {
      case 'Giỏi':
        return 'rank-gioi';
      case 'Khá':
        return 'rank-kha';
      case 'Trung Bình':
        return 'rank-trung-binh';
      default:
        return 'rank-yeu';
    }
  }

  riskClass(risk: PredictionRiskLevel): string {
    if (risk === 'high') {
      return 'risk-high-badge';
    }

    if (risk === 'medium') {
      return 'risk-medium';
    }

    return 'risk-low';
  }

  riskLabel(risk: PredictionRiskLevel): string {
    if (risk === 'high') {
      return 'Cao';
    }

    if (risk === 'medium') {
      return 'Trung bình';
    }

    return 'Thấp';
  }

  normalizeConfidence(confidence: number): number {
    if (Number.isNaN(confidence)) {
      return 0;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private loadClassPredictions(classId: string): void {
    if (!classId) {
      this.allRows = [];
      this.applyRows();
      return;
    }

    this.isLoadingPredictions = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<Prediction[]>>(`/predictions/class/${classId}`)
      .pipe(
        map((response) => response.data ?? []),
        map((predictions) => predictions.map((item) => this.toPredictionRow(item))),
        finalize(() => {
          this.isLoadingPredictions = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.allRows = rows;
          this.applyRows();
        },
        error: (error: unknown) => {
          this.handleError(error, 'Không thể tải dữ liệu dự đoán của lớp.');
        },
      });
  }

  private applyRows(): void {
    const rows = this.highRiskOnly
      ? this.allRows.filter((item) => item.riskLevel === 'high')
      : this.allRows;

    this.dataSource.data = rows;

    if (this.dataSource.sort) {
      this.dataSource.sort.sort({ id: 'confidence', start: 'desc', disableClear: false });
    }
  }

  private toPredictionRow(prediction: Prediction): PredictionRow {
    const student = this.asStudent(prediction.studentId);
    const grade = this.asGrade(prediction.gradeId);

    return {
      id: prediction._id,
      studentCode: student?.studentCode ?? '-',
      studentName: student?.fullName ?? 'Không rõ',
      finalScore: typeof grade?.finalScore === 'number' ? grade.finalScore : null,
      predictedRank: prediction.predictedRank,
      confidence: prediction.confidence,
      riskLevel: prediction.riskLevel,
      gradeId: this.extractId(prediction.gradeId),
      createdAt: prediction.createdAt,
    };
  }

  private asStudent(value: Prediction['studentId']): Student | null {
    if (!value || typeof value === 'string') {
      return null;
    }

    return value;
  }

  private asGrade(value: Prediction['gradeId']): Grade | null {
    if (!value || typeof value === 'string') {
      return null;
    }

    return value;
  }

  private extractId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && '_id' in value) {
      const id = (value as { _id?: unknown })._id;
      return typeof id === 'string' ? id : '';
    }

    return '';
  }

  private handleError(error: unknown, fallbackMessage: string): void {
    let message = fallbackMessage;

    if (error instanceof HttpErrorResponse) {
      const serverMessage = (error.error as { message?: string } | null)?.message;
      message = serverMessage || error.message || fallbackMessage;
    } else if (error instanceof Error) {
      message = error.message || fallbackMessage;
    }

    this.errorMessage = message;
    this.snackBar.open(message, 'Đóng', { duration: 3500 });
  }
}
