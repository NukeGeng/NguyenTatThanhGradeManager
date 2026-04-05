# 🏠 TEMPLATEHTML.md — Prompt chuyển HTML thành Angular Home Component

> Agent đọc file này, tự đọc toàn bộ HTML bên dưới và tạo ra Angular component.
> KHÔNG hỏi lại, KHÔNG bỏ sót nội dung nào.

---

## 📋 Yêu cầu thực hiện

Chuyển đổi file HTML bên dưới thành Angular v21 standalone component cho trang chủ (landing page).

**Tạo các file sau:**
```
src/app/features/home/home.component.ts
src/app/features/home/home.component.html
src/app/features/home/home.component.scss
```

**Đồng thời cập nhật:**
```
src/app/app.routes.ts   — thêm route path: ''
src/index.html          — thêm Google Fonts nếu chưa có
```

---

## 🔧 Quy tắc chuyển đổi (làm ĐÚNG theo thứ tự)

### home.component.ts
```typescript
// Standalone component, selector: app-home
// Imports cần thiết:
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  LucideAngularModule,
  Zap, LogIn, LayoutDashboard, ArrowDown,
  Users, User, Building2, Layers, ShieldCheck, Shield,
  ClipboardList, FileSpreadsheet, Bell, BrainCircuit,
  TrendingUp, Lightbulb, Database, CheckCircle,
  AlertTriangle, AlertCircle, Cpu, Code2, Server,
  Lock, Triangle, Sparkles, Workflow
} from 'lucide-angular';

// Logic trong ngOnInit: nếu đã đăng nhập → navigate('/dashboard')
// if (this.authService.isLoggedIn()) this.router.navigate(['/dashboard']);
```

### home.component.html
- ❌ BỎ: `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<title>`
- ❌ BỎ: `<link>` Google Fonts
- ❌ BỎ: `<script src="lucide CDN">`
- ❌ BỎ: `<script>lucide.createIcons()</script>`
- ✅ THAY: `<i data-lucide="X" style="width:Npx">` → `<lucide-icon name="X" [size]="N"></lucide-icon>`
- ✅ THAY: `href="/login"` → `routerLink="/login"`
- ✅ THAY: `href="/dashboard"` → `routerLink="/dashboard"`
- ✅ GIỮ NGUYÊN: `href="#features"`, `href="#ai"` (anchor scroll)
- ✅ THAY: `src="logo-nttu.png"` → `src="assets/images/logo-nttu.png"`
- ✅ THAY: email bị obfuscate `[email protected]` → `admin@nttu.edu.vn`
- ✅ GIỮ NGUYÊN: 100% cấu trúc HTML, class CSS, text nội dung

### home.component.scss
- ✅ CHUYỂN: toàn bộ nội dung trong `<style>...</style>` vào đây
- ❌ BỎ: `:root { }` (đã có trong styles.scss global)
- ❌ BỎ: reset (`*, html, body, img, a, ul, button`) (đã có global)
- ✅ GIỮ: tất cả class CSS còn lại (`.navbar`, `.hero`, `.feat-card`...)

### app.routes.ts — thêm route trang chủ
```typescript
{
  path: '',
  loadComponent: () =>
    import('./features/home/home.component').then(m => m.HomeComponent),
},
```

---

## 📄 FILE HTML NGUỒN (agent đọc và chuyển đổi phần dưới đây)

