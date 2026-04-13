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
  subjectType: 'required' | 'elective' | 'prerequisite';
  status: 'completed' | 'in-progress' | 'failed' | 'not-started';
  letterGrade: string | null;
  gpa4: number | null;
}

interface SemesterGroup {
  label: string;
  index: number;
  totalCredits: number;
  completedCredits: number;
  items: (CurriculumDetail & { stt: number })[];
  open: boolean;
}

interface ProgressSummary {
  creditsEarned: number;
  creditsRequired: number;
  progressPercent: number;
  totalRequired: number;
  completed: number;
  inProgress: number;
  failed: number;
  remaining: number;
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
          <p class="eyebrow">Tiến độ chương trình khung</p>
          <h1 class="page-title">Học sinh {{ studentId }}</h1>
          <p class="subtitle">Theo dõi tín chỉ tích lũy và trạng thái từng môn.</p>
        </div>

        <a mat-stroked-button [routerLink]="['/students', studentId]">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lại hồ sơ
        </a>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải tiến độ...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else {
        <!-- Summary bar -->
        <mat-card class="summary-card">
          <div class="summary-top">
            <span class="summary-credits">
              <strong>{{ progress?.creditsEarned || 0 }}</strong>
              / {{ progress?.creditsRequired || 0 }} tín chỉ
            </span>
            <span class="summary-pct">{{ progress?.progressPercent || 0 }}%</span>
          </div>
          <mat-progress-bar
            mode="determinate"
            [value]="progress?.progressPercent || 0"
          ></mat-progress-bar>
          <div class="summary-chips">
            <span class="chip chip--done">
              <lucide-icon name="check-circle" [size]="13"></lucide-icon>
              Đạt: {{ progress?.completed || 0 }}
            </span>
            <span class="chip chip--progress">
              <lucide-icon name="clock" [size]="13"></lucide-icon>
              Đang học: {{ progress?.inProgress || 0 }}
            </span>
            <span class="chip chip--fail">
              <lucide-icon name="x-circle" [size]="13"></lucide-icon>
              Rớt: {{ progress?.failed || 0 }}
            </span>
            <span class="chip chip--pending">
              <lucide-icon name="circle" [size]="13"></lucide-icon>
              Chưa học: {{ progress?.remaining || 0 }}
            </span>
          </div>
        </mat-card>

        <!-- Accordion per semester -->
        @if (semesterGroups.length === 0) {
          <mat-card class="state-card">
            <lucide-icon name="book-open" [size]="24"></lucide-icon>
            <p>Chưa có dữ liệu chương trình khung.</p>
          </mat-card>
        } @else {
          <div class="accordion-list">
            @for (group of semesterGroups; track group.index) {
              <div class="accordion-item" [class.is-open]="group.open">
                <button type="button" class="accordion-header" (click)="group.open = !group.open">
                  <span class="acc-left">
                    <lucide-icon
                      [name]="group.open ? 'chevron-down' : 'chevron-right'"
                      [size]="16"
                      class="acc-chevron"
                    ></lucide-icon>
                    <span class="acc-title">{{ group.label }}</span>
                  </span>
                  <span class="acc-right">
                    <span class="acc-badge">{{ group.totalCredits }} TC</span>
                    <span class="acc-badge acc-badge--done">
                      {{ group.completedCredits }}/{{ group.totalCredits }} TC đạt
                    </span>
                    <span class="acc-count">{{ group.items.length }} môn</span>
                  </span>
                </button>

                @if (group.open) {
                  <div class="accordion-body">
                    <div class="table-wrap">
                      <table class="curriculum-table">
                        <thead>
                          <tr>
                            <th class="col-stt">STT</th>
                            <th class="col-name">Tên môn học / Học phần</th>
                            <th class="col-code">Mã học phần</th>
                            <th class="col-type">Loại</th>
                            <th class="col-tc">Số TC</th>
                            <th class="col-grade">Điểm</th>
                            <th class="col-status">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of group.items; track item.subjectCode) {
                            <tr [class]="'row-' + item.status">
                              <td class="col-stt cell-center">{{ item.stt }}</td>
                              <td class="col-name">{{ item.subjectName }}</td>
                              <td class="col-code cell-center">{{ item.subjectCode || '-' }}</td>
                              <td class="col-type cell-center">
                                <span [class]="'type-badge type-' + item.subjectType">
                                  {{ subjectTypeLabel(item.subjectType) }}
                                </span>
                              </td>
                              <td class="col-tc cell-center">{{ item.credits }}</td>
                              <td class="col-grade cell-center">{{ item.letterGrade || '-' }}</td>
                              <td class="col-status cell-center">
                                <span [class]="'status-badge status-' + item.status">
                                  {{ statusLabel(item.status) }}
                                </span>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
        padding-block: 1.5rem;
      }

      /* ── Summary card ── */
      .summary-card {
        padding: 1rem 1.2rem;
      }

      .summary-top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.4rem;
      }

      .summary-credits {
        font-size: 0.95rem;
        color: var(--text-sub);
      }

      .summary-credits strong {
        font-size: 1.25rem;
        color: var(--text-main, #1e293b);
      }

      .summary-pct {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--primary, #2563eb);
      }

      .summary-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.65rem;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        border: 1px solid;
      }

      .chip--done {
        color: #16a34a;
        border-color: #bbf7d0;
        background: #f0fdf4;
      }
      .chip--progress {
        color: #2563eb;
        border-color: #bfdbfe;
        background: #eff6ff;
      }
      .chip--fail {
        color: #dc2626;
        border-color: #fecaca;
        background: #fef2f2;
      }
      .chip--pending {
        color: #6b7280;
        border-color: #e5e7eb;
        background: #f9fafb;
      }

      /* ── Accordion ── */
      .accordion-list {
        display: grid;
        gap: 0.5rem;
      }

      .accordion-item {
        border: 1px solid var(--border, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
        transition: box-shadow 0.15s;
      }

      .accordion-item.is-open {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
      }

      .accordion-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.12s;
      }

      .accordion-item.is-open .accordion-header {
        background: #f8faff;
        border-bottom: 1px solid var(--border, #e2e8f0);
      }

      .accordion-header:hover {
        background: #f1f5f9;
      }

      .acc-left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .acc-chevron {
        color: var(--text-sub, #64748b);
        flex-shrink: 0;
      }

      .acc-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text-main, #1e293b);
      }

      .acc-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
        min-width: 260px;
        justify-content: flex-end;
      }

      .acc-badge {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.18rem 0.5rem;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        min-width: 52px;
        text-align: center;
      }

      .acc-badge--done {
        background: #dcfce7;
        color: #16a34a;
        min-width: 110px;
        text-align: center;
      }

      .acc-count {
        font-size: 0.72rem;
        color: var(--text-sub, #64748b);
      }

      /* ── Table ── */
      .accordion-body {
        padding: 0;
      }

      .table-wrap {
        overflow-x: auto;
      }

      .curriculum-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }

      .curriculum-table thead tr {
        background: #f1f5f9;
      }

      .curriculum-table th {
        padding: 0.55rem 0.75rem;
        font-weight: 600;
        font-size: 0.78rem;
        color: #2563eb;
        text-align: left;
        white-space: nowrap;
        border-bottom: 1px solid #e2e8f0;
      }

      .curriculum-table td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
        vertical-align: middle;
      }

      .curriculum-table tbody tr:last-child td {
        border-bottom: none;
      }

      .curriculum-table tbody tr:hover {
        background: #f8faff;
      }

      .cell-center {
        text-align: center;
      }

      .col-stt {
        width: 46px;
      }
      .col-code {
        width: 120px;
      }
      .col-type {
        width: 90px;
      }
      .col-tc {
        width: 60px;
      }
      .col-grade {
        width: 70px;
      }
      .col-status {
        width: 110px;
      }

      /* row tinting */
      .row-completed td {
        background: #f0fdf4 !important;
      }
      .row-failed td {
        background: #fff5f5 !important;
      }
      .row-in-progress td {
        background: #eff6ff !important;
      }

      .curriculum-table tbody tr.row-completed:hover td {
        background: #dcfce7 !important;
      }
      .curriculum-table tbody tr.row-failed:hover td {
        background: #fee2e2 !important;
      }
      .curriculum-table tbody tr.row-in-progress:hover td {
        background: #dbeafe !important;
      }

      /* type badge */
      .type-badge {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
      }

      .type-required {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .type-elective {
        background: #fef9c3;
        color: #854d0e;
      }
      .type-prerequisite {
        background: #f3e8ff;
        color: #7e22ce;
      }

      /* status badge */
      .status-badge {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.18rem 0.5rem;
        border-radius: 999px;
      }

      .status-completed {
        background: #dcfce7;
        color: #16a34a;
      }
      .status-in-progress {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .status-failed {
        background: #fee2e2;
        color: #dc2626;
      }
      .status-not-started {
        background: #f1f5f9;
        color: #64748b;
      }

      /* State cards */
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
  semesterGroups: SemesterGroup[] = [];

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.studentId = params.get('id') ?? '';
      if (!this.studentId) {
        this.errorMessage = 'Không tìm thấy sinh viên.';
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
          this.semesterGroups = this.buildSemesterGroups(progress?.details || []);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private buildSemesterGroups(details: CurriculumDetail[]): SemesterGroup[] {
    // Sort by year then semester
    const sorted = [...details].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.semester - b.semester,
    );

    // Collect ordered unique (year, semester) keys
    const seenKeys: string[] = [];
    const keySet = new Set<string>();
    for (const item of sorted) {
      const k = `${item.year}-${item.semester}`;
      if (!keySet.has(k)) {
        keySet.add(k);
        seenKeys.push(k);
      }
    }

    const groups: SemesterGroup[] = seenKeys.map((key, idx) => {
      const [yearStr, semStr] = key.split('-');
      const yearNum = Number(yearStr);
      const semNum = Number(semStr);
      const items = sorted
        .filter((d) => d.year === yearNum && d.semester === semNum)
        .map((d, i) => ({ ...d, stt: i + 1 }));

      const totalCredits = items.reduce((s, d) => s + d.credits, 0);
      const completedCredits = items
        .filter((d) => d.status === 'completed')
        .reduce((s, d) => s + d.credits, 0);

      return {
        label: `Học kỳ ${idx + 1}`,
        index: idx + 1,
        totalCredits,
        completedCredits,
        items,
        open: false,
      };
    });

    // Open the first semester by default
    if (groups.length > 0) {
      groups[0].open = true;
    }

    return groups;
  }

  subjectTypeLabel(type: CurriculumDetail['subjectType']): string {
    if (type === 'elective') return 'Tự chọn';
    if (type === 'prerequisite') return 'Tiên quyết';
    return 'Bắt buộc';
  }

  statusLabel(status: CurriculumDetail['status']): string {
    if (status === 'completed') return 'Đạt';
    if (status === 'in-progress') return 'Đang học';
    if (status === 'failed') return 'Rớt';
    return 'Chưa học';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.message || 'Không thể tải tiến độ chương trình khung.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Không thể tải tiến độ chương trình khung.';
  }
}
