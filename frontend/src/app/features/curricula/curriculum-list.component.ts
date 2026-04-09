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
import { ApiResponse, Curriculum, Major } from '../../shared/models/interfaces';

@Component({
  selector: 'app-curriculum-list',
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
          <p class="eyebrow">Chuong trinh khung</p>
          <h1 class="page-title">Danh sach CTDT</h1>
          <p class="subtitle">Quan ly va theo doi cac chuong trinh khung theo tung nganh.</p>
        </div>

        <a mat-stroked-button routerLink="/majors">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lai nganh
        </a>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai danh sach CTDT...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
        </mat-card>
      } @else {
        <div class="grid">
          @for (item of curricula; track item._id) {
            <mat-card class="curr-card">
              <p class="code">{{ resolveMajorCode(item.majorId) }}</p>
              <h2>{{ item.name }}</h2>
              <p class="desc">Khoa: {{ item.schoolYear }} · Tong {{ item.totalCredits }} tin chi</p>

              <button mat-flat-button class="btn-primary" type="button" (click)="openDetail(item)">
                <lucide-icon name="arrow-right" [size]="16"></lucide-icon>
                Xem timeline
              </button>
            </mat-card>
          }
        </div>

        @if (!curricula.length) {
          <mat-card class="state-card empty">
            <lucide-icon name="info" [size]="20"></lucide-icon>
            <p>Khong co CTDT nao phu hop.</p>
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

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1rem;
      }

      .curr-card {
        padding: 1rem;
        display: grid;
        gap: 0.55rem;
      }

      .code {
        margin: 0;
        color: var(--blue);
        font-weight: 700;
      }

      h2 {
        margin: 0;
        color: var(--navy);
        font-size: 1.05rem;
      }

      .desc {
        margin: 0;
        color: var(--text-sub);
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
export class CurriculumListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  curricula: Curriculum[] = [];
  majors: Major[] = [];

  isLoading = true;
  errorMessage = '';
  private majorId = '';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.majorId = params.get('majorId') ?? '';
      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .get<ApiResponse<Curriculum[]>>(
        '/curricula',
        this.majorId ? { majorId: this.majorId } : undefined,
      )
      .pipe(
        map((response) => response.data ?? []),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.curricula = data;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });

    this.apiService
      .get<ApiResponse<Major[]>>('/majors')
      .pipe(
        map((response) => response.data ?? []),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.majors = data;
        },
      });
  }

  openDetail(item: Curriculum): void {
    this.router.navigate(['/curricula', item._id]);
  }

  resolveMajorCode(value: Curriculum['majorId']): string {
    if (typeof value !== 'string') {
      return value.code;
    }

    return this.majors.find((item) => item._id === value)?.code || value;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.message || 'Khong the tai danh sach CTDT.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai danh sach CTDT.';
  }
}
