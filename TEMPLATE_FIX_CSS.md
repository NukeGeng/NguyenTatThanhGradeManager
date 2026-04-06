# 📄 PAGES_PROMPT.md — Prompt UI cho các trang chức năng

> Mỗi section là 1 prompt riêng biệt cho 1 trang.
> Dán DESIGN_SYSTEM.md + BUGS.md + DONE.md vào đầu mỗi prompt trước khi gửi.

---

## 🔖 QUY TẮC CHUNG CHO MỌI TRANG

```
Style chuẩn theo portal NTTU (ảnh tham khảo):
- Nền trắng (#fff), content area nền xám nhạt (#f8fafc)
- Header bảng: nền trắng, chữ navy đậm, border-bottom 2px var(--blue)
- Row bảng: hover nền #eff6ff nhẹ, border-bottom 1px var(--gray-100)
- Filter bar: nền trắng, border 1px var(--gray-200), border-radius 8px
- Button primary: nền var(--navy), chữ trắng
- Button outline: border var(--navy), chữ navy
- Badge/chip: border-radius 999px, font-size .72rem, font-weight 700
- Section title: có border-left 3px solid var(--blue), padding-left .75rem
- Table: width 100%, border-collapse collapse, font-size .875rem
- mat-table: dùng MatTableModule + MatPaginatorModule + MatSortModule
- Icon: lucide-icon [size]="16" — KHÔNG dùng mat-icon
- Dialog: MatDialog, border-radius 16px, min-width 480px
- Snackbar: MatSnackBar để thông báo thành công/lỗi
```

---

## 📅 TRANG 1 — /classes (Lớp học phần)

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM + BUGS + DONE]

Tạo features/classes/class-list/class-list.component.ts (standalone)

=== DỮ LIỆU ===
API calls:
  GET /api/classes?departmentId=&schoolYearId=&semester=  → danh sách lớp
  GET /api/departments → dropdown filter khoa
  GET /api/school-years/current → năm học hiện tại
  POST /api/classes → tạo lớp mới [Admin]
  PUT /api/classes/:id → sửa lớp
  DELETE /api/classes/:id → xóa lớp [Admin]

Interface Class: {
  _id, code, name, departmentId, schoolYearId, semester,
  subjectId, teacherId, studentCount, weights, isActive
}

=== LAYOUT ===

Cấu trúc trang (dùng .page-container):

1. PAGE HEADER:
   - Breadcrumb: Trang chủ › Lớp học
   - Title: "Lớp học phần"
   - Subtitle: "Quản lý các lớp học phần theo khoa và học kỳ"
   - Button "Thêm lớp học phần" [adminOnly] — lucide-icon name="plus"

2. FILTER BAR (card trắng, padding 1rem, border-radius 8px):
   - Dropdown: Năm học (load từ API)
   - Dropdown: Học kỳ (HK1 / HK2)
   - Dropdown: Khoa (load từ API, Teacher chỉ thấy khoa mình)
   - Input search: tìm theo tên lớp / mã lớp
   - Tất cả filter dùng MatFormField appearance="outline", subscriptSizing="dynamic"

3. BẢNG (MatTable trong content-card):
   Header bảng style: background var(--gray-50), color var(--navy), font-weight 700,
   border-bottom: 2px solid var(--blue), font-size .8rem, text-transform uppercase,
   letter-spacing .04em

   Cột:
   - STT (width 60px, căn giữa)
   - Mã lớp HP (width 140px, font-weight 600, color var(--navy))
   - Tên môn học (flex)
   - Khoa (chip màu xanh nhạt)
   - HK (width 70px, căn giữa, badge pill)
   - Số TC (width 70px, căn giữa)
   - Sĩ số (width 80px, căn giữa)
   - Trọng số % (width 140px):
     hiện "TX:10 GK:30 TH:0 TKT:60" dạng text nhỏ, font-mono .75rem
   - Trạng thái (width 100px):
     badge "Đang mở" xanh lá / "Đã đóng" xám
   - Thao tác (width 100px, căn giữa):
     lucide-icon name="pencil" button outline nhỏ
     lucide-icon name="trash-2" button đỏ nhỏ [adminOnly]

   - MatPaginator bên dưới: 10/25/50 per page
   - MatSort trên các cột tên, khoa, sĩ số

