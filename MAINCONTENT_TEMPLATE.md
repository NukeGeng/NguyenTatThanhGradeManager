# 🖼️ MAINCONTENT_TEMPLATE.md — Template main content chuẩn NTTU

> Copilot đọc file này để tạo đúng layout main content cho MỌI trang.
> Dựa trên thiết kế portal sinh viên NTTU (sidebar trắng + topbar trắng + content xám nhạt).

---

## 🏗️ CẤU TRÚC LAYOUT TỔNG THỂ

```scss
// Shell: topbar + body
.shell {
  display: grid;
  grid-template-rows: 56px 1fr;
  min-height: 100vh;
  background: #f1f5f9;
}

// Topbar: full width, nền trắng
.topbar {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  z-index: 100;
}

// Body: sidebar + main
.body {
  display: grid;
  grid-template-columns: 210px 1fr;
  overflow: hidden;
}

// Sidebar: nền trắng, border phải
.sidebar {
  background: #fff;
  border-right: 1px solid #e2e8f0;
  padding: 12px 8px;
  overflow-y: auto;
}

// Main content: nền xám nhạt, có padding
.main {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f1f5f9;
}
```

---

## 📐 CÁC THÀNH PHẦN TRONG MAIN CONTENT

### 1. Breadcrumb + Page Header

```html
<!-- Breadcrumb -->
<div class="breadcrumb">
  <a routerLink="/dashboard">Trang chủ</a>
  <span class="breadcrumb-sep">›</span>
  <span>Tên trang hiện tại</span>
</div>

<!-- Page header: title bên trái, buttons bên phải -->
<div class="page-hd">
  <div>
    <h1 class="page-title">Tên trang</h1>
    <p class="page-sub">Mô tả ngắn gọn về chức năng trang</p>
  </div>
  <div class="btn-row">
    <button class="btn btn-outline btn-sm">
      <lucide-icon name="upload" [size]="13"></lucide-icon>
      Import Excel
    </button>
    <button class="btn btn-primary btn-sm">
      <lucide-icon name="plus" [size]="13"></lucide-icon>
      Thêm mới
    </button>
  </div>
</div>
```

```scss
.breadcrumb {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #94a3b8;
  a { color: #2563eb; text-decoration: none; }
  &-sep { color: #cbd5e1; font-size: 10px; }
}
.page-hd { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.page-title { font-size: 17px; font-weight: 800; color: #1a3464; letter-spacing: -.02em; margin: 0; }
.page-sub { font-size: 12px; color: #94a3b8; margin: 2px 0 0; }
.btn-row { display: flex; align-items: center; gap: 8px; }
```

---

### 2. Stats Row (4 thẻ số liệu)

```html
<div class="stats-row">
  <div class="stat">
    <div class="stat-icon si-blue">
      <lucide-icon name="layers" [size]="16"></lucide-icon>
    </div>
    <div class="stat-val">24</div>
    <div class="stat-lbl">Tổng lớp học phần</div>
  </div>
  <!-- thêm 3 stat nữa tương tự -->
</div>
```

```scss
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
}
.stat-icon {
  width: 32px; height: 32px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 10px;
}
.si-blue  { background: #eff6ff; color: #2563eb; }
.si-green { background: #f0fdf4; color: #16a34a; }
.si-red   { background: #fef2f2; color: #dc2626; }
.si-amber { background: #fffbeb; color: #d97706; }
.stat-val { font-size: 20px; font-weight: 800; color: #1a3464; line-height: 1; }
.stat-lbl { font-size: 11px; color: #94a3b8; margin-top: 3px; }

@media (max-width: 1024px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
```

---

### 3. Filter Bar

```html
<div class="filter-bar">
  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <mat-select placeholder="Năm học">
      <mat-option value="2024">2024-2025</mat-option>
    </mat-select>
  </mat-form-field>

  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <mat-select placeholder="Học kỳ">
      <mat-option value="1">Học kỳ 1</mat-option>
      <mat-option value="2">Học kỳ 2</mat-option>
    </mat-select>
  </mat-form-field>

  <div class="filter-spacer"></div>

  <mat-form-field appearance="outline" subscriptSizing="dynamic">
    <lucide-icon matPrefix name="search" [size]="14"></lucide-icon>
    <input matInput placeholder="Tìm kiếm...">
  </mat-form-field>
</div>
```

