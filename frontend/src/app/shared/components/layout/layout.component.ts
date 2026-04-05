import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { LucideAngularModule } from 'lucide-angular';
import { filter, map } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Prediction, User } from '../../models/interfaces';

interface LayoutNavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
  showAlertBadge?: boolean;
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
    <mat-sidenav-container class="shell">
      <mat-sidenav
        class="sidebar"
        [mode]="isMobile ? 'over' : 'side'"
        [opened]="isMobile ? mobileSidebarOpened : true"
        (closedStart)="mobileSidebarOpened = false"
      >
        <div class="brand">
          <div class="brand-logo">
            <lucide-icon name="graduation-cap" [size]="18"></lucide-icon>
          </div>
          <div>
            <strong>NTTU Manager</strong>
            <p>Hệ thống học tập</p>
          </div>
        </div>

        <nav class="menu-list">
          <a
            *ngFor="let item of visibleNavItems"
            [routerLink]="item.path"
            routerLinkActive="active"
            class="menu-link"
            (click)="onMenuClick()"
          >
            <span class="menu-left">
              <lucide-icon [name]="item.icon" [size]="17"></lucide-icon>
              <span>{{ item.label }}</span>
            </span>

            @if (item.showAlertBadge && highRiskCount > 0) {
              <span class="alert-badge">{{ highRiskCount }}</span>
            }
          </a>
        </nav>
      </mat-sidenav>

      <mat-sidenav-content class="content-wrap">
        <header class="topbar">
          <button
            mat-icon-button
            type="button"
            class="menu-toggle"
            (click)="toggleSidebar()"
            aria-label="Mở menu"
          >
            <lucide-icon name="menu" [size]="18"></lucide-icon>
          </button>

          <div class="topbar-right">
            <div class="user-box">
              <div class="avatar">{{ userInitials }}</div>
              <div>
                <p class="name">{{ currentUserName }}</p>
                <p class="role">{{ currentUserRoleLabel }}</p>
              </div>
            </div>

            <button mat-flat-button class="logout-btn" type="button" (click)="logout()">
              <lucide-icon name="log-out" [size]="16"></lucide-icon>
              Đăng xuất
            </button>
          </div>
        </header>

        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        background: var(--gray-50);
      }

      .sidebar {
        width: 270px;
        border-right: 1px solid rgba(15, 33, 68, 0.1);
        background: #1565c0;
        color: #fff;
        padding: 1rem 0.9rem;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.6rem 0.45rem 0.9rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.18);
        margin-bottom: 0.75rem;
      }

      .brand-logo {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.18);
      }

      .brand strong {
        font-size: 0.95rem;
        letter-spacing: 0.01em;
      }

      .brand p {
        margin: 0.1rem 0 0;
        font-size: 0.77rem;
        opacity: 0.84;
      }

      .menu-list {
        display: grid;
        gap: 0.45rem;
      }

      .menu-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.55rem;
        color: #fff;
        text-decoration: none;
        padding: 0.62rem 0.72rem;
        border-radius: var(--radius-sm);
        transition: var(--transition);
        font-size: 0.86rem;
        font-weight: 600;
      }

      .menu-left {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .menu-link:hover {
        background: rgba(255, 255, 255, 0.14);
      }

      .menu-link.active {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.42);
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

      .content-wrap {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 100vh;
      }

      .topbar {
        min-height: 64px;
        padding: 0.55rem 1rem;
        border-bottom: 1px solid var(--gray-200);
        background: var(--white);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .menu-toggle {
        display: none;
      }

      .topbar-right {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 0.8rem;
      }

      .user-box {
        display: flex;
        align-items: center;
        gap: 0.55rem;
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.74rem;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, var(--navy), var(--blue));
      }

      .name {
        margin: 0;
        color: var(--text);
        font-size: 0.84rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .role {
        margin: 0.05rem 0 0;
        color: var(--text-sub);
        font-size: 0.74rem;
        line-height: 1.2;
      }

      .logout-btn {
        background: var(--navy) !important;
        color: #fff !important;
      }

      .main-content {
        min-height: 0;
      }

      @media (max-width: 1024px) {
        .menu-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .user-box {
          display: none;
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: LayoutNavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'trending-up' },
    { label: 'Lớp học', path: '/classes', icon: 'school' },
    { label: 'Học sinh', path: '/students', icon: 'users' },
    { label: 'Nhập điểm', path: '/grades', icon: 'book-open-check' },
    {
      label: 'Dự đoán AI',
      path: '/predictions',
      icon: 'chart-column-increasing',
      showAlertBadge: true,
    },
    { label: 'Khoa', path: '/departments', icon: 'building-2', adminOnly: true },
    { label: 'Giáo viên', path: '/users', icon: 'user-check', adminOnly: true },
    { label: 'Môn học', path: '/subjects', icon: 'layers', adminOnly: true },
  ];

  isMobile = false;
  mobileSidebarOpened = false;

  currentUserName = 'Người dùng';
  currentUserRoleLabel = 'Giáo viên';
  highRiskCount = 0;

  get visibleNavItems(): LayoutNavItem[] {
    const role = this.authService.getCurrentRole();
    return this.navItems.filter((item) => !item.adminOnly || role === 'admin');
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
    this.observeLayoutMode();
    this.loadCurrentUser();
    this.loadHighRiskCount();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.loadHighRiskCount();
      });
  }

  toggleSidebar(): void {
    if (!this.isMobile) {
      return;
    }

    this.mobileSidebarOpened = !this.mobileSidebarOpened;
  }

  onMenuClick(): void {
    if (this.isMobile) {
      this.mobileSidebarOpened = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private observeLayoutMode(): void {
    this.breakpointObserver
      .observe('(max-width: 1024px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.isMobile = state.matches;
        if (!state.matches) {
          this.mobileSidebarOpened = false;
        }
      });
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
          this.currentUserRoleLabel = role === 'admin' ? 'Quản trị viên' : 'Giáo viên';
        },
      });
  }

  private applyCurrentUser(user: User): void {
    this.currentUserName = user.name?.trim() || 'Người dùng';
    this.currentUserRoleLabel = user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên';
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
}