4. DIALOG Thêm/Sửa lớp học phần:
   MatDialog 2 cột grid:
   - Mã lớp HP (readonly khi sửa)
   - Tên lớp (text)
   - Khoa (dropdown MatSelect)
   - Môn học (dropdown MatSelect, lọc theo khoa)
   - Giáo viên phụ trách (dropdown MatSelect)
   - Học kỳ (1 / 2)
   - Năm học (dropdown)
   Phần trọng số % (section riêng có title):
     4 ô số: TX% | GK% | TH% | TKT%
     Real-time validation: tổng phải = 100%, hiện tổng hiện tại bên dưới
     Nếu tổng ≠ 100 → border đỏ + "Tổng trọng số phải bằng 100%"

5. EMPTY STATE (khi không có lớp):
   lucide-icon name="inbox" size=48, color var(--gray-300)
   "Chưa có lớp học phần nào" + button Thêm mới

6. LOADING STATE:
   Skeleton loader 5 rows dùng animation pulse
   CSS: @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
```

---

## 📊 TRANG 2 — /grades (Nhập điểm)

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM + BUGS + DONE]

Tạo features/grades/grade-list/grade-list.component.ts (standalone)
và features/grades/grade-entry/grade-entry.component.ts (standalone)

=== DỮ LIỆU ===
API:
  GET /api/classes?teacherId=me → lớp GV đang dạy
  GET /api/grades/class/:classId?semester=&schoolYearId= → điểm cả lớp
  POST /api/grades → nhập điểm 1 SV
  PUT /api/grades/:id → sửa điểm
  POST /api/grades/import/template → tải Excel mẫu
  POST /api/grades/import/preview → preview import
  POST /api/grades/import/excel → import thật

=== LAYOUT grade-list ===

1. PAGE HEADER:
   - Title: "Quản lý điểm số"
   - Subtitle: "Nhập và theo dõi điểm theo lớp học phần"
   - Nút "Nhập điểm" (routerLink="/grades/entry") + nút "Import Excel"

2. FILTER BAR:
   - Dropdown: Lớp học phần (chỉ lớp GV được phân công)
   - Dropdown: Học kỳ + Năm học
   - Input search tên sinh viên
   - Nút "Tải template Excel" → gọi GET /api/grades/import/template

3. BẢNG ĐIỂM (style giống portal NTTU):
   Header: nền trắng, border-bottom 2px var(--blue), chữ var(--navy) bold
   Cột:
   - STT
   - Mã SV (font-weight 600, color var(--navy))
   - Họ tên sinh viên
   - TX1 / TX2 / TX3 (input number, width 60px, nếu chưa nhập hiện placeholder "—")
   - TB TX (tự tính, color var(--blue), font-weight 600)
   - Giữa kỳ (input number)
   - Thực hành (input, ẩn nếu weights.th === 0)
   - Thi kết thúc HP (input number, highlight màu cam nếu < 4)
   - Điểm TK (tự tính real-time, font-weight 700)
     màu: ≥8.5 → green, ≥7.0 → blue, ≥5.0 → yellow, <5.0 → red
   - Thang 4 / Xếp loại:
     badge A=green / B=blue / C=yellow / F=red
   - Trạng thái: "Đã lưu" chip xanh / "Chưa lưu" chip xám
   - Thao tác: nút Lưu + nút Xem dự đoán AI

   Trên header mỗi nhóm cột có label nhóm:
   "Đánh giá thường xuyên" gộp TX1,TX2,TX3,TB TX (colspan)
   "Điểm thực hành" gộp TH1,TH2,TH3 (colspan, ẩn nếu không có TH)
   → Dùng 2 hàng header như portal NTTU

   Inline editing: click vào ô → input số 0-10
   Tab để chuyển ô tiếp theo
   Auto-save khi blur khỏi ô

4. FOOTER BẢNG:
   Tổng kết: "Đã nhập: 25/30 sinh viên | Trung bình lớp: 7.4 | Tỉ lệ đạt: 86.7%"

5. IMPORT EXCEL DIALOG (MatStepper 4 bước):
   Bước 1: Chọn lớp + học kỳ + nút tải template
   Bước 2: Drag&drop upload .xlsx/.csv
   Bước 3: Preview 2 tab (Hợp lệ / Lỗi với màu xanh/đỏ, số dòng lỗi)
   Bước 4: Kết quả import + nút "Chạy AI dự đoán cả lớp"
```

---

## 👥 TRANG 3 — /users (Quản lý Giáo viên)

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM + BUGS + DONE]