```scss
.filter-bar {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  mat-form-field { font-size: 12px; }
}
.filter-spacer { flex: 1; }
```

---

### 4. Bảng dữ liệu (mat-table chuẩn NTTU)

```html
<div class="table-card">
  <!-- Card header -->
  <div class="table-card-hd">
    <div class="table-card-title">
      <lucide-icon name="table" [size]="14"></lucide-icon>
      Danh sách
    </div>
    <span class="chip chip-blue">{{ totalCount }} bản ghi</span>
  </div>

  <!-- Table -->
  <table mat-table [dataSource]="dataSource" matSort>

    <!-- STT Column -->
    <ng-container matColumnDef="stt">
      <th mat-header-cell *matHeaderCellDef class="col-stt">STT</th>
      <td mat-cell *matCellDef="let i = index" class="col-stt">{{ i + 1 }}</td>
    </ng-container>

    <!-- Code Column -->
    <ng-container matColumnDef="code">
      <th mat-header-cell *matHeaderCellDef mat-sort-header>Mã</th>
      <td mat-cell *matCellDef="let row">
        <span class="td-code">{{ row.code }}</span>
      </td>
    </ng-container>

    <!-- Name Column -->
    <ng-container matColumnDef="name">
      <th mat-header-cell *matHeaderCellDef mat-sort-header>Tên</th>
      <td mat-cell *matCellDef="let row">
        <div class="td-name">{{ row.name }}</div>
        <div class="td-sub">{{ row.subtitle }}</div>
      </td>
    </ng-container>

    <!-- Status Column -->
    <ng-container matColumnDef="status">
      <th mat-header-cell *matHeaderCellDef class="col-center">Trạng thái</th>
      <td mat-cell *matCellDef="let row" class="col-center">
        <span [class]="'chip ' + getStatusClass(row.status)">
          {{ row.status }}
        </span>
      </td>
    </ng-container>

    <!-- Actions Column -->
    <ng-container matColumnDef="actions">
      <th mat-header-cell *matHeaderCellDef class="col-center">Thao tác</th>
      <td mat-cell *matCellDef="let row" class="col-center">
        <div class="action-group">
          <button class="act-btn" (click)="onEdit(row)" matTooltip="Sửa">
            <lucide-icon name="pencil" [size]="12"></lucide-icon>
          </button>
          <button class="act-btn danger" (click)="onDelete(row)" matTooltip="Xóa">
            <lucide-icon name="trash-2" [size]="12"></lucide-icon>
          </button>
        </div>
      </td>
    </ng-container>

    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

    <!-- Empty state -->
    <tr class="mat-row" *matNoDataRow>
      <td [attr.colspan]="displayedColumns.length">
        <div class="empty-state">
          <lucide-icon name="inbox" [size]="40"></lucide-icon>
          <h3>Không có dữ liệu</h3>
          <p>Chưa có bản ghi nào phù hợp</p>
        </div>
      </td>
    </tr>
  </table>

  <!-- Paginator -->
  <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
</div>
```

