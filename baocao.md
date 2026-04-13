# TRƯỜNG ĐẠI HỌC NGUYỄN TẤT THÀNH

# KHOA CÔNG NGHỆ THÔNG TIN

---

## HỆ THỐNG QUẢN LÝ ĐIỂM VÀ DỰ ĐOÁN KẾT QUẢ HỌC TẬP SỬ DỤNG MACHINE LEARNING

**Giảng viên hướng dẫn:** ThS. Đỗ Gia Bảo

**Sinh viên thực hiện:** Trịnh Hải Đăng

**MSSV:** 2311560117

**Khóa:** 2023

**Chuyên ngành:** Kỹ thuật phần mềm

**Tp. HCM, tháng 5 năm 2026**

---

# CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI

## 1.1 Lý do chọn đề tài

Quản lý điểm và theo dõi kết quả học tập là bài toán thực tiễn cấp thiết tại các trường đại học. Các hệ thống truyền thống thường chỉ lưu trữ dữ liệu thô mà thiếu khả năng phân tích xu hướng, cảnh báo rủi ro hay gợi ý can thiệp sớm — dẫn đến tình trạng giảng viên và cố vấn không phát hiện kịp thời học sinh có nguy cơ trượt môn.

Đề tài xây dựng hệ thống web hoàn chỉnh: từ nhập điểm, quản lý chương trình đào tạo, đến tích hợp Machine Learning dự đoán xếp loại học lực và cảnh báo rủi ro, hỗ trợ giảng viên và cố vấn trường Nguyễn Tất Thành.

## 1.2 Mục tiêu nghiên cứu

- Xây dựng hệ thống quản lý điểm đầy đủ: nhập thủ công, import Excel, tính điểm theo trọng số.
- Tích hợp mô hình AI (Random Forest) dự đoán xếp loại và mức độ rủi ro từng sinh viên.
- Phân quyền 3 cấp: Admin / Giáo viên / Cố vấn học tập với mô hình lớp sinh hoạt (`homeClassCode`).
- Dashboard thống kê, cảnh báo rủi ro, lộ trình học tập theo CTĐT 140 tín.
- Kiến trúc 3 tầng: Angular — Node.js/Express — FastAPI/Python.

## 1.3 Đối tượng và phạm vi nghiên cứu

**Đối tượng:** Sinh viên, giảng viên, cố vấn học tập Đại học Nguyễn Tất Thành.

**Phạm vi công nghệ:**

- Frontend: Angular 21, Angular Material, Chart.js
- Backend: Node.js + Express + Mongoose + MongoDB Atlas
- AI Engine: Python FastAPI + scikit-learn (Random Forest)

## 1.4 Ý nghĩa thực tiễn

- Giúp giảng viên nhập điểm nhanh, tránh sai sót; cố vấn nhận cảnh báo rủi ro sớm.
- Admin có dashboard toàn trường, phân bố xếp loại theo khoa/ngành.
- Mô hình AI phân tích điểm đa môn → dự đoán xu hướng học lực độ chính xác ~85–90%.

---

# CHƯƠNG 2: PHÂN TÍCH, THIẾT KẾ VÀ TRIỂN KHAI HỆ THỐNG

## 2.1 Sơ đồ Mindmap Chức Năng

```
                    ┌──────────────────────────────────┐
                    │   HỆ THỐNG QUẢN LÝ ĐIỂM NTTU     │
                    └──────────────┬───────────────────┘
                                   │
          ┌──────────┬─────────────┼─────────────┬──────────┐
          │          │             │             │          │
    ┌─────▼────┐ ┌───▼────┐ ┌─────▼─────┐ ┌───▼─────┐ ┌──▼───────┐
    │  Xác     │ │ Quản   │ │  Nhập     │ │  AI     │ │  Admin   │
    │  thực &  │ │ lý     │ │  Điểm &   │ │  Dự     │ │  Quản    │
    │  Phân    │ │ Sinh   │ │  Import   │ │  đoán   │ │  trị     │
    │  quyền   │ │ viên   │ │           │ │         │ │          │
    └─────┬────┘ └───┬────┘ └─────┬─────┘ └───┬─────┘ └──┬───────┘
          │          │            │            │          │
     JWT  │     Tìm/ │       TX/  │      Xếp   │    CRUD  │
     3    │     Lọc  │       GK/  │      loại/ │    Khoa/ │
     role │     SV/  │       TH/  │      Rủi   │    Môn/  │
          │     Lớp  │       TKT  │      ro    │    Lớp   │
     ┌────┴────┐  ┌──┴────┐  ┌───┴────┐  ┌───┴────┐  ┌──┴─────┐
     │ Admin   │  │Bảng   │  │Import  │  │Cảnh    │  │CTĐT    │
     │ Teacher │  │điểm   │  │Excel/  │  │báo     │  │140 tín │
     │ Advisor │  │lớp SH │  │CSV     │  │rủi ro  │  │Lộ trình│
     └─────────┘  └───────┘  └────────┘  └────────┘  └────────┘
```

