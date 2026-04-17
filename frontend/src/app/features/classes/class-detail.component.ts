import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class } from '../../shared/models/interfaces';
import { ClassGradeSheetComponent } from '../grades/class-grade-sheet/class-grade-sheet.component';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    LucideAngularModule,
    ClassGradeSheetComponent,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <a [routerLink]="['/classes']">Lớp học</a>
        <span class="breadcrumb-sep">/</span>
        <span>Chi tiết</span>
      </nav>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải dữ liệu...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else if (classData) {
        <mat-card class="content-card hero-card">
          <div>
            <p class="eyebrow">Lớp học phần</p>
            <h1>{{ classData.name || classData.code }}</h1>
            <p>
              Mã lớp: {{ classData.code }} &middot; Học kỳ {{ classData.semester }} &middot; Năm
              học: {{ getSchoolYearName() }}
            </p>
            <p>Môn học: {{ getSubjectName() }} &middot; Giáo viên: {{ getTeacherName() }}</p>
          </div>
          <div class="hero-actions">
            <button mat-stroked-button type="button" (click)="goBack()">
              <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
              Quay lại danh sách lớp
            </button>
            <button mat-flat-button type="button" class="btn-primary" (click)="addStudent()">
              <lucide-icon name="user-plus" [size]="16"></lucide-icon>
              Thêm học sinh vào lớp
            </button>
          </div>
        </mat-card>

        <app-class-grade-sheet [presetClass]="classData" />
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
      .hero-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }
      @media (max-width: 768px) {
        .hero-card {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ClassDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  classData: Class | null = null;
  classId = '';
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.classId = params.get('id') ?? '';
      if (!this.classId) {
        this.errorMessage = 'Không tìm thấy mã lớp.';
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
      .get<ApiResponse<Class>>(`/classes/${this.classId}`)
      .pipe(
        map((r) => r.data),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (classData) => {
          this.classData = classData;
          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.isLoading = false;
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/classes']);
  }

  addStudent(): void {
    this.router.navigate(['/students/new'], { queryParams: { classId: this.classId } });
  }

  getSchoolYearName(): string {
    if (!this.classData) return '-';
    const sy = this.classData.schoolYearId;
    return typeof sy === 'string' ? sy : (sy as { name: string }).name;
  }

  getSubjectName(): string {
    if (!this.classData) return '-';
    const s = this.classData.subjectId;
    return typeof s === 'string' ? s : (s as { name: string }).name;
  }

  getTeacherName(): string {
    if (!this.classData || !this.classData.teacherId) return 'Chưa gán';
    return typeof this.classData.teacherId === 'string'
      ? this.classData.teacherId
      : (this.classData.teacherId as { name: string }).name;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string' && error.error.message.trim())
        return error.error.message;
      if (error.status === 0) return 'Không thể kết nối tới backend.';
    }
    return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
