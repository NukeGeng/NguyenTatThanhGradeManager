import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, finalize, forkJoin, map, of, switchMap, timeout } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse, Class, Grade, Prediction, Student } from '../../shared/models/interfaces';

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

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly requestTimeoutMs = 10000;
  private loadingGuardTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('gradeChartCanvas')
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

  private gradeChart?: Chart<'doughnut', number[], string>;
  private chartViewReady = false;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.chartViewReady = true;
    this.renderOrUpdateGradeChart();
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

    const studentsRequest = this.apiService
      .get<ApiResponse<Student[]>>('/students', { status: 'active' })
      .pipe(
        timeout(this.requestTimeoutMs),
        map((response) => response.data ?? []),
        catchError(() => of([] as Student[])),
      );

    const classesRequest = this.apiService.get<ApiResponse<Class[]>>('/classes').pipe(
      timeout(this.requestTimeoutMs),
      map((response) => response.data ?? []),
      catchError(() => of([] as Class[])),
    );

    const alertsRequest = this.apiService
      .get<ApiResponse<Prediction[]>>('/predictions/alerts')
      .pipe(
        timeout(this.requestTimeoutMs),
        map((response) => response.data ?? []),
        catchError(() => of([] as Prediction[])),
      );

    forkJoin({
      students: studentsRequest,
      classes: classesRequest,
      alerts: alertsRequest,
    })
      .pipe(
        switchMap(({ students, classes, alerts }) => {
          if (!classes.length) {
            return of({ students, classes, alerts, grades: [] as Grade[] });
          }

          const gradeRequests = classes.map((classItem) =>
            this.apiService.get<ApiResponse<Grade[]>>(`/grades/class/${classItem._id}`).pipe(
              timeout(this.requestTimeoutMs),
              map((response) => response.data ?? []),
              catchError(() => of([] as Grade[])),
            ),
          );

          return forkJoin(gradeRequests).pipe(
            map((grades) => ({
              students,
              classes,
              alerts,
              grades: grades.flat(),
            })),
            catchError(() => of({ students, classes, alerts, grades: [] as Grade[] })),
          );
        }),
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
        next: ({ students, classes, alerts, grades }) => {
          try {
            this.applyDashboardData(students, classes, alerts, grades);
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

  private applyDashboardData(
    students: Student[],
    classes: Class[],
    alerts: Prediction[],
    grades: Grade[],
  ): void {
    this.alertRows = this.mapAlertRows(alerts);
    this.gradeCounts = this.calculateGradeCounts(grades);

    const totalGraded = Object.values(this.gradeCounts).reduce((sum, count) => sum + count, 0);

    this.stats = {
      totalStudents: students.length,
      totalClasses: classes.length,
      totalAlerts: this.alertRows.length,
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

  private calculateGradeCounts(grades: Grade[]): Record<GradeBucket, number> {
    const buckets: Record<GradeBucket, number> = {
      A: 0,
      B: 0,
      C: 0,
      F: 0,
    };

    for (const grade of grades) {
      if (grade.letterGrade && grade.letterGrade in buckets) {
        const letter = grade.letterGrade as GradeBucket;
        buckets[letter] += 1;
      }
    }

    return buckets;
  }

  private renderOrUpdateGradeChart(): void {
    if (!this.chartViewReady || !this.gradeChartCanvas) {
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

    const chartConfig: ChartConfiguration<'doughnut', number[], string> = {
      type: 'doughnut',
      data: {
        labels: ['Giỏi (A)', 'Khá (B)', 'Trung Bình (C)', 'Yếu (F)'],
        datasets: [
          {
            data: chartData,
            backgroundColor: ['#16a34a', '#2563eb', '#d97706', '#dc2626'],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: {
                family: 'Be Vietnam Pro',
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
