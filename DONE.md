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

---

## FRONTEND

_(Chưa có task nào hoàn thành)_

---

## TEMPLATE THÊM TASK MỚI

```
## [DONE-001]
- Ngày:
- File:
- Ghi chú:
```
