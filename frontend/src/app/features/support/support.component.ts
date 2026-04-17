import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';

interface BugReport {
  title: string;
  category: string;
  description: string;
  steps: string;
  email: string;
}

interface FaqItem {
  question: string;
  answer: string;
  open: boolean;
}

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    LucideAngularModule,
  ],
  template: `
    <!-- SMOKE TRAIL CURSOR -->
    <canvas #smokeCanvas class="smoke-overlay" aria-hidden="true"></canvas>

    <!-- HERO -->
    <section class="hero">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__grid" aria-hidden="true"></div>
      <canvas #heroCanvas class="section-canvas" aria-hidden="true"></canvas>
      <div class="container">
        <a routerLink="/" class="back-btn">
          <lucide-icon name="arrow-left" [size]="14"></lucide-icon>
          Trang chủ
        </a>

        <div class="hero__badge reveal" [style.transition-delay]="'0s'">
          <lucide-icon name="life-buoy" [size]="12"></lucide-icon>
          Trung tâm Hỗ trợ
        </div>
        <h1 class="hero__title reveal" [style.transition-delay]="'0.1s'">
          Hướng dẫn &amp; <span class="accent">Hỗ trợ</span> sử dụng<br />
          NttuGradeManager
        </h1>
        <p class="hero__desc reveal" [style.transition-delay]="'0.2s'">
          Hướng dẫn chi tiết, phương thức liên lạc và kênh gửi báo cáo lỗi cho toàn bộ hệ thống quản
          lý học tập Khoa CNTT – Trường ĐH Nguyễn Tất Thành.
        </p>

        <nav class="toc-nav reveal" [style.transition-delay]="'0.3s'" aria-label="Mục lục">
          @for (item of tocItems; track item.href) {
            <a href="javascript:void(0)" (click)="scrollToSection($event, item.href.slice(1))">
              <lucide-icon [name]="item.icon" [size]="13"></lucide-icon>
              {{ item.label }}
            </a>
          }
        </nav>
      </div>
    </section>

    <!-- 1. HƯỚNG DẪN SỬ DỤNG -->
    <section id="guide" class="section section--gray">
      <div class="container">
        <div class="section__hd reveal">
          <div class="section__label">
            <lucide-icon name="book-open" [size]="12"></lucide-icon>
            Hướng dẫn sử dụng
          </div>
          <h2 class="section__heading">Hướng dẫn theo <em>từng vai trò</em></h2>
          <p class="section__sub">
            Mỗi nhóm người dùng có luồng thao tác riêng. Chọn vai trò phù hợp để xem hướng dẫn chi
            tiết.
          </p>
        </div>

        <div class="feat-grid">
          @for (role of roles; track role.title; let i = $index) {
            <div class="feat-card reveal" [style.transition-delay]="i * 0.1 + 's'">
              <div class="feat-card__top">
                <div class="feat-card__icon">
                  <lucide-icon [name]="role.icon" [size]="20"></lucide-icon>
                </div>
                <h3 class="feat-card__title">{{ role.title }}</h3>
              </div>
              <ul class="feat-card__list">
                @for (step of role.steps; track step) {
                  <li>
                    <lucide-icon name="check" [size]="13"></lucide-icon>
                    {{ step }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="faq-block reveal">
          <h3 class="faq-block__title">Câu hỏi thường gặp</h3>
          <div class="faq-list">
            @for (faq of faqs; track faq.question) {
              <div class="faq-item" [class.open]="faq.open">
                <button class="faq-q" type="button" (click)="faq.open = !faq.open">
                  <span>{{ faq.question }}</span>
                  <lucide-icon
                    [name]="faq.open ? 'chevron-up' : 'chevron-down'"
                    [size]="15"
                  ></lucide-icon>
                </button>
                @if (faq.open) {
                  <div class="faq-a">{{ faq.answer }}</div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- 2. UI LAYOUT -->
    <section id="layout" class="section">
      <div class="container">
        <div class="section__hd reveal">
          <div class="section__label">
            <lucide-icon name="layout-dashboard" [size]="12"></lucide-icon>
            Giao diện hệ thống
          </div>
          <h2 class="section__heading">Cấu trúc <em>UI Layout</em></h2>
          <p class="section__sub">
            Tổng quan các vùng giao diện và danh sách đường dẫn chính trong hệ thống.
          </p>
        </div>

        <div class="zone-grid">
          @for (zone of layoutZones; track zone.name; let i = $index) {
            <div class="zone-card reveal" [style.transition-delay]="i * 0.1 + 's'">
              <div class="zone-card__name">{{ zone.name }}</div>
              <div class="zone-card__desc">{{ zone.desc }}</div>
              <ul class="zone-card__list">
                @for (item of zone.items; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="route-wrap reveal">
          <h3 class="route-wrap__title">Danh sách đường dẫn chính</h3>
          <div class="table-scroll">
            <table class="route-table">
              <thead>
                <tr>
                  <th>Đường dẫn</th>
                  <th>Chức năng</th>
                  <th>Quyền</th>
                </tr>
              </thead>
              <tbody>
                @for (r of routes; track r.path) {
                  <tr>
                    <td>
                      <code>{{ r.path }}</code>
                    </td>
                    <td>{{ r.label }}</td>
                    <td>
                      <span class="role-badge" [attr.data-role]="r.role">{{ r.role }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. LIÊN HỆ -->
    <section id="contact" class="section section--navy">
      <canvas #navyCanvas class="section-canvas" aria-hidden="true"></canvas>
      <div class="container">
        <div class="section__hd section__hd--center reveal">
          <div class="section__label">
            <lucide-icon name="phone" [size]="12"></lucide-icon>
            Liên hệ
          </div>
          <h2 class="section__heading">Phương thức <em>liên lạc</em></h2>
          <p class="section__sub">Đội ngũ kỹ thuật và giáo vụ luôn sẵn sàng hỗ trợ bạn.</p>
        </div>

        <div class="contact-grid">
          @for (c of contacts; track c.label; let i = $index) {
            <a
              [href]="c.href"
              target="_blank"
              rel="noopener noreferrer"
              class="contact-card reveal"
              [style.transition-delay]="i * 0.1 + 's'"
            >
              <div class="contact-card__icon">
                <lucide-icon [name]="c.icon" [size]="22"></lucide-icon>
              </div>
              <div class="contact-card__body">
                <div class="contact-card__label">{{ c.label }}</div>
                <div class="contact-card__value">{{ c.value }}</div>
              </div>
            </a>
          }
        </div>

        <div class="hours-strip reveal">
          <lucide-icon name="clock" [size]="16"></lucide-icon>
          <span><strong>Giờ hỗ trợ:</strong> Thứ Hai – Thứ Sáu, 07:30 – 17:00 (trừ ngày lễ)</span>
        </div>
      </div>
    </section>

    <!-- 4. PHẢN HỒI & THEO DÕI -->
    <section id="feedback" class="section section--gray">
      <div class="container">
        <div class="section__hd reveal">
          <div class="section__label">
            <lucide-icon name="message-square" [size]="12"></lucide-icon>
            Phản hồi
          </div>
          <h2 class="section__heading">Phản hồi &amp; <em>Theo dõi</em></h2>
          <p class="section__sub">
            Mọi phản hồi đều được ghi nhận, phân loại theo mức ưu tiên và xử lý trong thời gian sớm
            nhất.
          </p>
        </div>

        <div class="steps">
          @for (step of feedbackSteps; track step.title; let i = $index) {
            <div class="step reveal" [style.transition-delay]="i * 0.12 + 's'">
              <div class="step__num">{{ i + 1 }}</div>
              <h4 class="step__title">{{ step.title }}</h4>
              <p class="step__desc">{{ step.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- 5. BÁO LỖI -->
    <section id="bug" class="section section--bug">
      <div class="bug-glow" aria-hidden="true"></div>
      <div class="bug-grid" aria-hidden="true"></div>
      <canvas #bugCanvas class="section-canvas" aria-hidden="true"></canvas>
      <div class="container">
        <div class="section__hd reveal">
          <div class="section__label">
            <lucide-icon name="bug" [size]="12"></lucide-icon>
            Báo lỗi
          </div>
          <h2 class="section__heading">Gửi <em>báo cáo lỗi</em></h2>
          <p class="section__sub">
            Mô tả chi tiết vấn đề gặp phải để đội kỹ thuật xử lý nhanh nhất có thể.
          </p>
        </div>

        <div class="bug-layout reveal">
          <!-- FORM CARD -->
          <div class="bug-form-card">
            <div class="bug-form-card__hd">
              <div class="bug-form-card__icon">
                <lucide-icon name="bug" [size]="18"></lucide-icon>
              </div>
              <div>
                <div class="bug-form-card__title">Báo cáo lỗi mới</div>
                <div class="bug-form-card__sub">Điền thông tin bên dưới để gửi báo cáo</div>
              </div>
            </div>

            <form class="bug-form" (ngSubmit)="submitBugReport()" #bugFormRef="ngForm">
              <div class="form-row-2">
                <mat-form-field appearance="outline" class="ff">
                  <mat-label>Tiêu đề lỗi</mat-label>
                  <input
                    matInput
                    name="title"
                    [(ngModel)]="bugReport.title"
                    required
                    placeholder="Mô tả ngắn gọn vấn đề"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline" class="ff">
                  <mat-label>Phân loại</mat-label>
                  <mat-select name="category" [(ngModel)]="bugReport.category" required>
                    @for (cat of bugCategories; track cat.value) {
                      <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="ff ff--full">
                <mat-label>Mô tả chi tiết</mat-label>
                <textarea
                  matInput
                  name="description"
                  [(ngModel)]="bugReport.description"
                  required
                  rows="4"
                  placeholder="Mô tả chi tiết vấn đề, hiện tượng quan sát được..."
                ></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff ff--full">
                <mat-label>Các bước tái hiện lỗi</mat-label>
                <textarea
                  matInput
                  name="steps"
                  [(ngModel)]="bugReport.steps"
                  rows="3"
                  placeholder="1. Mở trang...&#10;2. Click vào...&#10;3. Lỗi xuất hiện..."
                ></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="ff">
                <mat-label>Email nhận phản hồi</mat-label>
                <input
                  matInput
                  type="email"
                  name="email"
                  [(ngModel)]="bugReport.email"
                  placeholder="email@example.com"
                />
              </mat-form-field>

              <div class="form-actions">
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  [disabled]="submitting || !bugFormRef.valid"
                  class="btn-submit"
                >
                  @if (submitting) {
                    <lucide-icon name="loader-2" [size]="15" class="spin"></lucide-icon>
                    Đang gửi...
                  } @else {
                    <lucide-icon name="send" [size]="15"></lucide-icon>
                    Gửi báo cáo
                  }
                </button>
                <button mat-stroked-button type="button" (click)="resetBugForm(bugFormRef)">
                  Nhập lại
                </button>
              </div>
            </form>
          </div>

          <!-- ASIDE -->
          <aside class="bug-aside">
            <div class="bug-aside__card">
              <div class="bug-aside__icon">
                <lucide-icon name="info" [size]="16"></lucide-icon>
              </div>
              <div>
                <strong>Thời gian phản hồi</strong>
                <p>Xử lý trong vòng <strong>1–3 ngày làm việc</strong> kể từ khi tiếp nhận.</p>
              </div>
            </div>
            <div class="bug-aside__card">
              <div class="bug-aside__icon">
                <lucide-icon name="shield-check" [size]="16"></lucide-icon>
              </div>
              <div>
                <strong>Bảo mật thông tin</strong>
                <p>Thông tin được bảo mật và chỉ dùng để xử lý sự cố kỹ thuật.</p>
              </div>
            </div>
            <div class="bug-aside__card">
              <div class="bug-aside__icon">
                <lucide-icon name="mail" [size]="16"></lucide-icon>
              </div>
              <div>
                <strong>Liên hệ trực tiếp</strong>
                <p>Email: <a href="mailto:admin@nttu.edu.vn">admin@nttu.edu.vn</a></p>
              </div>
            </div>
            <div class="bug-tip">
              <lucide-icon name="lightbulb" [size]="14"></lucide-icon>
              <span>Mô tả càng chi tiết, lỗi càng được xử lý nhanh hơn.</span>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="sp-footer">
      <canvas #footerCanvas class="section-canvas" aria-hidden="true"></canvas>
      <div class="container">
        <div class="sp-footer__inner">
          <div class="sp-footer__logo">
            <img src="assets/images/LogoNTTU.svg" alt="NTTU" />
            <span>NttuGradeManager — Khoa CNTT, Trường ĐH Nguyễn Tất Thành</span>
          </div>
          <div class="sp-footer__links">
            <a routerLink="/">Trang chủ</a>
            <a routerLink="/login">Đăng nhập</a>
            <a href="mailto:admin@nttu.edu.vn">admin@nttu.edu.vn</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .smoke-overlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 9999;
      }

      /* ── SCROLL REVEAL (same as /home) ── */
      .reveal {
        opacity: 0;
        transform: translateY(28px);
        transition:
          opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
          transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        &.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .section-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
      }

      /* ── HERO (matches home hero) ── */
      .hero {
        background: var(--navy-dark);
        color: #fff;
        padding: clamp(3.5rem, 8vw, 5.5rem) 0 clamp(2.5rem, 5vw, 4rem);
        position: relative;
        overflow: hidden;
      }
      .hero__glow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37, 99, 235, 0.28) 0%, transparent 65%),
          radial-gradient(ellipse 40% 40% at 90% 80%, rgba(245, 158, 11, 0.07) 0%, transparent 60%);
      }
      .hero__grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
        background-size: 48px 48px;
      }
      .container {
        width: 100%;
        max-width: var(--container-max);
        margin-inline: auto;
        padding-inline: var(--pad);
        position: relative;
        z-index: 1;
      }
      .back-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 0.8rem;
        margin-bottom: 2.5rem;
        width: fit-content;
        transition: color 0.2s;
        &:hover {
          color: #fff;
        }
      }
      .hero__badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--gold);
        border: 1px solid rgba(245, 158, 11, 0.3);
        background: rgba(245, 158, 11, 0.08);
        padding: 0.28rem 0.9rem;
        border-radius: 999px;
        margin-bottom: 1.25rem;
      }
      .hero__title {
        font-size: clamp(1.8rem, 4.5vw, 3rem);
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.03em;
        margin: 0 0 1rem;
      }
      .hero__title .accent {
        color: var(--gold);
      }
      .hero__desc {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.65);
        max-width: 560px;
        line-height: 1.7;
        margin: 0 0 2rem;
      }
      .toc-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        a {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.32rem 0.85rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          transition: var(--transition);
          &:hover {
            background: rgba(255, 255, 255, 0.14);
            border-color: rgba(255, 255, 255, 0.28);
            color: #fff;
          }
        }
      }

      /* ── SHARED SECTION STYLES (mirrors home) ── */
      .section {
        padding-block: clamp(3.5rem, 7vw, 5.5rem);
        scroll-margin-top: 80px;
      }
      .section--gray {
        background: var(--gray-50);
      }
      .section--navy {
        background: var(--navy);
        color: #fff;
        position: relative;
        overflow: hidden;
        isolation: isolate;
      }
      .section__hd {
        margin-bottom: 2.5rem;
      }
      .section__hd--center {
        text-align: center;
      }
      .section__hd--center .section__sub {
        margin-inline: auto;
      }
      .section__label {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--blue);
        background: var(--blue-pale);
        border: 1px solid rgba(37, 99, 235, 0.15);
        padding: 0.28rem 0.75rem;
        border-radius: 999px;
        margin-bottom: 0.85rem;
      }
      .section--navy .section__label {
        color: var(--gold);
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.2);
      }
      .section__heading {
        font-size: clamp(1.4rem, 3.2vw, 2.1rem);
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.2;
        color: var(--navy);
        margin: 0 0 0.5rem;
      }
      .section--navy .section__heading {
        color: #fff;
      }
      .section__heading em {
        font-style: normal;
        color: var(--blue);
      }
      .section--navy .section__heading em {
        color: var(--gold);
      }
      .section__sub {
        color: var(--text-sub);
        font-size: 0.975rem;
        max-width: 540px;
        line-height: 1.7;
        margin-top: 0.65rem;
        margin-bottom: 0;
      }
      .section--navy .section__sub {
        color: rgba(255, 255, 255, 0.65);
      }

      /* ── FEAT CARDS (role guide — mirrors home feat-card) ── */
      .feat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.25rem;
        margin-bottom: 3rem;
      }
      .feat-card {
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-lg, 12px);
        padding: 1.75rem 1.5rem;
        transition: var(--transition);
        position: relative;
        overflow: hidden;
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--navy), var(--blue));
          opacity: 0;
          transition: var(--transition);
        }
        &:hover {
          border-color: rgba(37, 99, 235, 0.2);
          box-shadow: var(--shadow-md);
          transform: translateY(-3px);
          &::before {
            opacity: 1;
          }
        }
      }
      .feat-card__top {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        margin-bottom: 1.1rem;
      }
      .feat-card__icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        background: var(--blue-pale);
        color: var(--blue);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .feat-card__title {
        font-size: 0.975rem;
        font-weight: 700;
        color: var(--navy);
        margin: 0;
      }
      .feat-card__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-sub);
          line-height: 1.55;
          lucide-icon {
            color: var(--blue);
            flex-shrink: 0;
            margin-top: 2px;
          }
        }
      }

      /* FAQ */
      .faq-block {
        margin-top: 0.5rem;
      }
      .faq-block__title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--navy);
        margin: 0 0 1rem;
      }
      .faq-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .faq-item {
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        overflow: hidden;
        transition: border-color 0.2s;
        &.open {
          border-color: var(--blue);
        }
      }
      .faq-q {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.9rem 1.25rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--navy);
        gap: 0.5rem;
        transition: background 0.15s;
        &:hover {
          background: var(--gray-50);
        }
      }
      .faq-a {
        padding: 0 1.25rem 1rem;
        font-size: 0.87rem;
        color: var(--text-sub);
        line-height: 1.65;
        border-top: 1px solid var(--gray-100);
      }

      /* ── UI LAYOUT ZONES ── */
      .zone-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 1rem;
        margin-bottom: 2.5rem;
      }
      .zone-card {
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 1.3rem 1.4rem;
        transition: var(--transition);
        &:hover {
          box-shadow: var(--shadow-md);
        }
      }
      .zone-card__name {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--blue);
        margin-bottom: 0.3rem;
      }
      .zone-card__desc {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--navy);
        margin-bottom: 0.65rem;
      }
      .zone-card__list {
        margin: 0;
        padding-left: 1rem;
        font-size: 0.82rem;
        color: var(--text-sub);
        line-height: 1.7;
      }
      .route-wrap {
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 1.5rem 1.75rem;
      }
      .route-wrap__title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--navy);
        margin: 0 0 1.1rem;
      }
      .table-scroll {
        overflow-x: auto;
      }
      .route-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.87rem;
        th {
          text-align: left;
          padding: 0.6rem 1rem;
          background: var(--gray-50);
          font-weight: 700;
          color: var(--text-sub);
          border-bottom: 1px solid var(--gray-200);
          white-space: nowrap;
        }
        td {
          padding: 0.55rem 1rem;
          border-bottom: 1px solid var(--gray-100);
          color: var(--text);
          vertical-align: middle;
        }
        tr:last-child td {
          border-bottom: none;
        }
        code {
          background: var(--blue-pale);
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          font-size: 0.81rem;
          color: var(--blue);
        }
      }
      .role-badge {
        display: inline-block;
        padding: 2px 9px;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 700;
        background: var(--gray-100);
        color: var(--text-sub);
        &[data-role='Tất cả'] {
          background: var(--blue-pale);
          color: var(--blue);
        }
        &[data-role='Quản trị'] {
          background: #fef3c7;
          color: #92400e;
        }
        &[data-role='Giảng viên'] {
          background: #dcfce7;
          color: #166534;
        }
        &[data-role='Cố vấn'] {
          background: #f3e8ff;
          color: #6b21a8;
        }
      }

      /* ── CONTACT (navy section) ── */
      .contact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
        margin-bottom: 1.75rem;
      }
      .contact-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius-lg, 12px);
        padding: 1.3rem 1.5rem;
        text-decoration: none;
        color: rgba(255, 255, 255, 0.85);
        transition:
          background 0.2s,
          border-color 0.2s;
        &:hover {
          background: rgba(255, 255, 255, 0.13);
          border-color: rgba(255, 255, 255, 0.25);
        }
      }
      .contact-card__icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--gold);
      }
      .contact-card__label {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 3px;
      }
      .contact-card__value {
        font-size: 0.92rem;
        font-weight: 700;
      }
      .hours-strip {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius-sm);
        padding: 1rem 1.5rem;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
        lucide-icon {
          color: var(--gold);
          flex-shrink: 0;
        }
      }

      /* ── FEEDBACK STEPS (mirrors home .steps) ── */
      .steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
        position: relative;
      }
      .step {
        text-align: center;
        padding: 1.75rem 1.25rem;
        background: #fff;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        transition: var(--transition);
        &:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
      }
      .step__num {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: var(--navy);
        color: #fff;
        font-size: 1.1rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
        position: relative;
        z-index: 1;
        box-shadow: 0 4px 16px rgba(26, 52, 100, 0.3);
      }
      .step__title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--navy);
        margin: 0 0 0.4rem;
      }
      .step__desc {
        font-size: 0.82rem;
        color: var(--text-sub);
        line-height: 1.6;
        margin: 0;
      }

      /* ── BUG SECTION (dark navy + grid bg) ── */
      .section--bug {
        background: var(--navy-dark);
        color: #fff;
        position: relative;
        overflow: hidden;
        isolation: isolate;
      }
      .section--bug .section__label {
        color: var(--gold);
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.2);
      }
      .section--bug .section__heading {
        color: #fff;
      }
      .section--bug .section__heading em {
        color: var(--gold);
      }
      .section--bug .section__sub {
        color: rgba(255, 255, 255, 0.65);
      }
      .bug-glow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 70% 60% at 15% 50%, rgba(37, 99, 235, 0.22) 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 90% 20%, rgba(245, 158, 11, 0.07) 0%, transparent 60%);
      }
      .bug-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
        background-size: 48px 48px;
      }
      .section--bug > .container {
        position: relative;
        z-index: 1;
      }

      /* ── BUG FORM LAYOUT ── */
      .bug-layout {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 1.75rem;
        align-items: start;
        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }
      }

      /* GLASS FORM CARD — white frosted */
      .bug-form-card {
        background: rgba(255, 255, 255, 0.13);
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 20px;
        padding: 2rem 2.25rem;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.06) inset,
          0 8px 32px rgba(0, 0, 0, 0.35),
          0 32px 64px rgba(0, 0, 0, 0.25);
        /* ── Material field overrides — dark text on white-glass ── */
        --mdc-outlined-text-field-label-text-color: rgba(255, 255, 255, 0.65);
        --mdc-outlined-text-field-focus-label-text-color: #fff;
        --mdc-outlined-text-field-hover-label-text-color: rgba(255, 255, 255, 0.85);
        --mdc-outlined-text-field-input-text-color: #fff;
        --mdc-outlined-text-field-outline-color: rgba(255, 255, 255, 0.25);
        --mdc-outlined-text-field-hover-outline-color: rgba(255, 255, 255, 0.5);
        --mdc-outlined-text-field-focus-outline-color: var(--gold);
        --mdc-outlined-text-field-caret-color: var(--gold);
        --mdc-outlined-text-field-input-text-placeholder-color: rgba(255, 255, 255, 0.35);
        --mat-select-trigger-text-color: #fff;
        --mat-select-arrow-foreground-color: rgba(255, 255, 255, 0.6);
        --mat-form-field-subscript-text-color: rgba(255, 255, 255, 0.5);
        --mat-form-field-error-text-color: #fca5a5;
      }
      .bug-form-card__hd {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        margin-bottom: 1.75rem;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .bug-form-card__icon {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: rgba(245, 158, 11, 0.15);
        color: var(--gold);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .bug-form-card__title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #fff;
      }
      .bug-form-card__sub {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.55);
        margin-top: 2px;
      }
      /* reset button in glass card */
      .bug-form-card .mat-mdc-outlined-button {
        --mdc-outlined-button-label-text-color: rgba(255, 255, 255, 0.75);
        --mdc-outlined-button-outline-color: rgba(255, 255, 255, 0.3);
        &:hover {
          --mdc-outlined-button-label-text-color: #fff;
          --mdc-outlined-button-outline-color: rgba(255, 255, 255, 0.6);
        }
      }

      /* ── ng-deep: force Material MDC input styles inside glass card ── */
      .bug-form-card {
        ::ng-deep {
          /* input + textarea background */
          .mat-mdc-text-field-wrapper {
            background: rgba(255, 255, 255, 0.08) !important;
            border-radius: 8px;
          }
          .mat-mdc-text-field-wrapper:hover {
            background: rgba(255, 255, 255, 0.13) !important;
          }
          /* input text */
          .mat-mdc-input-element {
            color: #fff !important;
            caret-color: var(--gold) !important;
          }
          .mat-mdc-input-element::placeholder {
            color: rgba(255, 255, 255, 0.35) !important;
          }
          /* label */
          .mdc-floating-label {
            color: rgba(255, 255, 255, 0.6) !important;
          }
          .mdc-floating-label--float-above {
            color: rgba(255, 255, 255, 0.9) !important;
          }
          .mat-mdc-form-field.mat-focused .mdc-floating-label {
            color: var(--gold) !important;
          }
          /* outline border */
          .mdc-notched-outline__leading,
          .mdc-notched-outline__notch,
          .mdc-notched-outline__trailing {
            border-color: rgba(255, 255, 255, 0.22) !important;
          }
          .mat-mdc-form-field:hover .mdc-notched-outline__leading,
          .mat-mdc-form-field:hover .mdc-notched-outline__notch,
          .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
            border-color: rgba(255, 255, 255, 0.45) !important;
          }
          .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
          .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
          .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
            border-color: var(--gold) !important;
            border-width: 2px !important;
          }
          /* mat-select value text */
          .mat-mdc-select-value-text,
          .mat-mdc-select-placeholder {
            color: rgba(255, 255, 255, 0.65) !important;
          }
          .mat-mdc-select-value {
            color: #fff !important;
          }
          .mat-mdc-select-arrow {
            color: rgba(255, 255, 255, 0.5) !important;
          }
          /* error message */
          .mat-mdc-form-field-error {
            color: #fca5a5 !important;
          }
          /* required asterisk */
          .mat-mdc-form-field-required-marker {
            color: rgba(255, 255, 255, 0.5) !important;
          }
          /* submit button — gold */
          .btn-submit.mat-mdc-raised-button {
            --mdc-protected-button-container-color: var(--gold) !important;
            --mdc-protected-button-label-text-color: #1a2035 !important;
          }
          .btn-submit.mat-mdc-raised-button:disabled {
            --mdc-protected-button-container-color: rgba(245, 158, 11, 0.25) !important;
            --mdc-protected-button-label-text-color: rgba(255, 255, 255, 0.3) !important;
          }
          /* reset button — white outlined */
          .mat-mdc-outlined-button {
            --mdc-outlined-button-label-text-color: rgba(255, 255, 255, 0.8) !important;
            --mdc-outlined-button-outline-color: rgba(255, 255, 255, 0.35) !important;
          }
          .mat-mdc-outlined-button:hover {
            --mdc-outlined-button-label-text-color: #fff !important;
            --mdc-outlined-button-outline-color: rgba(255, 255, 255, 0.65) !important;
          }
        }
      }
      .bug-form {
        display: flex;
        flex-direction: column;
      }
      .form-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 1rem;
        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }
      .ff {
        width: 100%;
      }
      .ff--full {
        width: 100%;
      }
      .form-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        margin-top: 0.5rem;
        button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      }
      .btn-submit {
        min-width: 140px;
      }

      /* GLASS ASIDE CARDS */
      .bug-aside {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .bug-aside__card {
        display: flex;
        align-items: flex-start;
        gap: 0.9rem;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 1.1rem 1.2rem;
        backdrop-filter: blur(8px);
        transition:
          background 0.2s,
          border-color 0.2s;
        &:hover {
          background: rgba(255, 255, 255, 0.11);
          border-color: rgba(255, 255, 255, 0.2);
        }
        strong {
          display: block;
          font-size: 0.87rem;
          color: #fff;
          margin-bottom: 0.25rem;
        }
        p {
          margin: 0;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          a {
            color: var(--gold);
            text-decoration: none;
            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
      .bug-aside__icon {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: var(--gold);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .bug-tip {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.85rem 1rem;
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.2);
        border-radius: 8px;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.55;
        lucide-icon {
          color: var(--gold);
          flex-shrink: 0;
          margin-top: 1px;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .spin {
        animation: spin 0.8s linear infinite;
      }

      /* ── FOOTER (same as home footer) ── */
      .sp-footer {
        background: var(--navy-dark);
        color: rgba(255, 255, 255, 0.55);
        padding-block: 2.5rem;
        font-size: 0.85rem;
        position: relative;
        overflow: hidden;
      }
      .sp-footer__inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .sp-footer__logo {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 700;
        img {
          height: 30px;
          filter: brightness(0) invert(1) opacity(0.7);
        }
      }
      .sp-footer__links {
        display: flex;
        gap: 1.5rem;
        a {
          color: rgba(255, 255, 255, 0.45);
          text-decoration: none;
          transition: var(--transition);
          &:hover {
            color: rgba(255, 255, 255, 0.85);
          }
        }
      }
    `,
  ],
})
export class SupportComponent implements AfterViewInit, OnDestroy {
  private readonly snackBar = inject(MatSnackBar);
  private readonly ngZone = inject(NgZone);
  private readonly hostEl = inject(ElementRef) as ElementRef<HTMLElement>;

