import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
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
    homeClassCodes: string[];
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
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  @ViewChild('particleCanvas')
  private particleCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('smokeCanvas')
  private smokeCanvas?: ElementRef<HTMLCanvasElement>;

  private particleAnimId?: number;
  private smokeAnimId?: number;
  private smokeHandler?: (e: MouseEvent) => void;
  private readonly requestTimeoutMs = 10000;
  private loadingGuardTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('gradeChartCanvas')
  set gradeChartCanvasRef(value: ElementRef<HTMLCanvasElement> | undefined) {
    this.gradeChartCanvas = value;

    if (!value) {
      this.destroyChart();
      return;
    }

    // Defer to next tick to avoid triggering CD during ngAfterContentChecked
    // which causes mat-form-field control-not-found errors.
    setTimeout(() => this.renderOrUpdateGradeChart(), 0);
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

  // Initialized to null (not 'all') to prevent MatSelect._keyManager crash:
  // NgModel.ngOnInit fires writeValue(value) BEFORE MatSelect.ngAfterContentInit
  // sets up _keyManager. With 'all', _selectValue finds the static mat-option and
  // calls _keyManager.updateActiveItem which is still null → TypeError crash.
  // With null, _selectValue finds no match → no crash. Actual 'all' is set
  // in ngAfterViewInit after all ngAfterContentInit hooks have run.
  selectedDepartmentId: string | null = null;
  selectedSemester: string | null = null;
  selectedClassId: string | null = null;
  selectedStudentId: string | null = null;
  classType: 'subject' | 'homeroom' = 'subject';
  selectedHomeClassCode: string | null = null;
  selectedHomeroomSemester: string | null = null;

  departmentOptions: DashboardDepartmentOption[] = [];
  classOptions: DashboardClassOption[] = [];
  studentOptions: DashboardStudentOption[] = [];
  homeClassCodeOptions: string[] = [];

  private gradeChart?: Chart<'bar', number[], string>;
  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initPlexus();
      this.initSmokeTrail();
    });

    // By this point all MatSelect.ngAfterContentInit hooks have run and _keyManager
    // is initialized. Use a microtask to set defaults AFTER the current CD pass
    // completes, avoiding ExpressionChangedAfterItHasBeenChecked errors.
    Promise.resolve().then(() => {
      this.selectedDepartmentId ??= 'all';
      this.selectedSemester ??= 'all';
      this.selectedClassId ??= 'all';
      this.selectedStudentId ??= 'all';
      this.selectedHomeClassCode ??= 'all';
      this.selectedHomeroomSemester ??= 'all';
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroyChart();
    if (this.particleAnimId !== undefined) cancelAnimationFrame(this.particleAnimId);
    if (this.smokeAnimId !== undefined) cancelAnimationFrame(this.smokeAnimId);
    if (this.smokeHandler) document.removeEventListener('mousemove', this.smokeHandler);
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
        departmentId: this.selectedDepartmentId ?? 'all',
        semester:
          (this.classType === 'homeroom' ? this.selectedHomeroomSemester : this.selectedSemester) ?? 'all',
        classId: this.classType === 'homeroom' ? 'all' : (this.selectedClassId ?? 'all'),
        studentId: this.selectedStudentId ?? 'all',
        homeClassCode: this.classType === 'homeroom' ? (this.selectedHomeClassCode ?? 'all') : 'all',
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
                homeClassCodes: [],
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
              homeClassCodes: [],
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
        classId: this.classType === 'homeroom' ? 'all' : (this.selectedClassId ?? 'all'),
        departmentId: this.selectedDepartmentId ?? 'all',
        semester:
          (this.classType === 'homeroom' ? this.selectedHomeroomSemester : this.selectedSemester) ?? 'all',
        homeClassCode: this.classType === 'homeroom' ? (this.selectedHomeClassCode ?? 'all') : 'all',
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
            this.alertTotal = Number(alerts.total || 0);
            this.applyDashboardData(summary, alerts.items ?? [], this.alertTotal);
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
    summary: DashboardSummaryResponse,
    alerts: Prediction[],
    alertTotal?: number,
  ): void {
    this.homeClassCodeOptions = summary.filterOptions?.homeClassCodes ?? [];

    this.departmentOptions = (summary.filterOptions?.departments ?? []).map((item) => ({
      id: item._id,
      label: `${item.code} - ${item.name}`,
    }));

    this.classOptions = (summary.filterOptions?.classes ?? [])
      .filter((item) => item.code.includes('-'))
      .map((item) => ({
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
      totalAlerts: alertTotal ?? this.alertTotal,
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

  onClassTypeChange(): void {
    this.selectedClassId = 'all';
    this.selectedHomeClassCode = 'all';
    this.selectedHomeroomSemester = 'all';
    this.selectedStudentId = 'all';
    this.alertPage = 1;
    this.loadDashboardData();
  }

  onHomeroomSemesterChange(): void {
    this.selectedStudentId = 'all';
    this.alertPage = 1;
    this.loadDashboardData();
  }

  onHomeClassCodeChange(): void {
    this.selectedStudentId = 'all';
    this.alertPage = 1;
    this.loadDashboardData();
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
    // In homeroom mode the backend already filters by homeClassCode
    if (this.classType === 'homeroom') {
      return alerts;
    }

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

      if ((this.selectedStudentId ?? 'all') !== 'all' && studentId !== this.selectedStudentId) {
        return false;
      }

      if ((this.selectedClassId ?? 'all') !== 'all' && classId !== this.selectedClassId) {
        return false;
      }

      if ((this.selectedClassId ?? 'all') === 'all' && (this.selectedDepartmentId ?? 'all') !== 'all') {
        if (departmentId !== this.selectedDepartmentId) {
          return false;
        }
      }

      if ((this.selectedSemester ?? 'all') !== 'all' && (this.selectedClassId ?? 'all') === 'all') {
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

  // Angular zone (HttpClient) tu dong schedule CD sau moi callback async.
  // detectChanges() dong bo gay loi mat-form-field/keyManager chua init.
  // markForCheck() an toan: chi danh dau dirty, khong force CD ngay lap tuc.
  private syncView(): void {
    this.cdr.markForCheck();
  }

  private initPlexus(): void {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || (canvas.parentElement?.offsetWidth ?? 800);
      canvas.height = canvas.offsetHeight || (canvas.parentElement?.offsetHeight ?? 160);
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 65;
    const LINK_DIST = 130;

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }

    const nodes: Node[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r: Math.random() * 1.6 + 0.8,
    }));

    const loop = () => {
      this.particleAnimId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;
      }

      ctx.lineWidth = 0.55;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.5;
            ctx.strokeStyle = `rgba(190,210,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,232,255,0.85)';
        ctx.fill();
      }
    };
    loop();
  }

  private initSmokeTrail(): void {
    const canvas = this.smokeCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface SP {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      decay: number;
      grow: number;
    }
    const particles: SP[] = [];

    this.smokeHandler = (e: MouseEvent) => {
      for (let i = 0; i < 6; i++) {
        const spread = (Math.random() - 0.5) * 14;
        particles.push({
          x: e.clientX + spread,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -(Math.random() * 1.4 + 0.4),
          r: Math.random() * 12 + 8,
          alpha: Math.random() * 0.1 + 0.04,
          decay: Math.random() * 0.003 + 0.0018,
          grow: Math.random() * 0.35 + 0.18,
        });
      }
      if (particles.length > 450) particles.splice(0, particles.length - 450);
    };
    document.addEventListener('mousemove', this.smokeHandler);

    const loop = () => {
      this.smokeAnimId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.975;
        p.r += p.grow;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255,255,255,${p.alpha})`);
        g.addColorStop(0.45, `rgba(240,242,255,${p.alpha * 0.35})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    };
    loop();
  }
}
