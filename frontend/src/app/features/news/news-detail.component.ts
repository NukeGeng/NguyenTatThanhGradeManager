import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { ApiResponse } from '../../shared/models/interfaces';

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

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  'dao-tao': 'Đào tạo',
  'hoc-vu': 'Học vụ',
  'hoc-phi': 'Học phí',
  'tan-sinh-vien': 'Tân sinh viên',
  'su-kien': 'Sự kiện',
  khac: 'Khác',
};

const CATEGORY_SECTION: Record<NewsCategory, string> = {
  'dao-tao': 'Thông tin Đào tạo',
  'hoc-vu': 'Thông tin Học vụ',
  'hoc-phi': 'Thông tin Học phí',
  'tan-sinh-vien': 'Thông tin tân Sinh viên',
  'su-kien': 'Sự kiện & Hoạt động',
  khac: 'Tin tức khác',
};

const CATEGORY_SLUG: Record<NewsCategory, string> = {
  'dao-tao': 'thong-tin-dao-tao',
  'tan-sinh-vien': 'thong-tin-tan-sinh-vien',
  'hoc-vu': 'thong-tin-hoc-vu',
  'hoc-phi': 'thong-tin-hoc-phi',
  'su-kien': 'su-kien-va-hoat-dong',
  khac: 'tin-tuc-khac',
};

