# ✅ DONE.md — Nhật ký Hoàn Thành

> **Mục đích:** Ghi lại những task đã làm xong.
> Dán file này vào đầu prompt để AI biết không cần làm lại, và tiếp nối đúng chỗ.

**Cách ghi:**

```
## [DONE-XXX] Tên task
- Ngày: DD/MM/YYYY
- File đã tạo/sửa: danh sách file
- Ghi chú: thông tin đặc biệt AI cần biết khi làm task tiếp theo
```

---

## BACKEND

## [DONE-001] Ngày 1 - Setup Backend + Auth API

- Ngày: 01/04/2026
- File đã tạo/sửa: backend/package.json, backend/.env.example, backend/src/index.js, backend/src/config/database.js, backend/src/models/User.js, backend/src/middleware/auth.js, backend/src/middleware/errorHandler.js, backend/src/routes/auth.js
- Ghi chú: Đã cài dependencies bằng npm install, kiểm tra cú pháp các file JS không có lỗi.

## [DONE-002] Ngày 2 - Models Class/Student + CRUD Classes/Students

- Ngày: 01/04/2026
- File đã tạo/sửa: backend/src/models/Class.js, backend/src/models/Student.js, backend/src/routes/classes.js, backend/src/routes/students.js, backend/src/index.js
- Ghi chú: Đã thêm auth middleware cho toàn bộ routes classes/students, có auto tăng/giảm studentCount, đã check syntax không lỗi.

## [DONE-003] Ngày 3 - Grades API + Import Excel/CSV

- Ngày: 01/04/2026
- File đã tạo/sửa: backend/src/models/Grade.js, backend/src/routes/grades.js, backend/src/services/importService.js, backend/src/templates/grade_import_template.xlsx, backend/package.json, backend/src/index.js
- Ghi chú: Đã thêm CRUD grades cơ bản, import template/preview/excel bằng multer+xlsx, parse/validate/import dữ liệu điểm, và đã check syntax không lỗi.

---

## AI ENGINE

## [DONE-004] Ngày 4 - AI Engine Generate Data Train Model

- Ngày: 02/04/2026
- File đã tạo/sửa: ai-engine/data/generate_data.py
- Ghi chú: Đã tạo script sinh dữ liệu giả 1000 học sinh, gán nhãn theo rule học lực + noise 10%, lưu ra data/students.csv và in phân phối nhãn.

## [DONE-005] Đồng bộ update mới ngày 1-4.1 (NTTU)

- Ngày: 02/04/2026
- File đã tạo/sửa: backend/src/models/Subject.js, backend/src/models/Class.js, backend/src/models/Grade.js, backend/src/routes/subjects.js, backend/src/routes/classes.js, backend/src/routes/grades.js, backend/src/services/importService.js, backend/src/scripts/seedData.js, ai-engine/data/generate_data.py
- Ghi chú: Đã cập nhật model và routes theo hệ NTTU (weights TX/GK/TH/TKT, finalScore, gpa4, letterGrade, lớp học phần) và nâng generate_data.py sang đọc môn active từ MongoDB + lưu subject_codes.json.

## [DONE-006] Ngày 4 - AI Engine Train Model theo feature động

- Ngày: 02/04/2026
- File đã tạo/sửa: ai-engine/train.py
- Ghi chú: Đã tạo train.py đọc data/students.csv + data/subject_codes.json, train RandomForest, in accuracy/classification_report/feature_importances và lưu model.pkl, feature_names.pkl, label_encoder.pkl.

## [DONE-007] Ngày 5 - FastAPI server input động theo feature_names

- Ngày: 03/04/2026
- File đã tạo/sửa: ai-engine/schemas.py, ai-engine/main.py
- Ghi chú: Đã tạo FastAPI server port 5000 với endpoints /health, /predict, /predict-batch, /retrain-required; load model artifacts động và build input vector theo feature_names.pkl.

## [DONE-008] Thực thi quy trình Admin thêm môn mới và retrain AI

- Ngày: 03/04/2026
- File đã tạo/sửa: backend/.env, backend/src/scripts/adminAddSubject.js, ai-engine/data/students.csv, ai-engine/data/subject_codes.json, ai-engine/models/model.pkl, ai-engine/models/feature_names.pkl, ai-engine/models/label_encoder.pkl
- Ghi chú: Đã thêm môn aiiot vào Subject collection, chạy lại generate_data.py + train.py, restart FastAPI bằng uvicorn và xác nhận health endpoint trả feature mới.

