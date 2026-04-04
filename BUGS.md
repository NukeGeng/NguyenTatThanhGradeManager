# 🐛 BUGS.md — Nhật ký Bug & Fix

> **Mục đích:** Ghi lại mọi bug đã gặp và cách fix.
> Dán file này vào đầu prompt mỗi ngày để AI không lặp lại bug cũ.

**Cách ghi:**

```
## [BUG-XXX] Tên bug ngắn gọn
- Ngày: DD/MM/YYYY
- File/Vị trí: đường dẫn file bị lỗi
- Mô tả: bug xảy ra như thế nào
- Nguyên nhân: tại sao bị
- Fix: đã sửa như thế nào
- Trạng thái: ✅ Đã fix / 🔄 Đang fix
```

---

## DANH SÁCH BUG

## [BUG-001] Lỗi thiếu thư viện Python khi train model

- Ngày: 02/04/2026
- File/Vị trí: ai-engine/train.py
- Mô tả: Pylance báo lỗi import không resolve được pandas và sklearn khi tạo train.py.
- Nguyên nhân: Môi trường .venv chưa cài đủ package cho AI Engine.
- Fix: Cấu hình Python environment cho workspace và cài packages: pandas, scikit-learn, numpy, pymongo, python-dotenv.
- Trạng thái: ✅ Đã fix

## [BUG-002] Lỗi thiếu FastAPI/Uvicorn khi tạo AI API

- Ngày: 03/04/2026
- File/Vị trí: ai-engine/main.py
- Mô tả: Pylance báo không resolve import fastapi, fastapi.middleware.cors và uvicorn.
- Nguyên nhân: Môi trường .venv chưa cài package cho web API.
- Fix: Cài thêm packages fastapi và uvicorn trong environment hiện tại.
- Trạng thái: ✅ Đã fix

## [BUG-003] Thiếu backend/.env nên không có MONGO_URI

- Ngày: 03/04/2026
- File/Vị trí: backend/.env (không tồn tại)
- Mô tả: Thao tác thêm môn mới vào Subject collection lỗi Mongoose vì uri undefined.
- Nguyên nhân: Chưa có file backend/.env nên dotenv không nạp được MONGO_URI.
- Fix: Đã tạo backend/.env với MONGO_URI hợp lệ rồi chạy lại quy trình add subject -> generate_data -> train thành công.
- Trạng thái: ✅ Đã fix

## [BUG-004] Thiếu dữ liệu khoa CNTT khi thêm môn mới

- Ngày: 03/04/2026
- File/Vị trí: collection departments
- Mô tả: Script thêm môn mới báo lỗi Department CNTT not found.
- Nguyên nhân: DB chưa có bản ghi khoa CNTT.
- Fix: Upsert khoa CNTT trước khi insert Subject mới trong script adminAddSubject.js.
- Trạng thái: ✅ Đã fix

## [BUG-005] Register teacher trả 500 khi departmentIds không hợp lệ

- Ngày: 03/04/2026
- File/Vị trí: backend/src/routes/auth.js
- Mô tả: API /api/auth/register bị lỗi 500 khi body gửi departmentIds rỗng hoặc placeholder chưa resolve (ví dụ "{{departmentId}}").
- Nguyên nhân: Query countDocuments cast ObjectId thất bại do departmentIds không đúng định dạng, lỗi đi thẳng vào errorHandler.
- Fix: Bổ sung validate departmentIds là mảng, chuẩn hóa chuỗi id, kiểm tra ObjectId hợp lệ trước khi query DB, và trả 400 message rõ ràng.
- Trạng thái: ✅ Đã fix

## [BUG-006] Login admin trả 401 do thiếu dữ liệu seed user

- Ngày: 03/04/2026
- File/Vị trí: MongoDB collection users
- Mô tả: Test /api/auth/login với admin@nttu.edu.vn trả 401.
- Nguyên nhân: DB không có user admin (collection users rỗng).
- Fix: Chạy lại script seed backend (npm run seed) để tạo user mặc định admin/teacher.
- Trạng thái: ✅ Đã fix

## [BUG-007] Postman Auth bị Unauthorized do lệch scope biến

- Ngày: 03/04/2026
- File/Vị trí: postman/collections/NTT-Grade-Manager-API-Tests/01-Auth/\*.request.yaml
- Mô tả: Sau khi login vẫn bị 401 ở các request có token; register teacher báo thiếu departmentIds.
- Nguyên nhân: authToken/departmentId được set ở collectionVariables nhưng môi trường Postman đang có biến cùng tên rỗng, làm override giá trị thực.
- Fix: Đồng bộ set biến vào cả collection + environment và thêm header Authorization: Bearer {{authToken}} tường minh cho các request Auth cần token.
- Trạng thái: ✅ Đã fix

