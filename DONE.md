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

---

## FRONTEND

- Đã hoàn thành Prompt 8.2 Login UI (xem DONE-016).

---

## TEMPLATE THÊM TASK MỚI

```
## [DONE-001]
- Ngày:
- File:
- Ghi chú:
```