```scss
/* ── Table card wrapper ── */
.table-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.table-card-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.table-card-title {
  font-size: 13px; font-weight: 700; color: #1a3464;
  display: flex; align-items: center; gap: 6px;
  border-left: 3px solid #2563eb; padding-left: 8px;
  border-radius: 0;
  lucide-icon { color: #2563eb; }
}

/* ── Mat-table override chuẩn NTTU ── */
.mat-mdc-header-row {
  background: #f8fafc !important;
  border-bottom: 2px solid #2563eb !important;
}
.mat-mdc-header-cell {
  color: #1a3464 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 9px 14px !important;
  white-space: nowrap;
  font-family: 'Be Vietnam Pro', sans-serif !important;
}
.mat-mdc-row {
  border-bottom: 1px solid #f1f5f9 !important;
  transition: background .12s;
  &:hover { background: #f8fafc !important; }
}
.mat-mdc-cell {
  padding: 9px 14px !important;
  font-size: 12px !important;
  font-family: 'Be Vietnam Pro', sans-serif !important;
}
.col-stt, .col-center { text-align: center !important; }
.mat-mdc-paginator {
  border-top: 1px solid #f1f5f9;
  font-family: 'Be Vietnam Pro', sans-serif !important;
}

/* ── Cell content helpers ── */
.td-code { font-weight: 700; color: #1a3464; font-family: monospace; font-size: 11px; }
.td-name { font-weight: 500; color: #1e293b; }
.td-sub  { font-size: 11px; color: #94a3b8; margin-top: 1px; }

/* ── Chips / Badges ── */
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10px; font-weight: 700; white-space: nowrap;
}
.chip-blue   { background: #eff6ff; color: #1d4ed8; }
.chip-green  { background: #f0fdf4; color: #15803d; }
.chip-gray   { background: #f1f5f9; color: #475569; }
.chip-red    { background: #fef2f2; color: #b91c1c; }
.chip-amber  { background: #fffbeb; color: #92400e; }

/* Grade badges */
.grade-a { background: #f0fdf4; color: #15803d; }
.grade-b { background: #eff6ff; color: #1d4ed8; }
.grade-c { background: #fffbeb; color: #92400e; }
.grade-f { background: #fef2f2; color: #b91c1c; }

/* ── Action buttons trong bảng ── */
.action-group { display: flex; gap: 4px; justify-content: center; }
.act-btn {
  width: 26px; height: 26px;
  border: 1px solid #e2e8f0; border-radius: 5px;
  background: #fff; cursor: pointer; color: #64748b;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0; transition: all .12s;
  &:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
  &.danger:hover { border-color: #dc2626; color: #dc2626; background: #fef2f2; }
  &:disabled { opacity: .4; cursor: not-allowed; }
}

/* ── Empty state ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 24px; text-align: center; gap: 8px; color: #94a3b8;
  lucide-icon { opacity: .35; }
  h3 { font-size: 14px; font-weight: 700; color: #64748b; margin: 0; }
  p  { font-size: 12px; margin: 0; }
}

/* ── Skeleton loader ── */
.skeleton {
  background: #e2e8f0; border-radius: 4px;
  animation: sk-pulse 1.5s ease-in-out infinite;
}
@keyframes sk-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
.skeleton-row { height: 44px; margin-bottom: 1px; }
```

---

## 🧩 BUTTONS CHUẨN

```scss
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 5px; border-radius: 7px; font-size: 12px; font-weight: 600;
  cursor: pointer; border: none; line-height: 1; white-space: nowrap;
  transition: all .15s; font-family: 'Be Vietnam Pro', sans-serif;
  lucide-icon { width: 13px; height: 13px; }
}
.btn-primary { background: #1a3464; color: #fff; padding: 7px 14px;
  &:hover { background: #243d73; } }
.btn-outline { background: #fff; color: #1a3464; padding: 7px 14px;
  border: 1px solid #1a3464;
  &:hover { background: #eff6ff; } }
.btn-danger  { background: #dc2626; color: #fff; padding: 7px 14px;
  &:hover { background: #b91c1c; } }
.btn-sm  { padding: 5px 10px; font-size: 11px; }
.btn-lg  { padding: 9px 20px; font-size: 13px; border-radius: 8px; }
```

---

## 📋 CHECKLIST DÙNG TEMPLATE

```
□ import .page-container, .page-hd, .stats-row từ _page.scss vào styles.scss
□ import mat-table overrides vào styles.scss (dùng được cho tất cả trang)
□ Mỗi trang dùng cấu trúc: breadcrumb → page-hd → stats-row → filter-bar → table-card
□ displayedColumns khai báo đúng thứ tự: ['stt', 'code', 'name', ..., 'actions']
□ MatTableDataSource + MatPaginator + MatSort inject đúng
□ Empty state dùng *matNoDataRow
□ Skeleton loader dùng khi isLoading = true
□ Tất cả icon: lucide-icon [size]="N" — KHÔNG mat-icon system
```