## [BUG-008] Collection lỗi dây chuyền do thiếu setup biến liên folder

- Ngày: 03/04/2026
- File/Vị trí: postman/collections/NTT-Grade-Manager-API-Tests/02-Students, 03-Classes, 04-Grades, 05-Predictions
- Mô tả: Chạy full collection bị fail ở Create Class/Create Grade/Predict vì thiếu subjectId, schoolYearId, classId, gradeId hoặc bị override biến.
- Nguyên nhân: Request phụ thuộc biến được tạo ở folder khác, nhưng chưa có bước setup/fallback đồng bộ cho từng folder.
- Fix: Thêm các request setup lấy id động (class/subject/schoolYear/student/grade), lưu biến vào cả collection+environment; bỏ teacherId cứng khỏi Create Class; đổi code lớp sang dynamic để tránh trùng.
- Trạng thái: ✅ Đã fix

## [BUG-009] Frontend build lỗi do app.html còn template placeholder lẫn router shell

- Ngày: 03/04/2026
- File/Vị trí: frontend/src/app/app.html
- Mô tả: `ng build` báo NG5002 (Invalid ICU/Unexpected closing tag) khi setup Day 8.
- Nguyên nhân: app.html còn lẫn nội dung placeholder mặc định của Angular sau khi chèn router-outlet.
- Fix: Ghi đè app.html về shell tối giản `<router-outlet></router-outlet>` rồi build lại thành công.
- Trạng thái: ✅ Đã fix

## [BUG-010] TS6 báo lỗi outDir ở tsconfig app/spec

- Ngày: 03/04/2026
- File/Vị trí: frontend/tsconfig.app.json, frontend/tsconfig.spec.json
- Mô tả: VS Code báo lỗi tại outDir yêu cầu phải set rootDir tường minh cho layout output.
- Nguyên nhân: TypeScript 6 yêu cầu explicit rootDir khi common source directory bị suy luận khác nhau giữa app/spec project.
- Fix: Thêm `rootDir: "./src"` vào compilerOptions của cả tsconfig.app.json và tsconfig.spec.json.
- Trạng thái: ✅ Đã fix

## [BUG-011] Dashboard isLoading không tắt

- Ngày: 04/04/2026
- File/Vị trí: frontend/src/app/features/dashboard/dashboard.component.ts
- Mô tả: Dashboard có lúc xoay loading mãi, không hiển thị dữ liệu cũng không thoát trạng thái tải.
- Nguyên nhân: Có rủi ro nhánh request grades lồng trong switchMap bị treo/đứt luồng trong tình huống bất thường, cộng với việc frontend chạy nhầm instance ng serve cũ trên port 4200 nên người dùng tiếp tục thấy trạng thái loading cũ.
- Fix: Thêm catchError bọc forkJoin(gradeRequests), fallback grades rỗng, giữ finalize sau switchMap, thêm error callback dự phòng set isLoading = false, bổ sung watchdog timer ép thoát loading sau timeout và clear timer ở finalize/onDestroy; thêm try/catch khi apply dữ liệu và khi render/update Chart để chặn runtime exception làm treo UI; đồng thời restart sạch frontend trên đúng port 4200.
- Kiểm thử: Xác nhận backend health 200, login admin lấy token thành công, gọi đủ endpoints dashboard (students/classes/predictions/alerts) trả 200 với thời gian phản hồi ~0.18s-0.27s, build frontend pass.
- Trạng thái: ✅ Đã fix

## [BUG-012] Dữ liệu chỉ hiện sau khi user tương tác UI

- Ngày: 04/04/2026
- File/Vị trí: frontend/angular.json, frontend/src/app/app.config.ts, frontend/src/main.ts, frontend/package.json
- Mô tả: Các trang gọi API xong nhưng giao diện vẫn đứng loading, chỉ khi bấm/nhập vào trang thì danh sách mới hiện ra.
- Nguyên nhân: Frontend chưa nạp zone.js nên change detection không tự chạy sau callback async.
- Fix: Thêm `zone.js` vào dependencies frontend, cấu hình `polyfills: ["zone.js"]` trong angular.json, và ép provider `provideZoneChangeDetection(...)` trong app config để khóa zone-based change detection toàn app.
- Trạng thái: ✅ Đã fix

---

## TEMPLATE THÊM BUG MỚI

```
## [BUG-001]
- Ngày:
- File:
- Mô tả:
- Nguyên nhân:
- Fix:
- Trạng thái:
```