  @ViewChild('smokeCanvas') private smokeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('heroCanvas') private heroCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('navyCanvas') private navyCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('bugCanvas') private bugCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('footerCanvas') private footerCanvas?: ElementRef<HTMLCanvasElement>;

  private sectionAnimIds: number[] = [];
  private smokeAnimId?: number;
  private smokeHandler?: (e: MouseEvent) => void;
  private revealObserver?: IntersectionObserver;
  private readonly scrollDurationMs = 520;
  private readonly scrollOffset = 80;

  submitting = false;

  bugReport: BugReport = {
    title: '',
    category: '',
    description: '',
    steps: '',
    email: '',
  };

  tocItems = [
    { href: '#guide', icon: 'book-open', label: 'Hướng dẫn sử dụng' },
    { href: '#layout', icon: 'layout-dashboard', label: 'Giao diện' },
    { href: '#contact', icon: 'phone', label: 'Liên hệ' },
    { href: '#feedback', icon: 'message-square', label: 'Phản hồi' },
    { href: '#bug', icon: 'bug', label: 'Báo lỗi' },
  ];

  bugCategories = [
    { value: 'ui', label: 'Giao diện / Hiển thị' },
    { value: 'data', label: 'Dữ liệu sai / Không tải được' },
    { value: 'auth', label: 'Đăng nhập / Phân quyền' },
    { value: 'grade', label: 'Điểm số / Học bạ' },
    { value: 'perf', label: 'Hiệu suất / Chậm' },
    { value: 'other', label: 'Khác' },
  ];

