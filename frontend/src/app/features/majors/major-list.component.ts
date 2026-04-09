import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Department, Major } from '../../shared/models/interfaces';

@Component({
  selector: 'app-major-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Chuong trinh khung</p>
          <h1 class="page-title">Nganh dao tao</h1>
          <p class="subtitle">Quan ly danh sach nganh va dieu huong den danh sach CTDT.</p>
        </div>
      </header>

      <mat-card class="filter-card">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Khoa</mat-label>
          <mat-select [(value)]="selectedDepartmentId" (selectionChange)="applyFilter()">
            <mat-option value="">Tat ca khoa</mat-option>
            @for (department of departments; track department._id) {
              <mat-option [value]="department._id">{{ department.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-card>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai danh sach nganh...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
        </mat-card>
      } @else {
        <div class="major-grid">
          @for (major of filteredMajors; track major._id) {
            <mat-card class="major-card">
              <p class="major-code">{{ major.code }}</p>
              <h2>{{ major.name }}</h2>

              <div class="meta-row">
                <span>{{ major.totalCredits }} tin chi</span>
                <span>{{ major.durationYears }} nam</span>
              </div>

              <p class="dept-name">{{ resolveDepartmentName(major.departmentId) }}</p>

              <button
                mat-flat-button
                class="btn-primary"
                type="button"
                (click)="openCurricula(major)"
              >
                <lucide-icon name="arrow-right" [size]="16"></lucide-icon>
                Xem CTDT
              </button>
            </mat-card>
          }
        </div>

        @if (!filteredMajors.length) {
          <mat-card class="state-card empty">
            <lucide-icon name="info" [size]="20"></lucide-icon>
            <p>Khong co nganh nao theo bo loc da chon.</p>
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

      .filter-card {
        padding: 0.85rem 1rem;
      }

      .major-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }

      .major-card {
        padding: 1rem;
        display: grid;
        gap: 0.65rem;
      }

      .major-code {
        margin: 0;
        color: var(--blue);
        font-weight: 700;
        letter-spacing: 0.04em;
      }

      h2 {
        margin: 0;
        color: var(--navy);
        font-size: 1.05rem;
      }

      .meta-row {
        display: flex;
        gap: 0.5rem;
        color: var(--text-sub);
        font-size: 0.84rem;
      }

      .dept-name {
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
export class MajorListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  majors: Major[] = [];
  departments: Department[] = [];
  filteredMajors: Major[] = [];

  selectedDepartmentId = '';
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      majors: this.apiService
        .get<ApiResponse<Major[]>>('/majors')
        .pipe(map((response) => response.data ?? [])),
      departments: this.apiService
        .get<ApiResponse<Department[]>>('/departments')
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ majors, departments }) => {
          this.majors = majors;
          this.departments = departments;
          this.applyFilter();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  applyFilter(): void {
    if (!this.selectedDepartmentId) {
      this.filteredMajors = [...this.majors];
      return;
    }

    this.filteredMajors = this.majors.filter(
      (major) => this.resolveDepartmentId(major.departmentId) === this.selectedDepartmentId,
    );
  }

  openCurricula(major: Major): void {
    this.router.navigate(['/curricula'], { queryParams: { majorId: major._id } });
  }

  resolveDepartmentName(value: Major['departmentId']): string {
    if (typeof value !== 'string') {
      return value.name;
    }

    return this.departments.find((item) => item._id === value)?.name || value;
  }

  private resolveDepartmentId(value: Major['departmentId']): string {
    if (typeof value === 'string') {
      return value;
    }

    return value._id;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
      return error.message || 'Khong the tai danh sach nganh.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai danh sach nganh.';
  }
}
