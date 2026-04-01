# 🎓 HỆ THỐNG QUẢN LÝ HỌC SINH + AI DỰ ĐOÁN KẾT QUẢ
## Tài liệu Vibe Code — 14 Ngày — Mục tiêu 100 Điểm

---

## 📋 MỤC LỤC

1. Tổng quan dự án
2. Kiến trúc hệ thống
3. Cấu trúc thư mục
4. ERD Database
5. API Endpoints
6. Lịch 14 ngày chi tiết
7. Prompt Vibe Code từng ngày
8. Checklist nộp bài

---

## 1. TỔNG QUAN DỰ ÁN

**Tên đề tài:** Hệ thống Quản lý Học sinh và Dự đoán Kết quả Học tập sử dụng Machine Learning

**Vấn đề giải quyết:** Giáo viên/nhà trường thiếu công cụ phát hiện sớm học sinh có nguy cơ học yếu, thường chỉ biết khi kỳ thi kết thúc — quá muộn để can thiệp.

**Giải pháp:** Web app cho phép nhập điểm học sinh, ML model tự học pattern từ dữ liệu lịch sử và dự đoán kết quả học kỳ tiếp theo, cảnh báo sớm học sinh có nguy cơ.

**Người dùng:**
- Giáo viên chủ nhiệm: nhập điểm, xem cảnh báo, theo dõi học sinh
- Admin trường: quản lý lớp, giáo viên, tổng quan toàn trường

**Stack công nghệ:**
- Frontend: Angular v21 (Standalone Components + Angular Material)
- Backend: Node.js + Express
- AI Engine: Python + FastAPI + scikit-learn
- Database: MongoDB Atlas
- Auth: JWT

---

## 2. KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────┐
│           ANGULAR FRONTEND (port 4200)               │
│  Auth | Dashboard | Students | Classes | AI Report   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────┐
│         NODE.JS + EXPRESS BACKEND (port 3000)        │
│   Routes: /auth /students /classes /grades /predict  │
└──────────┬──────────────────────────┬───────────────┘
           │                          │ HTTP
    ┌──────▼──────┐         ┌─────────▼──────────┐
    │  MongoDB    │         │  PYTHON FASTAPI     │
    │  Atlas      │         │  AI ENGINE (5000)   │
    │             │         │  model.pkl          │
    └─────────────┘         └────────────────────┘
```

**Luồng dữ liệu chính:**
```
Giáo viên nhập điểm
  → Node.js lưu vào MongoDB
  → Node.js gọi Python API: POST /predict
  → Python load model.pkl, tính toán
  → Trả về: xếp loại dự đoán + % confidence + cảnh báo
  → Node.js lưu kết quả, trả về Angular
  → Angular hiển thị dashboard + badge cảnh báo
```

---

## 3. CẤU TRÚC THƯ MỤC

```
student-ai-system/
│
├── backend/                        # Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js         # Kết nối MongoDB
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT middleware
│   │   │   ├── auditLog.js         # Tự động ghi AuditLog
│   │   │   └── errorHandler.js     # Xử lý lỗi toàn cục
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── SchoolYear.js       # MỚI
│   │   │   ├── Subject.js          # MỚI
│   │   │   ├── Class.js
│   │   │   ├── Student.js
│   │   │   ├── Grade.js
│   │   │   ├── Prediction.js
│   │   │   ├── Notification.js     # MỚI
│   │   │   └── AuditLog.js         # MỚI
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── schoolYears.js      # MỚI
│   │   │   ├── subjects.js         # MỚI
│   │   │   ├── classes.js
│   │   │   ├── students.js
│   │   │   ├── grades.js
│   │   │   ├── predictions.js
│   │   │   ├── notifications.js    # MỚI
│   │   │   └── auditLogs.js        # MỚI
│   │   ├── services/
│   │   │   ├── aiService.js            # Gọi Python API
│   │   │   ├── notificationService.js  # Tạo notification tự động
│   │   │   └── importService.js        # MỚI: parse Excel/CSV, validate, import
│   │   ├── templates/
│   │   │   └── grade_import_template.xlsx  # MỚI: file mẫu cho GV tải về
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── ai-engine/                      # Python + FastAPI
│   ├── data/
│   │   └── generate_data.py        # Tạo dữ liệu giả để train
│   ├── models/
│   │   └── model.pkl               # Model đã train (tự sinh)
│   ├── train.py                    # Script train model
│   ├── main.py                     # FastAPI server
│   ├── requirements.txt
│   └── schemas.py                  # Pydantic schemas
│
└── frontend/                       # Angular v21
    └── src/
        └── app/
            ├── core/
            │   ├── guards/
            │   │   └── auth.guard.ts
            │   ├── interceptors/
            │   │   └── jwt.interceptor.ts
            │   └── services/
            │       └── api.service.ts
            ├── features/
            │   ├── auth/
            │   │   ├── login/
            │   │   └── register/
            │   ├── dashboard/
            │   ├── school-years/           # MỚI
            │   │   └── school-year-list/
            │   ├── subjects/               # MỚI
            │   │   └── subject-list/
            │   ├── students/
            │   │   ├── student-list/
            │   │   ├── student-form/
            │   │   └── student-detail/
            │   ├── classes/
            │   │   ├── class-list/
            │   │   └── class-detail/
            │   ├── grades/
            │   │   ├── grade-entry/        # Nhập tay từng học sinh
            │   │   └── grade-import/       # MỚI: import Excel/CSV hàng loạt
            │   ├── predictions/
            │   │   ├── prediction-report/
            │   │   └── class-predictions/
            │   ├── notifications/          # MỚI
            │   │   └── notification-list/
            │   └── audit-logs/             # MỚI [Admin only]
            │       └── audit-log-list/
            ├── shared/
            │   ├── components/
            │   │   ├── navbar/
            │   │   ├── sidebar/
            │   │   ├── alert-badge/
            │   │   └── notification-bell/  # MỚI: icon chuông + dropdown
            │   └── models/
            │       └── interfaces.ts       # Interfaces cho 9 bảng
            └── app.routes.ts
```

---

## 4. ERD DATABASE

### Sơ đồ quan hệ tổng thể
```
SchoolYear ──────────────────────────────────────┐
    │ (1)                                         │
    │ (n)                                         │
  Class ──── (n) ──── User (Teacher)              │
    │ (1)                                         │
    │ (n)                                         │
 Student ───────────────────────────────── AuditLog
    │ (1)                 (1)                  (n)
    │ (n)               Subject
   Grade ──── (n:1) ────────────────────────────
    │ (1)
    │ (1)
