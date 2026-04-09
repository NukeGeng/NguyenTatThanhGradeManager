import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Student } from '../../shared/models/interfaces';

interface StudentProgress {
  progressPercent: number;
  creditsEarned: number;
  creditsRequired: number;
  failed: number;
}

@Component({
  selector: 'app-advisor-students',
  standalone: true,
  imports: [
    CommonModule,
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
          <p class="eyebrow">Co van hoc tap</p>
          <h1 class="page-title">Sinh vien duoc phan cong</h1>
          <p class="subtitle">Theo doi tien do chuong trinh khung va canh bao hoc tap.</p>
        </div>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai danh sach sinh vien...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
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
                  Tien do tin chi:
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
                  <span class="badge danger">Canh bao F: {{ progress(student._id).failed }}</span>
                }
                @if (progress(student._id).progressPercent < 35) {
                  <span class="badge warn">Tien do cham</span>
                }
              </div>

              <button
                mat-flat-button
                class="btn-primary"
                type="button"
                (click)="openDetail(student)"
              >
                <lucide-icon name="target" [size]="16"></lucide-icon>
                Xem chi tiet co van
              </button>
            </mat-card>
          }
        </div>

        @if (!students.length) {
          <mat-card class="state-card empty">
            <lucide-icon name="info" [size]="20"></lucide-icon>
            <p>Chua co sinh vien nao duoc phan cong.</p>
          </mat-card>
        }
      }
    </section>
  `,
  styles: [
    `
      .page-wrap {
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

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<Student[]>>('/students')
      .pipe(
        map((response) => response.data ?? []),
        switchMap((students) => {
          this.students = students;

          if (!students.length) {
            return of([] as Array<{ id: string; progress: StudentProgress }>);
          }

          return forkJoin(
            students.map((student) =>
              this.apiService
                .get<
                  ApiResponse<{
                    studentCurriculum: unknown;
                    progress: StudentProgress;
                  }>
                >(`/student-curricula/${student._id}`)
                .pipe(
                  map((response) => ({
                    id: student._id,
                    progress: response.data?.progress,
                  })),
                  catchError(() =>
                    of({
                      id: student._id,
                      progress: {
                        progressPercent: 0,
                        creditsEarned: 0,
                        creditsRequired: 0,
                        failed: 0,
                      },
                    }),
                  ),
                ),
            ),
          );
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.progressMap.clear();
          for (const item of items) {
            this.progressMap.set(item.id, item.progress);
          }
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
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
      return error.message || 'Khong the tai danh sach sinh vien.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai danh sach sinh vien.';
  }
}