## [DONE-009] Ngày 6 - Node.js gọi AI + Predictions API

- Ngày: 03/04/2026
- File đã tạo/sửa: backend/src/services/aiService.js, backend/src/models/Prediction.js, backend/src/routes/predictions.js, backend/src/index.js
- Ghi chú: Đã thêm dịch vụ gọi FastAPI /predict, lưu Prediction vào MongoDB, và tạo đủ API predictions gồm predict một học sinh, lịch sử theo học sinh, dự đoán mới nhất theo lớp, và cảnh báo riskLevel=high.

## [DONE-010] Ngày 7 - Backend Test Checklist (Postman)

- Ngày: 03/04/2026
- File đã tạo/sửa: backend/TEST_CHECKLIST.md
- Ghi chú: Đã bổ sung checklist test cho Auth, Students, Classes, Grades, Predictions theo format method | endpoint | body | expected response.

## [DONE-011] Fix lỗi Auth test trong Postman collection

- Ngày: 03/04/2026
- File đã tạo/sửa: backend/src/routes/auth.js, postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/Get-Departments-And-Save-DepartmentId.request.yaml, BUGS.md
- Ghi chú: Đã fix validate departmentIds để /auth/register không còn trả 500 khi id sai; thêm request Postman tự lấy departmentId trước khi register teacher; seed lại DB để có admin login mặc định.

## [DONE-012] Ổn định Auth token flow trong Postman collection

- Ngày: 03/04/2026
- File đã tạo/sửa: postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/Login-Admin-Success.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/Get-Departments-And-Save-DepartmentId.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/Register-Teacher.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/Get-Me-Valid-Token.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/Change-Password.request.yaml, BUGS.md
- Ghi chú: Đã thêm Authorization header tường minh cho request cần token và đồng bộ set authToken/departmentId vào cả collectionVariables + environment để tránh lỗi Unauthorized do override scope biến.

## [DONE-013] Ổn định toàn bộ Postman collection trước khi làm frontend

- Ngày: 03/04/2026
- File đã tạo/sửa: postman/collections/NTT-Grade-Manager-API-Tests/03-Classes/Create-Class.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/03-Classes/Get-Subjects-And-Save-SubjectId.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/03-Classes/Get-SchoolYear-Current-And-Save-SchoolYearId.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/02-Students/Get-Classes-And-Save-ClassId.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/02-Students/Create-Student.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/04-Grades/Get-Students-And-Save-Ids.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/04-Grades/Create-Grade-Success.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/05-Predictions/Get-Students-And-Save-GradeId.request.yaml, postman/collections/NTT-Grade-Manager-API-Tests/05-Predictions/Predict-Valid-Grade.request.yaml, BUGS.md
- Ghi chú: Đã thêm bước setup id động cho từng folder và fallback biến để tránh lỗi dây chuyền; đã test lại end-to-end các API chính (Auth/Students/Classes/Grades/Predictions) đều trả đúng status mong đợi.

## [DONE-014] Ngày 8 - Setup Angular standalone + Auth core

- Ngày: 03/04/2026
- File đã tạo/sửa: frontend/angular.json, frontend/package.json, frontend/src/app/app.config.ts, frontend/src/app/app.routes.ts, frontend/src/app/app.ts, frontend/src/app/app.html, frontend/src/app/core/services/api.service.ts, frontend/src/app/core/services/auth.service.ts, frontend/src/app/core/guards/auth.guard.ts, frontend/src/app/core/interceptors/jwt.interceptor.ts, frontend/src/app/shared/models/interfaces.ts, frontend/src/app/features/auth/auth.routes.ts, frontend/src/app/features/auth/login/login.component.ts, frontend/src/app/features/auth/register/register.component.ts, frontend/src/app/features/dashboard/dashboard.routes.ts, frontend/src/app/features/dashboard/dashboard.component.ts, frontend/src/app/features/students/students.routes.ts, frontend/src/app/features/students/student-list.component.ts, frontend/src/app/features/classes/classes.routes.ts, frontend/src/app/features/classes/class-list.component.ts, frontend/src/app/features/grades/grades.routes.ts, frontend/src/app/features/grades/grade-entry.component.ts, frontend/src/app/features/predictions/predictions.routes.ts, frontend/src/app/features/predictions/prediction-report.component.ts, frontend/src/app/app.spec.ts
- Ghi chú: Đã tạo cấu hình provideRouter + provideHttpClient(withInterceptors), lazy routes có authGuard, Api/Auth service, jwt interceptor, interfaces strict và build Angular thành công.