Prediction
    │ (1)
    │ (n)
Notification
```

**Tổng: 9 bảng — 14 quan hệ**

---

### 1. User (Giáo viên / Admin)
```
{
  _id:          ObjectId,
  name:         String (required),
  email:        String (unique, required),        // abc@nttu.edu.vn
  password:     String (hashed, required),
  role:         Enum['admin', 'teacher']
                (default: 'teacher'),
  phone:        String,
  avatar:       String,                           // URL ảnh đại diện
  isActive:     Boolean (default: true),
  lastLogin:    Date,
  createdAt:    Date,
  updatedAt:    Date
}
Index: email (unique)
```

### 2. SchoolYear (Năm học / Học kỳ)
```
{
  _id:          ObjectId,
  name:         String (required),                // "2024-2025"
  startDate:    Date (required),                  // 05/09/2024
  endDate:      Date (required),                  // 31/05/2025
  semesters: [
    {
      semesterNumber: Number,                     // 1 hoặc 2
      startDate:      Date,
      endDate:        Date,
      isCurrent:      Boolean (default: false)
    }
  ],
  isCurrent:    Boolean (default: false),         // Năm học hiện tại
  createdBy:    ObjectId (ref: User),
  createdAt:    Date
}
Index: name (unique), isCurrent
Ràng buộc: Chỉ 1 SchoolYear có isCurrent = true tại một thời điểm
```

### 3. Subject (Danh mục môn học)
```
{
  _id:          ObjectId,
  code:         String (unique, required),        // "TOAN", "VAN", "ANH"
  name:         String (required),                // "Toán", "Ngữ văn"
  gradeLevel:   [Number],                         // [10, 11, 12] — áp dụng khối nào
  coefficient:  Number (default: 1),              // Hệ số môn (Toán hệ số 2)
  category:     Enum['science', 'social',
                     'language', 'other'],
  isActive:     Boolean (default: true),
  createdAt:    Date
}
Index: code (unique)
Dữ liệu mặc định:
  { code: "TOAN",  name: "Toán",       coefficient: 2, category: "science"  }
  { code: "VAN",   name: "Ngữ văn",    coefficient: 2, category: "social"   }
  { code: "ANH",   name: "Tiếng Anh",  coefficient: 1, category: "language" }
  { code: "LY",    name: "Vật lý",     coefficient: 1, category: "science"  }
  { code: "HOA",   name: "Hóa học",    coefficient: 1, category: "science"  }
  { code: "SINH",  name: "Sinh học",   coefficient: 1, category: "science"  }
  { code: "SU",    name: "Lịch sử",    coefficient: 1, category: "social"   }
  { code: "DIA",   name: "Địa lý",     coefficient: 1, category: "social"   }
```

### 4. Class (Lớp học)
```
{
  _id:          ObjectId,
  name:         String (required),                // "11A1"
  gradeLevel:   Number (required, enum:[10,11,12]),
  schoolYearId: ObjectId (ref: SchoolYear, required),
  teacherId:    ObjectId (ref: User),             // GVCN
  studentCount: Number (default: 0),
  description:  String,
  isActive:     Boolean (default: true),
  createdAt:    Date,
  updatedAt:    Date
}
Index: { name, schoolYearId } (unique) — tên lớp không trùng trong cùng năm học
```

### 5. Student (Học sinh)
```
{
  _id:          ObjectId,
  studentCode:  String (unique, required),        // "HS0001"
  fullName:     String (required),
  dateOfBirth:  Date,
  gender:       Enum['male', 'female'],
  classId:      ObjectId (ref: Class, required),
  address:      String,
  parentName:   String,                           // Tên phụ huynh
  parentPhone:  String,
  parentEmail:  String,
  avatar:       String,
  status:       Enum['active', 'inactive',
                     'transferred']               // transferred = chuyển trường
                (default: 'active'),
  notes:        String,                           // Ghi chú đặc biệt
  createdAt:    Date,
  updatedAt:    Date
}
Index: studentCode (unique), classId, status
```

### 6. Grade (Bảng điểm)
```
{
  _id:            ObjectId,
  studentId:      ObjectId (ref: Student, required),
  classId:        ObjectId (ref: Class, required),
  schoolYearId:   ObjectId (ref: SchoolYear, required),
  semester:       Number (enum:[1,2], required),
  scores: [                                       // Mảng linh hoạt theo Subject
    {
      subjectId:  ObjectId (ref: Subject),
      subjectCode: String,                        // Cache để query nhanh
      score:      Number (min:0, max:10)
    }
  ],
  attendanceTotal:   Number (default: 0),         // Tổng số buổi học
  attendanceAbsent:  Number (default: 0),         // Số buổi vắng
  attendanceRate:    Number,                      // % chuyên cần (tự tính)
  conductScore:   Enum['Tốt', 'Khá',
                       'Trung Bình', 'Yếu'],
  averageScore:   Number,                         // Tính tự động (có hệ số)
  ranking:        Enum['Giỏi', 'Khá',
                       'Trung Bình', 'Yếu'],      // Xếp loại thực tế
  classRank:      Number,                         // Hạng trong lớp
  enteredBy:      ObjectId (ref: User),           // Ai nhập điểm
  createdAt:      Date,
  updatedAt:      Date
}
Index: { studentId, semester, schoolYearId } (unique)
Pre-save hook: tự tính averageScore (có hệ số) + attendanceRate + ranking
```

### 7. Prediction (Kết quả AI dự đoán)
```
{
  _id:              ObjectId,
  studentId:        ObjectId (ref: Student, required),
  gradeId:          ObjectId (ref: Grade, required),
  schoolYearId:     ObjectId (ref: SchoolYear),
  semester:         Number,
  predictedRank:    Enum['Giỏi', 'Khá',
                         'Trung Bình', 'Yếu'],
  confidence:       Number,                       // 0-100 (%)
  riskLevel:        Enum['low', 'medium', 'high'],
  weakSubjects:     [String],                     // Code môn yếu
  suggestions:      [String],                     // Gợi ý cải thiện
  analysis:         String,                       // Đoạn phân tích tổng thể
  modelVersion:     String (default: '1.0'),      // Version model đã dùng
  inputFeatures:    Object,                       // Lưu input đã dùng để debug
  isRead:           Boolean (default: false),     // GV đã xem chưa
  createdAt:        Date
}
Index: studentId, gradeId, riskLevel, isRead
```

### 8. Notification (Thông báo & Cảnh báo)
```
{
  _id:          ObjectId,
  userId:       ObjectId (ref: User, required),   // Người nhận
  type:         Enum[
                  'risk_alert',                   // Cảnh báo HS có nguy cơ
                  'grade_entered',                // Điểm vừa được nhập
                  'prediction_done',              // AI dự đoán xong
                  'system'                        // Thông báo hệ thống
                ],
  title:        String (required),
  message:      String (required),
  data: {                                         // Dữ liệu đính kèm
    studentId:  ObjectId,
    classId:    ObjectId,
    gradeId:    ObjectId,
    predictionId: ObjectId
  },
  priority:     Enum['low', 'normal', 'high']
                (default: 'normal'),
  isRead:       Boolean (default: false),
  readAt:       Date,
  createdAt:    Date
}
Index: { userId, isRead }, createdAt
Auto-trigger:
  → Khi Prediction.riskLevel = 'high'   → tạo notification type='risk_alert'
  → Khi Grade được tạo                  → tạo notification type='grade_entered'
  → Khi Prediction xong                 → tạo notification type='prediction_done'
