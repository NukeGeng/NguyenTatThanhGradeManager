import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class, Student } from '../../shared/models/interfaces';
import { toTenDigitStudentCode } from '../../shared/utils/code-format.util';

@Component({
  selector: 'app-class-detail',
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
        <span>Lớp học</span>
        <span class="breadcrumb-sep">/</span>
        <span>Chi tiết</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Quản lý lớp học</p>
          <h1 class="page-title">Chi tiết lớp học phần</h1>
          <p class="subtitle">Theo dõi thông tin lớp và danh sách học sinh trong lớp học phần.</p>
        </div>

        <button mat-stroked-button type="button" (click)="goBack()">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lại danh sách lớp
        </button>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải thông tin lớp...</p>
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
              Mã lớp: {{ classData.code }} · Học kỳ {{ classData.semester }} · Năm học:
              {{ getSchoolYearName() }}
            </p>
            <p>Môn học: {{ getSubjectName() }} · Giáo viên: {{ getTeacherName() }}</p>
          </div>

          <div class="hero-actions">
            <button mat-flat-button type="button" class="btn-primary" (click)="addStudent()">
              <lucide-icon name="user-plus" [size]="16"></lucide-icon>
              Thêm học sinh vào lớp
            </button>
          </div>
        </mat-card>

        <mat-card class="content-card">
          <h2 class="section-title">Danh sách học sinh</h2>

          <div class="table-wrap">
            <table mat-table [dataSource]="students" class="full-table nttu-table">
              <ng-container matColumnDef="studentCode">
                <th mat-header-cell *matHeaderCellDef>Mã HS</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ formatStudentCode(row) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef>Họ tên</th>
                <td mat-cell *matCellDef="let row">{{ row.fullName }}</td>
              </ng-container>

              <ng-container matColumnDef="gender">
                <th mat-header-cell *matHeaderCellDef>Giới tính</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  {{ formatGender(row.gender) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let row" class="cell-center">
                  <span class="status-chip" [class.status-chip--active]="row.status === 'active'">
                    <span
                      class="status-dot"
                      [class.status-dot--active]="row.status === 'active'"
                    ></span>
                    {{ formatStatus(row.status) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Thao tác</th>
                <td mat-cell *matCellDef="let row" class="actions-cell">
                  <a
                    class="action-btn"
                    [routerLink]="['/students', row._id]"
                    aria-label="Xem chi tiết sinh viên"
                    title="Xem chi tiết sinh viên"
                  >
                    <lucide-icon name="eye" [size]="15"></lucide-icon>
                  </a>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>
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
        align-items: flex-start;
      }

      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
      }

      h2 {
        margin: 0 0 0.75rem;
        color: var(--navy);
      }

      .table-wrap {
        overflow-x: auto;
        border: 1px solid #c8d0d8;
        border-radius: 4px;
        background: #fff;
      }

      .full-table {
        width: 100%;
        border-collapse: collapse;
      }

      .full-table .mat-mdc-header-row {
        height: 58px;
        background: #d8e1e8;
      }

      .full-table .mat-mdc-header-cell {
        color: #1f8fe4;
        font-weight: 700;
        font-size: 0.92rem;
        border-bottom: 1px solid #bcc8d2;
        border-right: 1px solid #c7d1da;
        text-align: center;
      }

      .full-table .mat-mdc-cell {
        height: 52px;
        color: #4f6679;
        font-size: 0.95rem;
        border-bottom: 1px solid #d1d8de;
        border-right: 1px solid #d1d8de;
      }

      .full-table .mat-mdc-header-cell:first-child,
      .full-table .mat-mdc-cell:first-child {
        border-left: 1px solid #c7d1da;
      }

      .full-table .mat-mdc-row:last-child .mat-mdc-cell {
        border-bottom: 0;
      }

      .cell-center {
        text-align: center;
        justify-content: center;
      }

      .full-table .mat-column-studentCode {
        width: 150px;
        min-width: 150px;
        max-width: 150px;
      }

      .full-table .mat-column-fullName {
        width: auto;
        min-width: 180px;
      }

      .full-table .mat-column-gender {
        width: 110px;
        min-width: 110px;
        max-width: 110px;
      }

      .full-table .mat-column-status {
        width: 150px;
        min-width: 150px;
        max-width: 150px;
      }

      .full-table .mat-column-actions {
        width: 80px;
        min-width: 80px;
        max-width: 80px;
      }

      .actions-cell {
        white-space: nowrap;
        text-align: center;
        justify-content: center;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border-radius: 999px;
        padding: 0.2rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 700;
        background: #fee2e2;
        color: #dc2626;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      .status-chip--active {
        background: #dcfce7;
        color: #16a34a;
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['studentCode', 'fullName', 'gender', 'status', 'actions'];

  classData: Class | null = null;
  students: Student[] = [];

  isLoading = true;
  errorMessage = '';

  private classId = '';

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

    forkJoin({
      classData: this.apiService
        .get<ApiResponse<Class>>(`/classes/${this.classId}`)
        .pipe(map((response) => response.data)),
      students: this.apiService
        .get<ApiResponse<Student[]>>(`/classes/${this.classId}/students`)
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ classData, students }) => {
          this.classData = classData;
          this.students = students;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
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
    if (!this.classData) {
      return '-';
    }

    const schoolYear = this.classData.schoolYearId;
    return typeof schoolYear === 'string' ? schoolYear : schoolYear.name;
  }

  getSubjectName(): string {
    if (!this.classData) {
      return '-';
    }

    const subject = this.classData.subjectId;
    return typeof subject === 'string' ? subject : subject.name;
  }

  getTeacherName(): string {
    if (!this.classData || !this.classData.teacherId) {
      return 'Chưa gán';
    }

    return typeof this.classData.teacherId === 'string'
      ? this.classData.teacherId
      : this.classData.teacherId.name;
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

  formatStudentCode(student: Student): string {
    return toTenDigitStudentCode(student.studentCode, student._id);
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