## [DONE-015] Fix lỗi outDir tsconfig cho frontend

- Ngày: 03/04/2026
- File đã tạo/sửa: frontend/tsconfig.app.json, frontend/tsconfig.spec.json, BUGS.md
- Ghi chú: Đã thêm rootDir cho cả app/spec tsconfig để hết lỗi TS6 tại outDir và xác nhận build frontend thành công.

## [DONE-016] Ngày 8.2 - Login UI Angular Material

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/src/app/features/auth/login/login.component.ts, frontend/src/app/features/auth/login/login.component.html, frontend/src/app/features/auth/login/login.component.scss, frontend/src/app/app.config.ts, frontend/src/styles.scss, frontend/package.json
- Ghi chú: Đã triển khai form đăng nhập bằng Reactive Forms + Validators, gọi AuthService.login(), điều hướng /dashboard khi thành công, hiển thị lỗi sai credentials, loading spinner khi submit, và cấu hình Angular Material theme/animations.

## [DONE-017] Bổ sung đầy đủ Day 8.1 + nâng cấp Day 8.2 theo design system NTTU

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/package.json, frontend/src/index.html, frontend/src/styles.scss, frontend/src/app/app.config.ts, frontend/src/app/app.routes.ts, frontend/src/app/core/services/auth.service.ts, frontend/src/app/core/guards/admin-only.guard.ts, frontend/src/app/shared/models/interfaces.ts, frontend/src/app/features/departments/department-list.component.ts, frontend/src/app/features/departments/departments.routes.ts, frontend/src/app/features/users/user-list.component.ts, frontend/src/app/features/users/users.routes.ts, frontend/src/app/features/subjects/subject-list.component.ts, frontend/src/app/features/subjects/subjects.routes.ts, frontend/src/app/features/notifications/notification-list.component.ts, frontend/src/app/features/notifications/notifications.routes.ts, frontend/src/app/features/auth/login/login.component.ts, frontend/src/app/features/auth/login/login.component.html, frontend/src/app/features/auth/login/login.component.scss
- Ghi chú: Đã cài lucide-angular, thêm Google Font Be Vietnam Pro, áp dụng CSS variables + Material overrides chuẩn NTTU, mở rộng lazy routes/guards (auth + adminOnly), bổ sung interfaces cho 10 bảng, và cập nhật Login thành layout split 2 cột với lucide-icon, show/hide password, remember me, xử lý lỗi và điều hướng theo role.

## [DONE-018] Bổ sung file môi trường + thư viện còn thiếu (Day 1-8)

- Ngày: 04/04/2026
- File đã tạo/sửa: backend/.env, ai-engine/.env, ai-engine/requirements.txt, DONE.md
- Ghi chú: Đã tạo backend/.env với Mongo URI thực tế, tạo ai-engine/.env dùng chung MONGO_URI, tạo ai-engine/requirements.txt theo source thực tế (FastAPI, Uvicorn, scikit-learn, pandas, numpy, pymongo, python-dotenv), cài npm install cho backend/frontend, tạo ai-engine/.venv và cài toàn bộ Python dependencies.

## [DONE-019] Ngày 9.1 - Dashboard tổng quan + cảnh báo + donut chart

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/package.json, frontend/src/app/app.config.ts, frontend/src/app/features/dashboard/dashboard.component.ts, frontend/src/app/features/dashboard/dashboard.component.html, frontend/src/app/features/dashboard/dashboard.component.scss, frontend/src/app/shared/models/interfaces.ts
- Ghi chú: Đã làm dashboard gọi API students/classes/predictions alerts/grades class, hiển thị 4 card thống kê, bảng học sinh rủi ro, và biểu đồ donut phân bố Giỏi/Khá/TB/Yếu bằng Chart.js, dùng Angular Material + Lucide icons + màu theo design system.