  roles = [
    {
      title: 'Quản trị viên',
      icon: 'shield',
      steps: [
        'Đăng nhập bằng tài khoản admin',
        'Quản lý người dùng tại /users',
        'Thiết lập khoa, bộ môn tại /departments',
        'Quản lý môn học, chuyên ngành tại /subjects và /majors',
        'Xem báo cáo và cấu hình hệ thống tại /dashboard',
      ],
    },
    {
      title: 'Giảng viên / Giáo vụ',
      icon: 'graduation-cap',
      steps: [
        'Đăng nhập bằng tài khoản giảng viên',
        'Xem và nhập điểm lớp học tại /grades',
        'Tra cứu danh sách lớp tại /classes',
        'Xem thông tin sinh viên tại /students',
        'Gửi thông báo và tin nhắn nội bộ',
      ],
    },
    {
      title: 'Cố vấn học tập',
      icon: 'users',
      steps: [
        'Đăng nhập bằng tài khoản cố vấn',
        'Xem danh sách sinh viên được phân công tại /advisor',
        'Theo dõi tiến độ học tập và cảnh báo sớm',
        'Xem biểu đồ điểm GPA theo từng học kỳ',
        'Tư vấn lịch học lại / cải thiện điểm',
      ],
    },
    {
      title: 'Sinh viên',
      icon: 'user',
      steps: [
        'Đăng nhập bằng mã sinh viên',
        'Xem điểm các môn học theo học kỳ',
        'Theo dõi tiến độ chương trình đào tạo',
        'Xem dự đoán kết quả học tập bằng AI',
        'Liên hệ cố vấn qua tin nhắn nội bộ',
      ],
    },
  ];