```

### 9. AuditLog (Lịch sử thao tác)
```
{
  _id:          ObjectId,
  userId:       ObjectId (ref: User, required),   // Ai thực hiện
  action:       Enum[
                  'CREATE', 'UPDATE',
                  'DELETE', 'LOGIN',
                  'LOGOUT', 'PREDICT'
                ],
  resource:     String (required),                // "Student", "Grade", "Class"
  resourceId:   ObjectId,                         // ID bản ghi bị tác động
  description:  String,                           // Mô tả ngắn gọn
  oldData:      Object,                           // Dữ liệu trước khi sửa
  newData:      Object,                           // Dữ liệu sau khi sửa
  ipAddress:    String,
  userAgent:    String,
  createdAt:    Date
}
Index: userId, action, resource, createdAt
Retention: Giữ tối đa 90 ngày (TTL index)
Auto-trigger: Middleware ghi log sau mọi thao tác CREATE/UPDATE/DELETE
```

---

### Tóm tắt quan hệ

| Bảng | Quan hệ với |
|------|------------|
| User | Class (1-n), AuditLog (1-n), Notification (1-n), Grade.enteredBy |
| SchoolYear | Class (1-n), Grade (1-n) |
| Subject | Grade.scores (n-n qua array) |
| Class | Student (1-n), Grade (1-n) |
| Student | Grade (1-n), Prediction (1-n), Notification (qua data) |
| Grade | Prediction (1-1), Notification (qua data) |
| Prediction | Notification (1-1 khi tạo) |

---

## 5. API ENDPOINTS

### Auth
```
POST   /api/auth/register           Đăng ký
POST   /api/auth/login              Đăng nhập → trả JWT + ghi AuditLog
POST   /api/auth/logout             Đăng xuất + ghi AuditLog
GET    /api/auth/me                 Thông tin user hiện tại
PUT    /api/auth/change-password    Đổi mật khẩu
```

### SchoolYear (Năm học)
```
GET    /api/school-years            Danh sách năm học
GET    /api/school-years/current    Năm học hiện tại (isCurrent=true)
GET    /api/school-years/:id        Chi tiết năm học
POST   /api/school-years            Tạo năm học mới [Admin]
PUT    /api/school-years/:id        Cập nhật năm học [Admin]
PATCH  /api/school-years/:id/set-current   Đặt làm năm học hiện tại [Admin]
```

### Subjects (Môn học)
```
GET    /api/subjects                Danh sách môn học (có filter gradeLevel)
GET    /api/subjects/:id            Chi tiết môn học
POST   /api/subjects                Thêm môn học [Admin]
PUT    /api/subjects/:id            Sửa môn học [Admin]
PATCH  /api/subjects/:id/toggle     Bật/tắt môn học [Admin]
```

### Classes (Lớp học)
```
GET    /api/classes                 Danh sách lớp (filter schoolYearId, teacherId)
GET    /api/classes/:id             Chi tiết lớp
GET    /api/classes/:id/students    Danh sách học sinh trong lớp
POST   /api/classes                 Tạo lớp [Admin]
PUT    /api/classes/:id             Sửa lớp
DELETE /api/classes/:id             Xóa lớp [Admin]
```

### Students (Học sinh)
```
GET    /api/students                Danh sách (filter classId, status)
GET    /api/students/:id            Chi tiết học sinh
GET    /api/students/:id/summary    Tóm tắt: điểm + dự đoán + lịch sử
POST   /api/students                Thêm học sinh
PUT    /api/students/:id            Sửa thông tin
PATCH  /api/students/:id/transfer   Chuyển lớp
DELETE /api/students/:id            Xóa [Admin]
```

### Grades (Điểm)
```
GET    /api/grades/student/:id           Lịch sử điểm của học sinh
GET    /api/grades/class/:id             Điểm cả lớp (?semester=&schoolYearId=)
GET    /api/grades/:id                   Chi tiết 1 bảng điểm
POST   /api/grades                       Nhập điểm 1 học sinh (form tay)
PUT    /api/grades/:id                   Sửa điểm
DELETE /api/grades/:id                   Xóa điểm [Admin]

