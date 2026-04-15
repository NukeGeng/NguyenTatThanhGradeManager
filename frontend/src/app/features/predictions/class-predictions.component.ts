import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import {
  ApiResponse,
  Department,
  Prediction,
  PredictionRiskLevel,
} from '../../shared/models/interfaces';
import { toTenDigitStudentCode } from '../../shared/utils/code-format.util';

interface StudentRow {
  _id: string;
  studentCode: string;
  fullName: string;
  className: string;
  lastPredictedAt: string | null;
  lastPredictedRank: Prediction['predictedRank'] | null;
  lastRiskLevel: PredictionRiskLevel | null;
}

interface PredictionSummary {
  studentId: string;
  createdAt: string;
  predictedRank: Prediction['predictedRank'];
  riskLevel: PredictionRiskLevel;
}

@Component({
  selector: 'app-class-predictions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>{{ title }}</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">{{ eyebrow }}</p>
          <h1>{{ title }}</h1>
          <p class="subtitle">{{ subtitle }}</p>
        </div>
      </header>

      <div class="master-detail">
        <!-- LEFT: student search panel -->
        <aside class="panel-left">
          <mat-form-field appearance="outline" class="full-field" subscriptSizing="dynamic">
            <mat-label>{{ labelDept }}</mat-label>
            <mat-select
              [(ngModel)]="selectedDeptId"
              (ngModelChange)="onDeptChange()"
              [disabled]="isLoadingDepts"
            >
              <mat-option value="">{{ labelAllDept }}</mat-option>
              @for (dept of departments; track dept._id) {
                <mat-option [value]="dept._id">{{ dept.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field
            appearance="outline"
            class="full-field search-field"
            subscriptSizing="dynamic"
          >
            <lucide-icon
              matPrefix
              name="search"
              [size]="15"
              style="margin-right:6px;color:var(--text-sub)"
            ></lucide-icon>
            <input
              matInput
              type="text"
              [placeholder]="placeholderSearch"
              [(ngModel)]="searchKeyword"
              (ngModelChange)="onSearchChange($event)"
            />
          </mat-form-field>

          @if (isLoadingStudents) {
            <div class="list-state">
              <mat-spinner [diameter]="28"></mat-spinner>
            </div>
          } @else if (students.length === 0) {
            <div class="list-state muted">
              <lucide-icon name="users" [size]="20"></lucide-icon>
              <p>{{ searchKeyword || selectedDeptId ? noStudentFound : noStudentPrompt }}</p>
            </div>
          } @else {
            <ul class="student-list" role="listbox">
              @for (s of students; track s._id) {
                <li
                  class="student-item"
                  role="option"
                  [class.selected]="s._id === selectedStudentId"
                  [attr.aria-selected]="s._id === selectedStudentId"
                  (click)="selectStudent(s._id)"
                  (keydown.enter)="selectStudent(s._id)"
                  tabindex="0"
                >
                  <div class="student-name">{{ s.fullName }}</div>
                  <div class="student-meta">{{ s.studentCode }} · {{ s.className }}</div>
                  @if (isLoadingSummary) {
                    <div class="predict-status predict-status--loading">...</div>
                  } @else if (s.lastPredictedAt) {
                    <div class="predict-status">
                      <span class="predict-dot predict-dot--done"></span>
                      <span class="badge predict-rank" [ngClass]="rankClass(s.lastPredictedRank)">{{
                        s.lastPredictedRank
                      }}</span>
                      <span class="predict-time">{{ formatShortDate(s.lastPredictedAt) }}</span>
                    </div>
                  } @else {
                    <div class="predict-status predict-status--none">
                      <span class="predict-dot predict-dot--none"></span>
                      {{ notYetPredicted }}
                    </div>
                  }
                </li>
              }
            </ul>
          }
        </aside>

        <!-- RIGHT: prediction detail panel -->
        <main class="panel-right">
          @if (!selectedStudentId) {
            <div class="empty-panel">
              <lucide-icon name="brain-circuit" [size]="36"></lucide-icon>
              <p>{{ promptSelectStudent }}</p>
            </div>
          } @else if (isLoadingPredictions) {
            <div class="empty-panel">
              <mat-spinner [diameter]="36"></mat-spinner>
              <p>{{ loadingPredictions }}</p>
            </div>
          } @else {
            @if (selectedStudent) {
              <div class="student-header">
                <div>
                  <p class="eyebrow">{{ labelStudent }}</p>
                  <h2>{{ selectedStudent.fullName }}</h2>
                  <p class="student-header-meta">
                    {{ selectedStudent.studentCode }} · {{ selectedStudent.className }}
                  </p>
                </div>
                <a mat-stroked-button [routerLink]="['/students', selectedStudentId]">
                  <lucide-icon name="user" [size]="15"></lucide-icon>
                  {{ labelProfile }}
                </a>
              </div>
            }

            @if (predictions.length === 0) {
              <div class="empty-panel">
                <lucide-icon name="info" [size]="24"></lucide-icon>
                <p>{{ noPredictions }}</p>
                <a
                  mat-flat-button
                  class="btn-primary"
                  [routerLink]="['/students', selectedStudentId]"
                >
                  <lucide-icon name="brain-circuit" [size]="15"></lucide-icon>
                  {{ goRunPrediction }}
                </a>
              </div>
            } @else {
              @let latest = predictions[0];
              <div class="report-grid">
                <mat-card class="report-card card--accent">
                  <h3 class="card-title">{{ latestResult }}</h3>

                  <div class="result-row">
                    <span class="label">{{ labelDate }}</span>
                    <span>{{ formatDate(latest.createdAt) }}</span>
                  </div>
                  <div class="result-row">
                    <span class="label">{{ labelRank }}</span>
                    <span class="badge" [ngClass]="rankClass(latest.predictedRank)">{{
                      latest.predictedRank
                    }}</span>
                  </div>
                  <div class="result-row">
                    <span class="label">{{ labelConfidence }}</span>
                    <div class="confidence-wrap">
                      <div class="confidence-track">
                        <div
                          class="confidence-fill"
                          [ngClass]="rankClass(latest.predictedRank)"
                          [style.width.%]="latest.confidence"
                        ></div>
                      </div>
                      <strong>{{ latest.confidence.toFixed(1) }}%</strong>
                    </div>
                  </div>
                  <div class="result-row">
                    <span class="label">{{ labelRisk }}</span>
                    <span class="badge" [ngClass]="riskClass(latest.riskLevel)">{{
                      riskLabel(latest.riskLevel)
                    }}</span>
                  </div>
                </mat-card>

                <mat-card class="report-card">
                  <h3 class="card-title">{{ detailAnalysis }}</h3>

                  <div class="section-item">
                    <h4>{{ labelAnalysis }}</h4>
                    <p class="analysis-text">{{ latest.analysis || noAnalysis }}</p>
                  </div>

                  @if (latest.weakSubjects.length) {
                    <div class="section-item">
                      <h4>{{ labelWeak }}</h4>
                      <ul class="subject-chip-list">
                        @for (s of latest.weakSubjects; track s) {
                          <li class="chip chip--danger">{{ s }}</li>
                        }
                      </ul>
                    </div>
                  }

                  @if (latest.improveSubjects?.length) {
                    <div class="section-item">
                      <h4>{{ labelImprove }}</h4>
                      <ul class="subject-chip-list">
                        @for (s of latest.improveSubjects!; track s) {
                          <li class="chip chip--warn">{{ s }}</li>
                        }
                      </ul>
                    </div>
                  }
                </mat-card>

                @if (latest.suggestions.length) {
                  <mat-card class="report-card report-card--full">
                    <h3 class="card-title">{{ labelSuggestions }}</h3>
                    <ul class="suggestion-list">
                      @for (sug of latest.suggestions; track sug) {
                        <li>
                          <lucide-icon name="check-circle" [size]="15"></lucide-icon>
                          <span>{{ sug }}</span>
                        </li>
                      }
                    </ul>
                  </mat-card>
                }
              </div>

              @if (predictions.length > 1) {
                <div class="history-section">
                  <h4 class="history-title">
                    <lucide-icon name="history" [size]="14"></lucide-icon>
                    {{ historyTitle }} ({{ predictions.length - 1 }})
                  </h4>
                  <div class="history-list">
                    @for (item of predictions.slice(1); track item._id) {
                      <div class="history-item">
                        <div>
                          <span class="badge" [ngClass]="rankClass(item.predictedRank)">{{
                            item.predictedRank
                          }}</span>
                          <span class="badge" [ngClass]="riskClass(item.riskLevel)">{{
                            riskLabel(item.riskLevel)
                          }}</span>
                        </div>
                        <span class="history-meta"
                          >{{ item.confidence.toFixed(1) }}% ·
                          {{ formatDate(item.createdAt) }}</span
                        >
                      </div>
                    }
                  </div>
                </div>
              }
            }
          }
        </main>
      </div>
    </section>
  `,
  styles: [
    `
      .page-wrap {
        display: grid;
        gap: 1rem;
      }
      .eyebrow {
        margin: 0;
        color: var(--blue);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
      }
      h1 {
        margin: 0.25rem 0;
        color: var(--navy-dark);
      }
      .subtitle {
        margin: 0;
        color: var(--text-sub);
      }

      /* master-detail layout */
      .master-detail {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 1rem;
        align-items: start;
        min-width: 0;
      }
      @media (max-width: 1024px) {
        .master-detail {
          grid-template-columns: 300px 1fr;
        }
      }
      @media (max-width: 768px) {
        .master-detail {
          grid-template-columns: 1fr;
        }
      }

      /* left panel */
      .panel-left {
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        position: sticky;
        top: 1rem;
        min-width: 0;
      }
      .full-field {
        width: 100%;
        /* MDC density token — shrinks the field to ~44px without breaking internals */
        --mdc-outlined-text-field-container-height: 44px;
        --mat-form-field-container-height: 44px;
        --mat-form-field-container-vertical-padding: 10px;
      }
      /* Remove floating label from search field (no mat-label used) */
      :host ::ng-deep .search-field .mat-mdc-form-field-infix {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }
      /* Remove extra subscript space since we use subscriptSizing=dynamic */
      :host ::ng-deep .full-field .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      .list-state {
        min-height: 120px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.5rem;
        text-align: center;
      }
      .list-state.muted {
        color: var(--text-sub);
      }
      .student-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: calc(100vh - 300px);
        overflow-y: auto;
        overflow-x: hidden;
      }
      .student-item {
        padding: 0.55rem 0.6rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.12s;
        min-width: 0;
        overflow: hidden;
      }
      .student-item:hover {
        background: var(--gray-50, #f8fafc);
      }
      .student-item.selected {
        background: #eff6ff;
        border-left: 3px solid var(--blue);
        padding-left: calc(0.6rem - 3px);
      }
      .student-name {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--navy-dark);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .student-meta {
        font-size: 0.72rem;
        color: var(--text-sub);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* predict status row */
      .predict-status {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        margin-top: 0.3rem;
        font-size: 0.72rem;
      }
      .predict-status--none {
        color: var(--text-sub);
      }
      .predict-status--loading {
        color: var(--text-sub);
        font-style: italic;
      }
      .predict-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .predict-dot--done {
        background: #16a34a;
      }
      .predict-dot--none {
        background: #d1d5db;
      }
      .predict-rank {
        font-size: 0.65rem !important;
        padding: 0.1rem 0.4rem !important;
      }
      .predict-time {
        color: var(--text-sub);
        font-size: 0.68rem;
      }

      /* right panel */
      .panel-right {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .empty-panel {
        min-height: 260px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        text-align: center;
        color: var(--text-sub);
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        padding: 2rem;
      }
      .student-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        padding: 0.85rem 1rem;
        flex-wrap: wrap;
      }
      h2 {
        margin: 0.2rem 0 0;
        color: var(--navy-dark);
      }
      .student-header-meta {
        margin: 0.2rem 0 0;
        color: var(--text-sub);
        font-size: 0.85rem;
      }

      /* report grid */
      .report-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 1100px) {
        .report-grid {
          grid-template-columns: 1fr;
        }
      }
      .report-card {
        padding: 1rem 1.1rem 1.1rem;
        border: 1px solid var(--gray-200);
        position: relative;
      }
      .report-card--full {
        grid-column: 1 / -1;
      }
      .card--accent::before {
        content: '';
        position: absolute;
        inset: 0 0 auto;
        height: 3px;
        border-radius: var(--radius) var(--radius) 0 0;
        background: linear-gradient(90deg, var(--navy), var(--blue));
      }
      .card-title {
        margin: 0 0 0.9rem;
        color: var(--navy-dark);
        font-size: 0.95rem;
        font-weight: 700;
      }
      h4 {
        margin: 0 0 0.4rem;
        font-size: 0.85rem;
        color: var(--gray-700, #374151);
      }

      .result-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.55rem 0;
        border-bottom: 1px dashed var(--gray-200);
      }
      .result-row:last-child {
        border-bottom: none;
      }
      .label {
        color: var(--text-sub);
        font-size: 0.88rem;
      }
      .confidence-wrap {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 160px;
      }
      .confidence-track {
        flex: 1;
        height: 8px;
        border-radius: 999px;
        background: var(--gray-100);
        overflow: hidden;
      }
      .confidence-fill {
        height: 100%;
      }

      .section-item {
        margin-top: 0.85rem;
        padding-top: 0.85rem;
        border-top: 1px dashed var(--gray-200);
      }
      .section-item:first-of-type {
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }
      .analysis-text {
        margin: 0;
        font-size: 0.88rem;
        color: var(--text-main, #1e293b);
        line-height: 1.6;
      }

      .subject-chip-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .chip {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
      }
      .chip--danger {
        background: #fef2f2;
        color: #dc2626;
      }
      .chip--warn {
        background: #fffbeb;
        color: #d97706;
      }

      .suggestion-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .suggestion-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        font-size: 0.88rem;
        color: var(--text-main, #1e293b);
      }

      .history-section {
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        padding: 0.85rem 1rem;
      }
      .history-title {
        margin: 0 0 0.65rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text-sub);
        font-size: 0.85rem;
        font-weight: 600;
      }
      .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0;
        border-bottom: 1px dashed var(--gray-100);
      }
      .history-item:last-child {
        border-bottom: none;
      }
      .history-item > div {
        display: flex;
        gap: 0.35rem;
      }
      .history-meta {
        font-size: 0.78rem;
        color: var(--text-sub);
      }

      /* badges */
      .badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        white-space: nowrap;
      }
      .rank-gioi,
      .risk-low,
      .confidence-fill.rank-gioi {
        background: #f0fdf4;
        color: #16a34a;
      }
      .rank-kha,
      .confidence-fill.rank-kha {
        background: #eff6ff;
        color: #2563eb;
      }
      .rank-trung-binh,
      .risk-medium,
      .confidence-fill.rank-trung-binh {
        background: #fffbeb;
        color: #d97706;
      }
      .rank-yeu,
      .risk-high,
      .confidence-fill.rank-yeu {
        background: #fef2f2;
        color: #dc2626;
      }
      .btn-primary {
        background: var(--navy) !important;
        color: #fff !important;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
    `,
  ],
})
export class ClassPredictionsComponent implements OnInit {
  // ---- i18n strings (keep Vietnamese out of template literals to avoid encoding issues) ----
  readonly title = 'D\u1ef1 \u0111o\u00e1n AI';
  readonly eyebrow = 'Ph\u00e2n t\u00edch r\u1ee7i ro h\u1ecdc t\u1eadp';
  readonly subtitle =
    'T\u00ecm h\u1ecdc sinh theo khoa, xem k\u1ebft qu\u1ea3 d\u1ef1 \u0111o\u00e1n v\u00e0 ph\u00e2n t\u00edch chi ti\u1ebft.';
  readonly labelDept = 'Khoa / B\u1ed9 m\u00f4n';
  readonly labelAllDept = 'T\u1ea5t c\u1ea3 khoa';
  readonly labelSearch = 'T\u00ecm h\u1ecdc sinh';
  readonly placeholderSearch = 'T\u00ean ho\u1eb7c m\u00e3 h\u1ecdc sinh...';
  readonly noStudentFound = 'Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ecdc sinh.';
  readonly noStudentPrompt = 'Nh\u1eadp t\u1eeb kho\u00e1 ho\u1eb7c ch\u1ecdn khoa.';
  readonly notYetPredicted = 'Ch\u01b0a d\u1ef1 \u0111o\u00e1n';
  readonly promptSelectStudent =
    'Ch\u1ecdn m\u1ed9t h\u1ecdc sinh \u0111\u1ec3 xem b\u00e1o c\u00e1o d\u1ef1 \u0111o\u00e1n AI.';
  readonly loadingPredictions = '\u0110ang t\u1ea3i d\u1eef li\u1ec7u d\u1ef1 \u0111o\u00e1n...';
  readonly labelStudent = 'H\u1ecdc sinh';
  readonly labelProfile = 'H\u1ed3 s\u01a1 h\u1ecdc sinh';
  readonly noPredictions =
    'H\u1ecdc sinh n\u00e0y ch\u01b0a c\u00f3 d\u1ef1 \u0111o\u00e1n AI n\u00e0o.';
  readonly goRunPrediction = 'Ch\u1ea1y d\u1ef1 \u0111o\u00e1n t\u1ea1i trang h\u1ecdc sinh';
  readonly latestResult = 'K\u1ebft qu\u1ea3 d\u1ef1 \u0111o\u00e1n m\u1edbi nh\u1ea5t';
  readonly labelDate = 'Ng\u00e0y d\u1ef1 \u0111o\u00e1n';
  readonly labelRank = 'X\u1ebfp lo\u1ea1i d\u1ef1 \u0111o\u00e1n';
  readonly labelConfidence = '\u0110\u1ed9 tin c\u1eady';
  readonly labelRisk = 'M\u1ee9c r\u1ee7i ro';
  readonly detailAnalysis = 'Chi ti\u1ebft ph\u00e2n t\u00edch';
  readonly labelAnalysis = 'Ph\u00e2n t\u00edch t\u1ed5ng th\u1ec3';
  readonly noAnalysis = 'Kh\u00f4ng c\u00f3 ph\u00e2n t\u00edch chi ti\u1ebft.';
  readonly labelWeak = 'M\u00f4n y\u1ebfu (F)';
  readonly labelImprove = 'C\u1ea7n c\u1ea3i thi\u1ec7n (C)';
  readonly labelSuggestions = 'Khuy\u1ebfn ngh\u1ecb';
  readonly historyTitle = 'L\u1ecbch s\u1eed d\u1ef1 \u0111o\u00e1n';
  readonly riskLow = 'Th\u1ea5p';
  readonly riskMedium = 'Trung b\u00ecnh';
  readonly riskHigh = 'Cao';

  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  departments: Department[] = [];
  students: StudentRow[] = [];
  predictions: Prediction[] = [];

  selectedDeptId = '';
  searchKeyword = '';
  selectedStudentId = '';
  selectedStudent: StudentRow | null = null;

  isLoadingDepts = true;
  isLoadingStudents = false;
  isLoadingPredictions = false;
  isLoadingSummary = false;

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadStudents());

    this.loadDepartments();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const studentId = params.get('studentId');
      if (studentId && studentId !== this.selectedStudentId) {
        this.selectedStudentId = studentId;
        this.loadPredictions(studentId);
        if (!this.students.find((s) => s._id === studentId)) {
          this.loadStudentInfo(studentId);
        }
      }
    });
  }

  loadDepartments(): void {
    this.apiService
      .get<ApiResponse<Department[]>>('/departments')
      .pipe(
        map((res) => res.data ?? []),
        finalize(() => {
          this.isLoadingDepts = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (depts) => {
          this.departments = depts.filter((d) => d.isActive !== false);
        },
        error: () => {
          this.snackBar.open(
            'Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch khoa.',
            '\u0110\u00f3ng',
            { duration: 3000 },
          );
        },
      });
  }

  loadStudents(): void {
    this.isLoadingStudents = true;
    const params = new URLSearchParams();
    if (this.selectedDeptId) params.set('departmentId', this.selectedDeptId);
    if (this.searchKeyword.trim()) params.set('search', this.searchKeyword.trim());
    const query = params.toString() ? `?${params.toString()}` : '';

    this.apiService
      .get<ApiResponse<unknown[]>>(`/students${query}`)
      .pipe(
        map((res) => res.data ?? []),
        finalize(() => {
          this.isLoadingStudents = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (raw) => {
          this.students = (raw as any[]).map((s) => this.mapStudentRow(s));
          const found = this.students.find((s) => s._id === this.selectedStudentId);
          if (found) this.selectedStudent = found;
          this.loadPredictionSummary();
        },
        error: () => {
          this.snackBar.open(
            'Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch h\u1ecdc sinh.',
            '\u0110\u00f3ng',
            { duration: 3000 },
          );
        },
      });
  }

  loadPredictionSummary(): void {
    if (this.students.length === 0) return;
    this.isLoadingSummary = true;
    const ids = this.students.map((s) => s._id).join(',');

    this.apiService
      .get<ApiResponse<PredictionSummary[]>>(`/predictions/latest-summary?studentIds=${ids}`)
      .pipe(
        map((res) => res.data ?? []),
        finalize(() => {
          this.isLoadingSummary = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (summaries) => {
          const summaryMap = new Map(summaries.map((s) => [s.studentId, s]));
          this.students = this.students.map((s) => {
            const sm = summaryMap.get(s._id);
            return {
              ...s,
              lastPredictedAt: sm?.createdAt ?? null,
              lastPredictedRank: sm?.predictedRank ?? null,
              lastRiskLevel: sm?.riskLevel ?? null,
            };
          });
          const found = this.students.find((s) => s._id === this.selectedStudentId);
          if (found) this.selectedStudent = found;
        },
        error: () => {
          /* non-critical */
        },
      });
  }

  loadStudentInfo(studentId: string): void {
    this.apiService
      .get<ApiResponse<unknown>>(`/students/${studentId}`)
      .pipe(
        map((res) => res.data),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (raw) => {
          if (raw) this.selectedStudent = this.mapStudentRow(raw as any);
        },
        error: () => {},
      });
  }

  loadPredictions(studentId: string): void {
    this.isLoadingPredictions = true;
    this.predictions = [];

    this.apiService
      .get<ApiResponse<Prediction[]>>(`/predictions/student/${studentId}`)
      .pipe(
        map((res) => res.data ?? []),
        finalize(() => {
          this.isLoadingPredictions = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (preds) => {
          this.predictions = preds;
          if (preds.length > 0) {
            const latest = preds[0];
            this.students = this.students.map((s) =>
              s._id === studentId
                ? {
                    ...s,
                    lastPredictedAt: latest.createdAt ?? null,
                    lastPredictedRank: latest.predictedRank,
                    lastRiskLevel: latest.riskLevel,
                  }
                : s,
            );
            const found = this.students.find((s) => s._id === studentId);
            if (found) this.selectedStudent = found;
          }
        },
        error: () => {
          this.snackBar.open(
            'Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1ef1 \u0111o\u00e1n c\u1ee7a h\u1ecdc sinh n\u00e0y.',
            '\u0110\u00f3ng',
            { duration: 3000 },
          );
        },
      });
  }

  onDeptChange(): void {
    this.loadStudents();
  }

  onSearchChange(value: string): void {
    this.searchKeyword = value;
    this.searchSubject.next(value);
  }

  selectStudent(studentId: string): void {
    if (studentId === this.selectedStudentId) return;
    this.selectedStudentId = studentId;
    this.selectedStudent = this.students.find((s) => s._id === studentId) ?? null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { studentId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadPredictions(studentId);
  }

  private mapStudentRow(s: any): StudentRow {
    const cls = s.classId;
    const className = typeof cls === 'object' && cls ? cls.name || cls.code : String(cls ?? '');
    return {
      _id: String(s._id),
      studentCode: toTenDigitStudentCode(s.studentCode, s._id),
      fullName: String(s.fullName ?? ''),
      className,
      lastPredictedAt: null,
      lastPredictedRank: null,
      lastRiskLevel: null,
    };
  }

  rankClass(rank: Prediction['predictedRank'] | null): string {
    switch (rank) {
      case 'Gi\u1ecfi':
        return 'rank-gioi';
      case 'Kh\u00e1':
        return 'rank-kha';
      case 'Trung B\u00ecnh':
        return 'rank-trung-binh';
      default:
        return 'rank-yeu';
    }
  }

  riskClass(risk: PredictionRiskLevel): string {
    switch (risk) {
      case 'high':
        return 'risk-high';
      case 'medium':
        return 'risk-medium';
      default:
        return 'risk-low';
    }
  }

  riskLabel(risk: PredictionRiskLevel): string {
    switch (risk) {
      case 'high':
        return this.riskHigh;
      case 'medium':
        return this.riskMedium;
      default:
        return this.riskLow;
    }
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatShortDate(value: string): string {
    const d = new Date(value);
    const diffH = (Date.now() - d.getTime()) / 3_600_000;
    if (diffH < 1) return 'V\u1eeba xong';
    if (diffH < 24) return `${Math.floor(diffH)} gi\u1edd tr\u01b0\u1edbc`;
    if (diffH < 48) return 'H\u00f4m qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}
