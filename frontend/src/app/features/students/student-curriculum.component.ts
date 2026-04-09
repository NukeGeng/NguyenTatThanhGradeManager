import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse } from '../../shared/models/interfaces';

interface CurriculumDetail {
  subjectCode: string;
  subjectName: string;
  credits: number;
  year: number;
  semester: 1 | 2 | 3;
  status: 'completed' | 'in-progress' | 'failed' | 'not-started';
  letterGrade: string | null;
}

interface ProgressSummary {
  creditsEarned: number;
  creditsRequired: number;
  progressPercent: number;
  details: CurriculumDetail[];
}

@Component({
  selector: 'app-student-curriculum',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Tien do chuong trinh khung</p>
          <h1 class="page-title">Hoc sinh {{ studentId }}</h1>
          <p class="subtitle">Theo doi tin chi tich luy va trang thai tung mon.</p>
        </div>

        <a mat-stroked-button [routerLink]="['/students', studentId]">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lai ho so
        </a>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai tien do...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
        </mat-card>
      } @else {
        <mat-card class="summary-card">
          <p>
            {{ progress?.creditsEarned || 0 }}/{{ progress?.creditsRequired || 0 }} tin chi ({{
              progress?.progressPercent || 0
            }}%)
          </p>
          <mat-progress-bar
            mode="determinate"
            [value]="progress?.progressPercent || 0"
          ></mat-progress-bar>
        </mat-card>

        <mat-card class="list-card">
          <ul>
            @for (
              item of progress?.details || [];
              track item.subjectCode + item.year + item.semester
            ) {
              <li>
                <span [class]="statusClass(item.status)">{{ statusIcon(item.status) }}</span>
                <div>
                  <p>{{ item.subjectName }} ({{ item.credits }} TC)</p>
                  <small
                    >Nam {{ item.year }} · HK{{ item.semester }} ·
                    {{ item.letterGrade || '-' }}</small
                  >
                </div>
              </li>
            }
          </ul>
        </mat-card>
      }
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
      }

      .summary-card,
      .list-card {
        padding: 0.9rem;
      }

      .summary-card p {
        margin: 0 0 0.45rem;
        color: var(--text-sub);
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.45rem;
      }

      li {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
      }

      li p {
        margin: 0;
      }

      li small {
        color: var(--text-sub);
      }

      .status-completed {
        color: #16a34a;
      }

      .status-in-progress {
        color: #2563eb;
      }

      .status-failed {
        color: #dc2626;
      }

      .status-not-started {
        color: #6b7280;
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
    `,
  ],
})
export class StudentCurriculumComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  studentId = '';
  progress: ProgressSummary | null = null;

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.studentId = params.get('id') ?? '';
      if (!this.studentId) {
        this.errorMessage = 'Khong tim thay sinh vien.';
        this.isLoading = false;
        return;
      }

      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<{ studentCurriculum: unknown; progress: ProgressSummary }>>(
        `/student-curricula/${this.studentId}`,
      )
      .pipe(
        map((response) => response.data?.progress || null),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (progress) => {
          this.progress = progress;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  statusIcon(status: CurriculumDetail['status']): string {
    if (status === 'completed') {
      return '✓';
    }

    if (status === 'in-progress') {
      return '→';
    }

    if (status === 'failed') {
      return '✗';
    }

    return '○';
  }

  statusClass(status: CurriculumDetail['status']): string {
    if (status === 'completed') {
      return 'status-completed';
    }

    if (status === 'in-progress') {
      return 'status-in-progress';
    }

    if (status === 'failed') {
      return 'status-failed';
    }

    return 'status-not-started';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.message || 'Khong the tai tien do chuong trinh khung.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai tien do chuong trinh khung.';
  }
}
