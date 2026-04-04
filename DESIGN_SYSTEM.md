# 🎨 DESIGN_SYSTEM.md — NttuGradeManager UI Rules

> Dán file này vào đầu MỌI prompt frontend.
> Copilot / AI phải tuân theo toàn bộ quy tắc bên dưới.

---

## 1. CSS Variables — `styles.scss`

```scss
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');

:root {
  /* ── Brand ── */
  --navy:        #1a3464;
  --navy-dark:   #0f2144;
  --navy-mid:    #243d73;
  --blue:        #2563eb;
  --blue-light:  #3b82f6;
  --blue-pale:   #eff6ff;
  --gold:        #f59e0b;
  --gold-light:  #fbbf24;

  /* ── Neutral ── */
  --white:       #ffffff;
  --gray-50:     #f8fafc;
  --gray-100:    #f1f5f9;
  --gray-200:    #e2e8f0;
  --gray-300:    #cbd5e1;
  --gray-400:    #94a3b8;
  --gray-600:    #475569;
  --gray-800:    #1e293b;
  --text:        #1e293b;
  --text-sub:    #475569;
  --text-muted:  #94a3b8;

  /* ── Status ── */
  --green:       #16a34a;
  --green-pale:  #f0fdf4;
  --yellow:      #d97706;
  --yellow-pale: #fffbeb;
  --red:         #dc2626;
  --red-pale:    #fef2f2;

  /* ── Layout ── */
  --container-max: 1200px;
  --pad:           clamp(1rem, 4vw, 2rem);
  --radius:        12px;
  --radius-sm:     8px;
  --radius-lg:     20px;
  --shadow:        0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06);
  --shadow-md:     0 4px 24px rgba(26,52,100,.12);
  --shadow-lg:     0 8px 40px rgba(26,52,100,.18);
  --transition:    all .2s ease;

  font-family: 'Be Vietnam Pro', sans-serif;
  font-size: 16px;
  color: var(--text);
}
```

---

## 2. Container — giới hạn width chuẩn

```scss
// LUÔN bọc content trong .container — KHÔNG để full-width
.container {
  width: 100%;
  max-width: var(--container-max);  // 1200px
  margin-inline: auto;              // căn giữa
  padding-inline: var(--pad);       // responsive padding
}

.container--sm  { max-width: 760px;  }
.container--md  { max-width: 960px;  }
```

---

## 3. Button — quy tắc bắt buộc

```scss
// ✅ LUÔN dùng inline-flex để icon không bị lệch
.btn {
  display: inline-flex;    // KHÔNG dùng block / flex
  align-items: center;     // căn icon + text theo chiều dọc
  justify-content: center;
  gap: .4rem;
  padding: .6rem 1.4rem;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: .875rem;
  font-weight: 600;
  white-space: nowrap;     // không xuống dòng
  line-height: 1;          // tránh chiều cao không đều
  border: 2px solid transparent;
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
}

// Nhóm nhiều button cạnh nhau
.btn-group {
  display: flex;
  align-items: center;     // căn đều chiều cao
  gap: .75rem;
  flex-wrap: wrap;
}

// Biến thể màu
.btn--primary   { background: var(--navy);  color: #fff; }
.btn--blue      { background: var(--blue);  color: #fff; }
.btn--outline   { border-color: var(--navy); color: var(--navy); }
.btn--ghost     { color: var(--navy); background: transparent; }
.btn--danger    { background: var(--red);   color: #fff; }

// Kích thước
.btn--sm  { padding: .4rem 1rem;  font-size: .8rem;  }
.btn--lg  { padding: .8rem 2rem;  font-size: .95rem; border-radius: var(--radius); }
```

---

## 4. Angular Material — override bắt buộc

```scss
// styles.scss — paste toàn bộ đoạn này

// Font & button alignment
.mat-mdc-button,
.mat-mdc-raised-button,
.mat-mdc-outlined-button,
.mat-mdc-unelevated-button,
.mat-mdc-icon-button {
  display: inline-flex !important;
  align-items: center !important;
  font-family: 'Be Vietnam Pro', sans-serif !important;
  letter-spacing: 0 !important;
  gap: 6px;
}

// mat-icon size chuẩn trong button
.mat-mdc-button .mat-icon,
.mat-mdc-raised-button .mat-icon,
.mat-mdc-outlined-button .mat-icon {
  font-size: 18px !important;
  width: 18px !important;
  height: 18px !important;
  line-height: 1 !important;
  margin: 0 !important;
}

// Form field font
.mat-mdc-form-field,
.mat-mdc-select,
.mat-mdc-option {
  font-family: 'Be Vietnam Pro', sans-serif !important;
}

// Table font
.mat-mdc-table,
.mat-mdc-header-cell,
.mat-mdc-cell {
  font-family: 'Be Vietnam Pro', sans-serif !important;
}

// Dialog
.mat-mdc-dialog-container {
  border-radius: var(--radius-lg) !important;
}

// Snackbar
.mat-mdc-snack-bar-container {
  font-family: 'Be Vietnam Pro', sans-serif !important;
}
```