// Import hàng loạt
GET    /api/grades/import/template       Tải file Excel template về
POST   /api/grades/import/excel          Upload file .xlsx → import hàng loạt
POST   /api/grades/import/preview        Upload file → preview trước khi lưu (không lưu DB)
```

**Luồng import Excel:**
```
Bước 1: Giáo viên tải template    GET /template → file .xlsx có sẵn cột đúng format
Bước 2: Điền điểm vào file        Giáo viên điền offline
Bước 3: Preview trước khi lưu     POST /preview → trả về valid rows + error rows
Bước 4: Xác nhận import           POST /excel → lưu valid rows, trả báo cáo kết quả
```

### Predictions (Dự đoán AI)
```
POST   /api/predictions/predict           Dự đoán 1 học sinh (nhận gradeId)
POST   /api/predictions/predict-class     Dự đoán cả lớp (nhận classId)
GET    /api/predictions/student/:id       Lịch sử dự đoán của học sinh
GET    /api/predictions/class/:id         Dự đoán mới nhất cả lớp
GET    /api/predictions/alerts            HS rủi ro cao (riskLevel=high)
PATCH  /api/predictions/:id/read          Đánh dấu đã xem
```

### Notifications (Thông báo)
```
GET    /api/notifications                 Thông báo của user hiện tại
GET    /api/notifications/unread-count    Số thông báo chưa đọc
PATCH  /api/notifications/:id/read        Đánh dấu đã đọc
PATCH  /api/notifications/read-all        Đọc tất cả
DELETE /api/notifications/:id             Xóa thông báo
```

### AuditLog (Lịch sử thao tác)
```
GET    /api/audit-logs                    Danh sách log [Admin]
GET    /api/audit-logs?userId=&action=    Filter theo user/action [Admin]
GET    /api/audit-logs?resource=&resourceId=   Filter theo đối tượng [Admin]
```

---

## 6. LỊCH 14 NGÀY CHI TIẾT

```
TUẦN 1: Backend + AI Engine
─────────────────────────────────────────────
Ngày 1  │ Setup project + MongoDB + Auth API
Ngày 2  │ API Students + Classes (CRUD)
Ngày 3  │ API Grades (nhập tay + import Excel/CSV)
Ngày 4  │ Python AI Engine: generate data + train model
Ngày 5  │ Python FastAPI: expose /predict endpoint
Ngày 6  │ Node.js gọi Python AI + API Predictions + Notifications
Ngày 7  │ Test toàn bộ backend với Postman + fix bug

TUẦN 2: Frontend Angular
─────────────────────────────────────────────
Ngày 8  │ Setup Angular + routing + login/register UI
Ngày 9  │ Dashboard tổng quan (số liệu, cảnh báo, notification bell)
Ngày 10 │ Quản lý lớp + học sinh (list, form, CRUD)
Ngày 11 │ Nhập điểm tay + Import Excel/CSV + gọi AI dự đoán
Ngày 12 │ Trang kết quả AI (score, chart, gợi ý)
Ngày 13 │ Fix bug + polish UI + test toàn luồng
Ngày 14 │ Viết báo cáo + chuẩn bị slide demo
```

---

## 7. PROMPT VIBE CODE TỪNG NGÀY

> **TEMPLATE CHUẨN** — Dán vào đầu MỌI prompt:
> ```
> Tôi đang làm đồ án "Hệ thống Quản lý Học sinh + AI dự đoán kết quả học tập"
> Stack: Angular v21 | Node.js Express | Python FastAPI | MongoDB Mongoose | JWT Auth
> Yêu cầu code: TypeScript strict (không dùng any), comment tiếng Việt, có xử lý lỗi
> Chỉ trả code, không giải thích dài.
> ```

---

### 📅 NGÀY 1 — Setup + Auth Backend

**Prompt 1.1 — Khởi tạo project:**
```
[DÙNG TEMPLATE CHUẨN Ở TRÊN]

Tạo cấu trúc backend Node.js Express với:
- Thư mục: src/config, src/middleware, src/models, src/routes, src/services
- File index.js: setup express, cors, json parser, kết nối MongoDB, listen port 3000
- File src/config/database.js: kết nối MongoDB Atlas với mongoose, log "MongoDB connected"
- File .env.example: PORT=3000, MONGO_URI=..., JWT_SECRET=..., AI_ENGINE_URL=http://localhost:5000
- File package.json với scripts: start, dev (nodemon)
- Dependencies: express mongoose dotenv cors bcryptjs jsonwebtoken nodemon axios
```

**Prompt 1.2 — User Model + Auth:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo:
1. src/models/User.js: schema gồm name(String,required), email(unique,required),
   password(String,required), role(enum:['admin','teacher'], default:'teacher'), createdAt
   Thêm method comparePassword dùng bcrypt

2. src/middleware/auth.js: middleware xác thực JWT, gắn req.user từ token, trả 401 nếu sai

3. src/routes/auth.js:
   - POST /api/auth/register: validate input, hash password, tạo user, trả JWT
   - POST /api/auth/login: tìm user, so password, trả JWT 7 ngày
   - GET /api/auth/me: cần auth middleware, trả thông tin user (bỏ password)

4. src/middleware/errorHandler.js: middleware xử lý lỗi toàn cục, trả JSON {success:false, message}
```

---

### 📅 NGÀY 2 — CRUD Students + Classes

**Prompt 2.1 — Models:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo 2 Mongoose models:

1. src/models/Class.js:
   - name(String,required), grade(Number,required,min:10,max:12)
   - schoolYear(String,required), teacherId(ObjectId,ref:User)
   - studentCount(Number,default:0), timestamps:true

2. src/models/Student.js:
   - studentCode(String,unique,required), fullName(String,required)
   - dateOfBirth(Date), gender(enum:['male','female'])
   - classId(ObjectId,ref:Class,required), parentPhone(String)
   - status(enum:['active','inactive'],default:'active'), timestamps:true
```

**Prompt 2.2 — Routes CRUD:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo src/routes/students.js với đầy đủ CRUD:
- GET /api/students: lấy danh sách, hỗ trợ query ?classId=...&status=...
  Populate classId (chỉ lấy name), sort theo fullName
- GET /api/students/:id: chi tiết, populate classId
- POST /api/students: tạo mới, tự tạo studentCode format "HS" + padStart(4,'0')
  Sau khi tạo: tăng studentCount của Class lên 1
- PUT /api/students/:id: cập nhật các trường được phép
- DELETE /api/students/:id: xóa, giảm studentCount của Class đi 1

Tất cả routes cần auth middleware.
Trả về format: { success: true, data: ..., message: ... }

Tạo tương tự src/routes/classes.js với CRUD đầy đủ cho Class.
```

---

### 📅 NGÀY 3 — Grades API

**Prompt 3.1 — Grade Model:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo src/models/Grade.js:
- studentId(ObjectId,ref:Student,required)
- classId(ObjectId,ref:Class,required)
- semester(Number,enum:[1,2],required)
- schoolYear(String,required)
- subjects: object chứa toan,van,anh,ly,hoa,sinh,su,dia (đều Number,min:0,max:10)
- attendanceAbsent(Number,default:0) — số buổi vắng
- conductScore(enum:['Tốt','Khá','Trung Bình','Yếu'])
- averageScore(Number) — tính tự động
- timestamps:true
- Index unique: {studentId, semester, schoolYear} — 1 HS chỉ có 1 bảng điểm/học kỳ