  faqs: FaqItem[] = [
    {
      question: 'Tôi quên mật khẩu, phải làm thế nào?',
      answer:
        'Liên hệ quản trị viên khoa hoặc gửi yêu cầu đặt lại mật khẩu qua email admin@nttu.edu.vn. Tài khoản sẽ được reset trong vòng 1 ngày làm việc.',
      open: false,
    },
    {
      question: 'Điểm chưa hiển thị mặc dù đã nhập xong?',
      answer:
        'Kiểm tra lại trạng thái lưu trong trang nhập điểm. Nếu vẫn chưa thấy, hãy thử tải lại trang hoặc đăng xuất – đăng nhập lại. Nếu vấn đề vẫn còn, hãy gửi báo cáo lỗi bên dưới.',
      open: false,
    },
    {
      question: 'Tôi không thấy sinh viên trong lớp dù đã đăng ký?',
      answer:
        'Sinh viên cần được thêm vào lớp bởi giáo vụ trước khi xuất hiện trong danh sách. Kiểm tra mục Quản lý lớp học hoặc liên hệ giáo vụ khoa.',
      open: false,
    },
    {
      question: 'AI dự đoán kết quả học tập dựa trên dữ liệu nào?',
      answer:
        'Mô hình AI phân tích lịch sử điểm, tỉ lệ hoàn thành tín chỉ và xu hướng GPA của sinh viên để đưa ra dự đoán xác suất tốt nghiệp và cảnh báo rủi ro học tập.',
      open: false,
    },
    {
      question: 'Tôi có thể xuất dữ liệu điểm ra Excel không?',
      answer:
        'Tính năng xuất Excel đang trong lộ trình phát triển. Hiện tại bạn có thể in trực tiếp trang điểm bằng chức năng in của trình duyệt (Ctrl+P).',
      open: false,
    },
  ];

