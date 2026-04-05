import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly stickyNavbarOffset = 86;
  private readonly scrollDurationMs = 520;

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    try {
      if (this.authService.isLoggedIn()) {
        void this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      // Chặn lỗi runtime để homepage luôn render được.
      console.error('Không thể kiểm tra trạng thái đăng nhập', error);
    }
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();

    try {
      const sectionElement = document.getElementById(sectionId);

      if (!sectionElement) {
        return;
      }

      const currentY = this.getCurrentScrollY();
      const sectionTop = sectionElement.getBoundingClientRect().top + currentY;
      const targetY = Math.max(0, Math.round(sectionTop - this.stickyNavbarOffset));

      this.animateScrollTo(targetY);

      window.history.replaceState(null, '', '#' + sectionId);
    } catch (error) {
      // Fallback khi DOM lỗi bất thường: vẫn nhảy tới section để không chặn luồng dùng.
      console.error('Không thể cuộn tới section', error);
      window.location.hash = sectionId;
    }
  }

  scrollToTop(event: Event): void {
    event.preventDefault();

    try {
      this.animateScrollTo(0);

      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (error) {
      console.error('Không thể cuộn lên đầu trang', error);
      window.location.hash = '';
    }
  }

  private getCurrentScrollY(): number {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  private animateScrollTo(targetY: number): void {
    const startY = this.getCurrentScrollY();
    const distance = targetY - startY;

    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }

    const startTime = performance.now();

    const easeInOutCubic = (progress: number): number => {
      if (progress < 0.5) {
        return 4 * progress * progress * progress;
      }

      return 1 - Math.pow(-2 * progress + 2, 3) / 2;
    };

    const step = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.scrollDurationMs, 1);
      const easedProgress = easeInOutCubic(progress);
      const nextY = Math.round(startY + distance * easedProgress);

      window.scrollTo(0, nextY);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }
}
