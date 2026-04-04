import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, map, of, switchMap } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  Class,
  Grade,
  Prediction,
  PredictionRiskLevel,
  Student,
} from '../../shared/models/interfaces';

@Component({
  selector: 'app-prediction-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <div class="top-actions">
        <a mat-stroked-button [routerLink]="['/predictions']">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Về danh sách dự đoán lớp
        </a>

        @if (gradeId) {
          <button
            mat-flat-button
            type="button"
            class="btn-primary"
            [disabled]="isPredicting || !grade"
            (click)="runPrediction()"
          >
            <lucide-icon name="chart-column-increasing" [size]="16"></lucide-icon>
            {{ isPredicting ? 'Đang chạy AI...' : 'Chạy lại dự đoán' }}
          </button>
        }
      </div>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="36"></mat-spinner>
          <p>Đang tải báo cáo dự đoán...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else if (grade) {
        <mat-card class="hero-card card--accent">
          <div>
            <p class="eyebrow">Báo cáo AI theo bảng điểm</p>
            <h1>{{ getStudentName(grade.studentId) }}</h1>
            <p class="hero-meta">
              Lớp: {{ getClassDisplay(grade.classId) }} · Học kỳ: HK{{ grade.semester }}
            </p>
            <p class="hero-meta">Môn: {{ getSubjectDisplay(grade.subjectId) }}</p>
          </div>

          <div class="hero-side">
            <p><strong>Mã bảng điểm:</strong> {{ grade._id }}</p>
            <p><strong>Ngày phân tích:</strong> {{ formatDate(prediction?.createdAt) }}</p>
          </div>
        </mat-card>

        @if (!prediction) {
          <mat-card class="state-card">
            <lucide-icon name="info" [size]="20"></lucide-icon>
            <p>Chưa có dữ liệu dự đoán cho bảng điểm này. Vui lòng chạy dự đoán AI.</p>
          </mat-card>
        } @else {
          <div class="grid-2">
            <mat-card class="card-block">
              <h2>Kết quả chính</h2>

              <div class="result-row">
                <span class="label">Xếp loại dự đoán</span>
                <span class="badge" [ngClass]="rankClass(prediction.predictedRank)">
                  {{ prediction.predictedRank }}
                </span>
              </div>

              <div class="result-row progress-row">
                <span class="label">Độ tin cậy</span>
                <div class="confidence-wrap">
                  <div class="confidence-track">
                    <div
                      class="confidence-fill"
                      [ngClass]="rankClass(prediction.predictedRank)"
                      [style.width.%]="normalizeConfidence(prediction.confidence)"
                    ></div>
                  </div>
                  <strong>{{ normalizeConfidence(prediction.confidence).toFixed(1) }}%</strong>
                </div>
              </div>

              <div class="result-row">
                <span class="label">Mức rủi ro</span>
                <span class="badge" [ngClass]="riskClass(prediction.riskLevel)">
                  {{ riskLabel(prediction.riskLevel) }}
                </span>
              </div>
            </mat-card>

            <mat-card class="card-block">
              <h2>Chi tiết phân tích</h2>

              <div class="section-item">
                <h3>Môn yếu cần lưu ý</h3>
                @if (weakSubjects.length === 0) {
                  <p class="muted">Không có môn yếu trong lần dự đoán này.</p>
                } @else {
                  <ul class="list-wrap warning-list">
                    @for (subject of weakSubjects; track subject) {
                      <li>
                        <lucide-icon name="alert-triangle" [size]="16"></lucide-icon>
                        <span>{{ subject }}</span>
                      </li>
                    }
                  </ul>
                }
              </div>

              <div class="section-item">
                <h3>Gợi ý cải thiện</h3>
                @if (!prediction.suggestions.length) {
                  <p class="muted">Chưa có gợi ý cụ thể.</p>
                } @else {
                  <ul class="list-wrap suggestion-list">
                    @for (suggestion of prediction.suggestions; track suggestion) {
                      <li>
                        <lucide-icon name="check-circle" [size]="16"></lucide-icon>
                        <span>{{ suggestion }}</span>
                      </li>
                    }
                  </ul>
                }
              </div>

              <div class="section-item">
                <h3>Phân tích tổng thể</h3>
                <p class="analysis-text">
                  {{ prediction.analysis || 'Không có phân tích chi tiết.' }}
                </p>
              </div>
            </mat-card>
          </div>
        }
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

      .top-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .state-card {
        min-height: 230px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        text-align: center;
        color: var(--text-sub);
      }

      .state-card.error {
        color: #dc2626;
      }

      .hero-card {
        position: relative;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
      }

      .card--accent::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 3px;
        border-radius: var(--radius) var(--radius) 0 0;
        background: linear-gradient(90deg, var(--navy), var(--blue));
      }

      .eyebrow {
        margin: 0;
        color: var(--blue);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 0.78rem;
        font-weight: 700;
      }

      h1 {
        margin: 0.3rem 0;
        color: var(--navy-dark);
      }

      .hero-meta {
        margin: 0.2rem 0;
        color: var(--text-sub);
      }

      .hero-side p {
        margin: 0.2rem 0;
        color: var(--text-sub);
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .card-block {
        border: 1px solid var(--gray-200);
      }

      h2 {
        margin: 0 0 0.9rem;
        color: var(--navy-dark);
      }

      h3 {
        margin: 0 0 0.5rem;
        color: var(--gray-800, #1e293b);
        font-size: 0.95rem;
      }

      .result-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0;
        border-bottom: 1px dashed var(--gray-200);
      }

      .result-row:last-child {
        border-bottom: none;
      }

      .label {
        color: var(--text-sub);
      }

      .confidence-wrap {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 210px;
      }

      .confidence-track {
        width: 160px;
        height: 8px;
        border-radius: 999px;
        background: var(--gray-100);
        overflow: hidden;
      }

      .confidence-fill {
        height: 100%;
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
      .risk-high {
        background: #fef2f2;
        color: #dc2626;
      }

      .confidence-fill.rank-gioi,
      .confidence-fill.rank-kha,
      .confidence-fill.rank-trung-binh,
      .confidence-fill.rank-yeu {
        background: currentColor;
      }

      .section-item {
        margin-top: 0.85rem;
      }

      .section-item:first-of-type {
        margin-top: 0;
      }

      .list-wrap {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.45rem;
      }

      .list-wrap li {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
      }

      .warning-list li {
        color: #b91c1c;
      }

      .suggestion-list li {
        color: var(--text-sub);
      }

      .analysis-text {
        margin: 0;
        color: var(--text-sub);
        line-height: 1.6;
      }

      .muted {
        margin: 0;
        color: var(--text-muted);
      }

      @media (max-width: 1024px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }

        .hero-card {
          flex-direction: column;
        }
      }

      @media (max-width: 768px) {
        .confidence-wrap {
          min-width: 0;
          width: 100%;
        }

        .confidence-track {
          width: 100%;
        }

        .progress-row {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class PredictionReportComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  gradeId = '';
  grade: Grade | null = null;
  prediction: Prediction | null = null;

  isLoading = true;
  isPredicting = false;
  errorMessage = '';

  get weakSubjects(): string[] {
    if (!this.prediction) {
      return [];
    }

    if (this.prediction.atRiskSubjects?.length) {
      return this.prediction.atRiskSubjects.map((item) => item.subjectName || item.subjectId);
    }

    return this.prediction.weakSubjects ?? [];
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.gradeId = params.get('gradeId') ?? '';

      if (!this.gradeId) {
        this.errorMessage = 'Thiếu gradeId để tải báo cáo dự đoán.';
        this.isLoading = false;
        return;
      }

      this.loadData();
    });
  }

  loadData(): void {
    if (!this.gradeId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<Grade>>(`/grades/${this.gradeId}`)
      .pipe(
        map((response) => response.data),
        switchMap((grade) => {
          this.grade = grade;

          const studentId = this.extractId(grade.studentId);
          if (!studentId) {
            return of<Prediction | null>(null);
          }

          return this.apiService
            .get<ApiResponse<Prediction[]>>(`/predictions/student/${studentId}`)
            .pipe(
              map((response) => response.data ?? []),
              map((predictions) => this.findPredictionByGradeId(predictions, this.gradeId)),
            );
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (prediction) => {
          this.prediction = prediction;
        },
        error: (error: unknown) => {
          this.handleError(error, 'Không thể tải báo cáo dự đoán.');
        },
      });
  }

  runPrediction(): void {
    if (!this.gradeId) {
      return;
    }

    this.isPredicting = true;

    this.apiService
      .post<ApiResponse<Prediction>, { gradeId: string }>('/predictions/predict', {
        gradeId: this.gradeId,
      })
      .pipe(
        map((response) => response.data),
        finalize(() => {
          this.isPredicting = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (prediction) => {
          this.prediction = prediction;
          this.snackBar.open('Dự đoán AI đã được cập nhật.', 'Đóng', { duration: 2500 });
        },
        error: (error: unknown) => {
          this.handleError(error, 'Không thể chạy dự đoán AI.');
        },
      });
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
      return 'risk-high';
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

  getStudentName(value: Grade['studentId']): string {
    if (!value || typeof value === 'string') {
      return 'Không rõ học sinh';
    }

    const student = value as Student;
    return student.fullName || student.studentCode;
  }

  getClassDisplay(value: Grade['classId']): string {
    if (!value || typeof value === 'string') {
      return '-';
    }

    const classInfo = value as Class;
    return `${classInfo.code}${classInfo.name ? ` - ${classInfo.name}` : ''}`;
  }

  getSubjectDisplay(value: Grade['subjectId']): string {
    if (!value || typeof value === 'string') {
      return '-';
    }

    return `${value.code}${value.name ? ` - ${value.name}` : ''}`;
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private findPredictionByGradeId(predictions: Prediction[], gradeId: string): Prediction | null {
    for (const prediction of predictions) {
      const predictionGradeId = this.extractId(prediction.gradeId);
      if (predictionGradeId === gradeId) {
        return prediction;
      }
    }

    return predictions[0] ?? null;
  }

  private extractId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && '_id' in value) {
      const maybeId = (value as { _id?: unknown })._id;
      return typeof maybeId === 'string' ? maybeId : '';
    }

    return '';
  }

  private handleError(error: unknown, fallback: string): void {
    let message = fallback;

    if (error instanceof HttpErrorResponse) {
      const serverMessage = (error.error as { message?: string } | null)?.message;
      message = serverMessage || error.message || fallback;
    } else if (error instanceof Error) {
      message = error.message || fallback;
    }

    this.errorMessage = message;
    this.snackBar.open(message, 'Đóng', { duration: 3500 });
  }
}
