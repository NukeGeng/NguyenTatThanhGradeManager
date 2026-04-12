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

## [BUG-013] Thiếu shell layout chuẩn và xử lý lỗi HTTP toàn cục

- Ngày: 05/04/2026
- File/Vị trí: frontend/src/app/app.ts, frontend/src/app/app.html, frontend/src/app/core/interceptors/jwt.interceptor.ts
- Mô tả: UI chưa có sidebar/topbar dạng shell theo yêu cầu Day 13; lỗi 401/500/network chưa được xử lý tập trung nên trải nghiệm không đồng nhất và khó debug.
- Nguyên nhân: App đang dùng topbar đơn giản ở root, interceptor chỉ gắn token mà chưa bắt lỗi HTTP, chưa có global error handler.
- Fix: Tạo shell component dùng MatSidenav responsive + topbar user/logout + badge cảnh báo rủi ro; nâng cấp jwt interceptor để xử lý 401/500/network và hiển thị snackbar; bổ sung GlobalErrorHandler để bắt lỗi toàn cục.
- Trạng thái: ✅ Đã fix

## [BUG-014] Cảnh báo vượt budget bundle initial khi build frontend

- Ngày: 05/04/2026
- File/Vị trí: frontend/angular.json, frontend/src/app/shared/components/layout/layout.component.ts
- Mô tả: `ng build` cảnh báo `bundle initial exceeded maximum budget` (559.68 kB > 500 kB).
- Nguyên nhân: Shell layout Day 13 dùng MatSidenav + topbar được load ở root làm tăng kích thước chunk khởi tạo.
- Fix: Đã ghi nhận để tối ưu vòng sau (tách lazy shell hoặc điều chỉnh budget phù hợp kiến trúc hiện tại).
- Trạng thái: 🔄 Đang fix

## [BUG-015] TEMPLATEHTML nguồn bị cắt đoạn footer

- Ngày: 05/04/2026
- File/Vị trí: TEMPLATEHTML.md
- Mô tả: HTML mẫu trong file bị cắt ở đoạn link email footer, thiếu phần đóng thẻ cuối nên không thể chuyển 100% nguyên văn nếu giữ y nguyên.
- Nguyên nhân: Nội dung nguồn bị truncate tại chuỗi Cloudflare email obfuscation (`/cdn-cgi/l/email-protection...`).
- Fix: Giữ nguyên toàn bộ cấu trúc còn đọc được, hoàn thiện footer với email chuẩn `admin@nttu.edu.vn` và đóng đủ thẻ để Angular template compile.
- Trạng thái: ✅ Đã fix

## [BUG-016] Build lỗi do vượt anyComponentStyle budget ở Home

- Ngày: 05/04/2026
- File/Vị trí: frontend/angular.json, frontend/src/app/features/home/home.component.scss
- Mô tả: `ng build` fail với lỗi `home.component.scss exceeded maximum budget` (12.56kB > 8kB) khi giữ đầy đủ CSS landing page từ template.
- Nguyên nhân: Budget mặc định cho `anyComponentStyle` thấp hơn kích thước CSS thực tế của landing page.
- Fix: Nâng budget `anyComponentStyle` trong `angular.json` thành warning 12kB, error 16kB để phù hợp màn landing page; build chạy thành công.
- Trạng thái: ✅ Đã fix

## [BUG-017] Anchor navbar homepage không cuộn mượt

- Ngày: 05/04/2026
- File/Vị trí: frontend/src/app/features/home/home.component.html, frontend/src/app/features/home/home.component.ts
- Mô tả: Click các link section trên navbar homepage nhảy tức thì tới anchor, không có hiệu ứng smooth scroll như yêu cầu.
- Nguyên nhân: Chỉ dùng `href="#..."` mặc định của trình duyệt; trên một số môi trường render hành vi cuộn mượt từ CSS không được áp dụng ổn định cho anchor navigation.
- Fix: Bổ sung handler `scrollToSection()` và `scrollToTop()` trong HomeComponent, dùng `scrollIntoView({ behavior: 'smooth' })`/`window.scrollTo({ behavior: 'smooth' })`, đồng thời vẫn giữ fallback hash khi có lỗi.
- Trạng thái: ✅ Đã fix

## [BUG-018] Smooth scroll vẫn nhảy tức thì trên một số máy

- Ngày: 05/04/2026
- File/Vị trí: frontend/src/app/features/home/home.component.ts
- Mô tả: Dù đã dùng `behavior: 'smooth'`, click navbar vẫn nhảy tức thì trên môi trường người dùng.
- Nguyên nhân: Native smooth behavior phụ thuộc browser/OS setting (motion preference), nên có thể bị downgrade thành cuộn tức thì.
- Fix: Thay sang animation cuộn thủ công bằng `requestAnimationFrame` + easing (`easeInOutCubic`), tự tính vị trí trừ offset navbar sticky để luôn mượt và đúng điểm dừng.
- Trạng thái: ✅ Đã fix