Thêm pre-save hook để tự tính averageScore từ trung bình các môn (bỏ qua môn null/undefined)
```

**Prompt 3.2 — Grades Routes:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo src/routes/grades.js:
- POST /api/grades: nhập điểm, kiểm tra trùng (studentId+semester+schoolYear),
  populate studentId sau khi tạo, trả về grade vừa tạo
- PUT /api/grades/:id: cập nhật điểm, averageScore tự tính lại
- GET /api/grades/student/:studentId: lấy toàn bộ lịch sử điểm của HS,
  sort theo schoolYear và semester
- GET /api/grades/class/:classId: lấy điểm cả lớp theo query ?semester=&schoolYear=
  Trả về mảng có populate thông tin học sinh
```

**Prompt 3.3 — Import Excel/CSV:**
```
[DÙNG TEMPLATE CHUẨN]

Cài thêm package: npm install xlsx multer

Tạo src/services/importService.js với các hàm:

1. parseExcelFile(buffer):
   - Dùng xlsx để đọc file .xlsx hoặc .csv
   - Map cột theo header: Mã HS, Toán, Ngữ Văn, Tiếng Anh,
     Vật Lý, Hóa Học, Sinh Học, Lịch Sử, Địa Lý,
     Số buổi vắng, Hạnh kiểm
   - Trả về mảng raw rows

2. validateRows(rows, classId, semester, schoolYearId):
   - Với mỗi row: tìm Student theo studentCode trong classId
   - Kiểm tra điểm hợp lệ: 0 ≤ điểm ≤ 10, là số
   - Kiểm tra hạnh kiểm: chỉ nhận 'Tốt','Khá','Trung Bình','Yếu'
   - Trả về:
     {
       validRows: [...],   // hợp lệ, sẵn sàng import
       errorRows: [        // lỗi, kèm lý do
         { row: 5, studentCode: "HS001", error: "Không tìm thấy học sinh" },
         { row: 7, studentCode: "HS003", error: "Điểm Toán không hợp lệ: 'abc'" }
       ]
     }

3. importValidRows(validRows, enteredBy):
   - Dùng insertMany với ordered:false
   - Bỏ qua duplicate (đã có điểm học kỳ đó rồi)
   - Trả về số lượng imported thành công

Tạo src/routes/grades.js bổ sung thêm 3 routes:

- GET /api/grades/import/template:
  Đọc file src/templates/grade_import_template.xlsx
  Trả về file download với header Content-Disposition

- POST /api/grades/import/preview:
  Dùng multer nhận file (field name: 'file', max 5MB, chỉ .xlsx/.csv)
  Nhận body: classId, semester, schoolYearId
  Gọi parseExcelFile + validateRows
  KHÔNG lưu DB, chỉ trả về preview:
  {
    totalRows: 30,
    validCount: 28,
    errorCount: 2,
    validRows: [...],
    errorRows: [{ row, studentCode, studentName, error }]
  }

- POST /api/grades/import/excel:
  Tương tự preview nhưng LƯU validRows vào DB
  Trả về:
  {
    success: true,
    imported: 28,
    skipped: 2,
    errors: [{ row, studentCode, error }]
  }

Tạo file src/templates/grade_import_template.xlsx bằng xlsx package:
Hàng 1: Header tiếng Việt có màu xanh
Hàng 2-4: 3 dòng dữ liệu mẫu màu xám (HS001, HS002, HS003)
Các cột: Mã HS | Họ tên | Toán | Ngữ Văn | Tiếng Anh |
         Vật Lý | Hóa Học | Sinh Học | Lịch Sử | Địa Lý |
         Số buổi vắng | Hạnh kiểm
Thêm sheet thứ 2 tên "Hướng dẫn" ghi rõ quy tắc điền
```

---

### 📅 NGÀY 4 — AI Engine: Generate Data + Train Model

**Prompt 4.1 — Generate Data:**
```
Tôi cần file Python ai-engine/data/generate_data.py để tạo dữ liệu giả train ML model.

Tạo dataset 1000 học sinh với các cột:
- toan, van, anh, ly, hoa, sinh (float, 3.0-10.0)
- diem_hk_truoc (float, 3.0-10.0) — điểm học kỳ trước
- so_buoi_vang (int, 0-20)
- hanh_kiem (int: 0=Yếu, 1=TB, 2=Khá, 3=Tốt)
- ket_qua (label: 'Giỏi', 'Khá', 'Trung Bình', 'Yếu')

Logic gán nhãn thực tế:
- Tính tb_ky_nay = trung bình 6 môn
- Nếu tb >= 8.0 và vắng <= 3 và hành kiểm >= 2: Giỏi
- Nếu tb >= 6.5 và vắng <= 7 và hành kiểm >= 1: Khá
- Nếu tb >= 5.0 và vắng <= 12: Trung Bình
- Còn lại: Yếu
- Thêm random noise nhỏ (10% ngẫu nhiên đổi nhãn 1 bậc) để model không overfit

Lưu ra data/students.csv và in ra phân phối nhãn.
```

**Prompt 4.2 — Train Model:**
```
Tôi cần file Python ai-engine/train.py để train ML model phân loại học lực.

Yêu cầu:
1. Load data/students.csv
2. Features: toan, van, anh, ly, hoa, sinh, diem_hk_truoc, so_buoi_vang, hanh_kiem
3. Label: ket_qua
4. Encode label: Giỏi=3, Khá=2, Trung Bình=1, Yếu=0
5. Train/test split: 80/20, stratify=True, random_state=42
6. Train RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
7. In ra: accuracy, classification_report
8. Lưu model vào models/model.pkl bằng pickle
9. Lưu thêm models/feature_names.pkl (list tên feature theo đúng thứ tự)
10. Lưu models/label_encoder.pkl (dict mapping số → tên xếp loại)

In ra feature importance để kiểm tra model học đúng không.
```

---

### 📅 NGÀY 5 — Python FastAPI