## [DONE-020] Ngày 10 - Quản lý Khoa, Môn học, Lớp và Học sinh

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/src/app/core/services/api.service.ts, frontend/src/app/shared/models/interfaces.ts, frontend/src/app/app.config.ts, frontend/src/app/features/departments/departments.routes.ts, frontend/src/app/features/departments/department-list.component.ts, frontend/src/app/features/departments/department-detail.component.ts, frontend/src/app/features/users/user-list.component.ts, frontend/src/app/features/subjects/subject-list.component.ts, frontend/src/app/features/classes/classes.routes.ts, frontend/src/app/features/classes/class-list.component.ts, frontend/src/app/features/classes/class-detail.component.ts, frontend/src/app/features/students/students.routes.ts, frontend/src/app/features/students/student-list.component.ts, frontend/src/app/features/students/student-form.component.ts, frontend/src/app/features/students/student-detail.component.ts
- Ghi chú: Đã triển khai đầy đủ admin screens cho Day 10 với bảng dữ liệu + dialog CRUD + filter + validate + toggle trạng thái theo API backend thật; mở rộng routes detail/form cho classes/students/departments và build frontend thành công với TypeScript strict.

## [DONE-021] Fix dashboard treo loading + kiểm thử runtime

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/src/app/features/dashboard/dashboard.component.ts, BUGS.md, DONE.md
- Ghi chú: Đã rà soát lại toàn bộ luồng dashboard, bổ sung fallback chống treo (catchError cho forkJoin grades + watchdog timer + clear timer khi finalize/onDestroy), kiểm thử API thật bằng login token admin và build frontend pass.

## [DONE-022] Cứng hóa dashboard runtime để tránh treo do lỗi render

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/src/app/features/dashboard/dashboard.component.ts, BUGS.md, DONE.md
- Ghi chú: Bổ sung try/catch khi apply dữ liệu và render/update Chart.js để lỗi runtime không giữ UI ở trạng thái loading; xác nhận backend data có thật (students/classes) và tất cả endpoint dashboard trả 200.

## [DONE-023] Ngày 11 - Grade Entry + Import Excel/CSV + gọi AI lớp

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/features/grades/grade-import/grade-import.component.ts, frontend/src/app/features/grades/grades.routes.ts, backend/src/routes/predictions.js, DONE.md
- Ghi chú: Đã triển khai luồng nhập điểm 3 bước theo lớp/sinh viên với preview điểm realtime + chỉnh trọng số + lưu điểm và gọi AI sau khi lưu; đã triển khai import 4 bước bằng MatStepper (tải mẫu, upload, preview, import) và bổ sung API POST /api/predictions/predict-class để chạy AI cả lớp.

## [DONE-024] Fix global loading treo do thiếu zone.js

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/angular.json, frontend/src/app/app.config.ts, frontend/src/main.ts, frontend/package.json, BUGS.md, DONE.md
- Ghi chú: Đã khóa fix ở mức framework bằng zone.js dependency + polyfills angular.json + provideZoneChangeDetection trong app config để toàn bộ trang tự cập nhật UI sau callback async, không cần chờ user tương tác.

## [DONE-025] Ngày 12 - Trang Kết Quả AI (Prediction Report + Class Predictions)

- Ngày: 04/04/2026
- File đã tạo/sửa: frontend/src/app/features/predictions/prediction-report.component.ts, frontend/src/app/features/predictions/class-predictions.component.ts, frontend/src/app/features/predictions/predictions.routes.ts, frontend/src/app/app.config.ts, DONE.md
- Ghi chú: Đã triển khai màn hình báo cáo dự đoán theo gradeId (header, badge xếp loại, confidence bar, risk badge, môn yếu, gợi ý, phân tích) và màn hình dự đoán cả lớp (table sort, filter chỉ rủi ro cao, nút xem chi tiết, xuất PDF bằng window.print), đồng thời nối route /predictions và /predictions/report/:gradeId.

## [DONE-026] Ngày 13 - Layout Shell + Global Error Handling

- Ngày: 05/04/2026
- File đã tạo/sửa: frontend/src/app/shared/components/layout/layout.component.ts, frontend/src/app/shared/components/error-handling/global-error-handler.ts, frontend/src/app/shared/components/empty-state.component.ts, frontend/src/app/core/interceptors/jwt.interceptor.ts, frontend/src/app/app.config.ts, frontend/src/app/app.ts, frontend/src/app/app.html, frontend/src/app/app.scss, BUGS.md, DONE.md
- Ghi chú: Đã thay shell root sang layout dùng MatSidenav responsive (sidebar trái + topbar + logout), thêm badge đỏ cảnh báo rủi ro trên menu Dự đoán AI, bổ sung GlobalErrorHandler và nâng interceptor bắt lỗi 401/500/network theo yêu cầu.

