import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, finalize, forkJoin, map, of, timeout } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Prediction } from '../../shared/models/interfaces';

Chart.register(...registerables);

type GradeBucket = 'A' | 'B' | 'C' | 'F';

interface AlertRow {
  studentName: string;
  className: string;
  predictedRank: string;
  riskLevel: 'high' | 'medium' | 'low';
}

interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  totalAlerts: number;
  excellentRate: number;
}

interface DashboardSummaryResponse {
  totalStudents: number;
  totalClasses: number;
  gradeCounts: Partial<Record<GradeBucket, number>>;
  filterOptions: {
    departments: Array<{
      _id: string;
      code: string;
      name: string;
    }>;
    semesters: number[];
    classes: Array<{
      _id: string;
      code: string;
      name: string;
      semester: number;
      departmentId: string;
    }>;
    students: Array<{
      _id: string;
      studentCode: string;
      fullName: string;
      classId: string;
    }>;
  };
  appliedFilters: {
    departmentId: string;
    semester: string;
    classId: string;
    studentId: string;
    activeOnly: boolean;
  };
}

interface DashboardDepartmentOption {
  id: string;
  label: string;
}

interface DashboardClassOption {
  id: string;
  label: string;
  semester: number;
  departmentId: string;
}

interface DashboardStudentOption {
  id: string;
  label: string;
  classId: string;
}

interface AlertsPagePayload {
  items: Prediction[];
  total: number;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LucideAngularModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly requestTimeoutMs = 10000;
  private loadingGuardTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('gradeChartCanvas')
  set gradeChartCanvasRef(value: ElementRef<HTMLCanvasElement> | undefined) {
    this.gradeChartCanvas = value;

    if (!value) {
      this.destroyChart();
      return;
    }

    this.renderOrUpdateGradeChart();
  }

  private gradeChartCanvas?: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  errorMessage = '';

  stats: DashboardStats = {
    totalStudents: 0,
    totalClasses: 0,
    totalAlerts: 0,
    excellentRate: 0,
  };

  gradeCounts: Record<GradeBucket, number> = {
    A: 0,
    B: 0,
    C: 0,
    F: 0,
  };

  alertRows: AlertRow[] = [];
  alertPage = 1;
  alertPageSize = 20;
  alertTotal = 0;

  selectedDepartmentId = 'all';
  selectedSemester: 'all' | '1' | '2' | '3' = 'all';
  selectedClassId = 'all';
  selectedStudentId = 'all';

  departmentOptions: DashboardDepartmentOption[] = [];
  classOptions: DashboardClassOption[] = [];
  studentOptions: DashboardStudentOption[] = [];

