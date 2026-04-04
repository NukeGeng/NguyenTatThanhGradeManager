import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Học sinh', path: '/students' },
    { label: 'Lớp học', path: '/classes' },
    { label: 'Nhập điểm', path: '/grades' },
    { label: 'Dự đoán AI', path: '/predictions' },
    { label: 'Khoa', path: '/departments', adminOnly: true },
    { label: 'Giáo viên', path: '/users', adminOnly: true },
    { label: 'Môn học', path: '/subjects', adminOnly: true },
  ];

  get showShell(): boolean {
    return !this.router.url.startsWith('/login') && this.authService.isLoggedIn();
  }

  get visibleNavItems(): NavItem[] {
    const role = this.authService.getCurrentRole();
    return this.navItems.filter((item) => !item.adminOnly || role === 'admin');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