**Prompt 5.1 — FastAPI Server:**
```
Tôi cần file Python ai-engine/main.py — FastAPI server chạy port 5000.

File ai-engine/schemas.py trước:
- PredictRequest: toan,van,anh,ly,hoa,sinh,diem_hk_truoc,so_buoi_vang,hanh_kiem (đều float/int)
- PredictResponse: predicted_rank(str), confidence(float), risk_level(str),
  weak_subjects(list[str]), suggestions(list[str]), analysis(str)

File main.py:
1. Load model.pkl, feature_names.pkl, label_encoder.pkl khi khởi động
2. GET /health: trả {"status": "ok", "model_loaded": true}
3. POST /predict: nhận PredictRequest, trả PredictResponse
   Logic:
   - Tính toán theo đúng thứ tự feature_names
   - predict_proba → lấy confidence = max probability * 100
   - risk_level: confidence < 60 → 'high', < 75 → 'medium', else → 'low'
   - weak_subjects: các môn có điểm < 5.0
   - suggestions: list gợi ý dựa trên weak_subjects và so_buoi_vang
   - analysis: đoạn văn tiếng Việt tóm tắt tình hình học sinh

4. POST /predict-batch: nhận list PredictRequest, trả list PredictResponse
   (dùng cho dự đoán cả lớp)

Dùng uvicorn, thêm CORS cho phép origin http://localhost:3000
```

---

### 📅 NGÀY 6 — Node.js gọi AI + Predictions API

**Prompt 6.1 — AI Service + Predictions:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo src/services/aiService.js:
- Hàm predictStudent(gradeData): gọi POST http://localhost:5000/predict với axios
  Map gradeData (mongoose doc) sang PredictRequest format
  hanh_kiem: convert 'Tốt'→3, 'Khá'→2, 'Trung Bình'→1, 'Yếu'→0
  Trả về prediction object hoặc throw error có message rõ ràng

Tạo src/models/Prediction.js:
- studentId(ref:Student), gradeId(ref:Grade)
- predictedRank(enum:['Giỏi','Khá','Trung Bình','Yếu'])
- confidence(Number), riskLevel(enum:['low','medium','high'])
- weakSubjects([String]), suggestions([String]), analysis(String)
- timestamps:true

Tạo src/routes/predictions.js:
- POST /api/predictions/predict: nhận {gradeId}, load grade từ DB,
  gọi aiService.predictStudent, lưu Prediction, trả về kết quả
- GET /api/predictions/student/:studentId: lịch sử dự đoán của HS, sort -createdAt
- GET /api/predictions/class/:classId: dự đoán mới nhất của từng HS trong lớp
- GET /api/predictions/alerts: học sinh có riskLevel='high', populate studentId+classId
```

---

### 📅 NGÀY 7 — Test Backend

**Prompt 7.1 — Test Checklist:**
```
Tôi cần file backend/TEST_CHECKLIST.md liệt kê tất cả test cases cần kiểm tra bằng Postman
cho hệ thống quản lý học sinh. Bao gồm:
- Auth: register, login, me, token expired, sai password
- Students: CRUD đầy đủ, filter theo classId, studentCode tự tăng
- Classes: CRUD đầy đủ
- Grades: nhập điểm, trùng học kỳ phải báo lỗi, averageScore tự tính
- Predictions: predict thành công, grade không tồn tại, AI engine down
Format: method | endpoint | body | expected response
```

---

### 📅 NGÀY 8 — Setup Angular + Auth UI

**Prompt 8.1 — Setup Angular:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo Angular v21 standalone app với cấu trúc sau:
1. app.config.ts: provideRouter với routes, provideHttpClient với withInterceptors
2. app.routes.ts: lazy load các feature modules:
   - /login → AuthModule
   - /dashboard → DashboardModule (canActivate: authGuard)
   - /students → StudentsModule (canActivate: authGuard)
   - /classes → ClassesModule (canActivate: authGuard)
   - /grades → GradesModule (canActivate: authGuard)
   - /predictions → PredictionsModule (canActivate: authGuard)
   - '' → redirect /dashboard

3. core/services/api.service.ts: base URL http://localhost:3000/api,
   methods: get<T>, post<T>, put<T>, delete<T> — dùng HttpClient

4. core/services/auth.service.ts: login(), register(), logout(),
   getCurrentUser(), isLoggedIn(): boolean, lưu token vào localStorage

5. core/guards/auth.guard.ts: kiểm tra isLoggedIn, redirect /login nếu chưa đăng nhập

6. core/interceptors/jwt.interceptor.ts: tự gắn Authorization: Bearer token vào mọi request

7. shared/models/interfaces.ts: đầy đủ TypeScript interfaces cho
   User, Student, Class, Grade, Prediction, ApiResponse<T>
```

**Prompt 8.2 — Login UI:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/auth/login/login.component.ts (standalone, Angular v21):
- Form: email + password dùng ReactiveForm với Validators
- Gọi AuthService.login(), navigate /dashboard khi thành công
- Hiện thông báo lỗi nếu sai credentials
- Loading spinner khi đang gọi API
- UI dùng Angular Material: mat-card, mat-form-field, mat-button, mat-progress-spinner
- Thiết kế đẹp: centered card, logo/title ở trên, nền gradient nhẹ
```

---

### 📅 NGÀY 9 — Dashboard

**Prompt 9.1 — Dashboard:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/dashboard/dashboard.component.ts (standalone):

Gọi 4 API khi load:
- GET /api/students?status=active → tổng số học sinh
- GET /api/classes → tổng số lớp
- GET /api/predictions/alerts → danh sách HS rủi ro cao
- GET /api/grades/... → thống kê phân bố xếp loại

Hiển thị:
1. Row thống kê: 4 card số liệu (tổng HS, tổng lớp, số cảnh báo, tỷ lệ giỏi%)
2. Bảng cảnh báo: danh sách HS rủi ro cao, có tên + lớp + xếp loại dự đoán + badge màu đỏ
3. Biểu đồ donut: phân bố Giỏi/Khá/TB/Yếu (dùng Chart.js hoặc ngx-charts)

Dùng Angular Material + màu sắc:
- Cảnh báo cao (Yếu): đỏ
- Cảnh báo TB: vàng
- Tốt (Giỏi): xanh lá
```

---

### 📅 NGÀY 10 — Quản lý Lớp + Học sinh

**Prompt 10.1 — Class Management:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/classes/:
1. class-list.component.ts: bảng danh sách lớp (tên, khối, năm học, sĩ số, giáo viên)
   Có nút Thêm lớp, Sửa, Xóa (confirm dialog)
   Click vào lớp → navigate /classes/:id

2. Dialog thêm/sửa lớp: dùng MatDialog, form: tên lớp, khối (10/11/12), năm học

