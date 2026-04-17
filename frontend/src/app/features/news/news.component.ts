import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiResponse } from '../../shared/models/interfaces';

// --- Types ---

type NewsCategory = 'dao-tao' | 'hoc-vu' | 'hoc-phi' | 'tan-sinh-vien' | 'su-kien' | 'khac';

interface NewsItem {
  _id: string;
  title: string;
  summary: string;
  content?: string;
  imageUrl: string;
  category: NewsCategory;
  authorName: string;
  publishedAt: string;
  isActive: boolean;
}

interface NewsFormData {
  title: string;
  summary: string;
  content: string;
  category: NewsCategory;
  publishedAt: string;
  imageFile: File | null;
  imagePreview: string;
}

const CATEGORIES: { key: NewsCategory; label: string; sectionLabel: string; slug: string }[] = [
  {
    key: 'dao-tao',
    label: 'Đào tạo',
    sectionLabel: 'Thông tin Đào tạo',
    slug: 'thong-tin-dao-tao',
  },
  {
    key: 'tan-sinh-vien',
    label: 'Tân sinh viên',
    sectionLabel: 'Thông tin tân Sinh viên',
    slug: 'thong-tin-tan-sinh-vien',
  },
  { key: 'hoc-vu', label: 'Học vụ', sectionLabel: 'Thông tin Học vụ', slug: 'thong-tin-hoc-vu' },
  {
    key: 'hoc-phi',
    label: 'Học phí',
    sectionLabel: 'Thông tin Học phí',
    slug: 'thong-tin-hoc-phi',
  },
  {
    key: 'su-kien',
    label: 'Sự kiện',
    sectionLabel: 'Sự kiện & Hoạt động',
    slug: 'su-kien-va-hoat-dong',
  },
  { key: 'khac', label: 'Khác', sectionLabel: 'Tin tức khác', slug: 'tin-tuc-khac' },
];

const SLUG_BY_KEY: Record<NewsCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.slug]),
) as Record<NewsCategory, string>;