const DEFAULT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="%23e2e8f0"/><rect x="160" y="60" width="80" height="60" rx="6" fill="%23cbd5e1"/><rect x="140" y="130" width="120" height="10" rx="3" fill="%23cbd5e1"/><rect x="160" y="150" width="80" height="8" rx="3" fill="%23e2e8f0"/></svg>';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatProgressSpinnerModule, LucideAngularModule],
  template: `
    <section class="container page-wrap detail-page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a routerLink="/dashboard" class="bc-link">Dashboard</a>
        <span class="bc-sep">/</span>
        <a routerLink="/news" class="bc-link">{{ catSection }}</a>
        @if (item) {
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ item.title }}</span>
        }
      </nav>

      @if (loading) {
        <div class="state-center"><mat-spinner [diameter]="36"></mat-spinner></div>
      } @else if (item) {
        <div class="detail-layout">
          <!-- Main content -->
          <article class="detail-main">
            <h1 class="detail-title">{{ item.title }}</h1>

            @if (item.summary) {
              <p class="detail-summary">{{ item.summary }}</p>
            }

            @if (item.imageUrl) {
              <img
                [src]="resolveImg(item.imageUrl)"
                [alt]="item.title"
                class="detail-img"
                (error)="onImgError($event)"
              />
            }

            <div class="detail-body">
              @if (item.content) {
                <div class="detail-content" [innerHTML]="item.content"></div>
              } @else {
                <p class="no-content">Chưa có nội dung chi tiết.</p>
              }
            </div>
          </article>

          <!-- Sidebar: related news -->
          <aside class="detail-sidebar">
            <h3 class="sidebar-title">Tin Liên Quan</h3>
            @if (related.length === 0) {
              <p class="no-related">Không có tin liên quan.</p>
            }
            @for (r of related; track r._id) {
              <a class="related-item" [routerLink]="['/news', categorySlug(r.category), r._id]">
                <div class="related-thumb">
                  <img
                    [src]="resolveImg(r.imageUrl)"
                    [alt]="r.title"
                    (error)="onImgError($event)"
                  />
                </div>
                <span class="related-title">{{ r.title }}</span>
              </a>
            }
          </aside>
        </div>
      } @else {
        <div class="state-center">
          <lucide-icon name="file-x" [size]="36"></lucide-icon>
          <p>Không tìm thấy tin tức.</p>
          <a routerLink="/news" class="back-link">← Quay lại danh sách</a>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .detail-page {
        padding-top: 0.75rem;
      }

      /* Breadcrumb */
      .breadcrumb {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: #6b7280;
        margin-bottom: 1rem;
      }
      .bc-link {
        color: #1e4a99;
        text-decoration: none;
      }
      .bc-link:hover {
        text-decoration: underline;
      }
      .bc-sep {
        color: #d1d5db;
      }
      .bc-current {
        color: #6b7280;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 400px;
      }

      /* Layout */
      .detail-layout {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 1.5rem;
        align-items: start;
      }

      /* Main */
      .detail-main {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 1.5rem 1.75rem 2rem;
      }

      .detail-title {
        margin: 0 0 0.75rem;
        font-size: 1.35rem;
        font-weight: 800;
        color: #111827;
        line-height: 1.4;
      }

      .detail-summary {
        margin: 0 0 1rem;
        font-size: 0.9rem;
        color: #4b5563;
        line-height: 1.6;
        border-left: 3px solid #003087;
        padding-left: 0.75rem;
        font-style: italic;
      }

      .detail-img {
        width: 100%;
        max-height: 380px;
        object-fit: cover;
        border-radius: 6px;
        display: block;
        margin-bottom: 1.25rem;
      }

      .detail-body {
        font-size: 0.9rem;
        line-height: 1.8;
        color: #374151;
      }

      .detail-content {
        white-space: pre-wrap;
      }

      .no-content {
        color: #9ca3af;
        font-style: italic;
      }

      /* Sidebar */
      .detail-sidebar {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-top: 3px solid #003087;
        border-radius: 0 0 6px 6px;
        overflow: hidden;
      }

      .sidebar-title {
        margin: 0;
        padding: 0.7rem 0.9rem;
        font-size: 0.95rem;
        font-weight: 800;
        color: #003087;
        border-bottom: 1px solid #e8ecf0;
      }

      .related-item {
        display: flex;
        gap: 0.65rem;
        padding: 0.6rem 0.9rem;
        border-bottom: 1px solid #f0f2f5;
        text-decoration: none;
        align-items: flex-start;
        transition: background 0.12s;
      }

      .related-item:last-child {
        border-bottom: none;
      }
      .related-item:hover {
        background: #f5f8ff;
      }

      .related-thumb {
        flex-shrink: 0;
        width: 60px;
        height: 44px;
        border-radius: 4px;
        overflow: hidden;
        background: #eceff5;
      }

      .related-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .related-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #1e4a99;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .no-related {
        padding: 0.75rem 0.9rem;
        font-size: 0.8rem;
        color: #9ca3af;
      }

      .state-center {
        min-height: 260px;
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

      .back-link {
        color: #1e4a99;
        font-size: 0.85rem;
        text-decoration: none;
      }
      .back-link:hover {
        text-decoration: underline;
      }

      @media (max-width: 860px) {
        .detail-layout {
          grid-template-columns: 1fr;
        }
        .detail-sidebar {
          order: -1;
        }
      }
    `,
  ],
})
export class NewsDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  item: NewsItem | null = null;
  related: NewsItem[] = [];
  loading = true;

  get catSection(): string {
    return this.item ? (CATEGORY_SECTION[this.item.category] ?? 'Tin tức') : 'Tin tức';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/news']);
        return;
      }
      this.loadDetail(id);
    });
  }

  loadDetail(id: string): void {
    this.loading = true;
    this.item = null;
    this.api
      .get<ApiResponse<NewsItem>>(`/news/${id}`)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.item = res.data ?? null;
          if (this.item) this.loadRelated(this.item.category, id);
        },
        error: () => {
          this.item = null;
        },
      });
  }

  loadRelated(category: NewsCategory, excludeId: string): void {
    this.api.get<ApiResponse<NewsItem[]>>('/news', { category, limit: 6 }).subscribe({
      next: (res) => {
        this.related = (res.data ?? []).filter((n) => n._id !== excludeId).slice(0, 5);
      },
      error: () => {
        this.related = [];
      },
    });
  }

  resolveImg(url: string | undefined): string {
    if (!url) return DEFAULT_IMAGE;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `http://localhost:3000${url}`;
  }

  categorySlug(cat: NewsCategory): string {
    return CATEGORY_SLUG[cat] ?? cat;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = DEFAULT_IMAGE;
  }
}
