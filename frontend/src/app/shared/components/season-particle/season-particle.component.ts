import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { Season, SeasonParticleService } from '../../../core/services/season-particle.service';

// ─── Particle shape ─────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  size: number; // radius / half-size
  speed: number; // px per frame fall speed
  vx: number; // horizontal drift velocity
  alpha: number;
  rot: number; // current rotation (radians)
  rotSpeed: number; // rotation speed per frame
  phase: number; // sine phase offset for autumn zigzag
  flicker: number; // opacity flicker timer for summer
  type: number; // variant index per season
}

const MAX_PARTICLES = 120;

// ─── Color palettes ─────────────────────────────────────────────────────────
const SPRING_COLORS = ['#ffb7c5', '#ffe066', '#ff8fab', '#ffd166', '#ffccd5', '#fff0a0'];
const SUMMER_COLORS = ['#ff6b35', '#ff9f1c', '#e63946', '#ffb703', '#fb8500'];
const AUTUMN_COLORS = ['#d4622a', '#e07b39', '#c0392b', '#e8a838', '#8b4513', '#cd853f'];
const WINTER_COLORS = ['#7dd3fc', '#38bdf8', '#bae6fd', '#0ea5e9', '#e0f2fe'];

@Component({
  selector: 'app-season-particle',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <canvas #canvas class="season-canvas" aria-hidden="true"></canvas>

    <!-- Season selector toggle pill -->
    <div class="season-picker" role="toolbar" aria-label="Chọn mùa hiệu ứng">
      <button
        class="season-btn season-btn--spring"
        [class.active]="currentSeason === 'spring'"
        title="Mùa Xuân"
        aria-label="Mùa xuân"
        (click)="toggleSeason('spring')"
      >
        <lucide-icon name="flower-2" [size]="17" [strokeWidth]="1.8"></lucide-icon>
      </button>
      <button
        class="season-btn season-btn--summer"
        [class.active]="currentSeason === 'summer'"
        title="Mùa Hạ"
        aria-label="Mùa hạ"
        (click)="toggleSeason('summer')"
      >
        <lucide-icon name="sun" [size]="17" [strokeWidth]="1.8"></lucide-icon>
      </button>
      <button
        class="season-btn season-btn--autumn"
        [class.active]="currentSeason === 'autumn'"
        title="Mùa Thu"
        aria-label="Mùa thu"
        (click)="toggleSeason('autumn')"
      >
        <lucide-icon name="leaf" [size]="17" [strokeWidth]="1.8"></lucide-icon>
      </button>
      <button
        class="season-btn season-btn--winter"
        [class.active]="currentSeason === 'winter'"
        title="Mùa Đông"
        aria-label="Mùa đông"
        (click)="toggleSeason('winter')"
      >
        <lucide-icon name="snowflake" [size]="17" [strokeWidth]="1.8"></lucide-icon>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9995;
      }

      .season-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .season-picker {
        position: fixed;
        bottom: 1.5rem;
        right: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        pointer-events: all;
        z-index: 9996;
      }

      .season-btn {
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 50%;
        border: 1.5px solid rgba(0, 0, 0, 0.1);
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(8px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease,
          color 0.15s ease;
        color: #64748b;
      }

      .season-btn:hover {
        transform: scale(1.12);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
      }

      /* Per-season tints */
      .season-btn--spring {
        color: #be185d;
      }
      .season-btn--spring.active {
        background: #be185d;
        color: #fff;
        border-color: #be185d;
        box-shadow:
          0 0 0 3px rgba(190, 24, 93, 0.22),
          0 4px 12px rgba(190, 24, 93, 0.3);
        transform: scale(1.1);
      }

      .season-btn--summer {
        color: #ea580c;
      }
      .season-btn--summer.active {
        background: #ea580c;
        color: #fff;
        border-color: #ea580c;
        box-shadow:
          0 0 0 3px rgba(234, 88, 12, 0.22),
          0 4px 12px rgba(234, 88, 12, 0.3);
        transform: scale(1.1);
      }

      .season-btn--autumn {
        color: #b45309;
      }
      .season-btn--autumn.active {
        background: #b45309;
        color: #fff;
        border-color: #b45309;
        box-shadow:
          0 0 0 3px rgba(180, 83, 9, 0.22),
          0 4px 12px rgba(180, 83, 9, 0.3);
        transform: scale(1.1);
      }

      .season-btn--winter {
        color: #0284c7;
      }
      .season-btn--winter.active {
        background: #0284c7;
        color: #fff;
        border-color: #0284c7;
        box-shadow:
          0 0 0 3px rgba(2, 132, 199, 0.25),
          0 4px 12px rgba(2, 132, 199, 0.35);
        transform: scale(1.1);
      }
    `,
  ],
})
export class SeasonParticleComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly seasonService = inject(SeasonParticleService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  currentSeason: Season = this.seasonService.current;

  private particles: Particle[] = [];
  private animId = 0;
  private lastSpawn = 0;

  ngAfterViewInit(): void {
    this.resizeCanvas();
    window.addEventListener('resize', this.onResize);
    // Apply saved season immediately on load
    this.applyBodyClass(this.seasonService.current);

    this.seasonService.season$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((season) => {
      this.currentSeason = season;
      this.particles = [];
      this.applyBodyClass(season);
      if (season === 'none') {
        cancelAnimationFrame(this.animId);
        this.clearCanvas();
      } else {
        this.ngZone.runOutsideAngular(() => this.animate(0));
      }
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.applyBodyClass('none');
  }

  toggleSeason(season: Season): void {
    this.seasonService.toggle(season);
  }

  // ─── Body class for season theming ───────────────────────────────
  private applyBodyClass(season: Season): void {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    seasons.forEach((s) => document.body.classList.remove(`season-${s}`));
    if (season !== 'none') {
      document.body.classList.add(`season-${season}`);
    }
  }

  // ─── Canvas helpers ──────────────────────────────────────────────────────

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private get ctx(): CanvasRenderingContext2D {
    return this.canvas.getContext('2d')!;
  }

  private readonly onResize = (): void => this.resizeCanvas();

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ─── Animation loop ──────────────────────────────────────────────────────

  private animate(ts: number): void {
    const season = this.currentSeason;
    if (season === 'none') return;

    this.animId = requestAnimationFrame((t) => this.animate(t));

    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    // spawn new particles
    const spawnInterval = season === 'summer' ? 120 : season === 'winter' ? 90 : 150;
    if (ts - this.lastSpawn > spawnInterval && this.particles.length < MAX_PARTICLES) {
      this.spawnParticle(W, season);
      this.lastSpawn = ts;
    }

    // update + draw
    this.particles = this.particles.filter((p) => {
      this.updateParticle(p, H, season);
      this.drawParticle(ctx, p, season);
      return p.y < H + 20 && p.alpha > 0.02;
    });
  }

  // ─── Spawn factory ───────────────────────────────────────────────────────

  private spawnParticle(W: number, season: Season): void {
    const batch = season === 'spring' ? 2 : season === 'summer' ? 3 : season === 'winter' ? 2 : 2;
    for (let i = 0; i < batch; i++) {
      const p: Particle = {
        x: Math.random() * W,
        y: -10 - Math.random() * 20,
        size: this.randomSize(season),
        speed: this.randomSpeed(season),
        vx: (Math.random() - 0.5) * (season === 'summer' ? 1.2 : 0.6),
        alpha: season === 'winter' ? 0.8 + Math.random() * 0.2 : 0.55 + Math.random() * 0.45,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: this.randomRotSpeed(season),
        phase: Math.random() * Math.PI * 2,
        flicker: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3),
      };
      this.particles.push(p);
    }
  }

  private randomSize(season: Season): number {
    switch (season) {
      case 'spring':
        return 3 + Math.random() * 4; // 3–7px
      case 'summer':
        return 3 + Math.random() * 5; // 3–8px
      case 'autumn':
        return 4 + Math.random() * 5; // 4–9px
      case 'winter':
        return 2 + Math.random() * 4; // 2–6px
      default:
        return 4;
    }
  }

  private randomSpeed(season: Season): number {
    switch (season) {
      case 'spring':
        return 0.6 + Math.random() * 0.8; // slow gentle
      case 'summer':
        return 1.2 + Math.random() * 1.4; // fast
      case 'autumn':
        return 0.8 + Math.random() * 1.0; // medium
      case 'winter':
        return 0.9 + Math.random() * 1.6; // varied
      default:
        return 1;
    }
  }

  private randomRotSpeed(season: Season): number {
    switch (season) {
      case 'spring':
        return (Math.random() - 0.5) * 0.06; // gentle spin
      case 'summer':
        return (Math.random() - 0.5) * 0.1;
      case 'autumn':
        return (Math.random() - 0.5) * 0.05;
      case 'winter':
        return (Math.random() - 0.5) * 0.04;
      default:
        return 0;
    }
  }

  // ─── Update per frame ────────────────────────────────────────────────────

  private updateParticle(p: Particle, H: number, season: Season): void {
    p.rot += p.rotSpeed;
    p.flicker += 0.07;

    switch (season) {
      case 'spring':
        // float up slightly while drifting, gentle oscillation
        p.y += p.speed;
        p.x += p.vx + Math.sin(p.phase + p.y * 0.018) * 0.4;
        break;

      case 'summer':
        // faster fall, horizontal shimmer
        p.y += p.speed;
        p.x += p.vx + Math.sin(p.phase + p.y * 0.03) * 0.6;
        // flicker alpha
        p.alpha = Math.max(0.2, 0.55 + Math.sin(p.flicker) * 0.35);
        break;

      case 'autumn':
        // sine-wave zigzag — realistic leaf fall
        p.y += p.speed;
        p.x += p.vx + Math.sin(p.phase + p.y * 0.022) * 1.4;
        break;

      case 'winter':
        // straight down, gentle horizontal sway
        p.y += p.speed;
        p.x += p.vx + Math.sin(p.phase + p.y * 0.01) * 0.3;
        break;
    }
  }

  // ─── Draw per particle ───────────────────────────────────────────────────

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle, season: Season): void {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    switch (season) {
      case 'spring':
        this.drawSpringParticle(ctx, p);
        break;
      case 'summer':
        this.drawSummerParticle(ctx, p);
        break;
      case 'autumn':
        this.drawAutumnParticle(ctx, p);
        break;
      case 'winter':
        this.drawWinterParticle(ctx, p);
        break;
    }

    ctx.restore();
  }

  // ── Spring: small flower petals (pink/yellow circles with petal shape) ──

  private drawSpringParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const color = SPRING_COLORS[p.type % SPRING_COLORS.length];
    const s = p.size;

    if (p.type === 0) {
      // 5-petal flower
      ctx.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const angle = (i / 5) * Math.PI * 2;
        const px = Math.cos(angle) * s * 0.9;
        const py = Math.sin(angle) * s * 0.9;
        ctx.ellipse(px, py, s * 0.55, s * 0.35, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      // center dot
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
    } else if (p.type === 1) {
      // lì xì (small rounded rectangle)
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      const w = s * 1.4,
        h = s * 1.8;
      ctx.roundRect(-w / 2, -h / 2, w, h, s * 0.3);
      ctx.fill();
      // gold circle
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
    } else {
      // simple petal dot
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // ── Summer: leaf shapes (orange/red), shimmer dots ──────────────────────

  private drawSummerParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const color = SUMMER_COLORS[p.type % SUMMER_COLORS.length];
    const s = p.size;

    if (p.type <= 1) {
      // phoenix leaf — elongated oval with pointed ends
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.4);
      ctx.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.8, s * 0.5, 0, s * 1.4);
      ctx.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.8, -s * 0.5, 0, -s * 1.4);
      ctx.fillStyle = color;
      ctx.fill();
      // midrib line
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(0, s * 1.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else {
      // shimmer sun dot with glow
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color + 'aa');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // ── Autumn: maple/fallen leaves with veins ───────────────────────────────

  private drawAutumnParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const color = AUTUMN_COLORS[p.type % AUTUMN_COLORS.length];
    const s = p.size;

    if (p.type <= 1) {
      // rounded leaf with stem
      ctx.beginPath();
      ctx.moveTo(0, s * 1.3); // stem bottom
      ctx.lineTo(0, -s * 0.2);
      ctx.bezierCurveTo(s * 1.2, -s * 1.0, s * 1.2, -s * 1.8, 0, -s * 1.5);
      ctx.bezierCurveTo(-s * 1.2, -s * 1.8, -s * 1.2, -s * 1.0, 0, -s * 0.2);
      ctx.fillStyle = color;
      ctx.fill();
      // vein
      ctx.beginPath();
      ctx.moveTo(0, s * 1.3);
      ctx.lineTo(0, -s * 1.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else {
      // simple elongated oval leaf
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.6, s * 1.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // ── Winter: snowflake crystals ───────────────────────────────────────────

  private drawWinterParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    const color = WINTER_COLORS[p.type % WINTER_COLORS.length];

    // Glow shadow so flakes pop on any background
    ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
    ctx.shadowBlur = s * 2.5;

    if (p.type === 0) {
      // 6-arm snowflake
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, s * 0.25);
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const ex = Math.cos(angle) * s * 1.3;
        const ey = Math.sin(angle) * s * 1.3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // small cross branches
        const bx = Math.cos(angle) * s * 0.7;
        const by = Math.sin(angle) * s * 0.7;
        const perp = angle + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(perp) * s * 0.45, by + Math.sin(perp) * s * 0.45);
        ctx.lineTo(bx - Math.cos(perp) * s * 0.45, by - Math.sin(perp) * s * 0.45);
        ctx.stroke();
      }
      // center dot
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // filled ice crystal with bright core
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.1);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, color);
      grad.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}
