import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  GpaRoadmap,
  Prediction,
  RetakeRoadmap,
  StudentRegistration,
  Student,
  StudentCurriculum,
  Grade,
} from '../../shared/models/interfaces';

interface ProgressDetail {
  subjectCode: string;
  subjectName: string;
  credits: number;
  year: number;
  semester: 1 | 2 | 3;
  status: 'completed' | 'in-progress' | 'failed' | 'not-started';
  gpa4: number | null;
  letterGrade: string | null;
}

interface ProgressSummary {
  totalRequired: number;
  completed: number;
  inProgress: number;
  failed: number;
  remaining: number;
  creditsEarned: number;
  creditsRequired: number;
  progressPercent: number;
  details: ProgressDetail[];
}

interface StudentCurriculumPayload {
  studentCurriculum: StudentCurriculum | null;
  progress: ProgressSummary;
}

interface TimelineSlot {
  year: number;
  semester: 1 | 2 | 3;
  items: ProgressDetail[];
}

interface SemesterOption {
  key: string;
  label: string;
  semester: 1 | 2 | 3;
  year?: number;
  schoolYear?: string;
}

interface ResultChartRow {
  subjectCode: string;
  subjectName: string;
  studentScore: number;
  avgScore: number;
}

interface ClassSemesterRow {
  classCode: string;
  className: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  status: string;
}

type StudentGradeWithAverage = Grade & {
  classAverageScore?: number | null;
};