## 2.2 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND  Angular 21  (port 4200)                      │
│  Dashboard │ Nhập điểm │ AI Predict │ Advisor lớp SH    │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP REST / Socket.IO
┌──────────────────────────▼──────────────────────────────┐
│  BACKEND  Node.js + Express  (port 3000)                │
│  JWT Auth │ 13 Routes │ Middleware Guards │ Services    │
└─────────────────────────────────────────┬───────────────┘
                                          │ axios HTTP
                           ┌──────────────▼──────────────┐
                           │  AI ENGINE  FastAPI Python  │
                           │  Random Forest  /predict    │
                           └──────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  DATABASE  MongoDB Atlas 7.x  (13 Collections)          │
└─────────────────────────────────────────────────────────┘
```

## 2.3 Chức năng chính

### Xác thực & Phân quyền

| Chức năng        | Mô tả                                                        |
| ---------------- | ------------------------------------------------------------ |
| Đăng nhập JWT    | Xác thực email + mật khẩu (bcrypt), trả về JWT token         |
| Phân quyền 3 cấp | Admin / Teacher / Advisor — mỗi cấp có route và quyền riêng  |
| AuthGuard        | Bảo vệ mọi route, redirect về /login khi token hết hạn       |
| Audit log        | Ghi lại mọi hành động nhạy cảm (tạo/sửa/xóa điểm, tài khoản) |

### Nhập điểm & Import

| Chức năng          | Mô tả                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Nhập điểm thủ công | Chọn lớp → nhập TX1/TX2/TX3, GK, TH, TKT cho từng sinh viên        |
| Tính điểm tự động  | `final = txAvg×TX% + GK×GK% + TH×TH% + TKT×TKT%` theo trọng số lớp |
| Quy đổi tự động    | GPA thang 4, letterGrade (A → F), xếp loại Giỏi/Khá/Trung bình/Yếu |
| Import Excel/CSV   | Tải mẫu → điền điểm → upload → preview → xác nhận import           |
| Gọi AI sau nhập    | Sau khi lưu điểm → tự động batch prediction cho cả lớp sinh hoạt   |

### Dự đoán AI & Cảnh báo

| Chức năng         | Mô tả                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Dự đoán xếp loại  | Random Forest dự đoán: Giỏi / Khá / Trung bình / Yếu                     |
| Đánh giá rủi ro   | `high` / `medium` / `low` dựa trên xếp loại + confidence                 |
| Cảnh báo realtime | Badge đỏ trên menu hiển thị số học sinh rủi ro cao                       |
| Dự đoán lớp SH    | `/predict-class` nhận `homeClassCode` → predict toàn bộ SV lớp sinh hoạt |
| Lộ trình AI       | Gợi ý kế hoạch học tập theo CTĐT 140 tín                                 |

### Cố vấn học tập

| Chức năng         | Mô tả                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Lớp sinh hoạt     | Mỗi SV có `homeClassCode` (VD: `23DKTPM1A`), advisor quản lý theo mã |
| Nhiều lớp/advisor | 1 advisor có thể quản lý nhiều lớp qua `advisingClassCodes[]`        |
| Xem chi tiết SV   | Tab: Tổng quan / Điểm / Lộ trình AI / Cảnh báo rủi ro                |

## 2.4 Giao diện chính

Hệ thống bao gồm 26 trang giao diện. Dưới đây là danh sách đầy đủ kèm mô tả chức năng hiển thị.

| STT | Đường dẫn                      | Tên trang                   | Mô tả giao diện                                                                                |
| --- | ------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | `/`                            | Trang chủ (Home)            | Landing page giới thiệu hệ thống, tính năng AI, hướng dẫn đăng nhập                            |
| 2   | `/login`                       | Đăng nhập                   | Form đăng nhập email + mật khẩu, xác thực JWT                                                  |
| 3   | `/dashboard`                   | Dashboard Tổng quan         | 4 card thống kê, bảng học sinh rủi ro cao, biểu đồ phân bố xếp loại, cảnh báo học lực          |
| 4   | `/profile`                     | Hồ sơ cá nhân               | Thông tin tài khoản, đổi mật khẩu, xem vai trò và khoa phụ trách                               |
| 5   | `/students`                    | Danh sách Sinh viên         | Bảng danh sách có tìm kiếm, lọc theo khoa/lớp/trạng thái, cột lớp sinh hoạt                    |
| 6   | `/students/new`                | Thêm Sinh viên              | Form tạo mới: họ tên, ngày sinh, giới tính, lớp sinh hoạt, ngành, năm nhập học                 |
| 7   | `/students/:id`                | Chi tiết Sinh viên          | Card thông tin cá nhân, bảng lịch sử điểm theo học kỳ, dự đoán AI gần nhất                     |
| 8   | `/students/:id/curriculum`     | Tiến độ CTĐT                | Progress bar tổng tín chỉ đã đạt/cần đạt, danh sách môn đã qua/còn lại theo lộ trình           |
| 9   | `/classes`                     | Quản lý Lớp học phần        | Bảng lớp lọc theo năm học/học kỳ/khoa/từ khóa, dropdown phân loại lớp học phần / lớp sinh hoạt |
| 10  | `/classes/:id`                 | Chi tiết Lớp học phần       | Thông tin lớp, danh sách sinh viên trong lớp, bảng điểm và trạng thái nhập điểm                |
| 11  | `/grades`                      | Nhập điểm                   | Chọn lớp học phần → bảng nhập TX1/TX2/TX3, GK, TH, TKT cho từng sinh viên                      |
| 12  | `/grades/import`               | Import điểm Excel           | Tải file mẫu prefill sẵn danh sách SV → upload → preview → xác nhận lưu                        |
| 13  | `/grades/sheet/:classId`       | Bảng điểm lớp               | Bảng điểm đầy đủ: điểm thành phần, điểm tổng kết, GPA thang 4, xếp loại chữ                    |
| 14  | `/predictions`                 | Dự đoán AI                  | Danh sách kết quả dự đoán: xếp loại dự đoán, confidence, mức độ rủi ro, môn yếu                |
| 15  | `/predictions/report/:gradeId` | Chi tiết dự đoán            | Biểu đồ radar điểm từng môn, xếp loại dự đoán, gợi ý cải thiện từ AI                           |
| 16  | `/advisor`                     | Cố vấn học tập              | Danh sách lớp sinh hoạt được phân công, số SV rủi ro cao, nút xem chi tiết từng lớp            |
| 17  | `/advisor/students/:id`        | Chi tiết sinh viên (Cố vấn) | Tab Tổng quan / Điểm / Lộ trình CTĐT / Cảnh báo rủi ro AI của sinh viên trong lớp sinh hoạt    |
| 18  | `/majors`                      | Quản lý Ngành học           | CRUD ngành học, gắn với khoa, quản lý mã ngành                                                 |
| 19  | `/curricula`                   | Chương trình đào tạo        | CRUD CTĐT: thêm/sửa danh sách môn theo năm/học kỳ/loại, tính tổng tín chỉ tự động              |
| 20  | `/departments`                 | Quản lý Khoa                | CRUD khoa đào tạo, kích hoạt/tắt khoa                                                          |
| 21  | `/departments/:id`             | Chi tiết Khoa               | Thông tin khoa, danh sách ngành trực thuộc, số lượng giảng viên và sinh viên                   |
| 22  | `/subjects`                    | Quản lý Môn học             | CRUD môn học: tín chỉ, trọng số TX/GK/TH/TKT, số đầu điểm TX                                   |
| 23  | `/users`                       | Quản lý Tài khoản           | Tạo/sửa tài khoản giáo viên và cố vấn, phân lớp sinh hoạt cho cố vấn                           |
| 24  | `/notifications`               | Thông báo                   | Danh sách thông báo hệ thống, đánh dấu đã đọc                                                  |
| 25  | `/chat`                        | Chat nội bộ                 | Phòng chat theo khoa, nhắn tin realtime qua Socket.IO                                          |
| 26  | `/news`                        | Tin tức                     | Bảng tin trường, hiển thị cho tất cả người dùng                                                |

## 2.5 Công nghệ sử dụng

| Tầng          | Công nghệ                       | Phiên bản | Mục đích                       |
| ------------- | ------------------------------- | --------- | ------------------------------ |
| **Frontend**  | Angular + Angular Material      | 21.2      | SPA, UI components, Standalone |
|               | Chart.js + Lucide Angular       | 4.x       | Biểu đồ, icon                  |
|               | Socket.IO Client                | 4.x       | Chat realtime                  |
| **Backend**   | Node.js + Express + Mongoose    | 20/4/8    | API server, ODM MongoDB        |
|               | bcryptjs + jsonwebtoken         | 2.x/9.x   | Hash mật khẩu, JWT auth        |
|               | multer + xlsx + axios           | Latest    | Upload Excel, gọi AI Engine    |
|               | Socket.IO Server                | 4.x       | Chat server                    |
| **AI Engine** | Python + FastAPI + scikit-learn | 3.11      | Random Forest, serving model   |
|               | pandas + numpy + pymongo        | Latest    | Xử lý dữ liệu training         |
| **Database**  | MongoDB Atlas                   | 7.x       | NoSQL cloud, 13 collections    |

## 2.6 Database — Các Collection chính

| Collection           | Mô tả                | Trường chính                                                                      |
| -------------------- | -------------------- | --------------------------------------------------------------------------------- |
| **users**            | Tài khoản hệ thống   | `role` (admin/teacher/advisor), `departmentIds[]`, `advisingClassCodes[]`         |
| **students**         | Sinh viên            | `studentCode`, `fullName`, `homeClassCode`, `majorId`, `enrolledYear`             |
| **classes**          | Lớp học phần         | `code` (VD: `23DKTPM1A-KTPM_CO_SO_LAP_TRINH`), `subjectId`, `teacherId`           |
| **grades**           | Điểm theo lớp HP     | `studentId`, `classId`, `txScores[]`, `gkScore`, `tktScore`, `finalScore`, `gpa4` |
| **predictions**      | Kết quả dự đoán AI   | `studentId`, `predictedRank`, `confidence`, `riskLevel`, `weakSubjects[]`         |
| **curricula**        | Chương trình đào tạo | `majorId`, `items[]` (subjectId, year, semester, subjectType), `totalCredits`     |
| **studentcurricula** | Đăng ký CTĐT         | `studentId`, `curriculumId`, `advisorId`, `registrations[]`                       |
| **departments**      | Khoa đào tạo         | `name`, `code`, `isActive`                                                        |
| **subjects**         | Môn học              | `code`, `name`, `credits`, `defaultWeights` (tx/gk/th/tkt), `txCount`             |
| **auditlogs**        | Nhật ký hành động    | `userId`, `action`, `targetModel`, `changes`, `ip`                                |

**Quan hệ:**

```
Department ──< Subject ──< Class ──< Grade ──< Prediction
Student (homeClassCode) ──────────<┘
Student ──< StudentCurriculum ──> Curriculum ──> Major ──> Department
```

## 2.7 Kết quả đạt được

| Hạng mục              | Kết quả                                                          |
| --------------------- | ---------------------------------------------------------------- |
| Dữ liệu seed          | ~10,000 SV, 18+ khoa, 40+ ngành, mã lớp sinh hoạt đúng định dạng |
| Mô hình AI            | Random Forest, ~20,000 mẫu training, accuracy ~85–90%            |
| Phân quyền            | 3 cấp hoạt động đúng; advisorAccess kiểm tra qua `homeClassCode` |
| Import Excel          | File mẫu prefill SV, validate trước khi lưu                      |
| Dự đoán lớp sinh hoạt | `/predict-class` nhận `homeClassCode`, predict toàn bộ SV        |
| Chat realtime         | Socket.IO theo phòng khoa, ổn định                               |

---

# KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## Kết quả đạt được

Đề tài đã xây dựng hoàn chỉnh hệ thống quản lý điểm tích hợp AI với đầy đủ tính năng cốt lõi: nhập điểm, import Excel, dự đoán xếp loại bằng Random Forest, cảnh báo rủi ro, lộ trình học tập, phân quyền 3 cấp và mô hình lớp sinh hoạt cho cố vấn học tập.

## Hướng phát triển

| Ngắn hạn (1–3 tháng)           | Trung–dài hạn (3–12 tháng)                    |
| ------------------------------ | --------------------------------------------- |
| Push notification cảnh báo mới | Retrain model tự động (cron job hàng tháng)   |
| Xuất báo cáo PDF               | Thử nghiệm XGBoost / Neural Network           |
| Dashboard riêng cho Advisor    | Mobile App (Flutter) cho phụ huynh            |
| Timeline GPA nhiều học kỳ      | Tích hợp SSO Microsoft 365 / Google Workspace |
| Reset mật khẩu qua email (OTP) | Multi-tenant hỗ trợ nhiều trường đại học      |

---

# TÀI LIỆU THAM KHẢO

1. Angular Team. _Angular Documentation_. https://angular.dev
2. MongoDB Inc. _Mongoose ODM Documentation_. https://mongoosejs.com
3. Scikit-learn Developers. _Random Forest Classifier_. https://scikit-learn.org
4. FastAPI. _FastAPI Documentation_. https://fastapi.tiangolo.com
5. Tiệp Vũ. _Machine Learning cơ bản_. https://machinelearningcoban.com

---

# PHỤ LỤC: PHÂN QUYỀN THEO GIAO DIỆN

## Mô tả vai trò

| Vai trò     | Tên hiển thị   | Mô tả chi tiết                                                                                                       |
| ----------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Admin**   | Quản trị viên  | Có toàn quyền trên toàn hệ thống: quản lý tài khoản, khoa, ngành, môn học, lớp học phần, lớp sinh hoạt, điểm và CTĐT |
| **Teacher** | Giáo viên      | Nhập điểm thủ công và import Excel, xem bảng điểm, xem danh sách sinh viên và lớp, xem dự đoán AI                    |
| **Advisor** | Cố vấn học tập | Quản lý lớp sinh hoạt được phân công, xem điểm và dự đoán AI của sinh viên trong lớp, không nhập điểm                |

## Phân quyền theo từng trang

| STT | Đường dẫn                      | Tên trang                        | Quản trị viên |   Giáo viên    | Cố vấn học tập |
| --- | ------------------------------ | -------------------------------- | :-----------: | :------------: | :------------: |
| 1   | `/`                            | Trang chủ (public)               |   Truy cập    |    Truy cập    |    Truy cập    |
| 2   | `/login`                       | Đăng nhập                        |   Truy cập    |    Truy cập    |    Truy cập    |
| 3   | `/dashboard`                   | Dashboard tổng quan              |   Truy cập    |    Truy cập    |    Truy cập    |
| 4   | `/profile`                     | Hồ sơ cá nhân                    |   Truy cập    |    Truy cập    |    Truy cập    |
| 5   | `/students`                    | Danh sách sinh viên              |   Truy cập    |    Truy cập    |    Truy cập    |
| 6   | `/classes`                     | Lớp học phần / lớp sinh hoạt     |   Truy cập    |    Truy cập    |    Truy cập    |
| 7   | `/grades`                      | Nhập điểm (chọn lớp)             |   Truy cập    |    Truy cập    | Không có quyền |
| 8   | `/grades/import`               | Import điểm Excel                |   Truy cập    |    Truy cập    | Không có quyền |
| 9   | `/grades/sheet/:classId`       | Bảng điểm chi tiết lớp học phần  |   Truy cập    |    Truy cập    |    Chỉ xem     |
| 10  | `/predictions`                 | Danh sách dự đoán AI             |   Truy cập    |    Truy cập    |    Truy cập    |
| 11  | `/predictions/report/:gradeId` | Chi tiết kết quả dự đoán         |   Truy cập    |    Truy cập    |    Truy cập    |
| 12  | `/advisor`                     | Cố vấn — danh sách lớp sinh hoạt |   Truy cập    | Không có quyền |    Truy cập    |
| 13  | `/advisor/students/:id`        | Chi tiết sinh viên (cố vấn)      |   Truy cập    | Không có quyền |    Truy cập    |
| 14  | `/majors`                      | Quản lý ngành học                |   Truy cập    | Không có quyền | Không có quyền |
| 15  | `/curricula`                   | Quản lý chương trình đào tạo     |   Truy cập    | Không có quyền | Không có quyền |
| 16  | `/departments`                 | Quản lý khoa                     |   Truy cập    | Không có quyền | Không có quyền |
| 17  | `/subjects`                    | Quản lý môn học                  |   Truy cập    | Không có quyền | Không có quyền |
| 18  | `/users`                       | Quản lý tài khoản GV / cố vấn    |   Truy cập    | Không có quyền | Không có quyền |
| 19  | `/notifications`               | Thông báo hệ thống               |   Truy cập    |    Truy cập    |    Truy cập    |
| 20  | `/chat`                        | Chat nội bộ (Socket.IO)          |   Truy cập    |    Truy cập    |    Truy cập    |
| 21  | `/news`                        | Tin tức trường                   |   Truy cập    |    Truy cập    |    Truy cập    |