  layoutZones = [
    {
      name: 'Navbar',
      desc: 'Thanh điều hướng trên cùng',
      items: ['Logo trường', 'Tìm kiếm toàn hệ thống', 'Thông báo', 'Avatar tài khoản'],
    },
    {
      name: 'Sidebar',
      desc: 'Menu điều hướng bên trái',
      items: [
        'Dashboard',
        'Sinh viên',
        'Lớp học',
        'Điểm số',
        'Cố vấn',
        'Chương trình đào tạo',
        'Quản trị',
      ],
    },
    {
      name: 'Main Content',
      desc: 'Vùng nội dung chính',
      items: ['Breadcrumb', 'Tiêu đề trang', 'Bảng dữ liệu / Biểu đồ', 'Phân trang'],
    },
    {
      name: 'Dashboard',
      desc: 'Tổng quan hệ thống',
      items: ['Thẻ thống kê', 'Biểu đồ GPA', 'Tin tức mới nhất', 'Cảnh báo học tập'],
    },
  ];

  routes = [
    { path: '/', label: 'Trang chủ', role: 'Tất cả' },
    { path: '/dashboard', label: 'Bảng điều khiển', role: 'Tất cả' },
    { path: '/students', label: 'Quản lý sinh viên', role: 'Giảng viên' },
    { path: '/classes', label: 'Quản lý lớp học', role: 'Giảng viên' },
    { path: '/grades', label: 'Nhập & xem điểm', role: 'Giảng viên' },
    { path: '/predictions', label: 'Dự đoán AI', role: 'Giảng viên' },
    { path: '/advisor', label: 'Cố vấn học tập', role: 'Cố vấn' },
    { path: '/subjects', label: 'Quản lý môn học', role: 'Quản trị' },
    { path: '/majors', label: 'Quản lý chuyên ngành', role: 'Quản trị' },
    { path: '/curricula', label: 'Chương trình đào tạo', role: 'Quản trị' },
    { path: '/departments', label: 'Quản lý khoa/bộ môn', role: 'Quản trị' },
    { path: '/users', label: 'Quản lý người dùng', role: 'Quản trị' },
    { path: '/chat', label: 'Tin nhắn nội bộ', role: 'Tất cả' },
    { path: '/support', label: 'Trung tâm hỗ trợ', role: 'Tất cả' },
  ];

