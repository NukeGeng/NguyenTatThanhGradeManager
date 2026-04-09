import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Curriculum, CurriculumItem } from '../../shared/models/interfaces';

interface SemesterTimeline {
  year: number;
  semester: 1 | 2 | 3;
  items: CurriculumItem[];
  credits: number;
}

@Component({
  selector: 'app-curriculum-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Timeline CTDT</p>
          <h1 class="page-title">{{ curriculum?.name || 'Chi tiet CTDT' }}</h1>
          <p class="subtitle">Phan bo mon hoc theo tung nam, tung hoc ky.</p>
        </div>

        <div class="head-actions">
          <a mat-stroked-button routerLink="/curricula">
            <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
            Danh sach CTDT
          </a>
          <button mat-flat-button class="btn-primary" type="button" (click)="exportPdf()">
            <lucide-icon name="file-down" [size]="16"></lucide-icon>
            Xuat PDF
          </button>
        </div>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai chi tiet CTDT...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
        </mat-card>
      } @else if (curriculum) {
        <div class="timeline-grid">
          @for (slot of timeline; track trackTimeline(slot)) {
            <mat-card class="semester-card">
              <div class="semester-head">
                <h2>Nam {{ slot.year }} · HK{{ slot.semester }}</h2>
                @if (slot.semester === 3) {
                  <span class="summer-badge">He</span>
                }
              </div>

              <ul class="subject-list">
                @for (item of slot.items; track item.subjectCode + item.semester) {
                  <li>
                    <span class="name">{{ item.subjectName || item.subjectCode }}</span>
                    <span class="meta">
                      {{ item.credits }} TC
                      <span class="type-badge" [ngClass]="badgeClass(item.subjectType)">
                        {{ subjectTypeLabel(item.subjectType) }}
                      </span>
                    </span>
                  </li>
                }
              </ul>

              <footer>{{ slot.items.length }} mon · {{ slot.credits }} tin chi</footer>
            </mat-card>
          }
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

      .head-actions {
        display: inline-flex;
        gap: 0.6rem;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .timeline-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }

      .semester-card {
        padding: 1rem;
        display: grid;
        gap: 0.75rem;
      }

      .semester-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      h2 {
        margin: 0;
        color: var(--navy);
        font-size: 1rem;
      }

      .summer-badge {
        border-radius: 999px;
        padding: 0.2rem 0.5rem;
        font-size: 0.72rem;
        font-weight: 700;
        background: #fef3c7;
        color: #b45309;
      }

      .subject-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.45rem;
      }

      .subject-list li {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.5rem 0.6rem;
        display: grid;
        gap: 0.25rem;
      }

      .name {
        color: var(--text);
        font-weight: 600;
      }

      .meta {
        color: var(--text-sub);
        font-size: 0.78rem;
        display: inline-flex;
        gap: 0.35rem;
        align-items: center;
      }

      .type-badge {
        border-radius: 999px;
        padding: 0.15rem 0.45rem;
        font-size: 0.7rem;
        font-weight: 700;
      }

      .type-required {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .type-elective {
        background: #e5e7eb;
        color: #374151;
      }

      .type-prerequisite {
        background: #ffedd5;
        color: #c2410c;
      }

      footer {
        color: var(--text-sub);
        font-size: 0.82rem;
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
export class CurriculumDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  curriculum: Curriculum | null = null;
  timeline: SemesterTimeline[] = [];

  isLoading = true;
  errorMessage = '';

  private curriculumId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.curriculumId = params.get('id') ?? '';
      if (!this.curriculumId) {
        this.errorMessage = 'Khong tim thay CTDT.';
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
      .get<ApiResponse<Curriculum>>(`/curricula/${this.curriculumId}`)
      .pipe(
        map((response) => response.data),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.curriculum = data;
          this.timeline = this.buildTimeline(data.items || []);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  exportPdf(): void {
    window.print();
  }

  subjectTypeLabel(type: CurriculumItem['subjectType']): string {
    if (type === 'elective') {
      return 'Tu chon';
    }

    if (type === 'prerequisite') {
      return 'Tien quyet';
    }

    return 'Bat buoc';
  }

  badgeClass(type: CurriculumItem['subjectType']): string {
    if (type === 'elective') {
      return 'type-elective';
    }

    if (type === 'prerequisite') {
      return 'type-prerequisite';
    }

    return 'type-required';
  }

  trackTimeline(slot: SemesterTimeline): string {
    return `${slot.year}-${slot.semester}`;
  }

  private buildTimeline(items: CurriculumItem[]): SemesterTimeline[] {
    const slots = new Map<string, SemesterTimeline>();

    for (const item of items) {
      const semester = Number(item.semester) as 1 | 2 | 3;
      const year = Number(item.year);
      const key = `${year}-${semester}`;

      if (!slots.has(key)) {
        slots.set(key, {
          year,
          semester,
          items: [],
          credits: 0,
        });
      }

      const slot = slots.get(key);
      if (!slot) {
        continue;
      }

      slot.items.push(item);
      slot.credits += Number(item.credits || 0);
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
      return error.message || 'Khong the tai chi tiet CTDT.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai chi tiet CTDT.';
  }
}
