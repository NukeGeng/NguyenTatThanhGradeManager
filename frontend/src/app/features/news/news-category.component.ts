import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
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

interface CategoryMeta {
  key: NewsCategory;
  label: string;
  sectionLabel: string;
  slug: string;
}

const CATEGORIES: CategoryMeta[] = [
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

const DEFAULT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="%23e2e8f0"/><rect x="160" y="60" width="80" height="60" rx="6" fill="%23cbd5e1"/><rect x="140" y="130" width="120" height="10" rx="3" fill="%23cbd5e1"/><rect x="160" y="150" width="80" height="8" rx="3" fill="%23e2e8f0"/></svg>';

@Component({
  selector: 'app-news-category',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatProgressSpinnerModule,
    LucideAngularModule,
  ],
  template: `
    <section class="container page-wrap cat-page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/dashboard" class="bc-link">Dashboard</a>
        <span class="bc-sep">/</span>
        <a routerLink="/news" class="bc-link">Tin tức</a>
        @if (meta) {
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ meta.sectionLabel }}</span>
        }
      </nav>

      <!-- Header -->
      <header class="cat-header">
        <div class="cat-header-left">
          <h1 class="cat-heading">{{ meta?.sectionLabel ?? 'Tin tức' }}</h1>
          @if (!loading) {
            <span class="cat-total">{{ items.length }} tin tức</span>
          }
        </div>
        <a routerLink="/news" class="back-btn">
          <lucide-icon name="arrow-left" [size]="15"></lucide-icon>
          Quay lại
        </a>
      </header>

      @if (loading) {
        <div class="state-center"><mat-spinner [diameter]="36"></mat-spinner></div>
      } @else if (items.length === 0) {
        <div class="state-center">
          <lucide-icon name="newspaper" [size]="36"></lucide-icon>
          <p>Chưa có tin tức nào trong chuyên mục này.</p>
        </div>
      } @else {
        <!-- Top 2 featured -->
        <div class="featured-row">
          @for (item of items.slice(0, 2); track item._id) {
            <article class="feat-card" [routerLink]="['/news', meta!.slug, item._id]">
              <div class="feat-img-wrap">
                <img
                  [src]="resolveImg(item.imageUrl)"
                  [alt]="item.title"
                  class="feat-img"
                  (error)="onImgError($event)"
                />
              </div>
              <div class="feat-body">
                <h2 class="feat-title">{{ item.title }}</h2>
                @if (item.summary) {
                  <p class="feat-summary">{{ item.summary }}</p>
                }
                <p class="feat-date">{{ formatDate(item.publishedAt) }}</p>
              </div>
            </article>
          }
        </div>

        <!-- Rest as list -->
        @if (items.length > 2) {
          <ul class="news-list">
            @for (item of items.slice(2); track item._id) {
              <li class="news-list-item">
                <a class="list-link" [routerLink]="['/news', meta!.slug, item._id]">
                  <div class="list-thumb">
                    <img
                      [src]="resolveImg(item.imageUrl)"
                      [alt]="item.title"
                      (error)="onImgError($event)"
                    />
                  </div>
                  <div class="list-info">
                    <h3 class="list-title">{{ item.title }}</h3>
                    @if (item.summary) {
                      <p class="list-summary">{{ item.summary }}</p>
                    }
                    <p class="list-date">{{ formatDate(item.publishedAt) }}</p>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
  styles: [
    `
      .cat-page {
        padding-top: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: #6b7280;
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
      }

      .cat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 0.75rem;
        border-bottom: 3px solid #003087;
      }
      .cat-header-left {
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
      }
      .cat-heading {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #003087;
      }
      .cat-total {
        background: #e63124;
        color: #fff;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
      }
      .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.82rem;
        font-weight: 600;
        color: #1e4a99;
        text-decoration: none;
        padding: 0.35rem 0.7rem;
        border: 1px solid #c7d2fe;
        border-radius: 5px;
        transition: background 0.12s;
      }
      .back-btn:hover {
        background: #eef2ff;
      }

      /* Featured top 2 */
      .featured-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .feat-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        transition: box-shadow 0.15s;
        text-decoration: none;
      }
      .feat-card:hover {
        box-shadow: 0 4px 16px rgba(0, 48, 135, 0.1);
      }
      .feat-card:hover .feat-title {
        color: #e63124;
        text-decoration: underline;
      }

      .feat-img-wrap {
        width: 100%;
        aspect-ratio: 16/9;
        overflow: hidden;
        background: #eceff5;
        flex-shrink: 0;
      }
      .feat-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.3s;
      }
      .feat-card:hover .feat-img {
        transform: scale(1.04);
      }

      .feat-body {
        padding: 0.9rem 1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        flex: 1;
      }
      .feat-title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #111;
        line-height: 1.45;
        transition: color 0.12s;
      }
      .feat-summary {
        margin: 0;
        font-size: 0.82rem;
        color: #6b7280;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .feat-date {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: #e63124;
        margin-top: auto;
        padding-top: 0.4rem;
      }

      /* List */
      .news-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
      }

      .news-list-item {
        border-bottom: 1px solid #e8ecf0;
      }
      .news-list-item:last-child {
        border-bottom: none;
      }

      .list-link {
        display: flex;
        gap: 0.9rem;
        padding: 0.75rem 0;
        text-decoration: none;
        align-items: flex-start;
        transition: background 0.1s;
      }
      .list-link:hover .list-title {
        color: #e63124;
        text-decoration: underline;
      }

      .list-thumb {
        flex-shrink: 0;
        width: 100px;
        height: 68px;
        border-radius: 4px;
        overflow: hidden;
        background: #eceff5;
      }
      .list-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .list-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        min-width: 0;
      }
      .list-title {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 700;
        color: #1a1a1a;
        line-height: 1.45;
        transition: color 0.12s;
      }
      .list-summary {
        margin: 0;
        font-size: 0.8rem;
        color: #6b7280;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .list-date {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: #e63124;
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

      @media (max-width: 640px) {
        .featured-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class NewsCategoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  items: NewsItem[] = [];
  loading = true;
  meta: CategoryMeta | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      this.meta = CATEGORIES.find((c) => c.slug === slug) ?? null;
      if (!this.meta) {
        this.router.navigate(['/news']);
        return;
      }
      this.loadItems(this.meta.key);
    });
  }

  loadItems(category: NewsCategory): void {
    this.loading = true;
    this.items = [];
    this.api
      .get<ApiResponse<NewsItem[]>>('/news', { category, limit: 200 })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.items = (res.data ?? []).sort(
            (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
          );
        },
        error: () => {
          this.items = [];
        },
      });
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
}