## [DONE-027] Landing Page Home từ TEMPLATEHTML + route mặc định

- Ngày: 05/04/2026
- File đã tạo/sửa: frontend/src/app/features/home/home.component.ts, frontend/src/app/features/home/home.component.html, frontend/src/app/features/home/home.component.scss, frontend/src/app/app.routes.ts, frontend/src/app/app.config.ts, frontend/angular.json, frontend/src/assets/images/LogoNTTU.svg, BUGS.md, DONE.md
- Ghi chú: Đã chuyển HTML template sang Angular standalone HomeComponent (lucide-icon + routerLink + anchor section), thêm route `path: ''` về homepage, bổ sung đăng ký icon Lucide dùng cho trang chủ, thêm `src/assets` vào build assets, và build frontend thành công.

## [DONE-028] Fix Scrollbar Layout Shift + Smooth Scroll navbar trang chủ

- Ngày: 05/04/2026
- File đã tạo/sửa: frontend/src/styles.scss, frontend/src/app/features/home/home.component.scss, DONE.md
- Ghi chú: Đã thêm `scrollbar-gutter: stable` (kèm fallback `overflow-y: scroll`) để tránh layout shift khi scrollbar xuất hiện/biến mất toàn website; bật smooth scroll toàn cục và đặt `scroll-margin-top` cho các section anchor của homepage để cuộn mượt, không bị che bởi sticky navbar.

## [DONE-029] Fix smooth scroll navbar homepage bằng handler component

- Ngày: 05/04/2026
- File đã tạo/sửa: frontend/src/app/features/home/home.component.ts, frontend/src/app/features/home/home.component.html, frontend/src/app/features/home/home.component.scss, BUGS.md, DONE.md
- Ghi chú: Đã gắn click handler cho các link section (`Tính năng`, `Cách hoạt động`, `Phân quyền`, `AI dự đoán`, `Công nghệ`) để cuộn mượt bằng `scrollIntoView`, thêm cuộn mượt về đầu trang khi bấm logo, giữ fallback hash khi lỗi và bỏ bullet mặc định của danh sách navbar.

## [DONE-030] Cứng hóa smooth scroll bằng animation thủ công

- Ngày: 05/04/2026
- File đã tạo/sửa: frontend/src/app/features/home/home.component.ts, BUGS.md, DONE.md
- Ghi chú: Đã thay cuộn native smooth sang animation `requestAnimationFrame` (easing) để tránh bị nhảy tức thì do phụ thuộc setting/browser; đồng thời giữ offset navbar sticky để section dừng đúng vị trí.

## [DONE-031] Rework LayoutComponent theo cổng sinh viên + thêm trang Tin tức

- Ngày: 06/04/2026
- File đã tạo/sửa: frontend/src/app/shared/components/layout/layout.component.ts, frontend/src/app/app.routes.ts, frontend/src/app/features/news/news.component.ts, DONE.md
- Ghi chú: Đã thay toàn bộ template/styles của LayoutComponent theo layout topbar + sidebar mới, thêm menu Tin tức và route /news, tạo NewsComponent standalone dùng mock data để chờ API thật.

## [DONE-032] Đổi wordmark topbar sang LogoNTTU.svg + kéo search sát logo

- Ngày: 06/04/2026
- File đã tạo/sửa: frontend/src/app/shared/components/layout/layout.component.ts, DONE.md
- Ghi chú: Đã thay block chữ tên trường trong topbar bằng ảnh LogoNTTU.svg và chuyển search bar sang cụm bên trái để nằm sát logo theo mẫu.

---

## FRONTEND

- Đã hoàn thành Day 8.1 + 8.2 theo design system NTTU (xem DONE-017).
- Đã hoàn thành Day 9.1 Dashboard (xem DONE-019).
- Đã hoàn thành Day 10 quản lý Khoa/Môn/Lớp/Học sinh (xem DONE-020).
- Đã fix dashboard treo loading và kiểm thử runtime (xem DONE-021).
- Đã cứng hóa dashboard chống treo do lỗi render runtime (xem DONE-022).
- Đã hoàn thành Day 11 nhập điểm + import + gọi AI lớp (xem DONE-023).
- Đã fix lỗi global loading chỉ cập nhật khi user tương tác (xem DONE-024).
- Đã hoàn thành Day 12 trang kết quả AI (xem DONE-025).
- Đã hoàn thành Day 13 layout shell + error handling (xem DONE-026).

