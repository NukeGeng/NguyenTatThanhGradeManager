import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  GpaRoadmap,
  Prediction,
  RetakeRoadmap,
  Student,
  StudentCurriculum,
} from '../../shared/models/interfaces';

interface ProgressDetail {
  subjectCode: string;
  subjectName: string;
  credits: number;
  year: number;
  semester: 1 | 2 | 3;
  status: 'completed' | 'in-progress' | 'failed' | 'not-started';
  gpa4: number | null;
  letterGrade: string | null;
}

interface ProgressSummary {
  totalRequired: number;
  completed: number;
  inProgress: number;
  failed: number;
  remaining: number;
  creditsEarned: number;
  creditsRequired: number;
  progressPercent: number;
  details: ProgressDetail[];
}

interface StudentCurriculumPayload {
  studentCurriculum: StudentCurriculum;
  progress: ProgressSummary;
}

interface TimelineSlot {
  year: number;
  semester: 1 | 2 | 3;
  items: ProgressDetail[];
}

@Component({
  selector: 'app-advisor-student-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Ho so co van</p>
          <h1 class="page-title">{{ student?.fullName || 'Chi tiet sinh vien' }}</h1>
          <p class="subtitle">Tong quan GPA, tien do CTDT va lo trinh hoc tap tu AI.</p>
        </div>

        <a mat-stroked-button routerLink="/advisor/students">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Danh sach sinh vien
        </a>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai du lieu co van...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
        </mat-card>
      } @else {
        <mat-tab-group animationDuration="120ms">
          <mat-tab label="Tong quan">
            <div class="tab-wrap">
              <div class="stats-grid">
                <mat-card class="stat-card">
                  <p>Tin chi tich luy</p>
                  <h2>{{ progress?.creditsEarned || 0 }}/{{ progress?.creditsRequired || 0 }}</h2>
                </mat-card>

                <mat-card class="stat-card">
                  <p>Tien do</p>
                  <h2>{{ progress?.progressPercent || 0 }}%</h2>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="progress?.progressPercent || 0"
                  ></mat-progress-bar>
                </mat-card>

                <mat-card class="stat-card">
                  <p>Canh bao mon F</p>
                  <h2>{{ progress?.failed || 0 }}</h2>
                </mat-card>

                <mat-card class="stat-card">
                  <p>Du doan gan nhat</p>
                  <h2>{{ latestPrediction?.predictedRank || '-' }}</h2>
                  <p [class.risk-high]="latestPrediction?.riskLevel === 'high'">
                    {{ latestPrediction?.riskLevel || 'chua co' }}
                  </p>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Tien do CTDT">
            <div class="tab-wrap">
              <div class="timeline-grid">
                @for (slot of timeline; track trackSlot(slot)) {
                  <mat-card class="slot-card">
                    <div class="slot-head">
                      <h3>Nam {{ slot.year }} · HK{{ slot.semester }}</h3>
                      @if (slot.semester === 3) {
                        <span class="summer-badge">He</span>
                      }
                    </div>

                    <ul>
                      @for (item of slot.items; track item.subjectCode + item.semester) {
                        <li>
                          <span [class]="statusClass(item.status)">{{
                            statusIcon(item.status)
                          }}</span>
                          <div>
                            <p>{{ item.subjectName }}</p>
                            <small>
                              {{ item.credits }} TC · {{ item.letterGrade || 'chua co diem' }}
                            </small>
                          </div>
                        </li>
                      }
                    </ul>
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Lo trinh AI">
            <div class="tab-wrap">
              <div class="target-row">
                <button
                  mat-stroked-button
                  type="button"
                  [class.active]="targetGpa === 3.2"
                  (click)="changeTarget(3.2)"
                >
                  Muc tieu Gioi GPA >= 3.2
                </button>
                <button
                  mat-stroked-button
                  type="button"
                  [class.active]="targetGpa === 3.6"
                  (click)="changeTarget(3.6)"
                >
                  Muc tieu Xuat sac GPA >= 3.6
                </button>
              </div>

              @if (loadingRoadmap) {
                <mat-card class="state-card small">
                  <mat-spinner [diameter]="30"></mat-spinner>
                </mat-card>
              } @else if (gpaRoadmap) {
                <mat-card class="roadmap-card" [class.warn]="!gpaRoadmap.isAchievable">
                  <p class="summary-title">
                    {{
                      gpaRoadmap.isAchievable
                        ? 'Co the dat muc tieu voi ke hoach hien tai.'
                        : 'Can no luc rat cao de dat muc tieu nay.'
                    }}
                  </p>
                  <p>{{ gpaRoadmap.summary }}</p>
                </mat-card>

                <div class="plan-table-wrap">
                  <table class="plan-table">
                    <thead>
                      <tr>
                        <th>Mon hoc</th>
                        <th>Tin chi</th>
                        <th>Uu tien</th>
                        <th>Can dat</th>
                        <th>Hoc ky</th>
                        <th>Ly do</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (
                        plan of gpaRoadmap.subjectPlans;
                        track plan.subjectCode + plan.semester + plan.year
                      ) {
                        <tr>
                          <td>{{ plan.subjectName }}</td>
                          <td>{{ plan.credits }}</td>
                          <td>
                            <span class="priority" [class]="priorityClass(plan.priority)">
                              {{ priorityLabel(plan.priority) }}
                            </span>
                          </td>
                          <td>{{ plan.targetGrade }}</td>
                          <td>N{{ plan.year }} · HK{{ plan.semester }}</td>
                          <td>{{ plan.reason }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              @if (
                retakeRoadmap &&
                (retakeRoadmap.urgentRetakes.length || retakeRoadmap.recommendedRetakes.length)
              ) {
                <div class="retake-grid">
                  <mat-card class="retake urgent">
                    <h3>Hoc lai ngay</h3>
                    <ul>
                      @for (item of retakeRoadmap.urgentRetakes; track item.subjectCode) {
                        <li>
                          {{ item.subjectName }} · HK{{ item.suggestedSemester }}
                          <small>{{ item.reason }}</small>
                        </li>
                      }
                    </ul>
                  </mat-card>

                  <mat-card class="retake recommended">
                    <h3>Nen cai thien</h3>
                    <ul>
                      @for (item of retakeRoadmap.recommendedRetakes; track item.subjectCode) {
                        <li>
                          {{ item.subjectName }} · HK{{ item.suggestedSemester }}
                          <small>{{ item.reason }}</small>
                        </li>
                      }
                    </ul>
                  </mat-card>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
      }

      .tab-wrap {
        margin-top: 1rem;
        display: grid;
        gap: 1rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 0.85rem;
      }

      .stat-card {
        padding: 0.85rem 0.95rem;
        display: grid;
        gap: 0.35rem;
      }

      .stat-card p {
        margin: 0;
        color: var(--text-sub);
      }

      .stat-card h2 {
        margin: 0;
        color: var(--navy);
      }

      .timeline-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 0.85rem;
      }

      .slot-card {
        padding: 0.8rem;
      }

      .slot-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .slot-head h3 {
        margin: 0;
        color: var(--navy);
        font-size: 0.95rem;
      }

      .summer-badge {
        border-radius: 999px;
        padding: 0.15rem 0.45rem;
        font-size: 0.7rem;
        font-weight: 700;
        background: #fef3c7;
        color: #b45309;
      }

      ul {
        list-style: none;
        margin: 0.65rem 0 0;
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

      .risk-high {
        color: #dc2626;
      }

      .target-row {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .target-row button.active {
        background: var(--navy);
        color: #fff;
      }

      .roadmap-card {
        padding: 0.85rem 0.95rem;
        border-left: 4px solid #16a34a;
      }

      .roadmap-card.warn {
        border-left-color: #d97706;
        background: #fffbeb;
      }

      .summary-title {
        margin: 0;
        font-weight: 700;
      }

      .plan-table-wrap {
        overflow: auto;
      }

      .plan-table {
        width: 100%;
        border-collapse: collapse;
      }

      .plan-table th,
      .plan-table td {
        border-bottom: 1px solid var(--gray-200);
        padding: 0.5rem 0.45rem;
        text-align: left;
        font-size: 0.83rem;
      }

      .priority {
        border-radius: 999px;
        padding: 0.12rem 0.45rem;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .priority-critical {
        color: #b91c1c;
        background: #fee2e2;
      }

      .priority-high {
        color: #b45309;
        background: #ffedd5;
      }

      .priority-normal {
        color: #374151;
        background: #e5e7eb;
      }

      .retake-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.85rem;
      }

      .retake {
        padding: 0.8rem;
      }

      .retake h3 {
        margin: 0;
      }

      .retake.urgent {
        background: #fef2f2;
      }

      .retake.recommended {
        background: #fffbeb;
      }

      .state-card {
        min-height: 180px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.65rem;
      }

      .state-card.small {
        min-height: 120px;
      }

      .state-card.error {
        color: #dc2626;
      }

      @media (max-width: 980px) {
        .retake-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdvisorStudentDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  student: Student | null = null;
  progress: ProgressSummary | null = null;
  timeline: TimelineSlot[] = [];
  predictions: Prediction[] = [];
  latestPrediction: Prediction | null = null;

  gpaRoadmap: GpaRoadmap | null = null;
  retakeRoadmap: RetakeRoadmap | null = null;

  isLoading = true;
  loadingRoadmap = false;
  errorMessage = '';
  targetGpa: 3.2 | 3.6 = 3.2;

  private studentId = '';

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

    forkJoin({
      student: this.apiService
        .get<ApiResponse<Student>>(`/students/${this.studentId}`)
        .pipe(map((response) => response.data)),
      studentCurriculum: this.apiService
        .get<ApiResponse<StudentCurriculumPayload>>(`/student-curricula/${this.studentId}`)
        .pipe(map((response) => response.data)),
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
        next: ({ student, studentCurriculum, predictions }) => {
          this.student = student;
          this.progress = studentCurriculum.progress;
          this.timeline = this.buildTimeline(studentCurriculum.progress.details || []);
          this.predictions = predictions;
          this.latestPrediction = predictions[0] || null;
          this.loadRoadmaps();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  changeTarget(target: 3.2 | 3.6): void {
    this.targetGpa = target;
    this.loadRoadmaps();
  }

  trackSlot(slot: TimelineSlot): string {
    return `${slot.year}-${slot.semester}`;
  }

  statusIcon(status: ProgressDetail['status']): string {
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

  statusClass(status: ProgressDetail['status']): string {
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

  priorityClass(priority: 'critical' | 'high' | 'normal'): string {
    return `priority-${priority}`;
  }

  priorityLabel(priority: 'critical' | 'high' | 'normal'): string {
    if (priority === 'critical') {
      return 'Cot loi';
    }

    if (priority === 'high') {
      return 'Quan trong';
    }

    return 'Thong thuong';
  }

  private loadRoadmaps(): void {
    this.loadingRoadmap = true;

    forkJoin({
      gpaRoadmap: this.apiService
        .get<ApiResponse<GpaRoadmap>>(`/predictions/student/${this.studentId}/gpa-roadmap`, {
          targetGpa: this.targetGpa,
        })
        .pipe(map((response) => response.data)),
      retakeRoadmap: this.apiService
        .get<ApiResponse<RetakeRoadmap>>(`/predictions/student/${this.studentId}/retake-roadmap`)
        .pipe(map((response) => response.data)),
    })
      .pipe(
        finalize(() => {
          this.loadingRoadmap = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ gpaRoadmap, retakeRoadmap }) => {
          this.gpaRoadmap = gpaRoadmap;
          this.retakeRoadmap = retakeRoadmap;
        },
        error: () => {
          this.gpaRoadmap = null;
          this.retakeRoadmap = null;
        },
      });
  }

  private buildTimeline(details: ProgressDetail[]): TimelineSlot[] {
    const slots = new Map<string, TimelineSlot>();

    for (const item of details) {
      const key = `${item.year}-${item.semester}`;
      if (!slots.has(key)) {
        slots.set(key, {
          year: item.year,
          semester: item.semester,
          items: [],
        });
      }

      const slot = slots.get(key);
      if (!slot) {
        continue;
      }

      slot.items.push(item);
    }

    return Array.from(slots.values()).sort((a, b) => {
      if (a.year === b.year) {
        return a.semester - b.semester;
      }
      return a.year - b.year;
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.message || 'Khong the tai du lieu co van.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai du lieu co van.';
  }
}