@Component({
  selector: 'app-advisor-student-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <header class="page-header">
        <div>
          <p class="eyebrow">Ho so co van</p>
          <h1 class="page-title">{{ student?.fullName || 'Chi tiet sinh vien' }}</h1>
          <p class="subtitle">Tong quan GPA, tien do CTDT va lo trinh hoc tap tu AI.</p>
        </div>

        <a mat-stroked-button class="btn-back" routerLink="/advisor/students">
          <lucide-icon name="arrow-left" [size]="16"></lucide-icon>
          Danh sach sinh vien
        </a>
      </header>

      @if (isLoading) {
        <mat-card class="state-card">
          <mat-spinner [diameter]="34"></mat-spinner>
          <p>Dang tai du lieu co van...</p>
        </mat-card>
      } @else if (errorMessage) {
        <mat-card class="state-card error">
          <lucide-icon name="x-circle" [size]="20"></lucide-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="loadData()">Thu lai</button>
        </mat-card>
      } @else {
        <mat-tab-group animationDuration="120ms">
          <mat-tab label="Tong quan">
            <div class="tab-wrap">
              <mat-card class="student-info-card">
                <div class="student-info-grid">
                  <div class="student-avatar-col">
                    @if (student?.avatar) {
                      <img
                        class="student-avatar"
                        [src]="student?.avatar || ''"
                        [alt]="student?.fullName || 'student-avatar'"
                      />
                    } @else {
                      <div class="student-avatar fallback">
                        {{ studentInitials() }}
                      </div>
                    }
                  </div>

                  <div class="student-meta-grid">
                    <div class="meta-item">
                      <span class="meta-label">MSSV</span>
                      <span class="meta-value">{{ student?.studentCode || '-' }}</span>
                    </div>

                    <div class="meta-item">
                      <span class="meta-label">Ho ten</span>
                      <span class="meta-value">{{ student?.fullName || '-' }}</span>
                    </div>

                    <div class="meta-item">
                      <span class="meta-label">Gioi tinh</span>
                      <span class="meta-value">{{ genderLabel(student?.gender) }}</span>
                    </div>

                    <div class="meta-item">
                      <span class="meta-label">Ngay sinh</span>
                      <span class="meta-value">{{ dateLabel(student?.dateOfBirth) }}</span>
                    </div>

                    <div class="meta-item">
                      <span class="meta-label">Lop hoc</span>
                      <span class="meta-value">{{ classLabel() }}</span>
                    </div>

                    <div class="meta-item">
                      <span class="meta-label">Nganh</span>
                      <span class="meta-value">{{ majorLabel() }}</span>
                    </div>
                  </div>
                </div>
              </mat-card>

              <div class="overview-analytics-grid">
                <mat-card class="analytics-card result-panel">
                  <div class="panel-head">
                    <h3>Ket qua hoc tap</h3>
                    <mat-form-field appearance="outline" class="term-field">
                      <mat-select
                        [(ngModel)]="selectedResultSemesterKey"
                        (selectionChange)="onResultSemesterChange()"
                      >
                        @for (option of resultSemesterOptions; track option.key) {
                          <mat-option [value]="option.key">{{ option.label }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>

                  @if (!resultChartRows.length) {
                    <p class="empty-note">Chua co du lieu diem cho hoc ky da chon.</p>
                  } @else {
                    <div class="result-chart-wrap">
                      <div class="y-axis-label y-axis-label--left">Diem TKT</div>
                      <div class="y-axis-label y-axis-label--right">Diem TB lop HP</div>

                      <svg class="mixed-chart" viewBox="0 0 100 60" preserveAspectRatio="none">
                        @for (tick of chartGridTicks(); track tick) {
                          <line
                            class="grid-line"
                            x1="8"
                            [attr.y1]="scoreToChartY(tick)"
                            x2="92"
                            [attr.y2]="scoreToChartY(tick)"
                          ></line>
                        }

                        @for (
                          row of resultChartRows;
                          let index = $index;
                          track row.subjectCode + row.subjectName
                        ) {
                          <rect
                            class="chart-bar"
                            [attr.x]="barChartX(index, resultChartRows.length)"
                            [attr.y]="scoreToChartY(row.studentScore)"
                            [attr.width]="barChartWidth(resultChartRows.length)"
                            [attr.height]="chartBottomY() - scoreToChartY(row.studentScore)"
                            rx="0.7"
                            ry="0.7"
                          ></rect>

                          <text
                            class="bar-value"
                            [attr.x]="barChartCenterX(index, resultChartRows.length)"
                            [attr.y]="scoreToChartY(row.studentScore) - 1.3"
                          >
                            {{ formatScore(row.studentScore) }}
                          </text>
                        }

                        <polyline class="avg-line" [attr.points]="resultLinePoints()"></polyline>

                        @for (point of resultLineDots(); track point.x + '-' + point.y) {
                          <circle
                            class="avg-dot"
                            [attr.cx]="point.x"
                            [attr.cy]="point.y"
                            r="1.1"
                          ></circle>
                          <text class="avg-value" [attr.x]="point.x" [attr.y]="point.y - 1.7">
                            {{ formatScore(point.value) }}
                          </text>
                        }
                      </svg>

                      <div
                        class="labels-wrap"
                        [style.grid-template-columns]="
                          'repeat(' + resultChartRows.length + ', minmax(0, 1fr))'
                        "
                      >
                        @for (row of resultChartRows; track row.subjectCode + row.subjectName) {
                          <p class="col-label" [title]="row.subjectName">{{ row.subjectName }}</p>
                        }
                      </div>
                    </div>

                    <div class="chart-legend">
                      <span class="legend-item">
                        <span class="legend-dot legend-dot--bar"></span>
                        Diem TKT cua ban
                      </span>
                      <span class="legend-item">
                        <span class="legend-dot legend-dot--line"></span>
                        Diem TB lop hoc phan
                      </span>
                    </div>
                  }
                </mat-card>

                <mat-card class="analytics-card stat-card progress-combo-card">
                  <div class="panel-head panel-head--fixed">
                    <h3 class="combo-title">Tien do hoc tap</h3>
                    <span class="head-placeholder" aria-hidden="true"></span>
                  </div>

                  <div class="progress-donut-wrap">
                    <svg class="progress-donut" viewBox="0 0 220 220" aria-hidden="true">
                      <circle
                        class="ring-blue"
                        cx="110"
                        cy="110"
                        r="88"
                        (mouseenter)="progressRingHovered = true"
                        (mouseleave)="progressRingHovered = false"
                      ></circle>

                      <circle class="ring-track" cx="110" cy="110" r="62"></circle>
                      <circle
                        class="ring-green"
                        cx="110"
                        cy="110"
                        r="62"
                        [attr.stroke-dasharray]="innerRingDashArray()"
                        [attr.stroke-dashoffset]="innerRingDashOffset()"
                      ></circle>
                    </svg>

                    @if (progressRingHovered) {
                      <div class="donut-hover-center">
                        <p>Da hoc: {{ completedCredits() }} tin chi</p>
                        <strong>{{ progressPercent() }}%</strong>
                      </div>
                    }
                  </div>

                  <p class="combo-foot">{{ completedCredits() }}/{{ totalCredits() }}</p>
                </mat-card>

                <mat-card class="analytics-card classes-panel">
                  <div class="panel-head">
                    <h3>Lop hoc phan</h3>
                    <mat-form-field appearance="outline" class="term-field">
                      <mat-select
                        [(ngModel)]="selectedClassSemesterKey"
                        (selectionChange)="onClassSemesterChange()"
                      >
                        @for (option of classSemesterOptions; track option.key) {
                          <mat-option [value]="option.key">{{ option.label }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>

                  @if (!classSemesterRows.length) {
                    <p class="empty-note">Chua co lop hoc phan trong hoc ky da chon.</p>
                  } @else {
                    <div class="table-wrap class-panel-table">
                      <table class="full-table class-term-table">
                        <thead>
                          <tr>
                            <th>Mon hoc/hoc phan</th>
                            <th>So tin chi</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (
                            row of classSemesterRows;
                            track row.subjectCode + row.classCode + row.className
                          ) {
                            <tr>
                              <td>
                                <div class="class-cell-main">
                                  <p class="class-code">{{ row.classCode }}</p>
                                  <p class="class-name">{{ row.className }}</p>
                                  <small>{{ row.subjectCode }} · {{ row.subjectName }}</small>
                                </div>
                              </td>
                              <td class="cell-center">{{ row.credits }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </mat-card>
              </div>

              <div class="stats-grid">
                <mat-card class="stat-card stat-card--orange">
                  <p>Canh bao mon F</p>
                  <h2>{{ failedSubjects().length }}</h2>
                </mat-card>

                <mat-card class="stat-card stat-card--slate">
                  <p>Du doan gan nhat</p>
                  <h2>{{ latestPrediction?.predictedRank || '-' }}</h2>
                  <p [class.risk-high]="latestPrediction?.riskLevel === 'high'">
                    {{ latestPrediction?.riskLevel || 'chua co' }}
                  </p>
                </mat-card>
              </div>

              <mat-card class="f-warning-card">
                <div class="f-warning-head">
                  <h3>Cac mon dang bi F / hoc lai</h3>
                  <span class="count-badge">{{ failedSubjects().length }} mon</span>
                </div>

                @if (!failedSubjects().length) {
                  <p class="empty-note">Khong co mon F trong tien do hien tai.</p>
                } @else {
                  <div class="table-wrap">
                    <table class="full-table failed-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Ma mon</th>
                          <th>Ten mon</th>
                          <th>Tin chi</th>
                          <th>Hoc ky</th>
                          <th>Diem chu</th>
                          <th>Trang thai</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (
                          item of failedSubjects();
                          let index = $index;
                          track item.subjectCode + item.year + item.semester
                        ) {
                          <tr>
                            <td class="cell-center">{{ index + 1 }}</td>
                            <td class="cell-center">{{ item.subjectCode || '-' }}</td>
                            <td>{{ item.subjectName }}</td>
                            <td class="cell-center">{{ item.credits }}</td>
                            <td class="cell-center">N{{ item.year }} · HK{{ item.semester }}</td>
                            <td class="cell-center">{{ item.letterGrade || 'F' }}</td>
                            <td class="cell-center">
                              <span class="status-chip status-chip--danger">
                                {{ statusLabel(item.status) }}
                              </span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </mat-card>
            </div>
          </mat-tab>

          <mat-tab label="Tien do CTDT">
            <div class="tab-wrap">
              <div class="table-wrap">
                <table class="full-table progress-table">
                  <thead>
                    <tr>
                      <th>Nam</th>
                      <th>Hoc ky</th>
                      <th>Mon hoc</th>
                      <th>Tin chi</th>
                      <th>Trang thai</th>
                      <th>Diem chu</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (slot of timeline; track trackSlot(slot)) {
                      @for (
                        item of slot.items;
                        track item.subjectCode + item.semester + item.year
                      ) {
                        <tr>
                          <td class="cell-center">N{{ slot.year }}</td>
                          <td class="cell-center">HK{{ slot.semester }}</td>
                          <td>{{ item.subjectName }}</td>
                          <td class="cell-center">{{ item.credits }}</td>
                          <td class="cell-center">
                            <span
                              class="status-chip"
                              [class.status-chip--active]="item.status === 'completed'"
                              [class.status-chip--warn]="item.status === 'in-progress'"
                              [class.status-chip--danger]="item.status === 'failed'"
                            >
                              {{ statusLabel(item.status) }}
                            </span>
                          </td>
                          <td class="cell-center">{{ item.letterGrade || '-' }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Lo trinh AI">
            <div class="tab-wrap">
              <div class="target-row">
                <button
                  mat-stroked-button
                  type="button"
                  [class.active]="targetGpa === 3.2"
                  (click)="changeTarget(3.2)"
                >
                  Muc tieu Gioi GPA >= 3.2
                </button>
                <button
                  mat-stroked-button
                  type="button"
                  [class.active]="targetGpa === 3.6"
                  (click)="changeTarget(3.6)"
                >
                  Muc tieu Xuat sac GPA >= 3.6
                </button>
              </div>

              @if (loadingRoadmap) {
                <mat-card class="state-card small">
                  <mat-spinner [diameter]="30"></mat-spinner>
                </mat-card>
              } @else if (gpaRoadmap) {
                <mat-card class="roadmap-card" [class.warn]="!gpaRoadmap.isAchievable">
                  <p class="summary-title">
                    {{
                      gpaRoadmap.isAchievable
                        ? 'Co the dat muc tieu voi ke hoach hien tai.'
                        : 'Can no luc rat cao de dat muc tieu nay.'
                    }}
                  </p>
                  <p>{{ gpaRoadmap.summary }}</p>
                </mat-card>

                <details class="ai-dropdown">
                  <summary>
                    Danh sach lo trinh mon hoc
                    <span>({{ gpaRoadmap.subjectPlans.length }})</span>
                  </summary>

                  <div class="ai-dropdown-body">
                    <div class="table-wrap">
                      <table class="full-table roadmap-table">
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Mon hoc</th>
                            <th>Tin chi</th>
                            <th>Uu tien</th>
                            <th>Can dat</th>
                            <th>Hoc ky</th>
                            <th>Ly do</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (
                            plan of gpaRoadmap.subjectPlans;
                            let index = $index;
                            track plan.subjectCode + plan.semester + plan.year
                          ) {
                            <tr>
                              <td class="cell-center">{{ index + 1 }}</td>
                              <td>{{ plan.subjectName }}</td>
                              <td class="cell-center">{{ plan.credits }}</td>
                              <td>
                                <span class="priority" [class]="priorityClass(plan.priority)">
                                  {{ priorityLabel(plan.priority) }}
                                </span>
                              </td>
                              <td class="cell-center">{{ plan.targetGrade }}</td>
                              <td class="cell-center">N{{ plan.year }} · HK{{ plan.semester }}</td>
                              <td>{{ plan.reason }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              }

              @if (
                retakeRoadmap &&
                (retakeRoadmap.urgentRetakes.length || retakeRoadmap.recommendedRetakes.length)
              ) {
                <div class="retake-grid">
                  @if (retakeRoadmap.urgentRetakes.length) {
                    <details class="ai-dropdown ai-dropdown--danger">
                      <summary>
                        Hoc lai ngay
                        <span>({{ retakeRoadmap.urgentRetakes.length }})</span>
                      </summary>
                      <div class="ai-dropdown-body">
                        <ul class="retake-list">
                          @for (item of retakeRoadmap.urgentRetakes; track item.subjectCode) {
                            <li>
                              {{ item.subjectName }} · HK{{ item.suggestedSemester }}
                              <small>{{ item.reason }}</small>
                            </li>
                          }
                        </ul>
                      </div>
                    </details>
                  }

                  @if (retakeRoadmap.recommendedRetakes.length) {
                    <details class="ai-dropdown ai-dropdown--warn">
                      <summary>
                        Nen cai thien
                        <span>({{ retakeRoadmap.recommendedRetakes.length }})</span>
                      </summary>
                      <div class="ai-dropdown-body">
                        <ul class="retake-list">
                          @for (item of retakeRoadmap.recommendedRetakes; track item.subjectCode) {
                            <li>
                              {{ item.subjectName }} · HK{{ item.suggestedSemester }}
                              <small>{{ item.reason }}</small>
                            </li>
                          }
                        </ul>
                      </div>
                    </details>
                  }
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </section>
  `,
  styles: [
    `
      .page-wrap {
        padding-block: 1.5rem;
        display: grid;
        gap: 1rem;
      }

      .btn-back {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .tab-wrap {
        margin-top: 0.9rem;
        display: grid;
        gap: 1rem;
      }

      .student-info-card {
        padding: 0.95rem 1rem;
        border: 1px solid #d4dce3;
        border-radius: 4px;
      }

      .student-info-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 1rem;
        align-items: start;
      }

      .student-avatar-col {
        display: grid;
        justify-items: center;
      }

      .student-avatar {
        width: 118px;
        height: 118px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #d8e1ea;
        background: #f3f6fa;
      }

      .student-avatar.fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #3f7ea8, #5aa7da);
      }

      .student-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.6rem 1rem;
      }

      .meta-item {
        display: grid;
        gap: 0.15rem;
      }

      .meta-label {
        color: #70859a;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .meta-value {
        color: #405a70;
        font-weight: 700;
      }

      .overview-analytics-grid {
        display: grid;
        grid-template-columns: minmax(460px, 1.55fr) minmax(300px, 0.95fr) minmax(380px, 1.25fr);
        gap: 0.85rem;
      }

      .analytics-card {
        border: 1px solid #d6dbe1;
        border-radius: 4px;
        padding: 0.8rem 0.85rem;
        background: #f8fafc;
      }

      .panel-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.65rem;
        height: 68px;
        min-height: 68px;
        margin-bottom: 0.65rem;
        padding: 0 0 0.55rem;
        border-bottom: 1px solid #d6dee7;
      }

      .panel-head--fixed {
        align-items: center;
      }

      .head-placeholder {
        width: 220px;
        height: 44px;
        visibility: hidden;
        pointer-events: none;
      }

      .panel-head h3 {
        margin: 0;
        display: flex;
        align-items: center;
        min-height: 44px;
        line-height: 1.2;
        color: #4f667b;
        font-size: 18px;
      }

      .term-field {
        width: 220px;
        margin: 0;
        align-self: center;
      }

      .panel-head .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      .panel-head .mat-mdc-text-field-wrapper {
        align-items: center;
      }

      .result-chart-wrap {
        position: relative;
        padding: 0.45rem 1.55rem 0.2rem;
      }

      .y-axis-label {
        position: absolute;
        top: 36%;
        font-size: 0.72rem;
        color: #3267d8;
        letter-spacing: 0.01em;
      }

      .y-axis-label--left {
        left: 0.1rem;
        transform: rotate(-90deg) translateX(-50%);
        transform-origin: left top;
      }

      .y-axis-label--right {
        right: 0.15rem;
        transform: rotate(90deg) translateX(50%);
        transform-origin: right top;
      }

      .mixed-chart {
        width: 100%;
        height: 230px;
        display: block;
      }

      .grid-line {
        stroke: #d2d8de;
        stroke-width: 0.35;
      }

      .chart-bar {
        fill: #f86a4e;
      }

      .bar-value {
        fill: #111827;
        font-size: 3px;
        font-weight: 700;
        text-anchor: middle;
      }

      .avg-line {
        fill: none;
        stroke: #f6bf3b;
        stroke-width: 0.45;
        stroke-linejoin: round;
        stroke-linecap: round;
      }

      .avg-dot {
        fill: #f6bf3b;
      }

      .avg-value {
        fill: #111827;
        font-size: 2.6px;
        font-weight: 700;
        text-anchor: middle;
      }

      .labels-wrap {
        display: grid;
        align-items: start;
        gap: 0.5rem;
        margin-top: 0.15rem;
      }

      .col-label {
        margin: 0;
        text-align: center;
        font-size: 0.79rem;
        color: #374151;
        min-height: 48px;
        line-height: 1.2;
      }

      .chart-legend {
        margin-top: 0.35rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: #334155;
        font-size: 0.82rem;
      }

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .legend-dot--bar {
        background: #f86a4e;
      }

      .legend-dot--line {
        background: #f6bf3b;
      }

      .class-panel-table {
        max-height: 358px;
        overflow: auto;
      }

      .class-term-table th:first-child,
      .class-term-table td:first-child {
        text-align: left;
      }

      .class-cell-main {
        display: grid;
        gap: 0.15rem;
      }

      .class-code {
        margin: 0;
        color: #1d8ce2;
        font-weight: 700;
      }

      .class-name {
        margin: 0;
        color: #4d6376;
      }

      .class-cell-main small {
        color: #71879b;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }

      .stat-card {
        padding: 0.95rem 1rem;
        display: grid;
        gap: 0.35rem;
        border: 1px solid #d6dbe1;
        border-radius: 4px;
        background: #f8fafc;
      }

      .progress-combo-card {
        grid-column: auto;
        gap: 0.65rem;
        padding: 0.9rem 0.95rem 0.8rem;
      }

      .combo-title {
        margin: 0;
        color: #51697f;
        font-size: 18px;
        line-height: 1.2;
        align-self: center;
      }

      .progress-donut-wrap {
        position: relative;
        width: min(100%, 320px);
        margin-inline: auto;
      }

      .progress-donut {
        width: 100%;
        height: auto;
        display: block;
      }

      .ring-blue {
        fill: none;
        stroke: #38a6eb;
        stroke-width: 26;
      }

      .ring-track {
        fill: none;
        stroke: #dfe3e7;
        stroke-width: 24;
      }

      .ring-green {
        fill: none;
        stroke: #05df73;
        stroke-width: 24;
        stroke-linecap: round;
        transform-origin: 110px 110px;
        transform: rotate(-90deg);
      }

      .donut-hover-center {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        text-align: center;
        pointer-events: none;
      }

      .donut-hover-center p {
        margin: 0;
        color: #1f2a36;
        font-size: 0.78rem;
      }

      .donut-hover-center strong {
        color: #03d66d;
        font-size: 1.65rem;
        line-height: 1.05;
      }

      .combo-foot {
        margin: 0;
        text-align: center;
        color: #0f3760;
        font-size: 2.1rem;
        font-weight: 800;
      }

      .stat-card--blue {
        background: #eef7ff;
      }

      .stat-card--cyan {
        background: #ebf9ff;
      }

      .stat-card--orange {
        background: #fff5e8;
      }

      .stat-card--slate {
        background: #f4f6f8;
      }

      .stat-card p {
        margin: 0;
        color: var(--text-sub);
      }

      .stat-card h2 {
        margin: 0;
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

      .full-table thead tr {
        background: #d8e1e8;
        height: 58px;
      }

      .full-table th {
        color: #1da1f2;
        font-weight: 700;
        font-size: 0.9rem;
        border-bottom: 1px solid #bcc8d2;
        border-right: 1px solid #c7d1da;
        text-align: center;
        padding: 0.55rem 0.45rem;
      }

      .full-table td {
        height: 52px;
        color: #4f6679;
        font-size: 0.9rem;
        border-bottom: 1px solid #d1d8de;
        border-right: 1px solid #d1d8de;
        padding: 0.48rem 0.45rem;
      }

      .full-table th:first-child,
      .full-table td:first-child {
        border-left: 1px solid #c7d1da;
      }

      .full-table tbody tr:last-child td {
        border-bottom: 0;
      }

      .cell-center {
        text-align: center;
      }

      .progress-table th:nth-child(3),
      .progress-table td:nth-child(3),
      .roadmap-table th:nth-child(2),
      .roadmap-table td:nth-child(2),
      .roadmap-table th:last-child,
      .roadmap-table td:last-child {
        text-align: left;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.73rem;
        font-weight: 700;
        background: #e5e7eb;
        color: #4b5563;
      }

      .status-chip--active {
        background: #dcfce7;
        color: #16a34a;
      }

      .status-chip--warn {
        background: #ffedd5;
        color: #b45309;
      }

      .status-chip--danger {
        background: #fee2e2;
        color: #dc2626;
      }

      .risk-high {
        color: #dc2626;
      }

      .f-warning-card {
        padding: 0.9rem 1rem 1rem;
        border: 1px solid #d6dbe1;
        border-radius: 4px;
      }

      .f-warning-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.7rem;
      }

      .f-warning-head h3 {
        margin: 0;
        color: #476177;
      }

      .count-badge {
        border-radius: 999px;
        padding: 0.2rem 0.65rem;
        font-size: 0.75rem;
        font-weight: 700;
        background: #fee2e2;
        color: #b91c1c;
      }

      .empty-note {
        margin: 0;
        color: #647a8d;
      }

      .failed-table th:nth-child(3),
      .failed-table td:nth-child(3) {
        text-align: left;
      }

      .target-row {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .target-row button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .target-row button.active {
        background: var(--navy);
        color: #fff;
      }

      .roadmap-card {
        padding: 0.85rem 0.95rem;
        border-left: 4px solid #16a34a;
        border-radius: 4px;
      }

      .roadmap-card.warn {
        border-left-color: #d97706;
        background: #fffbeb;
      }

      .summary-title {
        margin: 0;
        font-weight: 700;
      }

      .ai-dropdown {
        border: 1px solid #d6dbe1;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
      }

      .ai-dropdown summary {
        list-style: none;
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.65rem;
        min-height: 44px;
        padding: 0.4rem 0.9rem;
        color: #3e78b4;
        font-weight: 700;
        background: #f7fbff;
        border-bottom: 1px solid #d8e1ea;
      }

      .ai-dropdown summary::-webkit-details-marker {
        display: none;
      }

      .ai-dropdown summary::after {
        content: '▾';
        color: #64748b;
        font-size: 0.8rem;
        transition: transform 0.2s ease;
      }

      .ai-dropdown summary > span {
        color: #3e78b4;
        font-weight: 700;
        margin-left: auto;
        min-width: 52px;
        text-align: right;
      }

      .ai-dropdown[open] summary::after {
        transform: rotate(180deg);
      }

      .ai-dropdown-body {
        padding: 0.65rem 0.75rem 0.8rem;
      }

      .ai-dropdown--danger summary {
        background: #fff7f7;
        color: #b91c1c;
      }

      .ai-dropdown--warn summary {
        background: #fffdf4;
        color: #b45309;
      }

      .priority {
        border-radius: 999px;
        padding: 0.12rem 0.45rem;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .priority-critical {
        color: #b91c1c;
        background: #fee2e2;
      }

      .priority-high {
        color: #b45309;
        background: #ffedd5;
      }

      .priority-normal {
        color: #374151;
        background: #e5e7eb;
      }

      .retake-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.85rem;
      }

      .retake-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.45rem;
      }

      .retake-list li {
        display: grid;
        gap: 0.18rem;
      }

      .retake-list li small {
        color: var(--text-sub);
      }

      .state-card {
        min-height: 180px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.65rem;
      }

      .state-card.small {
        min-height: 120px;
      }

      .state-card.error {
        color: #dc2626;
      }

      @media (max-width: 980px) {
        .overview-analytics-grid {
          grid-template-columns: 1fr;
        }

        .panel-head {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .term-field {
          width: min(220px, 100%);
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .progress-combo-card {
          grid-column: span 1;
        }

        .student-info-grid {
          grid-template-columns: 1fr;
        }

        .student-meta-grid {
          grid-template-columns: 1fr;
        }

        .retake-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdvisorStudentDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  student: Student | null = null;
  studentCurriculumData: StudentCurriculum | null = null;
  studentGrades: StudentGradeWithAverage[] = [];
  progress: ProgressSummary | null = null;
  timeline: TimelineSlot[] = [];
  predictions: Prediction[] = [];
  latestPrediction: Prediction | null = null;

  resultSemesterOptions: SemesterOption[] = [];
  classSemesterOptions: SemesterOption[] = [];
  selectedResultSemesterKey = '';
  selectedClassSemesterKey = '';
  resultChartRows: ResultChartRow[] = [];
  classSemesterRows: ClassSemesterRow[] = [];

  gpaRoadmap: GpaRoadmap | null = null;
  retakeRoadmap: RetakeRoadmap | null = null;

  isLoading = true;
  loadingRoadmap = false;
  progressRingHovered = false;
  errorMessage = '';
  targetGpa: 3.2 | 3.6 = 3.2;

  private studentId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.studentId = params.get('id') ?? '';
      if (!this.studentId) {
        this.errorMessage = 'Khong tim thay sinh vien.';
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
      student: this.apiService
        .get<ApiResponse<Student>>(`/students/${this.studentId}`)
        .pipe(map((response) => response.data)),
      grades: this.apiService
        .get<ApiResponse<StudentGradeWithAverage[]>>(`/grades/student/${this.studentId}`)
        .pipe(map((response) => response.data ?? [])),
      studentCurriculum: this.apiService
        .get<ApiResponse<StudentCurriculumPayload>>(`/student-curricula/${this.studentId}`)
        .pipe(map((response) => response.data)),
      predictions: this.apiService
        .get<ApiResponse<Prediction[]>>(`/predictions/student/${this.studentId}`)
        .pipe(map((response) => response.data ?? [])),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ student, grades, studentCurriculum, predictions }) => {
          this.student = student;
          this.studentGrades = grades;
          this.studentCurriculumData = studentCurriculum.studentCurriculum;
          this.progress = studentCurriculum.progress;
          this.timeline = this.buildTimeline(studentCurriculum.progress.details || []);
          this.initOverviewSemesterData();
          this.predictions = predictions;
          this.latestPrediction = predictions[0] || null;
          this.loadRoadmaps();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  changeTarget(target: 3.2 | 3.6): void {
    this.targetGpa = target;
    this.loadRoadmaps();
  }

  onResultSemesterChange(): void {
    this.refreshResultChartRows();
  }

  onClassSemesterChange(): void {
    this.refreshClassSemesterRows();
  }

  trackSlot(slot: TimelineSlot): string {
    return `${slot.year}-${slot.semester}`;
  }

  statusLabel(status: ProgressDetail['status']): string {
    if (status === 'completed') {
      return 'Hoan thanh';
    }

    if (status === 'in-progress') {
      return 'Dang hoc';
    }

    if (status === 'failed') {
      return 'Hoc lai';
    }

    return 'Chua hoc';
  }

  completedCredits(): number {
    return Math.max(0, Number(this.progress?.creditsEarned || 0));
  }

  totalCredits(): number {
    return Math.max(0, Number(this.progress?.creditsRequired || 0));
  }

  progressPercent(): number {
    const total = this.totalCredits();
    if (!total) {
      return 0;
    }

    const percent = (this.completedCredits() / total) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  innerRingDashArray(): string {
    const circumference = 2 * Math.PI * 62;
    return `${circumference} ${circumference}`;
  }

  innerRingDashOffset(): number {
    const circumference = 2 * Math.PI * 62;
    return circumference * (1 - this.progressPercent() / 100);
  }

  scorePercent(score: number): number {
    return Math.max(0, Math.min(100, (Number(score || 0) / 10) * 100));
  }

  chartGridTicks(): number[] {
    return [0, 2, 4, 6, 8, 10];
  }

  chartBottomY(): number {
    return 48;
  }

  private chartTopY(): number {
    return 6;
  }

  private chartLeftX(): number {
    return 8;
  }

  private chartRightX(): number {
    return 92;
  }

  scoreToChartY(score: number): number {
    const clamped = Math.max(0, Math.min(10, Number(score || 0)));
    const top = this.chartTopY();
    const bottom = this.chartBottomY();
    const height = bottom - top;
    return Number((bottom - (clamped / 10) * height).toFixed(2));
  }

  barChartWidth(count: number): number {
    const safeCount = Math.max(1, Number(count || 0));
    const step = (this.chartRightX() - this.chartLeftX()) / safeCount;
    return Number(Math.max(4.8, Math.min(10.2, step * 0.48)).toFixed(2));
  }

  barChartX(index: number, count: number): number {
    const safeCount = Math.max(1, Number(count || 0));
    const safeIndex = Math.max(0, Number(index || 0));
    const step = (this.chartRightX() - this.chartLeftX()) / safeCount;
    const width = this.barChartWidth(safeCount);
    return Number((this.chartLeftX() + safeIndex * step + (step - width) / 2).toFixed(2));
  }

  barChartCenterX(index: number, count: number): number {
    return Number((this.barChartX(index, count) + this.barChartWidth(count) / 2).toFixed(2));
  }

  formatScore(score: number): string {
    const rounded = Number(Number(score || 0).toFixed(1));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  resultLinePoints(): string {
    if (!this.resultChartRows.length) {
      return '';
    }

    const count = this.resultChartRows.length;

    return this.resultChartRows
      .map((row, index) => {
        const x = this.barChartCenterX(index, count);
        const y = this.scoreToChartY(row.avgScore);
        return `${x},${y}`;
      })
      .join(' ');
  }

  resultLineDots(): Array<{ x: number; y: number; value: number }> {
    if (!this.resultChartRows.length) {
      return [];
    }

    const count = this.resultChartRows.length;

    return this.resultChartRows.map((row, index) => ({
      x: this.barChartCenterX(index, count),
      y: this.scoreToChartY(row.avgScore),
      value: row.avgScore,
    }));
  }

  studentInitials(): string {
    const name = String(this.student?.fullName || '').trim();
    if (!name) {
      return 'SV';
    }

    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
  }

  genderLabel(gender: Student['gender'] | undefined): string {
    if (gender === 'male') {
      return 'Nam';
    }

    if (gender === 'female') {
      return 'Nu';
    }

    return '-';
  }

  dateLabel(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return '-';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }

  classLabel(): string {
    const value = this.student?.classId;
    if (!value) {
      return '-';
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.name || value.code || '-';
  }

  majorLabel(): string {
    const value = this.student?.majorId;
    if (!value) {
      return '-';
    }

    if (typeof value === 'string') {
      return '-';
    }

    return value.name || '-';
  }

  failedSubjects(): ProgressDetail[] {
    const details = Array.isArray(this.progress?.details) ? this.progress?.details : [];
    const failedRows = (details || []).filter(
      (item) => item.status === 'failed' || String(item.letterGrade || '').toUpperCase() === 'F',
    );

    const deduped = new Map<string, ProgressDetail>();

    for (const item of failedRows) {
      const key = item.subjectCode || item.subjectName;
      const current = deduped.get(key);

      if (!current) {
        deduped.set(key, item);
        continue;
      }

      const incomingOrder = item.year * 10 + item.semester;
      const currentOrder = current.year * 10 + current.semester;
      if (incomingOrder > currentOrder) {
        deduped.set(key, item);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => {
      const bOrder = b.year * 10 + b.semester;
      const aOrder = a.year * 10 + a.semester;
      if (bOrder !== aOrder) {
        return bOrder - aOrder;
      }
      return a.subjectName.localeCompare(b.subjectName);
    });
  }

  priorityClass(priority: 'critical' | 'high' | 'normal'): string {
    return `priority-${priority}`;
  }

  priorityLabel(priority: 'critical' | 'high' | 'normal'): string {
    if (priority === 'critical') {
      return 'Cot loi';
    }

    if (priority === 'high') {
      return 'Quan trong';
    }

    return 'Thong thuong';
  }

  private initOverviewSemesterData(): void {
    const details = Array.isArray(this.progress?.details) ? this.progress.details : [];
    const registrations = this.registrationRows();

    this.resultSemesterOptions = this.buildResultSemesterOptions(details, registrations);
    if (!this.resultSemesterOptions.some((item) => item.key === this.selectedResultSemesterKey)) {
      this.selectedResultSemesterKey = this.resultSemesterOptions[0]?.key || '';
    }

    this.classSemesterOptions = this.buildClassSemesterOptions(registrations);
    if (!this.classSemesterOptions.some((item) => item.key === this.selectedClassSemesterKey)) {
      this.selectedClassSemesterKey = this.classSemesterOptions[0]?.key || '';
    }

    this.refreshResultChartRows();
    this.refreshClassSemesterRows();
  }

  private refreshResultChartRows(): void {
    const option = this.resultSemesterOptions.find(
      (item) => item.key === this.selectedResultSemesterKey,
    );

    if (!option) {
      this.resultChartRows = [];
      return;
    }

    const details = (this.progress?.details || []).filter(
      (item) => item.semester === option.semester && item.year === option.year,
    );

    const scoredRows = details
      .map((item) => {
        const score = this.findStudentTktForResultRow(item, option);
        return {
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          studentScore: score,
        };
      })
      .map((item) => ({
        ...item,
        studentScore: Number.isFinite(Number(item.studentScore)) ? Number(item.studentScore) : 0,
      }));

    this.resultChartRows = scoredRows.map((item) => {
      const avgFromClass = this.findClassAverageForResultRow(item, option);
      return {
        ...item,
        avgScore: Number((avgFromClass ?? item.studentScore).toFixed(2)),
      };
    });
  }

  private findClassAverageForResultRow(
    row: Pick<ResultChartRow, 'subjectCode'>,
    option: SemesterOption,
  ): number | null {
    const matchedGrade = this.findMatchedGradeForResultRow(row, option);

    const avg = Number(matchedGrade?.classAverageScore);
    return Number.isFinite(avg) ? avg : null;
  }

  private findStudentTktForResultRow(
    row: Pick<ResultChartRow, 'subjectCode'>,
    option: SemesterOption,
  ): number | null {
    const matchedGrade = this.findMatchedGradeForResultRow(row, option);
    const score = Number(matchedGrade?.tktScore);
    return Number.isFinite(score) ? score : null;
  }

  private findMatchedGradeForResultRow(
    row: Pick<ResultChartRow, 'subjectCode'>,
    option: SemesterOption,
  ): StudentGradeWithAverage | null {
    const registrations = this.registrationRows();
    const matchedRegistration = registrations.find((registration) => {
      const sameSemester = Number(registration.semester || 0) === option.semester;
      if (!sameSemester) {
        return false;
      }

      if (option.schoolYear && String(registration.schoolYear || '') !== option.schoolYear) {
        return false;
      }

      return this.registrationSubjectCode(registration) === row.subjectCode;
    });

    if (!matchedRegistration?.classId) {
      return null;
    }

    const targetClassId = this.resolveId(matchedRegistration.classId);
    if (!targetClassId) {
      return null;
    }

    return (
      this.studentGrades.find((grade) => this.resolveId(grade.classId) === targetClassId) || null
    );
  }

  private refreshClassSemesterRows(): void {
    const option = this.classSemesterOptions.find(
      (item) => item.key === this.selectedClassSemesterKey,
    );

    if (!option) {
      this.classSemesterRows = [];
      return;
    }

    const rows = this.registrationRows()
      .filter((registration) => {
        const semester = Number(registration.semester || 0);
        if (semester !== option.semester) {
          return false;
        }

        if (option.schoolYear) {
          return String(registration.schoolYear || '') === option.schoolYear;
        }

        return true;
      })
      .map((registration) => this.mapRegistrationToClassRow(registration));

    this.classSemesterRows = rows.sort((a, b) => a.classCode.localeCompare(b.classCode));
  }

  private registrationRows(): StudentRegistration[] {
    const rows = this.studentCurriculumData?.registrations;
    return Array.isArray(rows) ? rows : [];
  }

  private buildResultSemesterOptions(
    details: ProgressDetail[],
    registrations: StudentRegistration[],
  ): SemesterOption[] {
    const mapByKey = new Map<string, SemesterOption>();

    for (const item of details) {
      const schoolYear = this.findSchoolYearForDetail(item, registrations);
      const key = `${item.year}-${item.semester}`;
      const label = schoolYear
        ? `HK ${item.semester} NH ${schoolYear}`
        : `HK ${item.semester} Nam ${item.year}`;

      mapByKey.set(key, {
        key,
        label,
        semester: item.semester,
        year: item.year,
        schoolYear,
      });
    }

    return Array.from(mapByKey.values()).sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return b.semester - a.semester;
    });
  }

  private buildClassSemesterOptions(registrations: StudentRegistration[]): SemesterOption[] {
    const mapByKey = new Map<string, SemesterOption>();

    for (const registration of registrations) {
      const semester = Number(registration.semester || 0);
      if (![1, 2, 3].includes(semester)) {
        continue;
      }

      const schoolYear = String(registration.schoolYear || '').trim();
      const key = `${schoolYear || 'none'}-${semester}`;
      const label = schoolYear ? `HK ${semester} NH ${schoolYear}` : `HK ${semester}`;

      mapByKey.set(key, {
        key,
        label,
        semester: semester as 1 | 2 | 3,
        schoolYear: schoolYear || undefined,
      });
    }

    return Array.from(mapByKey.values()).sort((a, b) => {
      if (a.schoolYear && b.schoolYear && a.schoolYear !== b.schoolYear) {
        return b.schoolYear.localeCompare(a.schoolYear);
      }
      return b.semester - a.semester;
    });
  }

  private findSchoolYearForDetail(
    detail: ProgressDetail,
    registrations: StudentRegistration[],
  ): string | undefined {
    const match = registrations.find((registration) => {
      const subjectCode = this.registrationSubjectCode(registration);
      return (
        Number(registration.semester || 0) === detail.semester &&
        subjectCode &&
        subjectCode === detail.subjectCode
      );
    });

    const schoolYear = String(match?.schoolYear || '').trim();
    return schoolYear || undefined;
  }

  private mapRegistrationToClassRow(registration: StudentRegistration): ClassSemesterRow {
    const classInfo = registration.classId;
    const subjectInfo = registration.subjectId;

    const subjectCode = this.registrationSubjectCode(registration);
    const subjectName = this.registrationSubjectName(registration);

    const classCode =
      typeof classInfo === 'string' ? `HP-${subjectCode || 'N/A'}` : classInfo?.code || '-';
    const className =
      typeof classInfo === 'string'
        ? subjectName || 'Hoc phan chua xac dinh'
        : classInfo?.name || subjectName || 'Hoc phan chua xac dinh';

    const credits = typeof subjectInfo === 'string' ? 0 : Number(subjectInfo?.credits || 0);

    return {
      classCode,
      className,
      subjectCode,
      subjectName,
      credits,
      status: this.registrationStatusLabel(registration.status),
    };
  }

  private registrationSubjectCode(registration: StudentRegistration): string {
    const subject = registration.subjectId;
    return typeof subject === 'string' ? '' : String(subject?.code || '').trim();
  }

  private registrationSubjectName(registration: StudentRegistration): string {
    const subject = registration.subjectId;
    return typeof subject === 'string' ? '-' : String(subject?.name || '-').trim();
  }

  private registrationStatusLabel(status: StudentRegistration['status']): string {
    if (status === 'completed') {
      return 'Da hoan thanh';
    }

    if (status === 'failed') {
      return 'Hoc lai';
    }

    if (status === 'retaking') {
      return 'Dang hoc lai';
    }

    return 'Dang hoc';
  }

  private resolveId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value && '_id' in value) {
      const idValue = (value as { _id?: unknown })._id;
      return typeof idValue === 'string' ? idValue : '';
    }

    return '';
  }

  private loadRoadmaps(): void {
    this.loadingRoadmap = true;

    forkJoin({
      gpaRoadmap: this.apiService
        .get<ApiResponse<GpaRoadmap>>(`/predictions/student/${this.studentId}/gpa-roadmap`, {
          targetGpa: this.targetGpa,
        })
        .pipe(map((response) => response.data)),
      retakeRoadmap: this.apiService
        .get<ApiResponse<RetakeRoadmap>>(`/predictions/student/${this.studentId}/retake-roadmap`)
        .pipe(map((response) => response.data)),
    })
      .pipe(
        finalize(() => {
          this.loadingRoadmap = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ gpaRoadmap, retakeRoadmap }) => {
          this.gpaRoadmap = gpaRoadmap;
          this.retakeRoadmap = retakeRoadmap;
        },
        error: () => {
          this.gpaRoadmap = null;
          this.retakeRoadmap = null;
        },
      });
  }

  private buildTimeline(details: ProgressDetail[]): TimelineSlot[] {
    const slots = new Map<string, TimelineSlot>();

    for (const item of details) {
      const key = `${item.year}-${item.semester}`;
      if (!slots.has(key)) {
        slots.set(key, {
          year: item.year,
          semester: item.semester,
          items: [],
        });
      }

      const slot = slots.get(key);
      if (!slot) {
        continue;
      }

      slot.items.push(item);
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
      return error.message || 'Khong the tai du lieu co van.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Khong the tai du lieu co van.';
  }
}