Tạo features/users/user-list/user-list.component.ts (standalone)
[Admin only — guard route]

=== DỮ LIỆU ===
API:
  GET /api/users?departmentId= → danh sách GV
  GET /api/departments → filter khoa
  POST /api/users → tạo GV mới
  PUT /api/users/:id → sửa thông tin
  PATCH /api/users/:id/departments → cập nhật khoa
  PATCH /api/users/:id/toggle → bật/tắt tài khoản
  DELETE /api/users/:id → xóa

=== LAYOUT ===

1. PAGE HEADER:
   - Title: "Quản lý Giáo viên"
   - Subtitle: "Tạo tài khoản và phân quyền giảng viên theo khoa"
   - Button "Thêm giáo viên" — lucide-icon name="user-plus"

2. STATS ROW (4 stat cards):
   - Tổng giáo viên (icon users, màu navy)
   - Đang hoạt động (icon user-check, màu green)
   - Bị vô hiệu hóa (icon user-x, màu red)
   - Dạy nhiều khoa (icon building-2, màu blue)

3. FILTER BAR:
   - Search: tên hoặc email giáo viên
   - Dropdown: Khoa
   - Dropdown: Trạng thái (Hoạt động / Vô hiệu hóa)

4. BẢNG:
   Cột:
   - Avatar + Họ tên (2 dòng: tên to + email nhỏ muted)
     Avatar: circle 36px gradient navy→blue, 2 chữ viết tắt
   - Email (@nttu.edu.vn)
   - Khoa đang dạy: chips mỗi khoa 1 chip xanh nhạt
     Nếu > 2 khoa → "+N khác" chip xám
   - Số lớp đang dạy (badge số)
   - Lần đăng nhập cuối (relative time: "2 giờ trước")
   - Trạng thái:
     toggle MatSlideToggle hoặc chip "Hoạt động"/"Vô hiệu"
   - Thao tác:
     lucide "pencil" (sửa info)
     lucide "building-2" (phân khoa)
     lucide "trash-2" [ngClass danger]

5. DIALOG Tạo/Sửa giáo viên:
   - Họ tên* (required)
   - Email* (required, validate @nttu.edu.vn)
   - Số điện thoại
   - Mật khẩu (chỉ hiện khi TẠO MỚI, ẩn khi sửa)
     có icon eye/eye-off toggle show/hide
   - Phân khoa:
     Checkbox list các khoa đang active
     "Chọn tất cả" toggle
     Validate: phải chọn ít nhất 1 khoa
   - Role: radio Admin / Giáo viên

6. DIALOG Phân khoa (riêng biệt):
   Title: "Phân khoa cho [Tên GV]"
   Checkbox list đẹp: mỗi khoa 1 row, có icon building-2,
   tên khoa, số môn thuộc khoa
   Hiện rõ "Đang dạy X khoa"
```

---

## 🏢 TRANG 4 — /departments (Quản lý Khoa)

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM + BUGS + DONE]

Tạo features/departments/department-list/department-list.component.ts (standalone)
[Admin only]

=== DỮ LIỆU ===
API:
  GET /api/departments → danh sách khoa
  GET /api/departments/:id → chi tiết (GV + môn)
  POST /api/departments → tạo khoa
  PUT /api/departments/:id → sửa
  DELETE /api/departments/:id → xóa

=== LAYOUT ===

1. PAGE HEADER:
   - Title: "Quản lý Khoa"
   - Button "Thêm khoa mới"

2. GRID 3 CỘT (thay vì bảng — trực quan hơn):
   Mỗi khoa là 1 CARD (content-card style):

   CARD HEADER:
   - Icon building-2 trong circle (màu navy, background xanh nhạt)
   - Mã khoa (badge pill navy) + Tên khoa (h3)
   - Badge trạng thái: "Đang hoạt động" green / "Tạm dừng" gray

   CARD BODY (3 stat số ngang):
   - [icon users] X Giáo viên
   - [icon layers] X Môn học
   - [icon school] X Lớp HP

   CARD FOOTER:
   - Nút "Xem chi tiết" (routerLink /departments/:id)
   - Nút icon pencil (sửa)
   - Nút icon trash-2 (xóa)

3. TRANG CHI TIẾT KHOA /departments/:id:
   Tạo department-detail.component.ts

   Layout: 1 cột
   Header: tên khoa + mã + badge + breadcrumb

   3 TAB dùng MatTabGroup:
   Tab 1 "Môn học":
     - Filter: Học kỳ HK1/HK2/Tất cả + search tên môn
     - Bảng: Mã môn | Tên môn | Tín chỉ | HK | Hệ số | Trạng thái | Thao tác
     - Nút "Thêm môn học" → mở dialog

   Tab 2 "Giáo viên":
     - Danh sách GV thuộc khoa (avatar + tên + email + số lớp)
     - Nút "Phân thêm GV" → mở dialog chọn GV

   Tab 3 "Lớp học phần":
     - Bảng lớp theo năm học + học kỳ
     - Filter năm học + học kỳ

4. DIALOG Tạo/Sửa khoa:
   - Mã khoa (code: CNTT, KTKT — uppercase, readonly khi sửa)
   - Tên khoa đầy đủ
   - Mô tả (textarea)
   - Trưởng khoa (dropdown GV)
```

