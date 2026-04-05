import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { LayoutComponent } from './shared/components/layout/layout.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, LayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  get showShell(): boolean {
    return !this.router.url.startsWith('/login') && this.authService.isLoggedIn();
  }
}