<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NttuGradeManager – Hệ thống Quản lý Học tập Thông minh</title>

  <!-- Google Fonts: Be Vietnam Pro — phù hợp giao diện giáo dục VN -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

  <!-- Lucide Icons (npm: lucide) via CDN -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <style>
    /* ════════════════════════════════════════════
       CSS VARIABLES — NTTU Brand
    ════════════════════════════════════════════ */
    :root {
      /* NTTU Brand Colors */
      --navy:          #1a3464;
      --navy-dark:     #0f2144;
      --navy-mid:      #243d73;
      --blue:          #2563eb;
      --blue-light:    #3b82f6;
      --blue-pale:     #eff6ff;
      --gold:          #f59e0b;
      --gold-light:    #fbbf24;

      /* Neutral */
      --white:         #ffffff;
      --gray-50:       #f8fafc;
      --gray-100:      #f1f5f9;
      --gray-200:      #e2e8f0;
      --gray-400:      #94a3b8;
      --gray-600:      #475569;
      --gray-800:      #1e293b;
      --text:          #1e293b;
      --text-sub:      #475569;
      --text-muted:    #94a3b8;

      /* Layout */
      --container-max: 1200px;
      --pad:           clamp(1rem, 4vw, 2rem);
      --gap-section:   clamp(4rem, 8vw, 6rem);
      --radius:        12px;
      --radius-lg:     20px;
      --radius-sm:     8px;
      --shadow:        0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06);
      --shadow-md:     0 4px 24px rgba(26,52,100,.12);
      --shadow-lg:     0 8px 40px rgba(26,52,100,.18);
      --transition:    all .2s ease;

      font-family: 'Be Vietnam Pro', sans-serif;
      font-size: 16px;
      color: var(--text);
    }

    /* ════════════════════════════════════════════
       RESET
    ════════════════════════════════════════════ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html  { scroll-behavior: smooth; }
    body  { background: var(--white); line-height: 1.65; }
    img   { max-width: 100%; display: block; }
    a     { text-decoration: none; color: inherit; }
    ul    { list-style: none; }
    button { font-family: inherit; cursor: pointer; }

    /* ════════════════════════════════════════════
       CONTAINER — giới hạn width, căn giữa
    ════════════════════════════════════════════ */
    .container {
      width: 100%;
      max-width: var(--container-max);
      margin-inline: auto;
      padding-inline: var(--pad);
    }
    .container--sm  { max-width: 760px; }
    .container--md  { max-width: 960px; }

    /* ════════════════════════════════════════════
       NAVBAR
    ════════════════════════════════════════════ */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 200;
      background: rgba(255,255,255,.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--gray-200);
      box-shadow: 0 1px 8px rgba(0,0,0,.06);
    }

    .navbar__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 68px;
      gap: 1.5rem;
    }

    /* Logo: hình trường + tên hệ thống */
    .navbar__logo {
      display: flex;
      align-items: center;
      gap: .75rem;
      font-weight: 800;
      font-size: .95rem;
      color: var(--navy);
      flex-shrink: 0;
    }

    .navbar__logo img {
      height: 40px;
      width: auto;
    }

    .navbar__logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .navbar__logo-text small {
      font-size: .65rem;
      font-weight: 500;
      color: var(--text-sub);
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .navbar__logo-text strong {
      font-size: .9rem;
      color: var(--navy);
    }

    /* Nav links */
    .navbar__links {
      display: flex;
      align-items: center;
      gap: .125rem;
    }

    .navbar__links a {
      font-size: .875rem;
      font-weight: 500;
      color: var(--gray-600);
      padding: .45rem .8rem;
      border-radius: var(--radius-sm);
      transition: var(--transition);
    }

    .navbar__links a:hover {
      color: var(--navy);
      background: var(--blue-pale);
    }

    /* CTA button */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      padding: .6rem 1.4rem;
      border-radius: var(--radius-sm);
      font-size: .875rem;
      font-weight: 600;
      transition: var(--transition);
      border: 2px solid transparent;
    }

    .btn--primary {
      background: var(--navy);
      color: var(--white);
    }
    .btn--primary:hover {
      background: var(--navy-mid);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .btn--outline {
      border-color: var(--navy);
      color: var(--navy);
      background: transparent;
    }
    .btn--outline:hover {
      background: var(--blue-pale);
    }

    .btn--blue {
      background: var(--blue);
      color: #fff;
    }
    .btn--blue:hover {
      background: var(--blue-light);
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(37,99,235,.3);
    }

    .btn--lg {
      padding: .8rem 2rem;
      font-size: .95rem;
      border-radius: var(--radius);
    }

    /* ════════════════════════════════════════════
       HERO
    ════════════════════════════════════════════ */
    .hero {
      background: var(--navy-dark);
      color: #fff;
      padding-block: clamp(4rem, 10vw, 7rem);
      position: relative;
      overflow: hidden;
    }

    /* Subtle pattern overlay */
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 50% 0%,   rgba(37,99,235,.25) 0%, transparent 65%),
        radial-gradient(ellipse 40% 40% at 90% 80%,  rgba(245,158,11,.08) 0%, transparent 60%);
      pointer-events: none;
    }

    /* Decorative grid lines */
    .hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
    }

    .hero__inner {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 3rem;
      align-items: center;
    }

    .hero__badge {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      font-size: .78rem;
      font-weight: 600;
      color: var(--gold-light);
      border: 1px solid rgba(251,191,36,.3);
      background: rgba(251,191,36,.08);
      padding: .3rem .9rem;
      border-radius: 999px;
      margin-bottom: 1.25rem;
      letter-spacing: .04em;
    }

    .hero__title {
      font-size: clamp(1.9rem, 4.5vw, 3.2rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -.03em;
      margin-bottom: 1rem;
    }

    .hero__title .accent {
      color: var(--gold-light);
    }

    .hero__desc {
      font-size: 1.05rem;
      color: rgba(255,255,255,.7);
      max-width: 520px;
      margin-bottom: 2rem;
      line-height: 1.7;
    }

    .hero__actions {
      display: flex;
      gap: .75rem;
      flex-wrap: wrap;
    }

    /* Stats strip */
    .hero__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,.12);
    }

    .hero__stat-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--gold-light);
      letter-spacing: -.03em;
    }

    .hero__stat-label {
      font-size: .8rem;
      color: rgba(255,255,255,.55);
      margin-top: .15rem;
    }

    /* Right side card preview */
    .hero__card {
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      min-width: 260px;
      backdrop-filter: blur(8px);
    }

    .hero__card-title {
      font-size: .75rem;
      font-weight: 600;
      color: rgba(255,255,255,.5);
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 1rem;
    }

    .grade-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .5rem 0;
      border-bottom: 1px solid rgba(255,255,255,.07);
      font-size: .85rem;
    }
    .grade-row:last-child { border-bottom: none; }
    .grade-row__name { color: rgba(255,255,255,.75); }
    .grade-badge {
      font-size: .72rem;
      font-weight: 700;
      padding: .2rem .55rem;
      border-radius: 999px;
    }
    .grade-badge--a  { background: rgba(34,197,94,.15);  color: #4ade80; }
    .grade-badge--b  { background: rgba(59,130,246,.15); color: #93c5fd; }
    .grade-badge--c  { background: rgba(245,158,11,.15); color: #fcd34d; }
    .grade-badge--f  { background: rgba(239,68,68,.15);  color: #fca5a5; }

    .ai-chip {
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-top: 1rem;
      background: rgba(37,99,235,.2);
      border: 1px solid rgba(59,130,246,.3);
      border-radius: var(--radius-sm);
      padding: .6rem .9rem;
      font-size: .8rem;
      color: #93c5fd;
    }
    .ai-chip i { color: var(--gold-light); }

    /* ════════════════════════════════════════════
       SECTION BASE
    ════════════════════════════════════════════ */
    .section {
      padding-block: var(--gap-section);
    }

    .section--gray { background: var(--gray-50); }
    .section--navy {
      background: var(--navy);
      color: #fff;
    }

    .section__label {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--blue);
      background: var(--blue-pale);
      border: 1px solid rgba(37,99,235,.15);
      padding: .28rem .75rem;
      border-radius: 999px;
      margin-bottom: .85rem;
    }

    .section--navy .section__label {
      color: var(--gold-light);
      background: rgba(251,191,36,.1);
      border-color: rgba(251,191,36,.2);
    }

    .section__heading {
      font-size: clamp(1.5rem, 3.5vw, 2.25rem);
      font-weight: 800;
      letter-spacing: -.03em;
      line-height: 1.2;
      color: var(--navy);
    }

    .section--navy .section__heading { color: #fff; }

    .section__heading em {
      font-style: normal;
      color: var(--blue);
    }

    .section--navy .section__heading em { color: var(--gold-light); }

    .section__sub {
      margin-top: .65rem;
      color: var(--text-sub);
      font-size: .975rem;
      max-width: 520px;
      line-height: 1.7;
    }

    .section--navy .section__sub { color: rgba(255,255,255,.65); }

    /* Center variant */
    .section__hd--center { text-align: center; }
    .section__hd--center .section__sub { margin-inline: auto; }

    /* ════════════════════════════════════════════
       FEATURE CARDS
    ════════════════════════════════════════════ */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      margin-top: 3rem;
    }

    .feat-card {
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      padding: 1.75rem 1.5rem;
      transition: var(--transition);
      position: relative;
      overflow: hidden;
    }

    .feat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--navy), var(--blue));
      opacity: 0;
      transition: var(--transition);
    }

    .feat-card:hover {
      border-color: rgba(37,99,235,.2);
      box-shadow: var(--shadow-md);
      transform: translateY(-3px);
    }

    .feat-card:hover::before { opacity: 1; }

    .feat-card__icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      background: var(--blue-pale);
      color: var(--blue);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.1rem;
    }

    .feat-card__title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: .5rem;
    }

    .feat-card__body {
      font-size: .875rem;
      color: var(--text-sub);
      line-height: 1.65;
    }

    /* ════════════════════════════════════════════
       HOW IT WORKS — numbered steps
    ════════════════════════════════════════════ */
    .steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-top: 3rem;
      position: relative;
    }

    /* Connector line */
    .steps::before {
      content: '';
      position: absolute;
      top: 28px;
      left: calc(12.5% + 28px);
      right: calc(12.5% + 28px);
      height: 2px;
      background: linear-gradient(90deg, var(--gray-200), var(--blue-light), var(--gray-200));
    }

    .step {
      text-align: center;
      padding: 1.5rem 1rem;
    }

    .step__num {
      width: 56px;
      height: 56px;
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
      box-shadow: 0 4px 16px rgba(26,52,100,.3);
    }

    .step__title {
      font-size: .9rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: .4rem;
    }

    .step__desc {
      font-size: .8rem;
      color: var(--text-sub);
      line-height: 1.6;
    }

    /* ════════════════════════════════════════════
       ROLES SECTION — 2 col split
    ════════════════════════════════════════════ */
    .roles-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 3rem;
    }

    .role-card {
      border-radius: var(--radius-lg);
      padding: 2rem;
      border: 1px solid var(--gray-200);
      background: var(--white);
    }

    .role-card--admin {
      border-color: rgba(26,52,100,.2);
      background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy-mid) 100%);
      color: #fff;
    }

    .role-card__header {
      display: flex;
      align-items: center;
      gap: .75rem;
      margin-bottom: 1.25rem;
    }

    .role-card__avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .role-card--admin .role-card__avatar {
      background: rgba(255,255,255,.12);
      color: var(--gold-light);
    }

    .role-card--teacher .role-card__avatar {
      background: var(--blue-pale);
      color: var(--blue);
    }

    .role-card__name {
      font-size: 1rem;
      font-weight: 700;
    }

    .role-card--admin .role-card__name { color: #fff; }
    .role-card--teacher .role-card__name { color: var(--navy); }

    .role-card__role {
      font-size: .75rem;
      opacity: .6;
    }

    .role-list {
      display: flex;
      flex-direction: column;
      gap: .55rem;
    }

    .role-item {
      display: flex;
      align-items: flex-start;
      gap: .6rem;
      font-size: .85rem;
      line-height: 1.5;
    }

    .role-item i {
      flex-shrink: 0;
      margin-top: .1rem;
    }

    .role-card--admin .role-item { color: rgba(255,255,255,.8); }
    .role-card--admin .role-item i { color: var(--gold-light); }
    .role-card--teacher .role-item { color: var(--text-sub); }
    .role-card--teacher .role-item i { color: var(--blue); }

    /* ════════════════════════════════════════════
       AI SECTION
    ════════════════════════════════════════════ */
    .ai-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: center;
    }

    .ai-mockup {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
    }

    .ai-mockup__header {
      display: flex;
      align-items: center;
      gap: .5rem;
      margin-bottom: 1.25rem;
      padding-bottom: .85rem;
      border-bottom: 1px solid var(--gray-200);
      font-size: .8rem;
      font-weight: 600;
      color: var(--navy);
    }

    .ai-mockup__header i { color: var(--blue); }

    .predict-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .65rem 0;
      border-bottom: 1px solid var(--gray-100);
      font-size: .83rem;
    }
    .predict-item:last-child { border-bottom: none; }

    .predict-item__name { color: var(--text); font-weight: 500; }
    .predict-item__meta { color: var(--text-muted); font-size: .75rem; }

    .predict-badge {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      font-size: .72rem;
      font-weight: 700;
      padding: .2rem .6rem;
      border-radius: 999px;
    }
    .predict-badge--high { background: #fef2f2; color: #dc2626; }
    .predict-badge--med  { background: #fffbeb; color: #d97706; }
    .predict-badge--low  { background: #f0fdf4; color: #16a34a; }

    .ai-bullets {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.75rem;
    }

    .ai-bullet {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .ai-bullet__icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: var(--blue-pale);
      color: var(--blue);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ai-bullet__title {
      font-size: .875rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: .2rem;
    }

    .ai-bullet__desc {
      font-size: .8rem;
      color: var(--text-sub);
      line-height: 1.6;
    }

    /* ════════════════════════════════════════════
       TECH STACK BADGES
    ════════════════════════════════════════════ */
    .tech-badges {
      display: flex;
      flex-wrap: wrap;
      gap: .65rem;
      margin-top: 2.5rem;
      justify-content: center;
    }

    .tech-badge {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      font-size: .78rem;
      font-weight: 600;
      padding: .35rem .9rem;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.07);
      color: rgba(255,255,255,.8);
      transition: var(--transition);
    }

    .tech-badge:hover {
      background: rgba(255,255,255,.13);
      border-color: rgba(255,255,255,.25);
    }

    .tech-badge i { color: var(--gold-light); }

    /* ════════════════════════════════════════════
       CTA SECTION
    ════════════════════════════════════════════ */
    .cta-box {
      background: linear-gradient(135deg, var(--navy-dark), var(--navy-mid));
      border-radius: var(--radius-lg);
      padding: clamp(2.5rem, 6vw, 4rem);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .cta-box::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 60% 70% at 50% 0%, rgba(37,99,235,.25) 0%, transparent 65%);
      pointer-events: none;
    }

    .cta-box__title {
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 800;
      color: #fff;
      margin-bottom: .75rem;
      position: relative;
    }

    .cta-box__sub {
      color: rgba(255,255,255,.65);
      margin-bottom: 2rem;
      font-size: .95rem;
      position: relative;
    }

    .cta-box__actions {
      display: flex;
      gap: .75rem;
      justify-content: center;
      flex-wrap: wrap;
      position: relative;
    }

    .btn--white {
      background: #fff;
      color: var(--navy);
      font-weight: 700;
    }
    .btn--white:hover {
      background: var(--gray-100);
      transform: translateY(-1px);
    }

    .btn--ghost-white {
      border: 2px solid rgba(255,255,255,.3);
      color: #fff;
      background: transparent;
    }
    .btn--ghost-white:hover {
      background: rgba(255,255,255,.1);
      border-color: rgba(255,255,255,.5);
    }

    /* ════════════════════════════════════════════
       FOOTER
    ════════════════════════════════════════════ */
    .footer {
      background: var(--navy-dark);
      color: rgba(255,255,255,.55);
      padding-block: 2.5rem;
      font-size: .85rem;
    }

    .footer__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .footer__logo {
      display: flex;
      align-items: center;
      gap: .65rem;
      color: rgba(255,255,255,.85);
      font-weight: 700;
    }

    .footer__logo img { height: 32px; filter: brightness(0) invert(1) opacity(.7); }

    .footer__links {
      display: flex;
      gap: 1.5rem;
    }

    .footer__links a {
      color: rgba(255,255,255,.45);
      transition: var(--transition);
    }

    .footer__links a:hover { color: rgba(255,255,255,.85); }

    /* ════════════════════════════════════════════
       DIVIDER
    ════════════════════════════════════════════ */
    .divider {
      border: none;
      border-top: 1px solid var(--gray-200);
    }

    /* ════════════════════════════════════════════
       RESPONSIVE
    ════════════════════════════════════════════ */
    @media (max-width: 960px) {
      .features-grid   { grid-template-columns: repeat(2, 1fr); }
      .steps           { grid-template-columns: repeat(2, 1fr); }
      .steps::before   { display: none; }
      .roles-split     { grid-template-columns: 1fr; }
      .ai-split        { grid-template-columns: 1fr; }
      .hero__inner     { grid-template-columns: 1fr; }
      .hero__card      { display: none; }
      .hero__stats     { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 640px) {
      .navbar__links   { display: none; }
      .features-grid   { grid-template-columns: 1fr; }
      .steps           { grid-template-columns: 1fr; }
      .hero__stats     { grid-template-columns: 1fr; gap: 1rem; }
    }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════
     NAVBAR
═══════════════════════════════════════ -->
<header class="navbar">
  <div class="container">
    <nav class="navbar__inner">

      <a href="#" class="navbar__logo">
        <!-- Thay src bằng đường dẫn logo thật của bạn -->
        <img src="logo-nttu.png" alt="Logo NTTU" />
        <div class="navbar__logo-text">
          <small>Trường ĐH Nguyễn Tất Thành</small>
          <strong>NttuGradeManager</strong>
        </div>
      </a>

      <ul class="navbar__links">
        <li><a href="#features">Tính năng</a></li>
        <li><a href="#how-it-works">Cách hoạt động</a></li>
        <li><a href="#roles">Phân quyền</a></li>
        <li><a href="#ai">AI dự đoán</a></li>
        <li><a href="#tech">Công nghệ</a></li>
      </ul>

      <a href="/login" class="btn btn--primary">
        <i data-lucide="log-in" style="width:15px;height:15px"></i>
        Đăng nhập
      </a>

    </nav>
  </div>
</header>


<!-- ═══════════════════════════════════════
     HERO
═══════════════════════════════════════ -->
<section class="hero">
  <div class="container">
    <div class="hero__inner">

      <!-- Left content -->
      <div>
        <div class="hero__badge">
          <i data-lucide="zap" style="width:12px;height:12px"></i>
          Hệ thống quản lý học tập thông minh
        </div>

        <h1 class="hero__title">
          Quản lý điểm số &<br/>
          <span class="accent">Dự đoán học lực</span><br/>
          bằng AI
        </h1>

        <p class="hero__desc">
          Nền tảng số hóa toàn diện cho Khoa CNTT – NTTU. Quản lý sinh viên,
          nhập điểm theo chuẩn tín chỉ, và sử dụng Machine Learning để phát hiện
          sớm sinh viên có nguy cơ.
        </p>

        <div class="hero__actions">
          <a href="/login" class="btn btn--white btn--lg">
            <i data-lucide="layout-dashboard" style="width:16px;height:16px"></i>
            Vào hệ thống
          </a>
          <a href="#features" class="btn btn--ghost-white btn--lg">
            Tìm hiểu thêm
            <i data-lucide="arrow-down" style="width:15px;height:15px"></i>
          </a>
        </div>

        <div class="hero__stats">
          <div>
            <div class="hero__stat-val">10+</div>
            <div class="hero__stat-label">Bảng dữ liệu</div>
          </div>
          <div>
            <div class="hero__stat-val">3</div>
            <div class="hero__stat-label">Khoa quản lý</div>
          </div>
          <div>
            <div class="hero__stat-val">AI</div>
            <div class="hero__stat-label">Random Forest</div>
          </div>
        </div>
      </div>

      <!-- Right: mini bảng điểm demo -->
      <div class="hero__card">
        <div class="hero__card-title">Bảng điểm học kỳ 1 — CNTT01</div>

        <div class="grade-row">
          <span class="grade-row__name">Lập trình cơ bản</span>
          <span class="grade-badge grade-badge--a">A — 4.0</span>
        </div>
        <div class="grade-row">
          <span class="grade-row__name">Cơ sở dữ liệu</span>
          <span class="grade-badge grade-badge--b">B — 3.0</span>
        </div>
        <div class="grade-row">
          <span class="grade-row__name">Mạng máy tính</span>
          <span class="grade-badge grade-badge--a">A — 4.0</span>
        </div>
        <div class="grade-row">
          <span class="grade-row__name">Kỹ thuật phần mềm</span>
          <span class="grade-badge grade-badge--c">C — 2.0</span>
        </div>
        <div class="grade-row">
          <span class="grade-row__name">NodeJS & React</span>
          <span class="grade-badge grade-badge--b">B — 3.0</span>
        </div>

        <div class="ai-chip">
          <i data-lucide="brain-circuit" style="width:14px;height:14px"></i>
          AI: GPA dự đoán HK2 → <strong style="color:#fcd34d; margin-left:.3rem">3.2 / Khá</strong>
        </div>
      </div>

    </div>
  </div>
</section>


<!-- ═══════════════════════════════════════
     FEATURES
═══════════════════════════════════════ -->
<section class="section" id="features">
  <div class="container">

    <div class="section__hd--center" style="text-align:center">
      <div class="section__label" style="margin-inline:auto">
        <i data-lucide="layers" style="width:11px;height:11px"></i>
        Tính năng
      </div>
      <h2 class="section__heading">Đầy đủ mọi nghiệp vụ quản lý</h2>
      <p class="section__sub" style="margin-inline:auto">
        Từ quản lý hành chính đến nhập điểm và phân tích học lực — tất cả trên một nền tảng.
      </p>
    </div>

    <div class="features-grid">

      <div class="feat-card">
        <div class="feat-card__icon">
          <i data-lucide="building-2" style="width:20px;height:20px"></i>
        </div>
        <div class="feat-card__title">Quản lý Khoa & Môn học</div>
        <div class="feat-card__body">Admin tạo khoa, thêm môn học với số tín chỉ và trọng số % tùy chỉnh. Giáo viên được phân quyền theo khoa.</div>
      </div>

      <div class="feat-card">
        <div class="feat-card__icon">
          <i data-lucide="users" style="width:20px;height:20px"></i>
        </div>
        <div class="feat-card__title">Quản lý Sinh viên</div>
        <div class="feat-card__body">CRUD sinh viên theo lớp học phần. Import hàng loạt từ Excel/CSV với preview lỗi từng dòng trước khi lưu.</div>
      </div>

      <div class="feat-card">
        <div class="feat-card__icon">
          <i data-lucide="clipboard-list" style="width:20px;height:20px"></i>
        </div>
        <div class="feat-card__title">Nhập điểm theo chuẩn NTTU</div>
        <div class="feat-card__body">TX, GK, TH, TKT với trọng số % linh hoạt. Tự động tính điểm tổng kết, xếp loại A/B/C/F theo quy tắc đặc biệt.</div>
      </div>

      <div class="feat-card">
        <div class="feat-card__icon">
          <i data-lucide="file-spreadsheet" style="width:20px;height:20px"></i>
        </div>
        <div class="feat-card__title">Import Excel thông minh</div>
        <div class="feat-card__body">Tải template động theo môn học hiện tại. Upload → Preview → Xác nhận import với báo cáo lỗi chi tiết từng dòng.</div>
      </div>

      <div class="feat-card">
        <div class="feat-card__icon">
          <i data-lucide="bell" style="width:20px;height:20px"></i>
        </div>
        <div class="feat-card__title">Cảnh báo & Thông báo</div>
        <div class="feat-card__body">Tự động tạo cảnh báo khi sinh viên có nguy cơ. Notification bell real-time ngay trên dashboard.</div>
      </div>

      <div class="feat-card">
        <div class="feat-card__icon">
          <i data-lucide="shield-check" style="width:20px;height:20px"></i>
        </div>
        <div class="feat-card__title">Bảo mật & Audit Log</div>
        <div class="feat-card__body">JWT Authentication, phân quyền theo khoa. Toàn bộ thao tác được ghi log tự động, giữ lại 90 ngày.</div>
      </div>

    </div>
  </div>
</section>


<!-- ═══════════════════════════════════════
     HOW IT WORKS
═══════════════════════════════════════ -->
<section class="section section--gray" id="how-it-works">
  <div class="container">

    <div style="text-align:center">
      <div class="section__label" style="margin-inline:auto">
        <i data-lucide="workflow" style="width:11px;height:11px"></i>
        Quy trình
      </div>
      <h2 class="section__heading">Cách hệ thống hoạt động</h2>
    </div>

    <div class="steps">

      <div class="step">
        <div class="step__num">1</div>
        <div class="step__title">Admin thiết lập</div>
        <div class="step__desc">Tạo khoa, môn học, lớp học phần. Phân quyền giáo viên theo khoa.</div>
      </div>

      <div class="step">
        <div class="step__num">2</div>
        <div class="step__title">Giáo viên nhập điểm</div>
        <div class="step__desc">Nhập từng sinh viên hoặc import Excel hàng loạt với preview trước khi lưu.</div>
      </div>

      <div class="step">
        <div class="step__num">3</div>
        <div class="step__title">AI phân tích</div>
        <div class="step__desc">Random Forest tự động dự đoán GPA học kỳ tới và phát hiện sinh viên có nguy cơ.</div>
      </div>

      <div class="step">
        <div class="step__num">4</div>
        <div class="step__title">Cảnh báo sớm</div>
        <div class="step__desc">Giáo viên nhận thông báo, xem báo cáo chi tiết và gợi ý can thiệp kịp thời.</div>
      </div>

    </div>
  </div>
</section>


<!-- ═══════════════════════════════════════
     ROLES — PHÂN QUYỀN
═══════════════════════════════════════ -->
<section class="section" id="roles">
  <div class="container--md container">

    <div>
      <div class="section__label">
        <i data-lucide="shield" style="width:11px;height:11px"></i>
        Phân quyền
      </div>
      <h2 class="section__heading">Hai vai trò rõ ràng</h2>
      <p class="section__sub">
        Admin quản lý toàn hệ thống. Giáo viên chỉ truy cập đúng khoa được gán.
      </p>
    </div>

    <div class="roles-split">

      <!-- Admin -->
      <div class="role-card role-card--admin">
        <div class="role-card__header">
          <div class="role-card__avatar">
            <i data-lucide="shield-check" style="width:20px;height:20px"></i>
          </div>
          <div>
            <div class="role-card__name">Admin</div>
            <div class="role-card__role">Quản trị hệ thống</div>
          </div>
        </div>
        <div class="role-list">
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Tạo / xóa khoa, môn học, lớp học phần
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Tạo tài khoản giáo viên & phân khoa
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Xem toàn bộ dữ liệu mọi khoa
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Báo cáo tổng hợp toàn trường
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Xem lịch sử thao tác hệ thống (Audit Log)
          </div>
        </div>
      </div>

      <!-- Giáo viên -->
      <div class="role-card role-card--teacher">
        <div class="role-card__header">
          <div class="role-card__avatar">
            <i data-lucide="user" style="width:20px;height:20px"></i>
          </div>
          <div>
            <div class="role-card__name">Giáo viên</div>
            <div class="role-card__role">Giảng viên — phân quyền theo khoa</div>
          </div>
        </div>
        <div class="role-list">
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Xem lớp học phần & sinh viên thuộc khoa mình
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Nhập điểm TX, GK, TH, TKT theo trọng số tùy chỉnh
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Import điểm hàng loạt từ Excel/CSV
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Xem kết quả AI dự đoán và cảnh báo rủi ro
          </div>
          <div class="role-item">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i>
            Nhận thông báo real-time khi có sinh viên nguy cơ
          </div>
        </div>
      </div>

    </div>
  </div>
</section>


<!-- ═══════════════════════════════════════
     AI PREDICTION
═══════════════════════════════════════ -->
<section class="section section--gray" id="ai">
  <div class="container">

    <div class="ai-split">

      <!-- Left: mockup -->
      <div class="ai-mockup">
        <div class="ai-mockup__header">
          <i data-lucide="brain-circuit" style="width:16px;height:16px"></i>
          Kết quả dự đoán AI — Lớp CNTT01 / HK1
        </div>

        <div class="predict-item">
          <div>
            <div class="predict-item__name">Nguyễn Văn An</div>
            <div class="predict-item__meta">GPA hiện tại: 1.8 · TX thiếu 2 buổi</div>
          </div>
          <span class="predict-badge predict-badge--high">
            <i data-lucide="alert-triangle" style="width:10px;height:10px"></i>
            Nguy cơ cao
          </span>
        </div>

        <div class="predict-item">
          <div>
            <div class="predict-item__name">Trần Thị Bích</div>
            <div class="predict-item__meta">GPA hiện tại: 2.5 · TKT môn CSDL = 5.2</div>
          </div>
          <span class="predict-badge predict-badge--med">
            <i data-lucide="alert-circle" style="width:10px;height:10px"></i>
            Trung bình
          </span>
        </div>

        <div class="predict-item">
          <div>
            <div class="predict-item__name">Lê Minh Cường</div>
            <div class="predict-item__meta">GPA hiện tại: 3.6 · Tất cả môn đạt</div>
          </div>
          <span class="predict-badge predict-badge--low">
            <i data-lucide="check-circle" style="width:10px;height:10px"></i>
            Ổn định
          </span>
        </div>

        <div class="predict-item">
          <div>
            <div class="predict-item__name">Phạm Thị Dung</div>
            <div class="predict-item__meta">GPA hiện tại: 2.1 · Vắng 5 buổi</div>
          </div>
          <span class="predict-badge predict-badge--high">
            <i data-lucide="alert-triangle" style="width:10px;height:10px"></i>
            Nguy cơ cao
          </span>
        </div>

        <div style="margin-top:1rem; padding-top:.85rem; border-top:1px solid var(--gray-200); font-size:.75rem; color:var(--text-muted); display:flex; align-items:center; gap:.4rem">
          <i data-lucide="cpu" style="width:12px;height:12px; color:var(--blue)"></i>
          Mô hình: Random Forest · Accuracy: 81.4% · v1.0
        </div>
      </div>

      <!-- Right: description -->
      <div>
        <div class="section__label">
          <i data-lucide="sparkles" style="width:11px;height:11px"></i>
          Machine Learning
        </div>
        <h2 class="section__heading">
          AI phát hiện<br/>
          <em>nguy cơ sớm</em>
        </h2>
        <p class="section__sub">
          Thay vì đợi kỳ thi kết thúc mới biết sinh viên yếu, hệ thống dự đoán từ đầu học kỳ để can thiệp kịp thời.
        </p>

        <div class="ai-bullets">
          <div class="ai-bullet">
            <div class="ai-bullet__icon">
              <i data-lucide="database" style="width:16px;height:16px"></i>
            </div>
            <div>
              <div class="ai-bullet__title">Train từ dữ liệu thật</div>
              <div class="ai-bullet__desc">Tự đọc môn học từ MongoDB, tính TB có hệ số, không hardcode — Admin thêm môn mới là model tự cập nhật.</div>
            </div>
          </div>

          <div class="ai-bullet">
            <div class="ai-bullet__icon">
              <i data-lucide="trending-up" style="width:16px;height:16px"></i>
            </div>
            <div>
              <div class="ai-bullet__title">Dự đoán GPA học kỳ</div>
              <div class="ai-bullet__desc">Dự báo GPA học kỳ tới, phân loại mức rủi ro (Cao / Trung bình / Thấp) với độ tin cậy %.
              </div>
            </div>
          </div>

          <div class="ai-bullet">
            <div class="ai-bullet__icon">
              <i data-lucide="lightbulb" style="width:16px;height:16px"></i>
            </div>
            <div>
              <div class="ai-bullet__title">Gợi ý can thiệp</div>
              <div class="ai-bullet__desc">Chỉ ra môn yếu cụ thể và đề xuất hành động: ôn thêm, liên hệ phụ huynh, theo dõi chuyên cần.</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>


<!-- ═══════════════════════════════════════
     TECH STACK
═══════════════════════════════════════ -->
<section class="section section--navy" id="tech">
  <div class="container">

    <div style="text-align:center">
      <div class="section__label" style="margin-inline:auto">
        <i data-lucide="code-2" style="width:11px;height:11px"></i>
        Công nghệ
      </div>
      <h2 class="section__heading">Stack hiện đại, kiến trúc 3 tầng</h2>
      <p class="section__sub" style="margin-inline:auto">
        Angular v21 · Node.js Express · Python FastAPI · MongoDB Atlas
      </p>
    </div>

    <div class="tech-badges">
      <span class="tech-badge">
        <i data-lucide="triangle" style="width:12px;height:12px"></i>
        Angular v21
      </span>
      <span class="tech-badge">
        <i data-lucide="server" style="width:12px;height:12px"></i>
        Node.js Express
      </span>
      <span class="tech-badge">
        <i data-lucide="cpu" style="width:12px;height:12px"></i>
        Python FastAPI
      </span>
      <span class="tech-badge">
        <i data-lucide="database" style="width:12px;height:12px"></i>
        MongoDB Atlas
      </span>
      <span class="tech-badge">
        <i data-lucide="brain-circuit" style="width:12px;height:12px"></i>
        scikit-learn
      </span>
      <span class="tech-badge">
        <i data-lucide="lock" style="width:12px;height:12px"></i>
        JWT Auth
      </span>
      <span class="tech-badge">
        <i data-lucide="file-spreadsheet" style="width:12px;height:12px"></i>
        xlsx / multer
      </span>
      <span class="tech-badge">
        <i data-lucide="layers" style="width:12px;height:12px"></i>
        Angular Material
      </span>
    </div>

  </div>
</section>


<!-- ═══════════════════════════════════════
     CTA
═══════════════════════════════════════ -->
<section class="section">
  <div class="container container--md">
    <div class="cta-box">
      <h2 class="cta-box__title">Bắt đầu sử dụng ngay</h2>
      <p class="cta-box__sub">
        Đăng nhập bằng tài khoản được cấp bởi Admin khoa.<br/>
        Hỗ trợ: <strong style="color:rgba(255,255,255,.85)"><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="49282d24202709273d3d3c672c2d3c673f27">[email&#160;protected]</a></strong>
      </p>
      <div class="cta-box__actions">
        <a href="/login" class="btn btn--white btn--lg">
          <i data-lucide="log-in" style="width:16px;height:16px"></i>
          Đăng nhập hệ thống
        </a>
        <a href="#features" class="btn btn--ghost-white btn--lg">
          Xem tính năng
        </a>
      </div>
    </div>
  </div>
</section>


<!-- ═══════════════════════════════════════
     FOOTER
═══════════════════════════════════════ -->
<footer class="footer">
  <div class="container">
    <div class="footer__inner">

      <div class="footer__logo">
        <img src="logo-nttu.png" alt="NTTU" />
        <span>NttuGradeManager — Khoa CNTT, Trường ĐH Nguyễn Tất Thành</span>
      </div>

      <div class="footer__links">
        <a href="#">Giới thiệu</a>
        <a href="#">Hỗ trợ</a>
        <a href="/cdn-cgi/l/email-protection#d7b6b3babeb997b9a3a3a2f9b2
---

## ✅ Checklist sau khi tạo xong

```
□ home.component.ts — standalone, imports RouterLink + LucideAngularModule, ngOnInit redirect nếu đã login
□ home.component.html — không có <html>/<head>/<body>, dùng lucide-icon, dùng routerLink
□ home.component.scss — không có :root {} và reset, chỉ chứa class CSS của trang
□ app.routes.ts — đã có route path: '' → HomeComponent
□ index.html — đã có Google Fonts Be Vietnam Pro
□ src/assets/images/logo-nttu.png — file logo đã được copy vào đúng chỗ
```