---

## 📚 TRANG 5 — /subjects (Quản lý Môn học)

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM + BUGS + DONE]

Tạo features/subjects/subject-list/subject-list.component.ts (standalone)
[Admin only]

=== DỮ LIỆU ===
API:
  GET /api/subjects?departmentId=&semester=&isActive= → danh sách
  GET /api/departments → filter
  POST /api/subjects → thêm môn
  PUT /api/subjects/:id → sửa
  PATCH /api/subjects/:id/toggle → bật/tắt
  DELETE /api/subjects/:id → xóa (chỉ khi chưa có điểm)

=== LAYOUT ===

1. PAGE HEADER:
   - Title: "Quản lý Môn học"
   - Subtitle: "Danh mục môn học theo khoa và học kỳ"
   - Button "Thêm môn học"

2. FILTER BAR (inline, 1 hàng ngang):
   - Dropdown: Khoa (load từ API)
   - Dropdown: Học kỳ (HK1 / HK2 / Tất cả)
   - Toggle: Chỉ hiện môn đang active (MatSlideToggle)
   - Search: tìm theo tên hoặc mã môn

3. BẢNG:
   Header style: border-bottom 2px var(--blue), chữ navy uppercase letter-spacing
   Cột:
   - Mã môn (width 100px, font-mono .85rem, color var(--navy), font-weight 700)
   - Tên môn học
   - Khoa (chip xanh nhạt với icon building-2)
   - Số tín chỉ (width 80px, căn giữa, badge circle navy)
   - Học kỳ (width 90px, căn giữa):
     "HK 1" badge xanh / "HK 2" badge tím / "Cả hai" badge xám
   - Trọng số mặc định (width 180px):
     mini progress bar hoặc text "TX:10 GK:30 TH:0 TKT:60"
     font-size .75rem, font-family monospace
   - Trạng thái (width 110px):
     MatSlideToggle inline, label "Đang dùng" / "Tắt"
     onChange → gọi PATCH /toggle ngay
   - Thao tác:
     icon pencil (sửa)
     icon trash-2 (xóa — disabled nếu đã có điểm, tooltip "Đã có dữ liệu điểm")

4. DIALOG Thêm/Sửa môn học (2 cột grid):
   Cột trái:
   - Mã môn* (lowercase, a-z+số, validate regex, readonly khi sửa)
     Placeholder: "vd: ltcb, csdl, mmt"
     Warning icon nếu đang sửa: "Không thể đổi mã sau khi có dữ liệu điểm"
   - Tên môn học* (required)
   - Khoa* (MatSelect dropdown, required)
   - Danh mục (science/social/language/specialized/other)

   Cột phải:
   - Số tín chỉ* (1-5, MatInput type=number)
   - Học kỳ* (radio: HK1 / HK2 / Cả hai)
   - Số cột TX (1-5, default 3)

   Phần trọng số % (full width, section riêng):
   Title: "Trọng số đánh giá mặc định"
   4 ô nhập số:
   ┌─────────────────────────────────────────┐
   │ TX%  │  GK%  │  TH%  │  TKT%           │
   │ [10] │ [30]  │ [ 0]  │  [60]           │
   └─────────────────────────────────────────┘
   Tổng hiện tại: X/100
   Nếu tổng ≠ 100: border đỏ + text "Tổng phải bằng 100%"
   Nếu tổng = 100: border xanh + text "✓ Hợp lệ"
   GV có thể override khi tạo lớp học phần

