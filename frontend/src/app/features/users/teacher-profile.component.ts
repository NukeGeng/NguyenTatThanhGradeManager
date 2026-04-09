import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class, Department, User } from '../../shared/models/interfaces';
import { toTenDigitTeacherCode } from '../../shared/utils/code-format.util';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTableModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Giáo viên</span>
        <span class="breadcrumb-sep">/</span>
        <span>Thông tin</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Hồ sơ giảng viên</p>
          <h1 class="page-title">Thông tin giảng viên</h1>
          <p class="subtitle">Tổng quan thông tin cá nhân và phụ trách giảng dạy.</p>
        </div>

        <button mat-stroked-button type="button" (click)="goBack()">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Quay lại danh sách giáo viên
        </button>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Đang tải thông tin giảng viên...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thử lại</button>
        </mat-card>
      } @else if (teacher) {
        <mat-card class="profile-card">
          <div class="profile-left">
            <div class="avatar">{{ getInitials(teacher.name) }}</div>
            <p><strong>MSGV:</strong> {{ formatTeacherCode() }}</p>
            <p><strong>Họ tên:</strong> {{ teacher.name }}</p>
            <p><strong>Email:</strong> {{ teacher.email }}</p>
            <p><strong>SĐT:</strong> {{ teacher.phone || '-' }}</p>
          </div>

          <div class="profile-right">
            <section class="section-block">
              <h2>Thông tin học vụ</h2>
              <div class="info-grid">
                <p>
                  <span>Trạng thái:</span>
                  <strong>{{ teacher.isActive === false ? 'Đã khóa' : 'Đang hoạt động' }}</strong>
                </p>
                <p>
                  <span>Mã giảng viên:</span> <strong>{{ formatTeacherCode() }}</strong>
                </p>
                <p>
                  <span>Khoa phụ trách:</span> <strong>{{ getDepartmentText() }}</strong>
                </p>
                <p>
                  <span>Số lớp phụ trách:</span> <strong>{{ teachingClasses.length }}</strong>
                </p>
                <p>
                  <span>Ngày tạo tài khoản:</span>
                  <strong>{{ formatDate(teacher.createdAt) }}</strong>
                </p>
                <p>
                  <span>Lần đăng nhập gần nhất:</span>
                  <strong>{{ formatDate(teacher.lastLogin) }}</strong>
                </p>
              </div>
            </section>

            <section class="section-block">
              <h2>Thông tin cá nhân</h2>
              <div class="info-grid">
                <p><span>Vai trò:</span> <strong>Giảng viên</strong></p>
                <p>
                  <span>Mã nội bộ:</span> <strong>{{ teacher._id }}</strong>
                </p>
                <p>
                  <span>Email công tác:</span> <strong>{{ teacher.email }}</strong>
                </p>
                <p>
                  <span>Điện thoại:</span> <strong>{{ teacher.phone || '-' }}</strong>
                </p>
              </div>
            </section>
          </div>
        </mat-card>

        <mat-card class="class-card">
          <h2 class="section-title">Lớp học phần đang phụ trách</h2>

          @if (teachingClasses.length === 0) {
            <div class="empty-state">
              <lucide-icon name="info" [size]="18"></lucide-icon>
              <p>Giảng viên chưa được phân công lớp học phần nào.</p>
            </div>
          } @else {
            <div class="table-wrap">
              <table mat-table [dataSource]="teachingClasses" class="full-table nttu-table">
                <ng-container matColumnDef="code">
                  <th mat-header-cell *matHeaderCellDef>Mã lớp HP</th>
                  <td mat-cell *matCellDef="let row">{{ row.code }}</td>
                </ng-container>

                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Tên lớp</th>
                  <td mat-cell *matCellDef="let row">{{ row.name || row.code }}</td>
                </ng-container>

                <ng-container matColumnDef="semester">
                  <th mat-header-cell *matHeaderCellDef>Học kỳ</th>
                  <td mat-cell *matCellDef="let row">HK{{ row.semester }}</td>
                </ng-container>

                <ng-container matColumnDef="studentCount">
                  <th mat-header-cell *matHeaderCellDef>Sĩ số</th>
                  <td mat-cell *matCellDef="let row">{{ row.studentCount }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="classColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: classColumns"></tr>
              </table>
            </div>
          }
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

      .state-card {
        min-height: 220px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
      }

      .state-card.error {
        color: var(--red);
      }

      .profile-card {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 0.95rem 1rem 1rem;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 1.1rem;
      }

      .profile-left {
        display: grid;
        align-content: start;
        gap: 0.45rem;
      }

      .profile-left p {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.86rem;
      }

      .avatar {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--navy), var(--blue));
        color: #fff;
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
      }

      .profile-right {
        display: grid;
        gap: 0.95rem;
      }

      .section-block {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.8rem 0.9rem;
        background: #fff;
      }

      .section-block h2 {
        margin: 0;
        color: var(--navy);
        font-size: 1.05rem;
        font-weight: 800;
      }

      .info-grid {
        margin-top: 0.7rem;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.45rem 1.25rem;
      }

      .info-grid p {
        margin: 0;
        color: var(--text-sub);
      }

      .info-grid span {
        color: #64748b;
      }

      .class-card {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 0.95rem 1rem 1rem;
      }

      .table-wrap {
        overflow-x: auto;
      }

      .full-table {
        width: 100%;
      }

      .empty-state {
        min-height: 130px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.45rem;
        color: var(--text-sub);
      }

      @media (max-width: 1024px) {
        .profile-card {
          grid-template-columns: 1fr;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TeacherProfileComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly classColumns = ['code', 'name', 'semester', 'studentCount'];

  teacher: User | null = null;
  teachingClasses: Class[] = [];

  isLoading = true;
  errorMessage = '';

  private teacherId = '';
  private routeTeacherId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.routeTeacherId = params.get('id') ?? '';

      this.loadData();
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const teacherRequest = this.routeTeacherId
      ? this.apiService
          .get<ApiResponse<User>>(`/users/${this.routeTeacherId}`)
          .pipe(map((response) => response.data))
      : this.apiService.get<ApiResponse<User>>('/auth/me').pipe(map((response) => response.data));

    forkJoin({
      teacher: teacherRequest,
      classes: this.apiService
        .get<ApiResponse<Class[]>>('/classes')
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ teacher, classes }) => {
          this.teacher = teacher;
          this.teacherId = teacher._id;
          this.teachingClasses = classes.filter(
            (item) => this.resolveRefId(item.teacherId) === teacher._id,
          );
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  goBack(): void {
    if (this.routeTeacherId) {
      this.router.navigate(['/users']);
      return;
    }

    this.router.navigate(['/dashboard']);
  }

  formatTeacherCode(): string {
    if (!this.teacher) {
      return '0000000000';
    }

    return toTenDigitTeacherCode(this.teacher._id, this.teacher.teacherCode);
  }

  getDepartmentText(): string {
    if (
      !this.teacher ||
      !Array.isArray(this.teacher.departmentIds) ||
      this.teacher.departmentIds.length === 0
    ) {
      return '-';
    }

    return this.teacher.departmentIds
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        const department = item as Department;
        return `${department.code} - ${department.name}`;
      })
      .join(', ');
  }

  getInitials(name: string): string {
    const tokens = name
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, 2);

    return tokens.map((token) => token[0]?.toUpperCase() ?? '').join('') || 'GV';
  }

  formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return '-';
    }

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return '-';
    }

    return dateValue.toLocaleDateString('vi-VN');
  }

  private resolveRefId(value: string | { _id: string } | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return typeof value === 'string' ? value : value._id;
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