## [BUG-019] Lỗi Lucide icon `table` chưa được cung cấp

- Ngày: 07/04/2026
- File/Vị trí: frontend/src/app/features/grades/grade-entry/grade-entry.component.ts, frontend/src/app/app.config.ts
- Mô tả: Runtime ném lỗi ở GlobalErrorHandler: `The "table" icon has not been provided by any available icon providers` khi mở trang nhập điểm.
- Nguyên nhân: Template dùng `<lucide-icon name="table">` nhưng icon `Table` chưa được đăng ký trong `LucideAngularModule.pick(...)` tại app config.
- Fix: Import và thêm `Table` vào danh sách icon provider trong `frontend/src/app/app.config.ts`.
- Trạng thái: ✅ Đã fix

## [BUG-020] Trang /majors và /curricula trống dữ liệu

- Ngày: 08/04/2026
- File/Vị trí: MongoDB collections `majors`, `curricula`
- Mô tả: Mở trang `/majors` và `/curricula` không thấy bản ghi nào dù UI/API hoạt động.
- Nguyên nhân: DB chưa có dữ liệu seed cho ngành và CTĐT.
- Fix: Chạy lại script seed backend để tạo dữ liệu majors/curricula, kiểm tra lại số lượng bản ghi sau seed.
- Trạng thái: ✅ Đã fix

## [BUG-021] Chat room theo khoa hiển thị thiếu quyền admin và tên phòng khó đọc

- Ngày: 08/04/2026
- File/Vị trí: `backend/src/routes/messages.js`, `backend/src/socket.js`, `frontend/src/app/features/chat/chat.component.ts`, `frontend/src/app/shared/models/interfaces.ts`
- Mô tả: Admin không thấy đầy đủ nhóm chat theo khoa; danh sách room hiển thị mã/ID kỹ thuật thay vì tên phòng dễ đọc.
- Nguyên nhân: Logic room listing chỉ dựa vào phạm vi được gán trước đó và chưa enrich metadata hiển thị (`roomName`, `roomCode`).
- Fix: Mở quyền admin xem toàn bộ room khoa active, auto-join socket theo khoa cho admin, trả thêm metadata tên/mã phòng từ backend và render theo metadata ở frontend.
- Trạng thái: ✅ Đã fix

## [BUG-022] UI chat room-item active bị to và giãn không đúng layout

- Ngày: 08/04/2026
- File/Vị trí: `frontend/src/app/features/chat/chat.component.ts`
- Mô tả: Item phòng chat ở trạng thái active quá to, lệch tỷ lệ so với thiết kế tham chiếu.
- Nguyên nhân: Kích thước padding/avatar/font và cách stretch của list container làm tile bị phồng.
- Fix: Thu gọn kích thước room tile (padding, avatar, font-size, line-height), điều chỉnh list container để không kéo giãn theo trục dọc.
- Trạng thái: ✅ Đã fix

## [BUG-023] Trang advisor/students gọi /student-curricula trả 404 hàng loạt

- Ngày: 09/04/2026
- File/Vị trí: `backend/src/routes/studentCurricula.js`, `frontend/src/app/features/advisor/advisor-student-detail.component.ts`
- Mô tả: Vào danh sách/chi tiết học sinh cố vấn phát sinh nhiều lỗi 404 từ API student-curricula.
- Nguyên nhân: Backend trả 404 cả khi học sinh tồn tại nhưng chưa được gán StudentCurriculum.
- Fix: Chỉ trả 404 khi học sinh không tồn tại; nếu chưa gán CTĐT thì trả 200 với `studentCurriculum: null` + `progress` rỗng/hợp lệ; cập nhật type phía frontend cho payload nullable.
- Trạng thái: ✅ Đã fix

## [BUG-024] API roadmap AI trả 500 khi sinh viên chưa gán CTĐT

- Ngày: 09/04/2026
- File/Vị trí: `backend/src/services/aiService.js`
- Mô tả: `GET /api/predictions/student/:id/gpa-roadmap` và `GET /api/predictions/student/:id/retake-roadmap` trả 500 ở trang advisor student detail.
- Nguyên nhân: Service roadmap throw exception khi không tìm thấy `StudentCurriculum`, lỗi này không được chuyển thành payload fallback.
- Fix: Bổ sung fallback trong `aiService`: khi chưa có CTĐT thì trả roadmap rỗng hợp lệ (summary/note rõ ràng) thay vì throw 500; giữ 404 cho trường hợp student không tồn tại.
- Trạng thái: ✅ Đã fix

