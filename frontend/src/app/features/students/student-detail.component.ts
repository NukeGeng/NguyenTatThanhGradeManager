import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Grade, Prediction, Student } from '../../shared/models/interfaces';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Học sinh</span>
        <span class="breadcrumb-sep">/</span>
        <span>Chi tiết</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Hồ sơ học sinh</p>
          <h1 class="page-title">Chi tiết học sinh</h1>
          <p class="subtitle">Theo dõi thông tin cá nhân, kết quả điểm và lịch sử dự đoán AI.</p>
        </div>

        <div class="btn-row">
          <button mat-stroked-button type="button" (click)="goBack()">
            <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
            Quay lại danh sách
          </button>

          @if (student) {
            <a
              mat-flat-button
              class="btn-primary"
              [routerLink]="['/students', student._id, 'edit']"
            >
              <lucide-icon name="pencil" [size]="16"></lucide-icon>
              Chỉnh sửa
            </a>
          }
        </div>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải chi tiết học sinh...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else if (student) {
        <mat-card class="content-card hero-card">
          <div>
            <p class="eyebrow">Hồ sơ học sinh</p>
            <h1>{{ student.fullName }}</h1>
            <p>Mã HS: {{ student.studentCode }} · Lớp: {{ getClassName(student.classId) }}</p>
            <p>
              Giới tính: {{ formatGender(student.gender) }} · Trạng thái:
              {{ formatStatus(student.status) }}
            </p>
          </div>

          <div class="contact">
            <p><strong>Phụ huynh:</strong> {{ student.parentName || '-' }}</p>
            <p><strong>SĐT:</strong> {{ student.parentPhone || '-' }}</p>
            <p><strong>Email:</strong> {{ student.parentEmail || '-' }}</p>
          </div>
        </mat-card>

        <div class="grid-2">
          <mat-card class="content-card">
            <h2 class="section-title">Lịch sử điểm</h2>
            <div class="table-wrap">
              <table mat-table [dataSource]="grades" class="full-table nttu-table">
                <ng-container matColumnDef="subject">
                  <th mat-header-cell *matHeaderCellDef>Môn học</th>
                  <td mat-cell *matCellDef="let row">{{ getSubjectName(row.subjectId) }}</td>
                </ng-container>

                <ng-container matColumnDef="semester">
                  <th mat-header-cell *matHeaderCellDef>Học kỳ</th>
                  <td mat-cell *matCellDef="let row">HK{{ row.semester }}</td>
                </ng-container>

                <ng-container matColumnDef="finalScore">
                  <th mat-header-cell *matHeaderCellDef>Điểm tổng</th>
                  <td mat-cell *matCellDef="let row">{{ row.finalScore ?? '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="letterGrade">
                  <th mat-header-cell *matHeaderCellDef>Xếp loại</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="badge" [ngClass]="gradeClass(row.letterGrade)">{{
                      row.letterGrade ?? 'Chưa có'
                    }}</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="gradeColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: gradeColumns"></tr>
              </table>
            </div>
          </mat-card>

          <mat-card class="content-card">
            <h2 class="section-title">Timeline dự đoán AI</h2>
            @if (predictions.length === 0) {
              <div class="empty-state">
                <lucide-icon name="info" [size]="18"></lucide-icon>
                <p>Chưa có dữ liệu dự đoán cho học sinh này.</p>
              </div>
            } @else {
              <div class="timeline">
                @for (item of predictions; track item._id) {
                  <article class="timeline-item">
                    <div class="timeline-head">
                      <strong>{{ item.predictedRank }}</strong>
                      <span>{{ formatDate(item.createdAt) }}</span>
                    </div>

                    <p>
                      Confidence: {{ item.confidence.toFixed(1) }}% · Risk:
                      <span
                        [class.risk-high]="item.riskLevel === 'high'"
                        [class.risk-med]="item.riskLevel === 'medium'"
                        [class.risk-low]="item.riskLevel === 'low'"
                      >
                        {{ item.riskLevel }}
                      </span>
                    </p>

                    <p>{{ item.analysis || 'Không có phân tích chi tiết.' }}</p>
                  </article>
                }
              </div>
            }
          </mat-card>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
      }

      .content-card {
        padding: 1rem 1.1rem 1.1rem;
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
        min-height: 260px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
      }

      .state-card.error {
        color: #dc2626;
      }

      .hero-card {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
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

      .hero-card p {
        margin: 0.2rem 0;
        color: var(--text-sub);
      }

      .contact p {
        margin: 0.2rem 0;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      h2 {
        margin: 0 0 0.75rem;
        color: var(--navy);
      }

      .table-wrap {
        overflow-x: auto;
      }

      .full-table {
        width: 100%;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.73rem;
        font-weight: 700;
      }

      .grade-a {
        background: #f0fdf4;
        color: #16a34a;
      }

      .grade-b {
        background: #eff6ff;
        color: #2563eb;
      }

      .grade-c {
        background: #fffbeb;
        color: #d97706;
      }

      .grade-f {
        background: #fef2f2;
        color: #dc2626;
      }

      .empty-state {
        min-height: 160px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.5rem;
        color: var(--text-sub);
        text-align: center;
      }

      .timeline {
        display: grid;
        gap: 0.75rem;
      }

      .timeline-item {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
      }

      .timeline-item p {
        margin: 0.35rem 0 0;
        color: var(--text-sub);
      }

      .timeline-head {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .risk-high {
        color: #dc2626;
      }

      .risk-med {
        color: #d97706;
      }

      .risk-low {
        color: #16a34a;
      }

      @media (max-width: 1024px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }

        .hero-card {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class StudentDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly gradeColumns = ['subject', 'semester', 'finalScore', 'letterGrade'];

  student: Student | null = null;
  grades: Grade[] = [];
  predictions: Prediction[] = [];

  isLoading = true;
  errorMessage = '';

  private studentId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.studentId = params.get('id') ?? '';
      if (!this.studentId) {
        this.errorMessage = 'Không tìm thấy học sinh.';
        this.isLoading = false;
        return;
      }

      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      student: this.apiService
        .get<ApiResponse<Student>>(`/students/${this.studentId}`)
        .pipe(map((response) => response.data)),
      grades: this.apiService
        .get<ApiResponse<Grade[]>>(`/grades/student/${this.studentId}`)
        .pipe(map((response) => response.data ?? [])),
      predictions: this.apiService
        .get<ApiResponse<Prediction[]>>(`/predictions/student/${this.studentId}`)
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ student, grades, predictions }) => {
          this.student = student;
          this.grades = grades;
          this.predictions = predictions;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/students']);
  }

  getClassName(value: Student['classId']): string {
    if (typeof value === 'string') {
      return value;
    }

    return value.name || value.code;
  }

  getSubjectName(value: Grade['subjectId']): string {
    if (typeof value === 'string') {
      return value;
    }

    return value.name;
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

  gradeClass(letter: Grade['letterGrade']): string {
    if (letter === 'A') {
      return 'grade-a';
    }

    if (letter === 'B') {
      return 'grade-b';
    }

    if (letter === 'C') {
      return 'grade-c';
    }

    return 'grade-f';
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('vi-VN');
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
