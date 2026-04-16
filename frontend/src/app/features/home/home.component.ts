import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly stickyNavbarOffset = 86;
  private readonly scrollDurationMs = 520;

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);

  @ViewChild('heroCanvas') private heroCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('smokeCanvas') private smokeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherCanvas') private teacherCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('navyCanvas') private navyCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ctaCanvas') private ctaCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('footerCanvas') private footerCanvas?: ElementRef<HTMLCanvasElement>;

  private revealObserver?: IntersectionObserver;
  private plexusAnimId?: number;
  private sectionAnimIds: number[] = [];
  private smokeAnimId?: number;
  private smokeHandler?: (e: MouseEvent) => void;

  ngOnInit(): void {
    try {
      if (this.authService.isLoggedIn()) {
        void this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Không thể kiểm tra trạng thái đăng nhập', error);
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initPlexus();
      this.initSmokeTrail();
      this.startSectionPlexuses();
    });

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('.reveal').forEach((el) => {
      this.revealObserver?.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    if (this.plexusAnimId !== undefined) cancelAnimationFrame(this.plexusAnimId);
    for (const id of this.sectionAnimIds) cancelAnimationFrame(id);
    if (this.smokeAnimId !== undefined) cancelAnimationFrame(this.smokeAnimId);
    if (this.smokeHandler) document.removeEventListener('mousemove', this.smokeHandler);
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

  private initSmokeTrail(): void {
    const canvas = this.smokeCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface SP {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      decay: number;
      grow: number;
    }
    const particles: SP[] = [];

    this.smokeHandler = (e: MouseEvent) => {
      for (let i = 0; i < 6; i++) {
        const spread = (Math.random() - 0.5) * 14;
        particles.push({
          x: e.clientX + spread,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -(Math.random() * 1.4 + 0.4),
          r: Math.random() * 12 + 8,
          alpha: Math.random() * 0.1 + 0.04,
          decay: Math.random() * 0.003 + 0.0018,
          grow: Math.random() * 0.35 + 0.18,
        });
      }
      if (particles.length > 450) particles.splice(0, particles.length - 450);
    };
    document.addEventListener('mousemove', this.smokeHandler);

    const loop = () => {
      this.smokeAnimId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.975;
        p.r += p.grow;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255,255,255,${p.alpha})`);
        g.addColorStop(0.45, `rgba(240,242,255,${p.alpha * 0.35})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    };
    loop();
  }

  private startSectionPlexuses(): void {
    const specs: Array<{
      canvas: HTMLCanvasElement | undefined;
      count: number;
      linkDist: number;
      lineRgb: string;
      dotColor: string;
    }> = [
      {
        canvas: this.teacherCanvas?.nativeElement,
        count: 25,
        linkDist: 100,
        lineRgb: '37,99,235',
        dotColor: 'rgba(37,99,235,0.50)',
      },
      {
        canvas: this.navyCanvas?.nativeElement,
        count: 45,
        linkDist: 130,
        lineRgb: '190,210,255',
        dotColor: 'rgba(220,232,255,0.85)',
      },
      {
        canvas: this.ctaCanvas?.nativeElement,
        count: 40,
        linkDist: 125,
        lineRgb: '190,210,255',
        dotColor: 'rgba(220,232,255,0.85)',
      },
      {
        canvas: this.footerCanvas?.nativeElement,
        count: 25,
        linkDist: 110,
        lineRgb: '190,210,255',
        dotColor: 'rgba(220,232,255,0.65)',
      },
    ];
    for (const s of specs) {
      if (s.canvas) this.startPlexus(s.canvas, s.count, s.linkDist, s.lineRgb, s.dotColor);
    }
  }

  private startPlexus(
    canvas: HTMLCanvasElement,
    count: number,
    linkDist: number,
    lineRgb: string,
    dotColor: string,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || (canvas.parentElement?.offsetWidth ?? 800);
      canvas.height = canvas.offsetHeight || (canvas.parentElement?.offsetHeight ?? 300);
    };
    resize();
    window.addEventListener('resize', resize);

    const idx = this.sectionAnimIds.length;
    this.sectionAnimIds.push(0);

    interface PlexNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }
    const nodes: PlexNode[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.36,
      vy: (Math.random() - 0.5) * 0.36,
      r: Math.random() * 1.6 + 0.8,
    }));

    const loop = () => {
      this.sectionAnimIds[idx] = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;
      }

      ctx.lineWidth = 0.55;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * 0.48;
            ctx.strokeStyle = `rgba(${lineRgb},${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    };
    loop();
  }

  private initPlexus(): void {
    const canvas = this.heroCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || (canvas.parentElement?.offsetWidth ?? 1200);
      canvas.height = canvas.offsetHeight || (canvas.parentElement?.offsetHeight ?? 400);
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 70;
    const LINK_DIST = 135;

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }

    const nodes: Node[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.36,
      vy: (Math.random() - 0.5) * 0.36,
      r: Math.random() * 1.6 + 0.8,
    }));

    const loop = () => {
      this.plexusAnimId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;
      }

      ctx.lineWidth = 0.55;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.48;
            ctx.strokeStyle = `rgba(190,210,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,232,255,0.85)';
        ctx.fill();
      }
    };
    loop();
  }
}