const DEFAULT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="%23e2e8f0"/><rect x="160" y="60" width="80" height="60" rx="6" fill="%23cbd5e1"/><rect x="140" y="130" width="120" height="10" rx="3" fill="%23cbd5e1"/><rect x="160" y="150" width="80" height="8" rx="3" fill="%23e2e8f0"/></svg>';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LucideAngularModule,
    RouterLink,
  ],
  template: `
    <section class="container page-wrap news-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Tin tức</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Cổng thông tin</p>
          <h1 class="page-title">Tin tức NTTU</h1>
          <p class="subtitle">Thông báo, tin tức từ nhà trường phân theo chuyên mục.</p>
        </div>
        @if (isAdmin) {
          <button mat-flat-button class="btn-add" type="button" (click)="openCreate()">
            <lucide-icon name="plus" [size]="16"></lucide-icon>
            Thêm tin tức
          </button>
        }
      </header>

      @if (loading) {
        <div class="state-center">
          <mat-spinner [diameter]="32"></mat-spinner>
        </div>
      } @else {
        <div class="category-grid">
          @for (cat of visibleCategories; track cat.key) {
            @let items = byCategory(cat.key);
            @if (items.length > 0) {
              <section class="cat-section">
                <div class="section-header">
                  <h2 class="section-title">{{ cat.sectionLabel }}</h2>
                  <div class="tab-bar">
                    <span class="tab-item active">
                      {{ cat.label }}
                      <span class="tab-count">{{ items.length }}</span>
                    </span>
                  </div>
                </div>

                <div class="featured-grid">
                  @for (item of items.slice(0, 2); track item._id) {
                    <article class="news-card" (click)="openDetail(item)">
                      <div class="card-img-wrap">
                        <img
                          [src]="resolveImg(item.imageUrl)"
                          [alt]="item.title"
                          class="card-img"
                          (error)="onImgError($event)"
                        />
                      </div>
                      <div class="card-body">
                        <h3 class="card-title">{{ item.title }}</h3>
                        <p class="card-date">{{ formatDate(item.publishedAt) }}</p>
                      </div>
                      @if (isAdmin) {
                        <div class="card-admin" (click)="$event.stopPropagation()">
                          <button
                            type="button"
                            class="btn-icon-sm"
                            title="Sửa"
                            (click)="openEdit(item)"
                          >
                            <lucide-icon name="pencil" [size]="13"></lucide-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-sm btn-del"
                            title="Xoá"
                            (click)="deleteNews(item)"
                          >
                            <lucide-icon name="trash-2" [size]="13"></lucide-icon>
                          </button>
                        </div>
                      }
                    </article>
                  }
                </div>

                <ul class="news-links">
                  @for (item of items.slice(2, 5); track item._id) {
                    <li>
                      <button type="button" class="link-btn" (click)="openDetail(item)">
                        <lucide-icon
                          name="chevron-right"
                          [size]="13"
                          class="link-chevron"
                        ></lucide-icon>
                        <span>{{ item.title }}</span>
                      </button>
                      @if (isAdmin) {
                        <div class="link-admin">
                          <button type="button" class="btn-icon-sm" (click)="openEdit(item)">
                            <lucide-icon name="pencil" [size]="12"></lucide-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-sm btn-del"
                            (click)="deleteNews(item)"
                          >
                            <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                          </button>
                        </div>
                      }
                    </li>
                  }
                  @for (p of placeholders(items.length); track p) {
                    <li class="link-placeholder"></li>
                  }
                </ul>
                <div class="section-footer">
                  <a class="see-more" [routerLink]="['/news', cat.slug]">
                    Xem tất cả
                    <lucide-icon name="chevron-right" [size]="13"></lucide-icon>
                  </a>
                </div>
              </section>
            }
          }
        </div>

        @if (allNews.length === 0) {
          <div class="state-center">
            <lucide-icon name="newspaper" [size]="36"></lucide-icon>
            <p>
              Chưa có tin tức nào.
              @if (isAdmin) {
                Nhấn &quot;Thêm tin tức&quot; để bắt đầu.
              }
            </p>
          </div>
        }
      }
    </section>

    @if (showForm) {
      <div class="overlay-backdrop" (click)="closeForm()"></div>
      <aside class="form-panel">
        <header class="form-head">
          <h2>{{ editingId ? 'Sửa tin tức' : 'Thêm tin tức' }}</h2>
          <button type="button" class="btn-icon-sm" (click)="closeForm()">
            <lucide-icon name="x" [size]="16"></lucide-icon>
          </button>
        </header>

        <div class="form-body">
          <label class="img-upload-zone" [class.has-img]="form.imagePreview">
            @if (form.imagePreview) {
              <img [src]="form.imagePreview" alt="preview" class="img-upload-preview" />
              <button type="button" class="img-remove" (click)="clearImage($event)">
                <lucide-icon name="x" [size]="12"></lucide-icon>
              </button>
            } @else {
              <lucide-icon name="image-plus" [size]="28"></lucide-icon>
              <span>Nhấn để chọn ảnh bìa</span>
              <span class="img-hint">JPG, PNG, WebP · tối đa 5MB</span>
            }
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style="display:none"
              (change)="onImageSelected($event)"
            />
          </label>

          <div class="field">
            <label class="field-label">Tiêu đề <span class="req">*</span></label>
            <input
              [(ngModel)]="form.title"
              placeholder="Nhập tiêu đề..."
              maxlength="300"
              class="field-input"
            />
          </div>

          <div class="field">
            <label class="field-label">Chuyên mục</label>
            <select [(ngModel)]="form.category" class="field-select">
              @for (cat of categories; track cat.key) {
                <option [value]="cat.key">{{ cat.sectionLabel }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label class="field-label">Tóm tắt</label>
            <textarea
              [(ngModel)]="form.summary"
              placeholder="Mô tả ngắn..."
              maxlength="600"
              rows="3"
              class="field-textarea"
            ></textarea>
          </div>

          <div class="field">
            <label class="field-label">Nội dung</label>
            <textarea
              [(ngModel)]="form.content"
              placeholder="Nội dung đầy đủ..."
              rows="6"
              class="field-textarea"
            ></textarea>
          </div>

          <div class="field">
            <label class="field-label">Ngày đăng</label>
            <input type="date" [(ngModel)]="form.publishedAt" class="field-input" />
          </div>
        </div>

        <footer class="form-foot">
          <button mat-stroked-button type="button" (click)="closeForm()">Huỷ</button>
          <button
            mat-flat-button
            class="btn-save"
            type="button"
            (click)="saveNews()"
            [disabled]="saving || !form.title.trim()"
          >
            @if (saving) {
              <mat-spinner [diameter]="16"></mat-spinner>
            }
            {{ saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Đăng tin' }}
          </button>
        </footer>
      </aside>
    }
  `,
  styles: [
    `
      /* ====================================================
         News Page - portal style (matches NTTU screenshot)
         ==================================================== */

      .news-page {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .btn-add {
        background: #0f2144 !important;
        color: #fff !important;
        white-space: nowrap;
        gap: 0.35rem;
      }

      .category-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1.25rem;
        align-items: start;
      }

      .cat-section {
        background: #fff;
        border: 1px solid #dde2ea;
        border-top: 3px solid #003087;
        border-radius: 0 0 4px 4px;
        overflow: hidden;
      }

      /* --- Section header (title + tab bar) --- */
      .section-header {
        padding: 0.9rem 0.9rem 0;
        border-bottom: 2px solid #e8ecf0;
      }

      .section-title {
        margin: 0 0 0.55rem;
        font-size: 1.15rem;
        font-weight: 800;
        color: #222;
        line-height: 1.3;
      }

      .tab-bar {
        display: flex;
        gap: 0.15rem;
        margin: 0 -0.9rem;
        padding: 0 0.9rem;
      }

      .tab-item {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.42rem 0.6rem;
        font-size: 0.84rem;
        font-weight: 600;
        color: #6b7280;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        cursor: default;
        white-space: nowrap;
      }

      .tab-item.active {
        color: #003087;
        border-bottom-color: #003087;
      }

      .tab-count {
        background: #e63124;
        color: #fff;
        border-radius: 999px;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.1rem 0.42rem;
        min-width: 20px;
        text-align: center;
        line-height: 1.4;
      }

      .featured-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-bottom: 1px solid #e8ecf0;
        padding-top: 0.75rem;
      }

      .news-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        background: #fff;
        position: relative;
        border-right: 1px solid #e8ecf0;
      }

      .news-card:last-child {
        border-right: none;
      }

      .news-card:hover .card-title {
        color: #e63124;
        text-decoration: underline;
      }

      .card-img-wrap {
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: #eceff5;
        border-bottom: 1px solid #e8ecf0;
        flex-shrink: 0;
      }

      .card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.3s ease;
      }

      .news-card:hover .card-img {
        transform: scale(1.04);
      }

      .card-body {
        padding: 0.65rem 0.75rem 0.75rem;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .card-title {
        margin: 0;
        font-size: 0.84rem;
        font-weight: 700;
        color: #1a1a1a;
        line-height: 1.45;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        transition: color 0.12s;
      }

      .card-date {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: #e63124;
      }

      .card-admin {
        position: absolute;
        top: 4px;
        right: 4px;
        display: flex;
        gap: 2px;
        background: rgba(255, 255, 255, 0.93);
        border-radius: 4px;
        padding: 2px 3px;
        opacity: 0;
        transition: opacity 0.15s;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      }

      .news-card:hover .card-admin {
        opacity: 1;
      }

      .news-links {
        list-style: none;
        margin: 0;
        padding: 0 0.9rem;
      }

      .news-links li {
        display: flex;
        align-items: center;
        border-bottom: 1px dashed #dde2ea;
        height: 2.35rem;
        overflow: hidden;
      }

      .news-links li:last-child {
        border-bottom: none;
      }

      .link-placeholder {
        border-bottom: 1px dashed transparent !important;
      }

      .link-btn {
        border: none;
        background: none;
        cursor: pointer;
        display: inline-flex;
        align-items: flex-start;
        gap: 0.35rem;
        text-align: left;
        font: inherit;
        font-size: 0.81rem;
        color: #1e4a99;
        padding: 0.48rem 0;
        flex: 1;
        min-width: 0;
        line-height: 1.45;
        transition: color 0.12s;
      }

      .link-btn:hover {
        color: #e63124;
        text-decoration: underline;
      }

      .link-chevron {
        flex-shrink: 0;
        margin-top: 2px;
        color: #e07b12;
      }

      .link-btn span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .link-admin {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
        margin-left: 0.25rem;
        opacity: 0;
        transition: opacity 0.15s;
      }

      .news-links li:hover .link-admin {
        opacity: 1;
      }

      .section-footer {
        display: flex;
        justify-content: flex-end;
        padding: 0.42rem 0.9rem;
        border-top: 1px solid #e8ecf0;
        background: #fafbfd;
      }

      .see-more {
        border: none;
        background: none;
        cursor: pointer;
        font: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        color: #0055a5;
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0;
        transition: color 0.12s;
      }

      .see-more:hover {
        color: #e63124;
        text-decoration: underline;
      }

      .btn-icon-sm {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0.22rem;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        color: #64748b;
        transition:
          background 0.12s,
          color 0.12s;
      }

      .btn-icon-sm:hover {
        background: #e2e8f0;
        color: #0f2144;
      }
      .btn-del:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      .state-center {
        min-height: 240px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.75rem;
        color: #94a3b8;
      }

      .state-center p {
        margin: 0;
        font-size: 0.9rem;
      }

      .overlay-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(10, 20, 48, 0.4);
        backdrop-filter: blur(2px);
        z-index: 200;
      }

      .form-panel,
      .detail-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: min(500px, 100vw);
        height: 100vh;
        background: #fff;
        z-index: 201;
        display: flex;
        flex-direction: column;
        box-shadow: -4px 0 28px rgba(10, 20, 48, 0.16);
      }

      .form-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.9rem 1.2rem;
        border-bottom: 1px solid #e8ecf0;
      }

      .form-head h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #003087;
      }

      .form-body,
      .detail-body {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .img-upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border: 2px dashed #c8d0da;
        border-radius: 8px;
        padding: 1.5rem 1rem;
        cursor: pointer;
        color: #8899a6;
        font-size: 0.82rem;
        position: relative;
        min-height: 110px;
        transition:
          border-color 0.15s,
          background 0.15s;
        text-align: center;
      }

      .img-upload-zone:hover {
        border-color: #003087;
        background: #f5f8ff;
        color: #003087;
      }
      .img-upload-zone.has-img {
        padding: 0;
        border-style: solid;
        overflow: hidden;
      }
      .img-upload-preview {
        width: 100%;
        max-height: 220px;
        object-fit: cover;
        display: block;
      }

      .img-remove {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        border: none;
        border-radius: 999px;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .img-hint {
        font-size: 0.7rem;
        opacity: 0.65;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .field-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #374151;
      }
      .req {
        color: #e63124;
      }

      .field-input,
      .field-select,
      .field-textarea {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 0.48rem 0.65rem;
        font: inherit;
        font-size: 0.875rem;
        outline: none;
        color: #111;
        transition:
          border-color 0.15s,
          box-shadow 0.15s;
      }

      .field-input:focus,
      .field-select:focus,
      .field-textarea:focus {
        border-color: #003087;
        box-shadow: 0 0 0 3px rgba(0, 48, 135, 0.08);
      }

      .field-textarea {
        resize: vertical;
        min-height: 76px;
        line-height: 1.6;
      }

      .form-foot {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
        padding: 0.8rem 1.2rem;
        border-top: 1px solid #e8ecf0;
      }

      .btn-save {
        background: #003087 !important;
        color: #fff !important;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .detail-img {
        width: 100%;
        max-height: 250px;
        object-fit: cover;
        border-radius: 6px;
        display: block;
        margin-bottom: 0.75rem;
      }

      .detail-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.78rem;
        color: #64748b;
        margin: 0 0 0.6rem;
        flex-wrap: wrap;
      }

      .cat-label {
        background: #eef2ff;
        color: #003087;
        border-radius: 999px;
        padding: 0.15rem 0.55rem;
        font-weight: 700;
        font-size: 0.72rem;
        border: 1px solid #c7d2fe;
      }

      .detail-summary {
        margin: 0 0 0.6rem;
        font-weight: 700;
        color: #003087;
        font-size: 0.93rem;
        line-height: 1.5;
      }

      .detail-content {
        font-size: 0.875rem;
        line-height: 1.75;
        color: #374151;
        white-space: pre-wrap;
      }

      @media (max-width: 1100px) {
        .category-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        .featured-grid {
          grid-template-columns: 1fr;
        }
        .news-card {
          border-right: none;
          border-bottom: 1px solid #e8ecf0;
        }
      }
    `,
  ],
})
export class NewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly categories = CATEGORIES;
  readonly visibleCategories = CATEGORIES;

  allNews: NewsItem[] = [];
  loading = true;
  isAdmin = false;

  showForm = false;
  saving = false;
  editingId: string | null = null;
  form: NewsFormData = this.emptyForm();

  ngOnInit(): void {
    this.isAdmin = this.auth.getCurrentRole() === 'admin';
    this.loadNews();
  }

  loadNews(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<NewsItem[]>>('/news', { limit: 200 })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.allNews = res.data ?? [];
        },
        error: () => {
          this.allNews = [];
        },
      });
  }

  byCategory(cat: NewsCategory): NewsItem[] {
    return this.allNews
      .filter((n) => n.category === cat)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  /** Returns an array of length = how many placeholder rows needed to fill 3 link slots */
  placeholders(itemCount: number): number[] {
    const linkCount = Math.min(Math.max(itemCount - 2, 0), 3);
    const needed = 3 - linkCount;
    return needed > 0 ? Array.from({ length: needed }) : [];
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(item: NewsItem): void {
    this.editingId = item._id;
    const d = new Date(item.publishedAt);
    const iso = isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    this.form = {
      title: item.title,
      summary: item.summary || '',
      content: '',
      category: item.category,
      publishedAt: iso,
      imageFile: null,
      imagePreview: this.resolveImg(item.imageUrl),
    };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.form.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.form.imagePreview = String(e.target?.result ?? '');
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  clearImage(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.form.imageFile = null;
    this.form.imagePreview = '';
  }

  saveNews(): void {
    if (!this.form.title.trim() || this.saving) return;
    this.saving = true;
    const fd = new FormData();
    fd.append('title', this.form.title.trim());
    fd.append('summary', this.form.summary.trim());
    fd.append('content', this.form.content);
    fd.append('category', this.form.category);
    if (this.form.publishedAt) fd.append('publishedAt', this.form.publishedAt);
    if (this.form.imageFile) fd.append('image', this.form.imageFile);

    const req$ = this.editingId
      ? this.api.putFormData<ApiResponse<NewsItem>>(`/news/${this.editingId}`, fd)
      : this.api.postFormData<ApiResponse<NewsItem>>('/news', fd);

    req$
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(this.editingId ? 'Đã cập nhật tin tức' : 'Đã đăng tin tức', 'OK', {
            duration: 2500,
          });
          this.closeForm();
          this.loadNews();
        },
        error: () => {
          this.snackBar.open('Lỗi khi lưu tin tức', 'OK', { duration: 2500 });
        },
      });
  }

  deleteNews(item: NewsItem): void {
    if (!confirm(`Xoá tin tức: "${item.title}"?`)) return;
    this.api.delete<ApiResponse<unknown>>(`/news/${item._id}`).subscribe({
      next: () => {
        this.snackBar.open('Đã xoá tin tức', 'OK', { duration: 2000 });
        this.loadNews();
      },
      error: () => {
        this.snackBar.open('Lỗi khi xoá', 'OK', { duration: 2000 });
      },
    });
  }

  openDetail(item: NewsItem): void {
    const slug = SLUG_BY_KEY[item.category] ?? item.category;
    this.router.navigate(['/news', slug, item._id]);
  }

  resolveImg(url: string | undefined): string {
    if (!url) return DEFAULT_IMAGE;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `http://localhost:3000${url}`;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = DEFAULT_IMAGE;
  }

  formatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  catLabel(key: NewsCategory): string {
    return CATEGORIES.find((c) => c.key === key)?.label ?? key;
  }

  private emptyForm(): NewsFormData {
    return {
      title: '',
      summary: '',
      content: '',
      category: 'dao-tao',
      publishedAt: new Date().toISOString().slice(0, 10),
      imageFile: null,
      imagePreview: '',
    };
  }
}