---

## TEMPLATE THÊM TASK MỚI

## [DONE-033] Chuẩn hóa vùng nội dung layout + bộ class page dùng chung

- Ngày: 06/04/2026
- File đã tạo/sửa: frontend/src/app/shared/components/layout/layout.component.ts, frontend/src/app/shared/styles/\_page.scss, frontend/src/styles.scss, DONE.md
- Ghi chú: Đã sửa CSS `main-content` trong LayoutComponent theo chuẩn padding/background/scroll, tạo shared page styles (\_page.scss) cho breadcrumb/page-header/stats/content-card và import global vào styles.scss để tái sử dụng toàn bộ trang con.

## [DONE-034] Gia cố vùng main-content tránh dính mép tại router-outlet

- Ngày: 06/04/2026
- File đã tạo/sửa: frontend/src/app/shared/components/layout/layout.component.ts, frontend/src/styles.scss, DONE.md
- Ghi chú: Đã bọc `router-outlet` bằng `main-content__inner` để đảm bảo có khung đệm ổn định cho mọi trang con, đồng thời bổ sung biến màu còn thiếu trong styles.scss để các class page dùng chung hiển thị đúng.

## [DONE-035] Chuẩn hóa main content các trang quản lý + thêm breadcrumb + giảm bo góc

- Ngày: 06/04/2026
- File đã tạo/sửa: frontend/src/styles.scss, frontend/src/app/shared/styles/\_page.scss, frontend/src/app/shared/components/layout/layout.component.ts, frontend/src/app/features/predictions/class-predictions.component.ts, frontend/src/app/features/classes/class-list.component.ts, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/features/grades/grade-import/grade-import.component.ts, frontend/src/app/features/users/user-list.component.ts, frontend/src/app/features/departments/department-list.component.ts, frontend/src/app/features/subjects/subject-list.component.ts, DONE.md
- Ghi chú: Đã chuẩn hóa lại giao diện vùng main content theo style hiện đại (spacing/card shell/border/shadow), thêm breadcrumb cho các route /predictions, /classes, /grades, /users, /departments, /subjects và giảm radius toàn cục để đồng bộ giao diện mà không phát sinh lỗi compile.

## [DONE-036] Làm lại UI theo TEMPLATE_FIX_CSS cho classes/grades/users/departments/subjects

- Ngày: 06/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/features/classes/class-list.component.ts, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/features/users/user-list.component.ts, frontend/src/app/features/departments/department-list.component.ts, frontend/src/app/features/departments/department-detail.component.ts, frontend/src/app/features/subjects/subject-list.component.ts, DONE.md
- Ghi chú: Đã áp bộ CSS chung từ TEMPLATE_FIX_CSS (nttu-table/filter-bar/section-title/grade-badge/empty-state/action-btn), làm lại layout các trang theo cấu trúc portal hiện đại, thêm filter/search/stats/card-grid nơi phù hợp, giữ nguyên logic API hiện tại và build frontend thành công.

## [DONE-037] Đồng bộ giao diện toàn feature theo style UserList (trừ Home/Auth)

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/features/students/student-list.component.ts, frontend/src/app/features/students/student-form.component.ts, frontend/src/app/features/students/student-detail.component.ts, frontend/src/app/features/classes/class-list.component.ts, frontend/src/app/features/classes/class-detail.component.ts, frontend/src/app/features/departments/department-list.component.ts, frontend/src/app/features/subjects/subject-list.component.ts, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/features/grades/grade-import/grade-import.component.ts, frontend/src/app/features/predictions/class-predictions.component.ts, frontend/src/app/features/predictions/prediction-report.component.ts, frontend/src/app/features/news/news.component.ts, frontend/src/app/features/notifications/notification-list.component.ts, DONE.md
- Ghi chú: Đã chuẩn hóa căn giữa `page-container`, tăng margin/padding cho card và state blocks để nội dung không dính lề, đồng bộ spacing/justify theo pattern của UserList, và đổi toàn bộ action buttons ở Student List sang icon buttons giống Users (xem/sửa/xóa). Build frontend pass.

