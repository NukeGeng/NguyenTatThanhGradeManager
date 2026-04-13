import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Student } from '../../shared/models/interfaces';

interface StudentProgress {
  progressPercent: number;
  creditsEarned: number;
  creditsRequired: number;
  failed: number;
}

interface AdvisorStudentOverview {
  student: Student;
  progress: StudentProgress;
  hasCurriculum: boolean;
}

interface AdvisorStudentsOverviewPayload {
  items: AdvisorStudentOverview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Component({
  selector: 'app-advisor-students',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Cố vấn học tập</p>
          <h1 class="page-title">Sinh viên được phân công</h1>
          <p class="subtitle">Theo dõi tiến độ chương trình khung và cảnh báo học tập.</p>
        </div>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải danh sách sinh viên...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else {
        <div class="student-grid">
          @for (student of students; track student._id) {
            <mat-card class="student-card">
              <div class="head">
                <span class="avatar">{{ initials(student.fullName) }}</span>
                <div>
                  <h2>{{ student.fullName }}</h2>
                  <p>{{ student.studentCode }}</p>
                </div>
              </div>

              <div class="progress-wrap">
                <p>
                  Tiến độ tín chỉ:
                  {{ progress(student._id).creditsEarned }}/{{
                    progress(student._id).creditsRequired
                  }}
                  ({{ progress(student._id).progressPercent | number: '1.0-0' }}%)
                </p>
                <mat-progress-bar
                  mode="determinate"
                  [value]="progress(student._id).progressPercent"
                ></mat-progress-bar>
              </div>

              <div class="badges">
                @if (progress(student._id).failed > 0) {
                  <span class="badge danger">Cảnh báo F: {{ progress(student._id).failed }}</span>
                }
                @if (progress(student._id).progressPercent < 35) {
                  <span class="badge warn">Tiến độ chậm</span>
                }
              </div>

              <button
                mat-flat-button
                class="btn-primary btn-detail"
                type="button"
                (click)="openDetail(student)"
              >
                <lucide-icon name="target" [size]="16"></lucide-icon>
                Xem chi tiết cố vấn
              </button>
            </mat-card>
          }
        </div>

        @if (totalPages > 1) {
          <div class="pager">
            <mat-form-field appearance="outline" class="pager-size">
              <mat-label>Items per page</mat-label>
              <mat-select
                [value]="pageSize"
                [disabled]="isLoading"
                (selectionChange)="onPageSizeChange($event.value)"
              >
                @for (size of pageSizeOptions; track size) {
                  <mat-option [value]="size">{{ size }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <button
              mat-stroked-button
              type="button"
              [disabled]="page <= 1 || isLoading"
              (click)="prevPage()"
            >
              Trang trước
            </button>

            <p>Trang {{ page }}/{{ totalPages }} · Tổng {{ totalStudents }} sinh viên</p>

            <button
              mat-stroked-button
              type="button"
              [disabled]="page >= totalPages || isLoading"
              (click)="nextPage()"
            >
              Trang sau
            </button>
          </div>
        }

        @if (!students.length) {
          <mat-card class="state-card empty">
            <lucide-icon name="info" [size]="20"></lucide-icon>
            <p>Chưa có sinh viên nào được phân công.</p>
          </mat-card>
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

      .student-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
        gap: 1rem;
      }

      .student-card {
        padding: 1rem;
        display: grid;
        gap: 0.75rem;
      }

      .head {
        display: flex;
        align-items: center;
        gap: 0.7rem;
      }

      .avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, var(--navy), var(--blue));
      }

      h2 {
        margin: 0;
        color: var(--navy);
        font-size: 1rem;
      }

      .head p {
        margin: 0.2rem 0 0;
        color: var(--text-sub);
        font-size: 0.8rem;
      }

      .progress-wrap p {
        margin: 0 0 0.35rem;
        color: var(--text-sub);
        font-size: 0.8rem;
      }

      .badges {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }

      .badge {
        border-radius: 999px;
        padding: 0.18rem 0.5rem;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .badge.danger {
        color: #b91c1c;
        background: #fee2e2;
      }

      .badge.warn {
        color: #b45309;
        background: #fef3c7;
      }

      .btn-primary {
        justify-self: start;
        background: var(--navy) !important;
        color: #fff !important;
      }

      .btn-detail {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .btn-detail lucide-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .pager-size {
        width: 170px;
      }

      .pager-size .mat-mdc-form-field {
        --mat-form-field-container-height: 44px;
        --mat-form-field-container-vertical-padding: 10px;
      }

      .pager p {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.85rem;
      }

      .state-card {
        min-height: 180px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.65rem;
      }

      .state-card.error {
        color: #dc2626;
      }

      .state-card.empty {
        color: var(--text-sub);
      }
    `,
  ],
})
export class AdvisorStudentsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  students: Student[] = [];
  progressMap = new Map<string, StudentProgress>();
  page = 1;
  pageSize = 24;
  readonly pageSizeOptions = [12, 24, 36, 48, 60];
  totalStudents = 0;
  totalPages = 0;

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<AdvisorStudentsOverviewPayload>>('/student-curricula/advisor/students', {
        page: this.page,
        limit: this.pageSize,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const payload = response.data;
          const items = Array.isArray(payload?.items) ? payload.items : [];

          this.students = items.map((item) => item.student);
          this.totalStudents = Number(payload?.pagination?.total || 0);
          this.totalPages = Number(payload?.pagination?.totalPages || 0);
          this.page = Number(payload?.pagination?.page || this.page);

          this.progressMap.clear();
          for (const item of items) {
            this.progressMap.set(item.student._id, item.progress);
          }
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  prevPage(): void {
    if (this.page <= 1 || this.isLoading) {
      return;
    }

    this.page -= 1;
    this.loadData();
  }

  nextPage(): void {
    if (this.page >= this.totalPages || this.isLoading) {
      return;
    }

    this.page += 1;
    this.loadData();
  }

  onPageSizeChange(value: number): void {
    const nextSize = Number(value);
    if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === this.pageSize) {
      return;
    }

    this.pageSize = Math.floor(nextSize);
    this.page = 1;
    this.loadData();
  }

  progress(studentId: string): StudentProgress {
    return (
      this.progressMap.get(studentId) || {
        progressPercent: 0,
        creditsEarned: 0,
        creditsRequired: 0,
        failed: 0,
      }
    );
  }

  initials(name: string): string {
    const parts = name
      .split(' ')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return parts
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? '')
      .join('');
  }

  openDetail(student: Student): void {
    this.router.navigate(['/advisor/students', student._id]);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.message || 'Không thể tải danh sách sinh viên.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Không thể tải danh sách sinh viên.';
  }
}