  private gradeChart?: Chart<'bar', number[], string>;
  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.loadingGuardTimer) {
      clearTimeout(this.loadingGuardTimer);
      this.loadingGuardTimer = null;
    }

    // Chot chan de tranh UI bi treo loading vo han neu co tinh huong bat thuong.
    this.loadingGuardTimer = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this.isLoading = false;
      this.errorMessage = 'Het thoi gian cho tai dashboard. Vui long thu lai.';
      this.syncView();
    }, this.requestTimeoutMs + 2000);

    const summaryRequest = this.apiService
      .get<ApiResponse<DashboardSummaryResponse>>('/grades/summary/dashboard', {
        activeOnly: true,
        departmentId: this.selectedDepartmentId,
        semester: this.selectedSemester,
        classId: this.selectedClassId,
        studentId: this.selectedStudentId,
      })
      .pipe(
        timeout(this.requestTimeoutMs),
        map(
          (response) =>
            response.data ?? {
              totalStudents: 0,
              totalClasses: 0,
              gradeCounts: { A: 0, B: 0, C: 0, F: 0 },
              filterOptions: {
                departments: [],
                semesters: [1, 2, 3],
                classes: [],
                students: [],
              },
              appliedFilters: {
                departmentId: 'all',
                semester: 'all',
                classId: 'all',
                studentId: 'all',
                activeOnly: true,
              },
            },
        ),
        catchError(() =>
          of({
            totalStudents: 0,
            totalClasses: 0,
            gradeCounts: { A: 0, B: 0, C: 0, F: 0 },
            filterOptions: {
              departments: [],
              semesters: [1, 2, 3],
              classes: [],
              students: [],
            },
            appliedFilters: {
              departmentId: 'all',
              semester: 'all',
              classId: 'all',
              studentId: 'all',
              activeOnly: true,
            },
          }),
        ),
      );

    const alertsRequest = this.apiService
      .get<ApiResponse<AlertsPagePayload>>('/predictions/alerts', {
        page: this.alertPage,
        limit: this.alertPageSize,
      })
      .pipe(
        timeout(this.requestTimeoutMs),
        map(
          (response) =>
            response.data ?? { items: [], total: 0, page: 1, limit: this.alertPageSize },
        ),
        catchError(() =>
          of({ items: [] as Prediction[], total: 0, page: 1, limit: this.alertPageSize }),
        ),
      );

    forkJoin({
      summary: summaryRequest,
      alerts: alertsRequest,
    })
      .pipe(
        finalize(() => {
          if (this.loadingGuardTimer) {
            clearTimeout(this.loadingGuardTimer);
            this.loadingGuardTimer = null;
          }

          this.isLoading = false;
          this.syncView();
        }),
      )
      .subscribe({
        next: ({ summary, alerts }) => {
          try {
            this.applyDashboardData(summary, alerts.items ?? []);
            this.alertTotal = Number(alerts.total || 0);
            this.syncView();
          } catch (error: unknown) {
            this.errorMessage = this.resolveErrorMessage(error);
            this.isLoading = false;
            this.syncView();
          }
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.errorMessage = this.resolveErrorMessage(error);
          this.syncView();
        },
      });
  }

  private applyDashboardData(summary: DashboardSummaryResponse, alerts: Prediction[]): void {
    this.departmentOptions = (summary.filterOptions?.departments ?? []).map((item) => ({
      id: item._id,
      label: `${item.code} - ${item.name}`,
    }));

    this.classOptions = (summary.filterOptions?.classes ?? []).map((item) => ({
      id: item._id,
      label: `${item.code} - ${item.name}`,
      semester: Number(item.semester || 1),
      departmentId: item.departmentId,
    }));

    this.studentOptions = (summary.filterOptions?.students ?? []).map((item) => ({
      id: item._id,
      label: `${item.studentCode} - ${item.fullName}`,
      classId: item.classId,
    }));

    this.alertRows = this.mapAlertRows(this.filterAlertsByScope(alerts));

    this.gradeCounts = {
      A: Number(summary.gradeCounts?.A || 0),
      B: Number(summary.gradeCounts?.B || 0),
      C: Number(summary.gradeCounts?.C || 0),
      F: Number(summary.gradeCounts?.F || 0),
    };

    const totalGraded = Object.values(this.gradeCounts).reduce((sum, count) => sum + count, 0);

    this.stats = {
      totalStudents: Number(summary.totalStudents || 0),
      totalClasses: Number(summary.totalClasses || 0),
      totalAlerts: this.alertTotal,
      excellentRate:
        totalGraded > 0 ? Number(((this.gradeCounts.A / totalGraded) * 100).toFixed(1)) : 0,
    };

    this.renderOrUpdateGradeChart();
  }

  private mapAlertRows(alerts: Prediction[]): AlertRow[] {
    return alerts.map((alert) => {
      const student = typeof alert.studentId === 'string' ? null : alert.studentId;
      const classData = student && typeof student.classId !== 'string' ? student.classId : null;

      return {
        studentName: student?.fullName ?? 'Chưa rõ học sinh',
        className: classData?.name || classData?.code || 'Chưa rõ lớp',
        predictedRank: alert.predictedRank ?? 'Không xác định',
        riskLevel: alert.riskLevel ?? 'high',
      };
    });
  }

  onDepartmentChange(): void {
    this.selectedClassId = 'all';
    this.selectedStudentId = 'all';
    this.alertPage = 1;
    this.loadDashboardData();
  }

  onSemesterChange(): void {
    this.selectedClassId = 'all';
    this.selectedStudentId = 'all';
    this.alertPage = 1;
    this.loadDashboardData();
  }

  onClassChange(): void {
    this.selectedStudentId = 'all';
    this.alertPage = 1;
    this.loadDashboardData();
  }

  onStudentChange(): void {
    this.alertPage = 1;
    this.loadDashboardData();
  }

  onAlertPageChange(event: PageEvent): void {
    const nextPage = Number(event.pageIndex) + 1;
    const nextSize = Number(event.pageSize);
    const pageChanged = nextPage !== this.alertPage;
    const sizeChanged = nextSize !== this.alertPageSize;

    if (!pageChanged && !sizeChanged) {
      return;
    }

    this.alertPage = nextPage;
    this.alertPageSize = nextSize;
    this.loadDashboardData();
  }

  private filterAlertsByScope(alerts: Prediction[]): Prediction[] {
    const availableClassIds = new Set(this.classOptions.map((item) => item.id));

    return alerts.filter((alert) => {
      const studentValue =
        typeof alert.studentId === 'string' || !alert.studentId ? null : alert.studentId;
      const studentId = studentValue?._id ? String(studentValue._id) : null;

      const classValue = studentValue?.classId;
      const classId =
        typeof classValue === 'string'
          ? classValue
          : classValue?._id
            ? String(classValue._id)
            : null;
      const departmentId =
        typeof classValue !== 'string' && classValue?.departmentId
          ? typeof classValue.departmentId === 'string'
            ? classValue.departmentId
            : String(classValue.departmentId._id)
          : null;

      if (this.selectedStudentId !== 'all' && studentId !== this.selectedStudentId) {
        return false;
      }

      if (this.selectedClassId !== 'all' && classId !== this.selectedClassId) {
        return false;
      }

      if (this.selectedClassId === 'all' && this.selectedDepartmentId !== 'all') {
        if (departmentId !== this.selectedDepartmentId) {
          return false;
        }
      }

      if (this.selectedSemester !== 'all' && this.selectedClassId === 'all') {
        if (!classId || !availableClassIds.has(classId)) {
          return false;
        }
      }

      return true;
    });
  }

  private renderOrUpdateGradeChart(): void {
    if (!this.gradeChartCanvas) {
      return;
    }

    const chartData = [
      this.gradeCounts.A,
      this.gradeCounts.B,
      this.gradeCounts.C,
      this.gradeCounts.F,
    ];

    if (this.gradeChart) {
      this.gradeChart.data.datasets[0].data = chartData;

      try {
        this.gradeChart.update();
      } catch {
        this.destroyChart();
      }

      return;
    }

    const chartConfig: ChartConfiguration<'bar', number[], string> = {
      type: 'bar',
      data: {
        labels: ['Giỏi (A)', 'Khá (B)', 'Trung Bình (C)', 'Yếu (F)'],
        datasets: [
          {
            label: 'Số lượng sinh viên',
            data: chartData,
            backgroundColor: ['#16a34a', '#2563eb', '#d97706', '#dc2626'],
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 52,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: 'Inter, sans-serif',
                size: 12,
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              maxTicksLimit: 8,
              font: {
                family: 'Inter, sans-serif',
                size: 12,
              },
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.2)',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: {
                family: 'Inter, sans-serif',
                size: 12,
              },
            },
          },
        },
      },
    };

    try {
      this.gradeChart = new Chart(this.gradeChartCanvas.nativeElement, chartConfig);
    } catch {
      this.errorMessage = 'Khong the ve bieu do dashboard. Vui long tai lai trang.';
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Không thể kết nối server. Vui lòng kiểm tra backend.';
      }

      const payload = error.error as { message?: unknown };
      if (typeof payload?.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
    }

    return 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.';
  }

  private destroyChart(): void {
    if (this.loadingGuardTimer) {
      clearTimeout(this.loadingGuardTimer);
      this.loadingGuardTimer = null;
    }

    if (this.gradeChart) {
      this.gradeChart.destroy();
      this.gradeChart = undefined;
    }
  }

  // Dam bao UI cap nhat ngay ca khi callback async chay ngoai vung change detection.
  private syncView(): void {
    this.cdr.detectChanges();
  }
}