## [DONE-038] Căn giữa toàn bộ control trong filter-bar (dropdown/input/button)

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, DONE.md
- Ghi chú: Đã fix lệch trục dọc trong filter-bar cho toàn bộ trang bằng cách chuẩn hóa margin control, bỏ vùng subscript chiếm chỗ của Material form-field trong filter bar, và ép checkbox/slide-toggle/button/input/select cùng align center. Build frontend pass.

## [DONE-039] CSS lại form nhập điểm + tạo trang xem điểm cả lớp dạng bảng tổng hợp

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/features/grades/class-grade-sheet/class-grade-sheet.component.ts, frontend/src/app/features/grades/grades.routes.ts, DONE.md
- Ghi chú: Đã chuyển phần danh sách sinh viên ở Grade Entry sang bảng score-sheet dạng nhiều cột giống mẫu (TX/TH/TKT/điểm tổng kết/thang 4/điểm chữ/xếp loại/đạt), thêm nút điều hướng tới trang mới xem điểm toàn bộ sinh viên của một lớp theo cùng định dạng bảng, và build frontend thành công.

## [DONE-040] Fix lỗi thiếu provider Lucide icon `table`

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/app.config.ts, BUGS.md, DONE.md
- Ghi chú: Đã đăng ký icon `Table` trong `LucideAngularModule.pick(...)` để hết lỗi runtime từ GlobalErrorHandler khi render nút "Xem điểm cả lớp" ở Grade Entry; build frontend pass.

## [DONE-041] Tối ưu lại layout bước 2 và bước 3 trang nhập điểm

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/features/grades/class-grade-sheet/class-grade-sheet.component.ts, DONE.md
- Ghi chú: Đã tách biến thể bảng điểm `score-sheet--compact|--wide|--entry`, giảm độ rộng và kích thước ô ở bước 2 để hạn chế vỡ form (không cần zoom 80% mới thấy), đồng thời chuyển bước 3 sang nhập điểm dạng bảng (TX/GK/TH/TKT + trạng thái dự thi/vắng thi) để căn chỉnh gọn, thẳng hàng như bảng bước 2.

## [DONE-042] Fix tràn ngang trang nhập điểm ở mức zoom 100%

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, DONE.md
- Ghi chú: Đã tối ưu thêm biến thể `score-sheet--compact` (table-layout fixed, giảm width/min-width từng nhóm cột, cho phép wrap header) và giảm padding card bước 2 để tăng vùng hiển thị bảng; mục tiêu là tránh overflow toàn trang và giảm phụ thuộc kéo ngang/zoom thấp. Build frontend pass.

## [DONE-043] Chuyển sidebar sang chế độ drawer ẩn/mở bằng nút

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/components/layout/layout.component.ts, DONE.md
- Ghi chú: Sidebar được chuyển sang dạng overlay drawer cho mọi kích thước màn hình, mặc định ẩn và mở bằng nút menu trên topbar; đóng khi bấm nền mờ hoặc chọn menu. Mục tiêu là mở rộng không gian nội dung (đặc biệt trang bảng điểm) và giữ trải nghiệm giống responsive mobile. Build frontend pass.

## [DONE-044] Căn giữa và mở rộng khung main-content/page-container toàn bộ component

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/styles.scss, frontend/src/app/shared/styles/\_page.scss, frontend/src/app/shared/components/layout/layout.component.ts, DONE.md
- Ghi chú: Đồng bộ lại khung hiển thị trung tâm: tăng `container/content max width` lên 1640px, cập nhật `main-content__inner` và `page-container` để luôn căn giữa màn hình và tận dụng tối đa chiều ngang khả dụng. Kết quả là các page (đặc biệt bảng điểm) hiển thị đầy đủ hơn, bớt bó hẹp cột/chữ. Build frontend pass.

## [DONE-045] Giãn cột bảng điểm TX/TH và sửa ép chữ theo ký tự

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, DONE.md
- Ghi chú: Nới kích thước cột trong `score-sheet--compact` (đặc biệt `num-col`/`group-col`), tăng spacing cell, bỏ `word-break: break-word` gây bẻ chữ từng ký tự, và chuyển class `card-block--table` sang đúng card của Bước 2 để phần bảng điểm có thêm không gian ngang. Build frontend pass.