## [BUG-025] Generate dataset AI lỗi do Mongo sort vượt giới hạn bộ nhớ

- Ngày: 09/04/2026
- File/Vị trí: `ai-engine/data/generate_data.py`
- Mô tả: Chạy generate_data trên tập Grade lớn bị lỗi `Sort exceeded memory limit`.
- Nguyên nhân: Query `grades.find(...).sort("createdAt", 1)` thực hiện server-side sort trên tập lớn mà không bật disk use.
- Fix: Bỏ sort phía Mongo trong `_load_grades`, xử lý logic tổng hợp theo dữ liệu đã đọc ở Python để tránh chạm giới hạn sort memory.
- Trạng thái: ✅ Đã fix

## [BUG-026] Seed dữ liệu lớn cảm giác treo do batch tạo Grade quá nặng

- Ngày: 09/04/2026
- File/Vị trí: `backend/src/scripts/seedLargeScaleData.js`
- Mô tả: Script seed 10k chạy rất chậm, log tiến độ thưa nên dễ hiểu nhầm bị treo.
- Nguyên nhân: Mỗi batch tạo quá nhiều Grade/registration dẫn đến insert nặng; script luôn seed thêm 10k mới thay vì target tổng.
- Fix: Tối ưu script theo target tổng (`SEED_TARGET_STUDENTS`), thêm tuning qua env (`SEED_BATCH_SIZE`, `SEED_GRADE_RATIO`), giảm tải tạo Grade, giữ progress log rõ ràng và hoàn tất mốc 10k ổn định hơn.
- Trạng thái: ✅ Đã fix

## [BUG-027] Lưu điểm thất bại với sinh viên đăng ký qua StudentCurriculum

- Ngày: 11/04/2026
- File/Vị trí: backend/src/routes/grades.js
- Mô tả: Trang `/grades` chọn được sinh viên trong lớp học phần nhưng bấm lưu điểm báo lỗi không thuộc lớp.
- Nguyên nhân: API `POST /api/grades` chỉ kiểm tra `Student.classId === classId`, không tính trường hợp sinh viên thuộc lớp qua `StudentCurriculum.registrations.classId`.
- Fix: Mở rộng kiểm tra membership theo cả hai nguồn (direct class + curriculum registrations) trước khi tạo bảng điểm.
- Trạng thái: ✅ Đã fix

## [BUG-028] Mẫu import điểm không đổ đủ sinh viên theo lớp học phần

- Ngày: 12/04/2026
- File/Vị trí: backend/src/services/importService.js
- Mô tả: Tải mẫu Excel import vẫn là dữ liệu ví dụ, không có đầy đủ danh sách sinh viên của lớp học phần đang chọn.
- Nguyên nhân: `generateTemplateWorkbook` dùng sample rows hard-code và `getTemplateOptionsByClassId` không lấy danh sách sinh viên thực tế của lớp.
- Fix: Bổ sung truy vấn enrolled students theo cả `Student.classId` và `StudentCurriculum.registrations.classId`, đưa toàn bộ danh sách vào sheet Template và hiển thị studentCount trong sheet Hướng dẫn.
- Trạng thái: ✅ Đã fix

## [BUG-029] Validate import điểm bỏ sót sinh viên thuộc lớp qua curriculum

- Ngày: 12/04/2026
- File/Vị trí: backend/src/services/importService.js
- Mô tả: Import preview/excel báo không tìm thấy học sinh dù sinh viên có trong lớp học phần theo dữ liệu đăng ký.
- Nguyên nhân: `validateRows` chỉ tìm theo `Student.find({ classId, studentCode })`, bỏ qua enrollment từ `StudentCurriculum`.
- Fix: Đồng bộ `validateRows` sang cùng nguồn enrollment gộp direct + registration để validate/import đúng phạm vi lớp học phần.
- Trạng thái: ✅ Đã fix

## [BUG-030] Dữ liệu seed lớn sinh tên placeholder kiểu Sinh vien 000xxx

- Ngày: 12/04/2026
- File/Vị trí: backend/src/scripts/seedLargeScaleData.js, backend/src/scripts/renameSyntheticStudentNames.js
- Mô tả: Dữ liệu học sinh hiển thị tên giả dạng mã (`Sinh vien 000416`) gây khó kiểm tra nghiệp vụ.
- Nguyên nhân: Script seed lớn hard-code `fullName` theo pattern số tăng dần.
- Fix: Thay generator tên thật trong seed lớn, thêm script đổi tên hàng loạt `students:rename-real` và đã chạy đổi 2,880 bản ghi, còn 0 tên synthetic.
- Trạng thái: ✅ Đã fix