3. class-detail.component.ts: thông tin lớp + danh sách học sinh trong lớp
   Có nút Thêm học sinh vào lớp
```

**Prompt 10.2 — Student Management:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/students/:
1. student-list.component.ts: bảng học sinh với MatTable + MatPaginator + MatSort
   Cột: mã HS, họ tên, lớp, giới tính, trạng thái, actions
   Có search theo tên, filter theo lớp, filter theo trạng thái
   Nút Thêm học sinh

2. student-form.component.ts: form thêm/sửa học sinh
   Fields: mã HS (tự sinh), họ tên, ngày sinh (MatDatepicker), giới tính,
   lớp (dropdown load từ API), số điện thoại phụ huynh
   Validate: required fields, phone format

3. student-detail.component.ts: chi tiết HS + lịch sử điểm + lịch sử dự đoán
   Hiển thị timeline các kết quả AI theo học kỳ
```

---

### 📅 NGÀY 11 — Nhập Điểm + Import Excel + Gọi AI

**Prompt 11.1 — Grade Entry (nhập tay):**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/grades/grade-entry.component.ts:
1. Step 1 — Chọn: dropdown lớp → dropdown học sinh → chọn học kỳ + năm học
2. Step 2 — Nhập điểm: form 8 môn (Toán, Văn, Anh, Lý, Hóa, Sinh, Sử, Địa)
   Mỗi ô input: type=number, min=0, max=10, step=0.1
   Hiển thị điểm TB tính real-time khi nhập
   Thêm: số buổi vắng, hạnh kiểm (dropdown)
3. Step 3 — Xác nhận + Dự đoán AI:
   Nút "Lưu điểm": gọi POST /api/grades
   Sau khi lưu thành công → tự động gọi POST /api/predictions/predict
   Hiển thị loading "Đang phân tích bằng AI..."
   Kết quả hiện ngay trên trang

Dùng MatStepper cho 3 bước.
```

**Prompt 11.2 — Import Excel/CSV:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/grades/grade-import/grade-import.component.ts (standalone):

Giao diện gồm 4 bước dùng MatStepper:

BƯỚC 1 — Chọn lớp & học kỳ:
  - Dropdown: lớp (load từ API), học kỳ (1/2), năm học
  - Nút "Tải file mẫu" → gọi GET /api/grades/import/template → tự download file

BƯỚC 2 — Upload file:
  - Drag & drop zone hoặc click để chọn file
  - Chỉ nhận .xlsx và .csv, max 5MB
  - Hiện tên file + size sau khi chọn
  - Nút "Xem trước" → gọi POST /api/grades/import/preview
  - Hiện loading spinner "Đang đọc file..."

BƯỚC 3 — Xem trước kết quả:
  Hiện 2 tab:
  Tab 1 "Hợp lệ (28)":
    - Bảng: STT | Mã HS | Họ tên | TB | Hạnh kiểm
    - Màu nền xanh nhạt
  Tab 2 "Lỗi (2)":
    - Bảng: Dòng số | Mã HS | Lý do lỗi
    - Màu nền đỏ nhạt, icon cảnh báo
  - Text tóm tắt: "Sẽ import 28 học sinh, bỏ qua 2 dòng lỗi"
  - Nút "Quay lại" và "Xác nhận Import"

BƯỚC 4 — Kết quả:
  Sau khi POST /api/grades/import/excel thành công:
  - Icon ✅ lớn + "Import thành công!"
  - Số liệu: X đã lưu / Y bỏ qua
  - Nếu có lỗi: hiện bảng lỗi nhỏ bên dưới
  - Nút "Chạy AI dự đoán cả lớp" → gọi POST /api/predictions/predict-class
  - Nút "Về trang điểm"

Lưu ý Angular:
  - Dùng HttpClient với responseType: 'blob' khi tải template
  - Tự trigger download: tạo thẻ <a> ẩn, gán href = URL.createObjectURL(blob)
  - Upload file dùng FormData, KHÔNG set Content-Type header (để browser tự set boundary)
```

---

### 📅 NGÀY 12 — Trang Kết Quả AI

**Prompt 12.1 — Prediction Report:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo features/predictions/prediction-report.component.ts:

Nhận gradeId từ route params, load prediction từ API.

Hiển thị 3 phần:
1. HEADER: tên học sinh, lớp, học kỳ, ngày phân tích
2. KẾT QUẢ CHÍNH:
   - Badge xếp loại dự đoán (màu: Giỏi=xanh, Khá=lam, TB=vàng, Yếu=đỏ)
   - Progress bar confidence % (với màu tương ứng)
   - Badge mức rủi ro (Cao/Trung bình/Thấp)
3. CHI TIẾT PHÂN TÍCH:
   - Danh sách môn yếu với icon cảnh báo
   - List gợi ý cải thiện (bullet points có icon)
   - Đoạn văn phân tích tổng thể

Tạo thêm features/predictions/class-predictions.component.ts:
- Bảng dự đoán cả lớp: tên HS, điểm TB, xếp loại dự đoán, confidence, rủi ro
- Có thể sort theo cột, filter chỉ hiện HS rủi ro cao
- Nút "Xuất PDF" (dùng window.print hoặc html2canvas)
```

---

### 📅 NGÀY 13 — Polish + Fix Bug

**Prompt 13.1 — Navbar + Sidebar:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo shared/components/layout/layout.component.ts (shell component):
- Sidebar trái: logo, menu items (Dashboard, Lớp học, Học sinh, Nhập điểm, Dự đoán AI)
  Highlight active route, icon cho mỗi mục dùng MatIcon
- Topbar: tên user + avatar, nút đăng xuất
- Badge đỏ trên menu "Dự đoán AI" hiển thị số HS rủi ro cao
- Responsive: sidebar thu gọn trên mobile (MatSidenav)
- Màu chủ đạo: xanh dương đậm (#1565C0) + trắng
```

**Prompt 13.2 — Error Handling:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo shared/components/error-handling:
1. GlobalErrorHandler: implement ErrorHandler của Angular
   Bắt lỗi toàn cục, log ra console

2. Cập nhật jwt.interceptor.ts: bắt lỗi 401 → tự logout + redirect /login
   Bắt lỗi 500 → hiện snackbar "Lỗi server, thử lại sau"
   Bắt lỗi network → hiện snackbar "Mất kết nối"

