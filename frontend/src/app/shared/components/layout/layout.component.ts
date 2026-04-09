import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { LucideAngularModule } from 'lucide-angular';
import { filter, map } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Prediction, User, UserRole } from '../../models/interfaces';

interface LayoutNavItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles?: UserRole[];
  showAlertBadge?: boolean;
  showMessageBadge?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatSidenavModule,
    LucideAngularModule,
  ],
  template: `
    <section class="shell">
      <header class="topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="menu-toggle"
            (click)="toggleSidebar()"
            [attr.aria-label]="sidebarOpened ? 'Đóng menu' : 'Mở menu'"
          >
            <lucide-icon name="menu" [size]="18"></lucide-icon>
          </button>

          <a routerLink="/dashboard" class="school-brand">
            <img class="school-shield" src="assets/images/logo-nttu.png" alt="Logo NTTU" />
            <img class="school-wordmark" src="assets/images/LogoNTTU.svg" alt="Logo NTTU" />
          </a>

          <label class="search-wrap" aria-label="Tìm kiếm">
            <lucide-icon name="search" [size]="15"></lucide-icon>
            <input type="text" placeholder="Tìm kiếm..." />
          </label>
        </div>

        <div class="topbar-right">
          <nav class="top-links">
            <a routerLink="/" class="top-link">Trang chủ</a>
            <a routerLink="/news" class="top-link">Tin tức</a>
          </nav>

          <a routerLink="/chat" class="chat-bell" aria-label="Tin nhan">
            <lucide-icon name="message-circle" [size]="16"></lucide-icon>
            @if (unreadMessageCount > 0) {
              <span class="chat-badge">{{ unreadMessageCount }}</span>
            }
          </a>

          <details class="user-menu">
            <summary class="user-trigger">
              <span class="avatar">{{ userInitials }}</span>
              <span class="user-meta">
                <span class="name">{{ currentUserName }}</span>
                <span class="role">{{ currentUserRoleLabel }}</span>
              </span>
              <lucide-icon name="chevron-down" [size]="14"></lucide-icon>
            </summary>

            <div class="dropdown-menu">
              <button type="button" class="dropdown-item" (click)="openProfile()">
                <lucide-icon name="user" [size]="15"></lucide-icon>
                Thông tin giảng viên
              </button>

              <button type="button" class="dropdown-item" (click)="logout()">
                <lucide-icon name="log-out" [size]="15"></lucide-icon>
                Đăng xuất
              </button>
            </div>
          </details>
        </div>
      </header>

      <div class="shell-body">
        <aside class="sidebar" [class.mobile-open]="sidebarOpened">
          <nav class="menu-list">
            <p class="section-label">TỔNG QUAN</p>
            @for (item of visibleNavItems; track item.path) {
              @if (item.path === '/dashboard' || item.path === '/news' || item.path === '/chat') {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  class="menu-link"
                  (click)="onMenuClick()"
                >
                  <span class="menu-left">
                    <lucide-icon [name]="item.icon" [size]="16"></lucide-icon>
                    <span>{{ item.label }}</span>
                  </span>
                </a>
              }
            }

            <p class="section-label">QUẢN LÝ</p>
            @for (item of visibleNavItems; track item.path) {
              @if (
                item.path === '/classes' ||
                item.path === '/students' ||
                item.path === '/grades' ||
                item.path === '/predictions' ||
                item.path === '/advisor/students'
              ) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  class="menu-link"
                  (click)="onMenuClick()"
                >
                  <span class="menu-left">
                    <lucide-icon [name]="item.icon" [size]="16"></lucide-icon>
                    <span>{{ item.label }}</span>
                  </span>

                  @if (item.showAlertBadge && highRiskCount > 0) {
                    <span class="alert-badge">{{ highRiskCount }}</span>
                  }

                  @if (item.showMessageBadge && unreadMessageCount > 0) {
                    <span class="alert-badge">{{ unreadMessageCount }}</span>
                  }
                </a>
              }
            }

            @if (currentUserRoleLabel === 'Quản trị viên') {
              <p class="section-label">QUẢN TRỊ</p>
              @for (item of visibleNavItems; track item.path) {
                @if (
                  item.path === '/departments' ||
                  item.path === '/users' ||
                  item.path === '/subjects' ||
                  item.path === '/majors' ||
                  item.path === '/curricula'
                ) {
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    class="menu-link"
                    (click)="onMenuClick()"
                  >
                    <span class="menu-left">
                      <lucide-icon [name]="item.icon" [size]="16"></lucide-icon>
                      <span>{{ item.label }}</span>
                    </span>
                  </a>
                }
              }
            }
          </nav>
        </aside>

        @if (sidebarOpened) {
          <button
            type="button"
            class="sidebar-backdrop"
            (click)="onMenuClick()"
            aria-label="Đóng menu"
          ></button>
        }

        <main class="main-content">
          <div class="main-content__inner page-container">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </section>
  `,
  styles: [
    `
      .shell {
        height: 100vh;
        display: grid;
        grid-template-rows: 56px 1fr;
        overflow: hidden;
        background: var(--gray-100);
      }

      .topbar {
        height: 56px;
        background: var(--white);
        border-bottom: 1px solid var(--gray-200);
        position: relative;
        z-index: 60;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding-inline: 1rem;
      }

      .topbar-left {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 0;
      }

      .menu-toggle {
        width: 34px;
        height: 34px;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        background: #fff;
        color: var(--navy);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .school-brand {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        text-decoration: none;
        flex-shrink: 0;
      }

      .school-shield {
        height: 38px;
        width: auto;
      }

      .school-wordmark {
        height: 38px;
        width: auto;
      }

      .search-wrap {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border: 1px solid var(--gray-200);
        border-radius: 999px;
        padding: 0.4rem 1rem;
        width: 320px;
        margin-left: 0.15rem;
        color: var(--gray-400);
        flex-shrink: 0;
      }

      .search-wrap input {
        width: 100%;
        border: none;
        outline: none;
        font-size: 0.875rem;
        color: var(--text);
        background: transparent;
      }

      .topbar-right {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 0.95rem;
      }

      .chat-bell {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--gray-200);
        color: var(--navy);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .chat-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 1rem;
        height: 1rem;
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        font-size: 0.62rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding-inline: 0.2rem;
      }

      .top-links {
        display: inline-flex;
        gap: 0.75rem;
      }

      .top-link {
        color: var(--gray-600);
        text-decoration: none;
        font-size: 0.84rem;
        font-weight: 500;
      }

      .top-link:hover {
        color: var(--navy);
      }

      .user-menu {
        position: relative;
      }

      .user-trigger {
        list-style: none;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        cursor: pointer;
      }

      .user-trigger::-webkit-details-marker {
        display: none;
      }

      .user-meta {
        display: grid;
        line-height: 1.2;
      }

      .name {
        margin: 0;
        color: var(--text);
        font-size: 0.84rem;
        font-weight: 700;
      }

      .role {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.77rem;
      }

      .avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.74rem;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, var(--navy), var(--blue));
      }

      .dropdown-menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        z-index: 80;
        min-width: 140px;
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        box-shadow: 0 10px 24px rgba(15, 33, 68, 0.14);
        padding: 0.35rem;
        display: none;
      }

      .user-menu[open] .dropdown-menu {
        display: block;
      }

      .dropdown-item {
        width: 100%;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: var(--radius-sm);
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.55rem;
        color: var(--gray-600);
        font-size: 0.84rem;
        font-weight: 600;
      }

      .dropdown-item:hover {
        background: var(--blue-pale);
        color: var(--navy);
      }

      .shell-body {
        min-height: 0;
        display: grid;
        grid-template-columns: 1fr;
        position: relative;
      }

      .sidebar {
        position: fixed;
        top: 56px;
        left: 0;
        bottom: 0;
        width: 236px;
        z-index: 50;
        transform: translateX(-100%);
        transition: transform 0.22s ease;
        background: #fff;
        border-right: 1px solid var(--gray-200);
        box-shadow: 0 14px 32px rgba(15, 33, 68, 0.16);
        padding: 0.75rem 0.5rem;
        overflow-y: auto;
      }

      .sidebar.mobile-open {
        transform: translateX(0);
      }

      .menu-list {
        display: grid;
        gap: 0.2rem;
      }

      .section-label {
        margin: 0.5rem 0 0.2rem;
        padding: 0.75rem 0.75rem 0.3rem;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-muted);
      }

      .menu-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        color: var(--gray-600);
        text-decoration: none;
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius-sm);
        transition: var(--transition);
        font-size: 0.84rem;
        font-weight: 500;
        border-left: 3px solid transparent;
      }

      .menu-left {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .menu-left lucide-icon {
        color: var(--gray-400);
      }

      .menu-link:hover {
        background: var(--blue-pale);
        color: var(--navy);
      }

      .menu-link:hover .menu-left lucide-icon {
        color: var(--blue);
      }

      .menu-link.active {
        background: var(--blue-pale);
        color: var(--navy);
        font-weight: 700;
        border-left-color: var(--blue);
      }

      .menu-link.active .menu-left lucide-icon {
        color: var(--blue);
      }

      .alert-badge {
        min-width: 1.15rem;
        height: 1.15rem;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.68rem;
        font-weight: 700;
        padding-inline: 0.25rem;
        background: var(--red);
        color: #fff;
      }

      .main-content {
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-gutter: auto;
        background: var(--gray-100);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: clamp(0.65rem, 1vw, 0.95rem);
      }

      .main-content__inner {
        width: 100%;
        max-width: none;
        min-width: 0;
        min-height: 100%;
        margin-inline: 0;
        padding: 0;
      }

      .main-content__inner.page-container {
        max-width: none;
        padding-inline: 0;
      }

      .main-content__inner > .container {
        max-width: 100%;
        padding-inline: 0;
      }

      .sidebar-backdrop {
        display: block;
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        bottom: 0;
        border: none;
        background: rgba(15, 33, 68, 0.3);
        z-index: 45;
      }

      @media (max-width: 1024px) {
        .sidebar {
          width: 210px;
        }

        .search-wrap {
          display: none;
        }

        .top-links {
          display: none;
        }

        .user-meta {
          display: none;
        }
      }

      @media (max-width: 640px) {
        .school-wordmark {
          display: none;
        }

        .topbar {
          padding-inline: 0.7rem;
        }

        .main-content__inner {
          padding: 0;
        }

        .main-content {
          padding: 0.55rem;
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: LayoutNavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'trending-up',
      allowedRoles: ['admin', 'teacher', 'advisor'],
    },
    {
      label: 'Tin tức',
      path: '/news',
      icon: 'newspaper',
      allowedRoles: ['admin', 'teacher', 'advisor'],
    },
    {
      label: 'Tin nhắn',
      path: '/chat',
      icon: 'message-circle',
      allowedRoles: ['admin', 'teacher', 'advisor'],
      showMessageBadge: true,
    },
    { label: 'Lớp học', path: '/classes', icon: 'school', allowedRoles: ['admin', 'teacher'] },
    { label: 'Học sinh', path: '/students', icon: 'users', allowedRoles: ['admin', 'teacher'] },
    {
      label: 'Nhập điểm',
      path: '/grades',
      icon: 'book-open-check',
      allowedRoles: ['admin', 'teacher'],
    },
    {
      label: 'Sinh viên của tôi',
      path: '/advisor/students',
      icon: 'graduation-cap',
      allowedRoles: ['admin', 'advisor'],
    },
    {
      label: 'Dự đoán AI',
      path: '/predictions',
      icon: 'chart-column-increasing',
      allowedRoles: ['admin', 'teacher'],
      showAlertBadge: true,
    },
    { label: 'Khoa', path: '/departments', icon: 'building-2', allowedRoles: ['admin'] },
    { label: 'Giáo viên', path: '/users', icon: 'user-check', allowedRoles: ['admin'] },
    { label: 'Môn học', path: '/subjects', icon: 'layers', allowedRoles: ['admin'] },
    { label: 'Ngành', path: '/majors', icon: 'graduation-cap', allowedRoles: ['admin'] },
    { label: 'CTĐT', path: '/curricula', icon: 'workflow', allowedRoles: ['admin'] },
  ];

  sidebarOpened = false;

  currentUserName = 'Người dùng';
  currentUserRoleLabel = 'Giáo viên';
  highRiskCount = 0;
  unreadMessageCount = 0;

  get visibleNavItems(): LayoutNavItem[] {
    const role = this.authService.getCurrentRole();
    if (!role) {
      return [];
    }

    return this.navItems.filter((item) => !item.allowedRoles || item.allowedRoles.includes(role));
  }

  get userInitials(): string {
    const segments = this.currentUserName
      .split(' ')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (!segments.length) {
      return 'NT';
    }

    const short = segments
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? '')
      .join('');
    return short || 'NT';
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadHighRiskCount();
    this.loadUnreadMessageCount();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.onMenuClick();
        this.loadHighRiskCount();
        this.loadUnreadMessageCount();
      });
  }

  toggleSidebar(): void {
    this.sidebarOpened = !this.sidebarOpened;
  }

  onMenuClick(): void {
    this.sidebarOpened = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openProfile(): void {
    this.router.navigate(['/profile']);
  }

  private loadCurrentUser(): void {
    this.authService
      .getCurrentUser()
      .pipe(
        map((response) => response.data),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.applyCurrentUser(user);
        },
        error: () => {
          const role = this.authService.getCurrentRole();
          if (role === 'admin') {
            this.currentUserRoleLabel = 'Quản trị viên';
          } else if (role === 'advisor') {
            this.currentUserRoleLabel = 'Cố vấn học tập';
          } else {
            this.currentUserRoleLabel = 'Giáo viên';
          }
        },
      });
  }

  private applyCurrentUser(user: User): void {
    this.currentUserName = user.name?.trim() || 'Người dùng';
    if (user.role === 'admin') {
      this.currentUserRoleLabel = 'Quản trị viên';
      return;
    }

    if (user.role === 'advisor') {
      this.currentUserRoleLabel = 'Cố vấn học tập';
      return;
    }

    this.currentUserRoleLabel = 'Giáo viên';
  }

  private loadHighRiskCount(): void {
    this.apiService
      .get<ApiResponse<Prediction[]>>('/predictions/alerts')
      .pipe(
        map((response) => response.data ?? []),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (alerts) => {
          this.highRiskCount = alerts.length;
        },
        error: () => {
          this.highRiskCount = 0;
        },
      });
  }

  private loadUnreadMessageCount(): void {
    this.apiService
      .get<ApiResponse<{ unreadCount: number }>>('/messages/unread-count')
      .pipe(
        map((response) => Number(response.data?.unreadCount || 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (count) => {
          this.unreadMessageCount = count;
        },
        error: () => {
          this.unreadMessageCount = 0;
        },
      });
  }
}