## [DONE-046] Nới thêm không gian ngang để nhìn bảng điểm như mức zoom thấp hơn

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, frontend/src/app/shared/components/layout/layout.component.ts, DONE.md
- Ghi chú: Giảm thêm lớp padding lồng nhau ở `main-content` + `page-container` + `.container` trong shell để tăng chiều ngang thực tế cho bảng; đồng thời tăng nhẹ độ rộng cột số/nhóm của `score-sheet--compact` nhằm tránh cảm giác dính cột. Build frontend pass.

## [DONE-047] Nới riêng 3 cột Điểm TX 1/2/3 thêm 5px

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/shared/styles/\_page.scss, DONE.md
- Ghi chú: Tạo class riêng `tx-col` cho các ô header/data của 3 cột TX ở Bước 2 và tăng width từ 78px lên 83px (đúng +5px) để tách cột rõ hơn, không ảnh hưởng các cột điểm khác. Build frontend pass.

## [DONE-048] Cân đều lại width cột TX với các cột điểm còn lại

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, DONE.md
- Ghi chú: Đồng bộ `tx-col` về cùng width `78px` như `num-col` trong `score-sheet--compact`, giúp 3 cột Điểm TX 1/2/3 có độ rộng đều và cùng nhịp với các ô điểm khác. Build frontend pass.

## [DONE-049] Đổi bảng Step 2 sang auto-fit cột theo nội dung

- Ngày: 07/04/2026
- File đã tạo/sửa: frontend/src/app/shared/styles/\_page.scss, DONE.md
- Ghi chú: Bỏ cơ chế width cứng ở `score-sheet--compact` (left/name/num/tx/group), chuyển sang `table-layout: auto` + `width: max-content` + `min-width: 100%` để độ rộng cột tự co giãn theo nội dung từng cột như mẫu tham chiếu. Build frontend pass.

## [DONE-050] Tổng hợp cập nhật chính ngày 08/04/2026

- Ngày: 08/04/2026
- File đã tạo/sửa: frontend/src/app/features/users/user-list.component.ts, backend/src/routes/messages.js, backend/src/socket.js, frontend/src/app/features/chat/chat.component.ts, frontend/src/app/shared/models/interfaces.ts, package.json (root)
- Ghi chú: Hoàn thiện quản lý user role advisor ở màn admin users; bổ sung quyền admin xem toàn bộ room chat theo khoa + metadata tên phòng dễ đọc; css lại layout danh sách chat theo mẫu và thu gọn tile active; thêm script chạy đồng thời backend + ai-engine + frontend bằng một lệnh ở root.

## [DONE-051] Tổng hợp cập nhật chính ngày 09/04/2026

- Ngày: 09/04/2026
- File đã tạo/sửa: backend/src/routes/studentCurricula.js, frontend/src/app/features/advisor/advisor-student-detail.component.ts, backend/src/services/aiService.js, BUGS.md, DONE.md
- Ghi chú: Fix lỗi advisor/students bị 404 khi học sinh chưa gán CTĐT bằng cách trả payload 200 hợp lệ; fix lỗi roadmap AI (`gpa-roadmap`, `retake-roadmap`) trả 500 bằng fallback roadmap rỗng khi thiếu StudentCurriculum; cập nhật nhật ký bug và công việc hoàn thành.

## [DONE-052] Nâng cấp dữ liệu AI + CTĐT 140 tín + retrain model lớn

- Ngày: 09/04/2026
- File đã tạo/sửa: backend/src/scripts/seedLargeScaleData.js, backend/src/scripts/checkSeedSummary.js, backend/src/scripts/checkRoadmapSmoke.js, backend/package.json, ai-engine/data/generate_data.py, ai-engine/train.py, ai-engine/main.py, ai-engine/risk_logic.py, ai-engine/data/predict_input_template.json, BUGS.md, DONE.md
- Ghi chú: Hoàn thiện CTĐT KTPM 140 tín với 56 học phần phủ đủ 12 học kỳ (1-1 đến 4-3), seed và backfill đạt tổng 10,000 sinh viên + 10,000 StudentCurriculum; tạo dataset train từ DB thật đạt 20,898 mẫu và retrain model mới (27 features); hiệu chỉnh confidence/risk để nhóm yếu/trung bình không còn confidence ảo cao và roadmap đã sinh kế hoạch học tập thành công cho sinh viên có dữ liệu CTĐT.

```
## [DONE-001]
- Ngày:
- File:
- Ghi chú:
```