  contacts = [
    {
      icon: 'mail',
      label: 'Email hỗ trợ kỹ thuật',
      value: 'admin@nttu.edu.vn',
      href: 'mailto:admin@nttu.edu.vn',
    },
    {
      icon: 'phone',
      label: 'Điện thoại Khoa CNTT',
      value: '(028) 3948 8000',
      href: 'tel:02839488000',
    },
    {
      icon: 'map-pin',
      label: 'Địa chỉ',
      value: '300A Nguyễn Tất Thành, Q.4, TP.HCM',
      href: 'https://maps.google.com/?q=300A+Nguyen+Tat+Thanh+Ho+Chi+Minh',
    },
    { icon: 'globe', label: 'Website trường', value: 'nttu.edu.vn', href: 'https://nttu.edu.vn' },
  ];

  feedbackSteps = [
    {
      title: 'Gửi phản hồi',
      desc: 'Điền form báo lỗi hoặc gửi email trực tiếp cho đội kỹ thuật với mô tả chi tiết về vấn đề.',
    },
    {
      title: 'Xác nhận tiếp nhận',
      desc: 'Hệ thống ghi nhận yêu cầu và gửi email xác nhận trong vòng vài giờ (giờ làm việc).',
    },
    {
      title: 'Phân loại & ưu tiên',
      desc: 'Đội kỹ thuật phân loại mức độ nghiêm trọng: Khẩn cấp → Cao → Trung bình → Thấp.',
    },
    {
      title: 'Xử lý & triển khai',
      desc: 'Lỗi được sửa và triển khai cập nhật. Bạn sẽ nhận thông báo khi vấn đề được giải quyết.',
    },
  ];