---

## 5. Icon — Lucide Angular (bắt buộc)

```
Cài:    npm install lucide-angular

Import vào component:
  import { LucideAngularModule, Users, AlertTriangle, ... } from 'lucide-angular';
  imports: [LucideAngularModule.pick({ Users, AlertTriangle })]

Dùng trong template:
  <lucide-icon name="users"          [size]="18"></lucide-icon>
  <lucide-icon name="alert-triangle" [size]="16" color="#dc2626"></lucide-icon>
  <lucide-icon name="check-circle"   [size]="16" color="#16a34a"></lucide-icon>

❌ KHÔNG dùng:  <mat-icon>person</mat-icon>  (icon từ hệ thống)
✅ LUÔN dùng:   <lucide-icon name="user">    (icon từ Lucide)

Tên icon hay dùng:
  users, user, user-plus, user-check
  building-2, layers, shield, shield-check
  book-open, clipboard-list, file-spreadsheet
  brain-circuit, trending-up, alert-triangle, alert-circle
  check-circle, x-circle, info
  bell, log-in, log-out, settings, search
  plus, pencil, trash-2, eye, eye-off
  download, upload, file-down
  chevron-right, arrow-left, arrow-right
```

---

## 6. Màu sắc trạng thái — dùng nhất quán

```scss
// Xếp loại A/B/C/F
.grade-a { background: var(--green-pale);  color: var(--green);  }  // A — 4.0
.grade-b { background: var(--blue-pale);   color: var(--blue);   }  // B — 3.0
.grade-c { background: var(--yellow-pale); color: var(--yellow); }  // C — 2.0
.grade-f { background: var(--red-pale);    color: var(--red);    }  // F — 0.0

// Mức rủi ro AI
.risk-high { background: var(--red-pale);    color: var(--red);    }
.risk-med  { background: var(--yellow-pale); color: var(--yellow); }
.risk-low  { background: var(--green-pale);  color: var(--green);  }

// Badge dùng chung
.badge {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  font-size: .72rem;
  font-weight: 700;
  padding: .2rem .6rem;
  border-radius: 999px;
  white-space: nowrap;
}
```

---

## 7. Card — layout cơ bản

```scss
.card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 1.5rem;
  transition: var(--transition);
  box-shadow: var(--shadow);
}

.card:hover {
  border-color: rgba(37,99,235,.2);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

// Card có top border màu khi hover
.card--accent::before {
  content: '';
  display: block;
  height: 3px;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(90deg, var(--navy), var(--blue));
  margin: -1.5rem -1.5rem 1.5rem;
  opacity: 0;
  transition: var(--transition);
}
.card--accent:hover::before { opacity: 1; }
```

---

## 8. Responsive breakpoints

```scss
// Desktop first — thu nhỏ xuống
@media (max-width: 1024px) { /* tablet landscape */ }
@media (max-width: 768px)  { /* tablet portrait  */ }
@media (max-width: 480px)  { /* mobile           */ }

// Grid responsive hay dùng
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
}
```

---

## 9. Template prompt — dán vào đầu MỌI prompt Angular

```
=== DESIGN SYSTEM (đọc kỹ trước khi code) ===
Stack     : Angular v21 standalone + Angular Material + Lucide Angular
Font      : Be Vietnam Pro — import qua Google Fonts trong index.html
Variables : dùng var(--navy), var(--blue), var(--text-sub) theo design system
Button    : display:inline-flex + align-items:center + gap:.4rem + line-height:1
Icon      : <lucide-icon name="..."> — KHÔNG dùng mat-icon system
Container : max-width:1200px + margin-inline:auto + padding-inline responsive
Grade màu : A=green(#16a34a) B=blue(#2563eb) C=yellow(#d97706) F=red(#dc2626)
Risk màu  : high=red  medium=yellow  low=green

=== BUGS ĐÃ GẶP (không lặp lại) ===
[dán nội dung BUGS.md]

=== ĐÃ HOÀN THÀNH (không làm lại) ===
[dán nội dung DONE.md]

=== YÊU CẦU ===
[mô tả component / tính năng cần tạo]
```