5. CONFIRM DELETE:
   MatDialog nhỏ:
   Nếu môn CHƯA có điểm:
     "Xóa môn [tên]? Hành động này không thể hoàn tác."
     Nút "Hủy" + "Xóa"
   Nếu môn ĐÃ có điểm:
     Warning icon + "Môn này đã có dữ liệu điểm"
     "Không thể xóa. Hãy TẮT môn để ẩn khỏi danh sách."
     Nút "Đóng" + "Tắt môn"

6. EMPTY STATE per filter:
   Nếu filter khoa chưa chọn: "Chọn khoa để xem môn học"
   Nếu không có môn: lucide "book-open" + "Chưa có môn học nào" + nút Thêm
```

---

## 🎨 CSS CHUNG CHO CẢ 5 TRANG — thêm vào `_page.scss`

```scss
/* ── Table NTTU style ── */
.nttu-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

/* Mat-table header row */
.mat-mdc-header-row {
  background: var(--gray-50) !important;
  border-bottom: 2px solid var(--blue) !important;
}

.mat-mdc-header-cell {
  color: var(--navy) !important;
  font-weight: 700 !important;
  font-size: 0.78rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem !important;
}

/* Data rows */
.mat-mdc-row {
  border-bottom: 1px solid var(--gray-100) !important;
  transition: background 0.15s;
}

.mat-mdc-row:hover {
  background: var(--blue-pale) !important;
}

.mat-mdc-cell {
  padding: 0.7rem 1rem !important;
  color: var(--text) !important;
  font-size: 0.875rem !important;
}

/* ── Filter bar ── */
.filter-bar {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-bar mat-form-field {
  min-width: 160px;
  flex-shrink: 0;
}

.filter-bar .spacer {
  flex: 1;
}

/* ── Section title with left border ── */
.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--navy);
  border-left: 3px solid var(--blue);
  padding-left: 0.75rem;
  margin-bottom: 0.75rem;
}

/* ── Inline score input ── */
.score-input {
  width: 60px;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  text-align: center;
  font-family: "Be Vietnam Pro", sans-serif;
  transition: border-color 0.15s;
}

.score-input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.score-input.warn {
  border-color: var(--red);
  background: var(--red-pale);
}

/* ── Grade badge ── */
.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  white-space: nowrap;
}

.grade-badge--a {
  background: var(--green-pale);
  color: var(--green);
}
.grade-badge--b {
  background: var(--blue-pale);
  color: var(--blue);
}
.grade-badge--c {
  background: var(--yellow-pale);
  color: var(--yellow);
}
.grade-badge--f {
  background: var(--red-pale);
  color: var(--red);
}

/* ── Weight display ── */
.weight-display {
  font-size: 0.72rem;
  font-family: "Courier New", monospace;
  color: var(--text-sub);
  letter-spacing: -0.01em;
}

/* ── Avatar ── */
.user-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--navy), var(--blue));
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
}

/* ── Skeleton loader ── */
.skeleton {
  background: var(--gray-100);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.skeleton-row {
  height: 44px;
  margin-bottom: 1px;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 1rem;
  color: var(--text-muted);
}

.empty-state lucide-icon {
  opacity: 0.35;
}

.empty-state h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-sub);
  margin: 0;
}

.empty-state p {
  font-size: 0.875rem;
  margin: 0;
}

/* ── Action buttons nhỏ trong bảng ── */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--gray-600);
  cursor: pointer;
  transition: var(--transition);
  padding: 0;
}

.action-btn:hover {
  border-color: var(--blue);
  color: var(--blue);
  background: var(--blue-pale);
}

.action-btn--danger:hover {
  border-color: var(--red);
  color: var(--red);
  background: var(--red-pale);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## ✅ CHECKLIST SAU KHI HOÀN THÀNH

```
□ /classes   — bảng 2 hàng header (nhóm cột), dialog trọng số validate = 100%
□ /grades    — inline editing, 2 hàng header nhóm cột, footer tổng kết lớp
□ /users     — chips khoa, dialog phân khoa riêng, toggle trạng thái
□ /departments — card grid 3 cột + trang chi tiết 3 tab
□ /subjects  — toggle inline, dialog validate tổng % = 100, confirm xóa 2 trường hợp
□ CSS chung  — đã thêm vào _page.scss và @import trong styles.scss
□ Tất cả dùng lucide-icon, không dùng mat-icon system
□ Tất cả dùng .page-container wrapper
□ Empty state và skeleton loader đầy đủ
```