  submitBugReport(): void {
    if (
      !this.bugReport.title.trim() ||
      !this.bugReport.category ||
      !this.bugReport.description.trim()
    ) {
      return;
    }
    this.submitting = true;
    setTimeout(() => {
      this.submitting = false;
      this.snackBar.open(
        'Báo cáo lỗi đã được gửi thành công! Chúng tôi sẽ phản hồi sớm nhất có thể.',
        'Đóng',
        { duration: 5000, panelClass: ['snack-success'] },
      );
      this.bugReport = { title: '', category: '', description: '', steps: '', email: '' };
    }, 1200);
  }

  resetBugForm(form: { resetForm: () => void }): void {
    form.resetForm();
    this.bugReport = { title: '', category: '', description: '', steps: '', email: '' };
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const el = document.getElementById(sectionId);
    if (!el) return;
    const y = this.getCurrentScrollY() + el.getBoundingClientRect().top;
    this.animateScrollTo(Math.max(0, Math.round(y - this.scrollOffset)));
  }

  private getCurrentScrollY(): number {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  private animateScrollTo(targetY: number): void {
    const startY = this.getCurrentScrollY();
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }
    const startTime = performance.now();
    const ease = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const step = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / this.scrollDurationMs, 1);
      window.scrollTo(0, Math.round(startY + distance * ease(progress)));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initSmokeTrail();
      const specs: Array<{
        canvas: HTMLCanvasElement | undefined;
        count: number;
        linkDist: number;
        lineRgb: string;
        dotColor: string;
      }> = [
        {
          canvas: this.heroCanvas?.nativeElement,
          count: 55,
          linkDist: 130,
          lineRgb: '190,210,255',
          dotColor: 'rgba(220,232,255,0.75)',
        },
        {
          canvas: this.navyCanvas?.nativeElement,
          count: 40,
          linkDist: 120,
          lineRgb: '190,210,255',
          dotColor: 'rgba(220,232,255,0.75)',
        },
        {
          canvas: this.bugCanvas?.nativeElement,
          count: 40,
          linkDist: 125,
          lineRgb: '190,210,255',
          dotColor: 'rgba(220,232,255,0.80)',
        },
        {
          canvas: this.footerCanvas?.nativeElement,
          count: 22,
          linkDist: 110,
          lineRgb: '190,210,255',
          dotColor: 'rgba(220,232,255,0.55)',
        },
      ];
      for (const s of specs) {
        if (s.canvas) this.startPlexus(s.canvas, s.count, s.linkDist, s.lineRgb, s.dotColor);
      }
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
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    setTimeout(() => {
      (this.hostEl.nativeElement as HTMLElement)
        .querySelectorAll('.reveal')
        .forEach((el) => this.revealObserver?.observe(el));
    }, 0);
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    for (const id of this.sectionAnimIds) cancelAnimationFrame(id);
    if (this.smokeAnimId !== undefined) cancelAnimationFrame(this.smokeAnimId);
    if (this.smokeHandler) document.removeEventListener('mousemove', this.smokeHandler);
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
            ctx.strokeStyle = `rgba(${lineRgb},${(1 - dist / linkDist) * 0.48})`;
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
}