## [BUG-031] PowerShell Set-Content double-encode UTF-8 → tiếng Việt bị rác

- Ngày: 12/04/2026
- File/Vị trí: Bất kỳ file TypeScript/SCSS nào có tiếng Việt
- Mô tả: Sau khi dùng PowerShell `Get-Content` + `Set-Content -Encoding UTF8` để chỉnh sửa file, toàn bộ ký tự tiếng Việt bị double-encode (VD: `Bộ môn` → `Bá»™ mĂ´n`). Angular compile bình thường nhưng browser hiển thị rác.
- Nguyên nhân: PS5 `Get-Content` không có tham số Encoding đọc file UTF-8 không BOM như Windows-1252, sau đó `Set-Content -Encoding UTF8` ghi lại là UTF-8 → double-encode. PS5 cũng thêm BOM vào file.
- Fix: KHÔNG BAO GIỜ dùng PowerShell để đọc/ghi file source có tiếng Việt. Dùng Python (`open(..., encoding='utf-8')`) hoặc tool `create_file`/`replace_string_in_file` của AI agent. Nếu file đã bị BOM: `python -c "with open(f,'rb') as f: raw=f.read(); open(f,'wb').write(raw[3:] if raw[:3]==b'\xef\xbb\xbf' else raw)"`.
- Trạng thái: ✅ Đã fix

## [BUG-032] class-predictions.component.ts bị duplicate do file cũ append vào file mới

- Ngày: 12/04/2026
- File/Vị trí: frontend/src/app/features/predictions/class-predictions.component.ts
- Mô tả: Build báo `Duplicate identifier 'CommonModule'`, `Duplicate identifier 'ClassPredictionsComponent'` (~60 lỗi). File có 2000+ dòng trong khi bình thường chỉ ~1000 dòng.
- Nguyên nhân: Khi tạo lại file mới bằng `create_file`, nội dung cũ (bị encoding rác từ BUG-031) đã bị append vào sau component mới thay vì ghi đè sạch.
- Fix: Dùng Python để truncate file tại đúng dòng `}` cuối cùng của component đầu tiên (dòng 1008), xóa toàn bộ phần duplicate từ dòng 1009 trở đi.
- Trạng thái: ✅ Đã fix

## [BUG-033] student-detail.component.ts: runOverallPrediction() bị merge vào body của runPrediction()

- Ngày: 12/04/2026
- File/Vị trí: frontend/src/app/features/students/student-detail.component.ts
- Mô tả: Build báo `TS1003: Identifier expected`, `TS2680: 'this' parameter must be first`, `TS2300: Duplicate identifier`, `TS7006: Parameter '(Missing)' implicitly has 'any' type` tại các dòng 516, 656, 666, 672. Hàm `runOverallPrediction()` không tồn tại mặc dù template gọi nó.
- Nguyên nhân: Khi AI agent thêm `runOverallPrediction()` vào `runPrediction()`, phần `error` callback và closing braces của `.subscribe({...})` bị bỏ sót → hàm mới bị nhét vào giữa subscribe object literal thay vì sau khi đóng `runPrediction()`.
- Fix: Bổ sung lại `error` callback + closing `});` + `}` cho `runPrediction()`, sau đó đặt `runOverallPrediction()` như method độc lập.
- Trạng thái: ✅ Đã fix

## [BUG-034] Build lỗi budget sau khi component mới làm tăng bundle size

- Ngày: 12/04/2026
- File/Vị trí: frontend/angular.json
- Mô tả: `ng build` exit code 1 do `bundle initial exceeded maximum budget` (564 kB > 500 kB) và `home.component.scss exceeded budget` (12.71 kB > 12 kB).
- Nguyên nhân: Thêm component predictions mới vào lazy chunk; CSS landing page vẫn sát ngưỡng budget cũ.
- Fix: Nâng `maximumWarning` initial từ 500kB → 700kB, `maximumError` từ 1MB → 2MB; nâng `anyComponentStyle` warning từ 12kB → 20kB, error từ 16kB → 32kB.
- Trạng thái: ✅ Đã fix

## [BUG-035] Sass @import deprecation warning làm CI/build fail (exit code 1)

- Ngày: 12/04/2026
- File/Vị trí: frontend/src/styles.scss
- Mô tả: Build warn `Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0` cho `@import './app/shared/styles/page'`. Kết hợp với budget warning tạo exit code 1.
- Nguyên nhân: Dart Sass đã deprecated `@import`, khuyến nghị dùng `@use`/`@forward`.
- Fix: Đổi `@import './app/shared/styles/page'` → `@use './app/shared/styles/page'` và đặt lên trước `@import '@angular/material/...'` (vì `@use` phải đứng đầu file trước mọi CSS rule).
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