3. shared/components/empty-state.component.ts: component hiển thị khi không có data
   Props: icon, title, subtitle, buttonText, buttonAction
```

---

### 📅 NGÀY 14 — Báo Cáo + Demo

**Prompt 14.1 — Chuẩn bị demo data:**
```
[DÙNG TEMPLATE CHUẨN]

Tạo backend/src/scripts/seedData.js để tạo dữ liệu mẫu cho demo:
- 1 tài khoản admin: admin@nttu.edu.vn / Admin@123
- 2 tài khoản giáo viên: gv1@nttu.edu.vn, gv2@nttu.edu.vn / Teacher@123
- 3 lớp: 11A1, 11A2, 12B1 (năm học 2024-2025)
- 30 học sinh phân đều vào 3 lớp (tên tiếng Việt thực tế)
- Điểm học kỳ 1 cho tất cả học sinh (đủ các loại: Giỏi, Khá, TB, Yếu)
- Chạy predict cho tất cả để có data sẵn

Thêm script vào package.json: "seed": "node src/scripts/seedData.js"
```

---

## 8. CHECKLIST NỘP BÀI

### Tiêu chí 1 — Ý tưởng & Tính cấp thiết (15đ)
```
□ Trình bày rõ: bài toán phát hiện học sinh yếu thường phát hiện muộn
□ Nêu số liệu: X% học sinh bị lưu ban do không được can thiệp kịp thời
□ Giải pháp: ML dự đoán sớm từ đầu học kỳ, không đợi cuối kỳ
```

### Tiêu chí 2 — Tính ứng dụng & Giá trị (15đ)
```
□ User group rõ: giáo viên chủ nhiệm + ban giám hiệu
□ Pain point cụ thể: hiện tại theo dõi thủ công bằng Excel
□ Giá trị: tiết kiệm thời gian, phát hiện sớm, can thiệp đúng lúc
```

### Tiêu chí 3 — Phân tích & Thiết kế (15đ)
```
□ Use Case Diagram: 2 actor (Admin, Teacher) + 8 use cases
□ ERD: 5 entities với đầy đủ quan hệ
□ Architecture Diagram: Angular → Node.js → Python AI + MongoDB
□ Sequence Diagram: luồng nhập điểm → dự đoán AI → hiển thị kết quả
```

### Tiêu chí 4 — Chức năng nghiệp vụ (20đ)
```
□ CRUD Users (Admin)
□ CRUD Classes
□ CRUD Students
□ Nhập điểm (tính TB tự động)
□ Dự đoán AI 1 học sinh
□ Dự đoán AI cả lớp
□ Dashboard cảnh báo
□ Lịch sử dự đoán
```

### Tiêu chí 5 — Giao diện UI/UX (10đ)
```
□ Responsive (desktop + tablet)
□ Loading states cho mọi API call
□ Empty states khi không có data
□ Form validation với thông báo lỗi rõ
□ Màu sắc nhất quán theo Material Design
□ Sidebar navigation hoạt động đúng
```

### Tiêu chí 6 — Công nghệ & Độ khó (10đ)
```
□ Angular v17+ Standalone Components
□ Machine Learning (RandomForest) tự train
□ 3-tier architecture (Angular + Node + Python)
□ JWT Authentication
□ REST API đầy đủ
□ Bảo mật: hash password, validate input
```

### Tiêu chí 7 — Demo (10đ)
```
□ Chạy seed data trước demo
□ Luồng demo: Login → Dashboard → Xem HS rủi ro → Nhập điểm mới → Xem dự đoán
□ Chuẩn bị sẵn 1 học sinh "sắp yếu" để demo cảnh báo
□ Backup: chụp ảnh màn hình các trang phòng khi mạng lỗi
□ AI Engine Python phải đang chạy khi demo
```

### Tiêu chí 8 — Thuyết trình (5đ)
```
□ Slide: vấn đề → giải pháp → demo → kết quả
□ Phân công rõ ai làm phần nào (dù 1 mình vẫn cần nói)
□ Chuẩn bị trả lời: "Tại sao dùng Random Forest?" "Accuracy bao nhiêu?"
  "Nếu không có data thật thì sao?" "Có thể mở rộng thêm gì?"
```

---

## 📂 FILE THEO DÕI TIẾN ĐỘ

| File | Mục đích |
|------|----------|
| `BUGS.md` | Ghi lại bug đã gặp + cách fix, AI đọc trước khi code để không lặp lại |
| `DONE.md` | Danh sách task đã hoàn thành, AI đọc để biết không làm lại |

> **Quy tắc bắt buộc:** Mỗi khi bắt đầu prompt mới, dán nội dung BUGS.md và DONE.md vào đầu prompt để AI có context đầy đủ.

**Prompt mẫu khi bắt đầu mỗi ngày:**
```
[TEMPLATE CHUẨN]

=== BUGS ĐÃ GẶP (không lặp lại) ===
[dán nội dung BUGS.md vào đây]

=== ĐÃ HOÀN THÀNH (không làm lại) ===
[dán nội dung DONE.md vào đây]

Bây giờ hãy làm: [yêu cầu mới]
```

---

## ⚡ QUICK START — Chạy project

```bash
# Terminal 1: Backend
cd backend && npm install && npm run dev

# Terminal 2: AI Engine
cd ai-engine
pip install fastapi uvicorn scikit-learn pandas numpy pickle5
python train.py          # Train model lần đầu
uvicorn main:app --port 5000 --reload

# Terminal 3: Frontend
cd frontend
ng serve

# Terminal 4: Seed data (chỉ chạy 1 lần)
cd backend && npm run seed
```

---

## 🆘 XỬ LÝ SỰ CỐ THƯỜNG GẶP

```
Lỗi: "Cannot connect to AI Engine"
Fix: Kiểm tra Python FastAPI đang chạy port 5000, kiểm tra CORS

Lỗi: "MongoDB connection failed"
Fix: Kiểm tra MONGO_URI trong .env, whitelist IP 0.0.0.0/0 trên Atlas

Lỗi: "model.pkl not found"
Fix: Chạy python train.py trước khi start FastAPI

Lỗi Angular: "NullInjectorError"
Fix: Thêm service vào providers của component hoặc app.config.ts

Lỗi: JWT expired trong khi demo
Fix: Đổi JWT_EXPIRES_IN=30d trong .env
```

---

*Chúc bạn 100 điểm! 🎯*
