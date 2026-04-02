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
│   │   │   ├── auth.js             # Xác thực JWT
│   │   │   ├── adminOnly.js        # Chỉ Admin mới qua
│   │   │   ├── departmentAccess.js # GV chỉ truy cập khoa mình
│   │   │   ├── auditLog.js         # Tự động ghi AuditLog
│   │   │   └── errorHandler.js     # Xử lý lỗi toàn cục
│   │   ├── models/
│   │   │   ├── User.js             # Thêm departmentIds[]
│   │   │   ├── Department.js       # MỚI
│   │   │   ├── SchoolYear.js
│   │   │   ├── Subject.js          # Thêm departmentId + semester
│   │   │   ├── Class.js            # Thêm departmentId
│   │   │   ├── Student.js
│   │   │   ├── Grade.js
│   │   │   ├── Prediction.js
│   │   │   ├── Notification.js
│   │   │   └── AuditLog.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── departments.js      # MỚI
│   │   │   ├── users.js            # MỚI: Admin quản lý GV
│   │   │   ├── schoolYears.js
│   │   │   ├── subjects.js         # Filter theo departmentId + semester
│   │   │   ├── classes.js          # Filter theo departmentId
│   │   │   ├── students.js
│   │   │   ├── grades.js
│   │   │   ├── predictions.js
│   │   │   ├── notifications.js
│   │   │   └── auditLogs.js
│   │   ├── services/
│   │   │   ├── aiService.js
│   │   │   ├── notificationService.js
│   │   │   └── importService.js    # Load Subject theo khoa + học kỳ động
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── ai-engine/                      # Python + FastAPI
│   ├── data/
│   │   ├── generate_data.py        # Đọc môn từ MongoDB → gen CSV
│   │   ├── students.csv            # Dataset đã gen (gitignore)
│   │   └── subject_codes.json      # Thứ tự features đã dùng khi gen
│   ├── models/
│   │   ├── model.pkl               # Trained model (gitignore)
│   │   ├── feature_names.pkl       # List feature đúng thứ tự (gitignore)
│   │   └── label_encoder.pkl       # Dict số → nhãn (gitignore)
│   ├── train.py                    # Đọc subject_codes.json → train
│   ├── main.py                     # FastAPI, input động theo feature_names.pkl
│   ├── schemas.py                  # PredictRequest dùng dict scores
│   ├── requirements.txt
│   └── .env → trỏ về backend/.env  # Dùng chung MONGO_URI
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
                    Admin
                      │ quản lý toàn bộ
          ┌───────────┼───────────────────┐
          ▼           ▼                   ▼
      Department ── Subject ──── User (Teacher)
          │ (1)       │ (n)        │ (n:n qua departments[])
          │ (n)       │            │
        Class ─────────────── Grade
          │ (1)                    │ (1)
          │ (n)                    │ (1)
       Student              Prediction
                                   │ (1)
                              Notification
```

**Tổng: 10 bảng — 18 quan hệ**

---

### 1. User (Admin / Giáo viên)

```
{
  _id:            ObjectId,
  name:           String (required),
  email:          String (unique, required),        // abc@nttu.edu.vn
  password:       String (hashed, required),
  role:           Enum['admin', 'teacher']
                  (default: 'teacher'),
  // Chỉ Teacher mới có departmentIds — Admin không thuộc khoa nào
  departmentIds:  [ObjectId] (ref: Department),     // Giáo viên dạy nhiều khoa
  phone:          String,
  avatar:         String,
  isActive:       Boolean (default: true),
  lastLogin:      Date,
  createdAt:      Date,
  updatedAt:      Date
}
Index: email (unique)
Ràng buộc:
  - Admin: role='admin', departmentIds=[] (không cần)
  - Teacher: role='teacher', departmentIds phải có ít nhất 1 khoa
  - Chỉ Admin mới tạo được tài khoản Teacher và gán departmentIds
```

### 2. Department (Khoa)

```
{
  _id:          ObjectId,
  code:         String (unique, required),          // "CNTT", "KTKT", "QTKD"
  name:         String (required),                  // "Công nghệ Thông tin"
  description:  String,
  headId:       ObjectId (ref: User),               // Trưởng khoa
  isActive:     Boolean (default: true),
  createdAt:    Date,
  updatedAt:    Date
}
Index: code (unique)
Dữ liệu mẫu:
  { code: "CNTT", name: "Công nghệ Thông tin" }
  { code: "KTKT", name: "Kỹ thuật - Kinh tế" }
  { code: "QTKD", name: "Quản trị Kinh doanh" }
```

### 3. SchoolYear (Năm học / Học kỳ)

```
{
  _id:          ObjectId,
  name:         String (required),                // "2024-2025"
  startDate:    Date (required),
  endDate:      Date (required),
  semesters: [
    {
      semesterNumber: Number,                     // 1 hoặc 2
      startDate:      Date,
      endDate:        Date,
      isCurrent:      Boolean (default: false)
    }
  ],
  isCurrent:    Boolean (default: false),
  createdBy:    ObjectId (ref: User),
  createdAt:    Date
}
Index: name (unique), isCurrent
Ràng buộc: Chỉ 1 SchoolYear có isCurrent = true tại một thời điểm
```

### 4. Subject (Môn học)

```
{
  _id:            ObjectId,
  code:           String (unique, required),      // "ltcb", "ktpm", "tieng_anh_cn"
  name:           String (required),              // "Lập trình cơ bản"
  departmentId:   ObjectId (ref: Department, required),
  credits:        Number (required, min:1, max:5),  // Số tín chỉ
  semester:       Enum[1, 2, 'both'] (default: 'both'),
  category:       Enum['theory','practice','both'] (default: 'theory'),

  // Trọng số % mặc định — giáo viên có thể override khi nhập điểm
  defaultWeights: {
    tx:   Number (default: 10, min:0, max:100),   // Thường xuyên %
    gk:   Number (default: 30, min:0, max:100),   // Giữa kỳ %
    th:   Number (default: 0,  min:0, max:100),   // Thực hành %
    tkt:  Number (default: 60, min:0, max:100),   // Thi kết thúc HP %
  },
  // Ràng buộc: tx + gk + th + tkt = 100

  // Cấu hình số lần đánh giá TX
  txCount:        Number (default: 3, min:1, max:5),  // Số cột TX

  isActive:       Boolean (default: true),
  createdAt:      Date
}
Index: code (unique), departmentId, semester
Dữ liệu mẫu khoa CNTT:
  { code: "ltcb",  name: "Lập trình cơ bản",    credits: 3, semester: 1,
    defaultWeights: { tx:10, gk:30, th:0, tkt:60 } }
  { code: "csdl",  name: "Cơ sở dữ liệu",       credits: 3, semester: 2,
    defaultWeights: { tx:10, gk:30, th:0, tkt:60 } }
  { code: "ltth",  name: "Lập trình thực hành",  credits: 2, semester: 1,
    category: 'practice',
    defaultWeights: { tx:10, gk:20, th:30, tkt:40 } }
```

### 5. Class (Lớp học phần)

```
{
  _id:            ObjectId,
  code:           String (required),              // "012307749505" — Mã lớp học phần
  subjectId:      ObjectId (ref: Subject, required),
  departmentId:   ObjectId (ref: Department, required),
  schoolYearId:   ObjectId (ref: SchoolYear, required),
  semester:       Number (enum:[1,2], required),
  teacherId:      ObjectId (ref: User, required), // Giáo viên dạy lớp này

  // Trọng số % do GV tự cấu hình (override defaultWeights của Subject)
  weights: {
    tx:   Number,   // % thường xuyên
    gk:   Number,   // % giữa kỳ
    th:   Number,   // % thực hành
    tkt:  Number,   // % thi kết thúc HP
  },
  txCount:        Number,                         // Số cột TX (override Subject.txCount)

  studentCount:   Number (default: 0),
  isActive:       Boolean (default: true),
  createdAt:      Date,
  updatedAt:      Date
}
Index: { code, schoolYearId, semester } (unique)
Pre-save: copy defaultWeights + txCount từ Subject nếu weights chưa được set
```

### 6. Student (Học sinh)

```
{
  _id:          ObjectId,
  studentCode:  String (unique, required),
  fullName:     String (required),
  dateOfBirth:  Date,
  gender:       Enum['male', 'female'],
  classId:      ObjectId (ref: Class, required),
  address:      String,
  parentName:   String,
  parentPhone:  String,
  parentEmail:  String,
  avatar:       String,
  status:       Enum['active', 'inactive', 'transferred'] (default: 'active'),
  notes:        String,
  createdAt:    Date,
  updatedAt:    Date
}
Index: studentCode (unique), classId, status
```

### 7. Grade (Bảng điểm — theo hệ đại học NTTU)

```
{
  _id:              ObjectId,
  studentId:        ObjectId (ref: Student, required),
  classId:          ObjectId (ref: Class, required),    // Lớp học phần
  subjectId:        ObjectId (ref: Subject, required),
  departmentId:     ObjectId (ref: Department),         // Cache
  schoolYearId:     ObjectId (ref: SchoolYear, required),
  semester:         Number (enum:[1,2], required),

  // Trọng số % thực tế áp dụng (copy từ Class.weights khi tạo)
  weights: {
    tx:   Number,   // % thường xuyên (vd: 10)
    gk:   Number,   // % giữa kỳ     (vd: 30)
    th:   Number,   // % thực hành   (vd: 0)
    tkt:  Number,   // % thi kết thúc HP (vd: 60)
  },

  // Điểm thành phần (do GV nhập)
  txScores:         [Number],      // [TX1, TX2, TX3...] — trung bình = điểm TX
  gkScore:          Number,        // Điểm giữa kỳ (0-10)
  thScores:         [Number],      // [TH1, TH2, TH3] — nếu có thực hành
  tktScore:         Number,        // Điểm thi kết thúc HP (0-10)

  // Điểm trung bình từng thành phần (tự tính)
  txAvg:            Number,        // Trung bình TX
  thAvg:            Number,        // Trung bình TH

  // Điểm tổng kết (tự tính theo công thức)
  // = txAvg*(tx/100) + gkScore*(gk/100) + thAvg*(th/100) + tktScore*(tkt/100)
  finalScore:       Number,        // Điểm tổng kết thang 10 (làm tròn 2 chữ số)

  // Quy đổi sang thang 4 + chữ
  // Quy tắc đặc biệt:
  //   tktScore === 4 → letterGrade = 'C', gpa4 = 2.0 (dù finalScore cao hơn)
  //   tktScore < 4   → letterGrade = 'F', gpa4 = 0.0
  //   finalScore >= 8.5 → A (4.0)
  //   finalScore >= 7.0 → B (3.0)
  //   finalScore >= 5.0 → C (2.0)
  //   finalScore < 5.0  → F (0.0)
  gpa4:             Number,        // 0.0 / 2.0 / 3.0 / 4.0
  letterGrade:      Enum['A','B','C','F'],

  // Trạng thái
  isDuThi:          Boolean (default: true),   // Được dự thi kết thúc HP
  isVangThi:        Boolean (default: false),  // Vắng thi
  enteredBy:        ObjectId (ref: User),
  createdAt:        Date,
  updatedAt:        Date
}
Index: { studentId, classId } (unique) — 1 SV chỉ có 1 bảng điểm/lớp học phần

Pre-save hook — tính tự động:
  1. txAvg = trung bình txScores (bỏ null)
  2. thAvg = trung bình thScores (bỏ null)
  3. finalScore = txAvg*(tx/100) + gkScore*(gk/100) + thAvg*(th/100) + tktScore*(tkt/100)
  4. Áp quy tắc đặc biệt tktScore rồi xếp letterGrade + gpa4

Công thức tính điểm tổng kết học kỳ (tính ở route, không lưu vào Grade):
  diemTBHK = Σ(finalScore × credits) / Σ(credits)
  gpaHK    = Σ(gpa4 × credits) / Σ(credits)
```

### 8. Prediction (Kết quả AI)

```
{
  _id:              ObjectId,
  studentId:        ObjectId (ref: Student, required),
  schoolYearId:     ObjectId (ref: SchoolYear),
  semester:         Number,

  // Dự đoán tổng hợp toàn học kỳ
  predictedGpaHK:   Number,              // GPA học kỳ dự đoán (0-4)
  predictedDiemTB:  Number,              // Điểm TB học kỳ dự đoán (0-10)
  predictedRank:    Enum['Xuất sắc','Giỏi','Khá','Trung bình','Yếu/Kém'],
  confidence:       Number,              // 0-100%
  riskLevel:        Enum['low','medium','high'],

  // Môn học có nguy cơ rớt
  atRiskSubjects: [{
    subjectId:      ObjectId,
    subjectName:    String,
    currentGpa4:    Number,
    predictedGpa4:  Number,
    reason:         String  // "TKT hiện tại thấp", "Chưa có điểm GK"
  }],

  suggestions:      [String],
  analysis:         String,
  modelVersion:     String (default: '1.0'),
  inputFeatures:    Object,
  isRead:           Boolean (default: false),
  createdAt:        Date
}
Index: studentId, schoolYearId, semester, riskLevel
```

### 9. Notification (Thông báo)

```
{
  _id:          ObjectId,
  userId:       ObjectId (ref: User, required),
  type:         Enum['risk_alert','grade_entered','prediction_done','system'],
  title:        String (required),
  message:      String (required),
  data: {
    studentId:    ObjectId,
    classId:      ObjectId,
    departmentId: ObjectId,
    gradeId:      ObjectId,
    predictionId: ObjectId
  },
  priority:     Enum['low','normal','high'] (default: 'normal'),
  isRead:       Boolean (default: false),
  readAt:       Date,
  createdAt:    Date
}
Index: { userId, isRead }, createdAt
```

### 10. AuditLog (Lịch sử thao tác)

```
{
  _id:          ObjectId,
  userId:       ObjectId (ref: User, required),
  action:       Enum['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','PREDICT'],
  resource:     String (required),
  resourceId:   ObjectId,
  description:  String,
  oldData:      Object,
  newData:      Object,
  ipAddress:    String,
  userAgent:    String,
  createdAt:    Date
}
Index: userId, action, resource, createdAt
Retention: TTL 90 ngày
```

---

### Tóm tắt quan hệ

| Bảng           | Quan hệ với                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **User**       | Department (n:n qua departmentIds[]), Class (1-n giảng dạy), AuditLog (1-n), Notification (1-n) |
| **Department** | Subject (1-n), Class (1-n), User/Teacher (n:n)                                                  |
| **SchoolYear** | Class (1-n), Grade (1-n)                                                                        |
| **Subject**    | Department (n:1), Class (1-n lớp HP), Grade (1-n) — 1 môn nhiều lớp HP                          |
| **Class**      | Subject (n:1), Department (n:1), Grade (1-n) — lớp học phần                                     |
| **Student**    | Grade (1-n), Prediction (1-n)                                                                   |
| **Grade**      | Class (n:1), Subject (n:1), Student (n:1)                                                       |
| **Prediction** | Student (n:1), tổng hợp nhiều Grade trong 1 học kỳ                                              |

---

### 📐 Công thức tính điểm chuẩn NTTU

```
// 1. Điểm tổng kết môn
txAvg     = mean(txScores)            // trung bình thường xuyên
thAvg     = mean(thScores)            // trung bình thực hành (nếu có)
finalScore = txAvg*(tx/100) + gkScore*(gk/100)
           + thAvg*(th/100) + tktScore*(tkt/100)

// 2. Quy tắc đặc biệt (kiểm tra theo thứ tự ưu tiên)
if (isVangThi)              → F, gpa4 = 0.0
else if (tktScore < 4)      → F, gpa4 = 0.0
else if (tktScore === 4)    → C, gpa4 = 2.0   // dù finalScore cao hơn
else if (finalScore >= 8.5) → A, gpa4 = 4.0
else if (finalScore >= 7.0) → B, gpa4 = 3.0
else if (finalScore >= 5.0) → C, gpa4 = 2.0
else                        → F, gpa4 = 0.0

// 3. Điểm học kỳ (tổng hợp từ tất cả môn)
diemTBHK = Σ(finalScore × credits) / Σ(credits)
gpaHK    = Σ(gpa4 × credits) / Σ(credits)

// 4. Xếp loại học kỳ theo gpaHK
gpaHK >= 3.6 → Xuất sắc
gpaHK >= 3.2 → Giỏi
gpaHK >= 2.5 → Khá
gpaHK >= 2.0 → Trung bình
gpaHK <  2.0 → Yếu/Kém
```

---

### Ma trận phân quyền

| Chức năng           | Admin | Giáo viên (đúng khoa)    | Giáo viên (sai khoa) |
| ------------------- | ----- | ------------------------ | -------------------- |
| Xem tất cả khoa     | ✅    | ❌                       | ❌                   |
| Tạo/xóa khoa        | ✅    | ❌                       | ❌                   |
| Tạo tài khoản GV    | ✅    | ❌                       | ❌                   |
| Gán GV vào khoa     | ✅    | ❌                       | ❌                   |
| Tạo/xóa môn học     | ✅    | ❌                       | ❌                   |
| Xem lớp của khoa    | ✅    | ✅                       | ❌                   |
| Xem học sinh        | ✅    | ✅ (lớp thuộc khoa mình) | ❌                   |
| Nhập điểm           | ✅    | ✅ (môn thuộc khoa mình) | ❌                   |
| Xem dự đoán AI      | ✅    | ✅ (lớp thuộc khoa mình) | ❌                   |
| Báo cáo toàn trường | ✅    | ❌                       | ❌                   |

---

## 5. API ENDPOINTS

### Auth

```
POST   /api/auth/login              Đăng nhập → trả JWT + ghi AuditLog
POST   /api/auth/logout             Đăng xuất + ghi AuditLog
GET    /api/auth/me                 Thông tin user + danh sách khoa của mình
PUT    /api/auth/change-password    Đổi mật khẩu
```

### Departments (Khoa) — Admin only

```
GET    /api/departments             Danh sách khoa (Admin: tất cả, Teacher: khoa mình)
GET    /api/departments/:id         Chi tiết khoa + danh sách GV + môn học
POST   /api/departments             Tạo khoa mới [Admin]
PUT    /api/departments/:id         Sửa thông tin khoa [Admin]
DELETE /api/departments/:id         Xóa khoa (chỉ khi không có lớp/môn) [Admin]
GET    /api/departments/:id/teachers      Danh sách GV thuộc khoa
GET    /api/departments/:id/subjects      Môn học thuộc khoa (?semester=1)
GET    /api/departments/:id/classes       Lớp thuộc khoa
GET    /api/departments/:id/stats         Thống kê tổng quan của khoa [Admin]
```

### Users — Admin only

```
GET    /api/users                   Danh sách giáo viên [Admin]
GET    /api/users/:id               Chi tiết giáo viên
POST   /api/users                   Tạo tài khoản GV + gán khoa [Admin]
PUT    /api/users/:id               Sửa thông tin GV [Admin]
PATCH  /api/users/:id/departments   Cập nhật danh sách khoa của GV [Admin]
PATCH  /api/users/:id/toggle        Bật/tắt tài khoản [Admin]
DELETE /api/users/:id               Xóa tài khoản [Admin]
```

### SchoolYear (Năm học)

```
GET    /api/school-years            Danh sách năm học
GET    /api/school-years/current    Năm học hiện tại
GET    /api/school-years/:id        Chi tiết năm học
POST   /api/school-years            Tạo năm học mới [Admin]
PUT    /api/school-years/:id        Cập nhật [Admin]
PATCH  /api/school-years/:id/set-current   Đặt làm năm học hiện tại [Admin]
```

### Subjects (Môn học)

```
GET    /api/subjects                        Môn học (Teacher: chỉ khoa mình)
GET    /api/subjects?departmentId=&semester= Filter theo khoa + học kỳ
GET    /api/subjects/:id                    Chi tiết môn
POST   /api/subjects                        Thêm môn vào khoa [Admin]
PUT    /api/subjects/:id                    Sửa môn [Admin]
PATCH  /api/subjects/:id/toggle             Bật/tắt môn [Admin]
DELETE /api/subjects/:id                    Xóa môn (nếu chưa có điểm) [Admin]
```

### Classes (Lớp học)

```
GET    /api/classes                 Lớp học (Teacher: chỉ khoa mình)
GET    /api/classes?departmentId=   Filter theo khoa [Admin]
GET    /api/classes/:id             Chi tiết lớp
GET    /api/classes/:id/students    Danh sách học sinh trong lớp
POST   /api/classes                 Tạo lớp (gán departmentId) [Admin]
PUT    /api/classes/:id             Sửa lớp
DELETE /api/classes/:id             Xóa lớp [Admin]
```

### Students (Học sinh)

```
GET    /api/students                Học sinh (Teacher: lớp thuộc khoa mình)
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
POST   /api/grades                       Nhập điểm (môn phải thuộc khoa GV)
PUT    /api/grades/:id                   Sửa điểm
DELETE /api/grades/:id                   Xóa điểm [Admin]

GET    /api/grades/import/template       Tải template (môn theo khoa GV + học kỳ)
POST   /api/grades/import/preview        Preview import
POST   /api/grades/import/excel          Thực hiện import
```

### Predictions (Dự đoán AI)

```
POST   /api/predictions/predict           Dự đoán 1 học sinh
POST   /api/predictions/predict-class     Dự đoán cả lớp
GET    /api/predictions/student/:id       Lịch sử dự đoán
GET    /api/predictions/class/:id         Dự đoán mới nhất cả lớp
GET    /api/predictions/alerts            HS rủi ro cao (theo khoa GV)
PATCH  /api/predictions/:id/read          Đánh dấu đã xem
```

### Notifications

```
GET    /api/notifications                 Thông báo của user hiện tại
GET    /api/notifications/unread-count    Số chưa đọc
PATCH  /api/notifications/:id/read        Đánh dấu đã đọc
PATCH  /api/notifications/read-all        Đọc tất cả
DELETE /api/notifications/:id             Xóa
```

### AuditLog — Admin only

```
GET    /api/audit-logs                         Toàn bộ log [Admin]
GET    /api/audit-logs?userId=&action=         Filter theo user/action
GET    /api/audit-logs?resource=&resourceId=   Filter theo đối tượng
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
>
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

**Prompt 1.2 — User + Department Models + Auth + Middleware:**

```
[DÙNG TEMPLATE CHUẨN]

Tạo:
1. src/models/Department.js:
   - code(String,unique,required,uppercase,trim)   // "CNTT", "KTKT"
   - name(String,required)                          // "Công nghệ Thông tin"
   - description(String), headId(ObjectId,ref:User)
   - isActive(Boolean,default:true), timestamps:true

2. src/models/User.js:
   - name, email(unique), password(hashed), role(enum:['admin','teacher'])
   - departmentIds([ObjectId],ref:'Department',default:[])
     Admin luôn để [], Teacher phải có ít nhất 1 khoa
   - phone, avatar, isActive(default:true), lastLogin(Date), timestamps:true
   - Method comparePassword dùng bcrypt
   - Virtual 'isAdmin': return this.role === 'admin'

3. src/middleware/auth.js:
   JWT middleware, gắn req.user từ token
   Payload JWT bao gồm: { id, role, departmentIds }
   Trả 401 nếu không có token hoặc token hết hạn

4. src/middleware/adminOnly.js:
   Kiểm tra req.user.role === 'admin'
   Trả 403 "Chỉ Admin mới có quyền thực hiện" nếu không phải

5. src/middleware/departmentAccess.js:
   Nhận departmentId từ params/body/query (theo thứ tự ưu tiên)
   Nếu Admin → next() luôn
   Nếu Teacher → kiểm tra departmentId.toString() có trong req.user.departmentIds không
   Nếu không thuộc → 403 "Bạn không có quyền truy cập khoa này"

6. src/routes/auth.js:
   - POST /api/auth/login: tìm user, so password, cập nhật lastLogin
     Trả JWT 7 ngày + { user: { id, name, email, role, departmentIds } }
   - POST /api/auth/logout: ghi AuditLog
   - GET /api/auth/me: populate departmentIds (chỉ lấy _id, code, name)
   - PUT /api/auth/change-password

7. src/routes/departments.js:
   - GET /api/departments:
     Admin → tất cả khoa
     Teacher → chỉ khoa có trong departmentIds của mình
   - GET /api/departments/:id: populate subjects(isActive) và teachers
   - GET /api/departments/:id/subjects?semester=: môn học theo khoa + filter học kỳ
   - GET /api/departments/:id/classes: lớp thuộc khoa
   - GET /api/departments/:id/stats [adminOnly]: thống kê tổng quan khoa
   - POST /api/departments [adminOnly]: tạo khoa
   - PUT /api/departments/:id [adminOnly]: sửa thông tin
   - DELETE /api/departments/:id [adminOnly]:
     Kiểm tra không có Class hoặc Subject nào → mới cho xóa

8. src/routes/users.js [adminOnly toàn bộ]:
   - GET /api/users?departmentId=: danh sách GV, populate departmentIds
   - GET /api/users/:id: chi tiết + khoa đang dạy
   - POST /api/users: tạo GV, validate departmentIds không rỗng nếu role=teacher
   - PUT /api/users/:id: sửa thông tin cơ bản
   - PATCH /api/users/:id/departments: gán/bỏ khoa, validate các departmentId tồn tại
   - PATCH /api/users/:id/toggle: bật/tắt isActive
   - DELETE /api/users/:id: không cho xóa admin cuối cùng

9. src/middleware/errorHandler.js: trả JSON { success:false, message, errors? }
```

---

### 📅 NGÀY 2 — CRUD Students + Classes + Subjects

**Prompt 2.1 — Models:**

```
[DÙNG TEMPLATE CHUẨN]

Tạo 3 Mongoose models:

1. src/models/Subject.js:
   - code(String, unique, required, lowercase, trim)  // "toan", "van" — KHÔNG cho sửa sau khi tạo
   - name(String, required)                           // "Toán", "Ngữ Văn" — tên hiển thị
   - coefficient(Number, default:1, min:1, max:3)     // hệ số tính điểm TB
   - category(enum:['science','social','language','other'], default:'other')
   - gradeLevel([Number], default:[10,11,12])          // áp dụng cho khối nào
   - isActive(Boolean, default:true)
   - timestamps:true
   Thêm index: code(unique), isActive

2. src/models/Class.js:
   - name(String,required), gradeLevel(Number,required,min:10,max:12)
   - schoolYearId(ObjectId,ref:SchoolYear), teacherId(ObjectId,ref:User)
   - studentCount(Number,default:0), isActive(Boolean,default:true), timestamps:true

3. src/models/Student.js:
   - studentCode(String,unique,required), fullName(String,required)
   - dateOfBirth(Date), gender(enum:['male','female'])
   - classId(ObjectId,ref:Class,required), parentPhone(String), parentName(String)
   - status(enum:['active','inactive','transferred'],default:'active'), timestamps:true
```

**Prompt 2.2 — Subject Routes (Admin + Department filter):**

```
[DÙNG TEMPLATE CHUẨN]

Tạo src/routes/subjects.js:
- GET /api/subjects:
  Admin → tất cả môn, hỗ trợ filter ?departmentId=&semester=&isActive=
  Teacher → chỉ môn thuộc các khoa trong departmentIds của mình
  Populate departmentId (chỉ lấy code, name)
- GET /api/subjects/:id: chi tiết môn
- POST /api/subjects [adminOnly]:
  Bắt buộc có departmentId (phải tồn tại trong DB)
  Bắt buộc có semester (1, 2, hoặc 'both')
  Validate code: chỉ chứa a-z và số, không dấu cách, unique toàn hệ thống
- PUT /api/subjects/:id [adminOnly]:
  Cho sửa: name, coefficient, category, gradeLevel, semester, departmentId
  KHÔNG cho sửa code
- PATCH /api/subjects/:id/toggle [adminOnly]: bật/tắt isActive
- DELETE /api/subjects/:id [adminOnly]:
  Kiểm tra Grade nào có subjectCode này không → nếu có thì từ chối xóa
```

**Prompt 2.3 — Seed data mặc định (Department + Subject + Users):**

```
[DÙNG TEMPLATE CHUẨN]

Trong file src/scripts/seedData.js, seed theo thứ tự sau:

// 1. Seed khoa mặc định
const departments = [
  { code: "CNTT", name: "Công nghệ Thông tin" },
  { code: "KTKT", name: "Kỹ thuật - Kinh tế" },
  { code: "QTKD", name: "Quản trị Kinh doanh" },
];

// 2. Seed môn học theo từng khoa + học kỳ
const subjects = [
  // Khoa CNTT - HK1
  { code: "ltcb",  name: "Lập trình cơ bản",    departmentCode: "CNTT", semester: 1, coefficient: 2 },
  { code: "tthcm", name: "Tư tưởng HCM",         departmentCode: "CNTT", semester: 1, coefficient: 1 },
  // Khoa CNTT - HK2
  { code: "csdl",  name: "Cơ sở dữ liệu",        departmentCode: "CNTT", semester: 2, coefficient: 2 },
  { code: "mmt",   name: "Mạng máy tính",         departmentCode: "CNTT", semester: 2, coefficient: 1 },
  { code: "ktpm",  name: "Kỹ thuật phần mềm",     departmentCode: "CNTT", semester: 2, coefficient: 2 },
  // Khoa KTKT - HK1
  { code: "co",    name: "Cơ học",                departmentCode: "KTKT", semester: 1, coefficient: 2 },
  { code: "vl",    name: "Vật lý đại cương",      departmentCode: "KTKT", semester: 1, coefficient: 1 },
  // Khoa QTKD - HK1
  { code: "ktvm",  name: "Kinh tế vi mô",         departmentCode: "QTKD", semester: 1, coefficient: 2 },
  { code: "ktvm2", name: "Kinh tế vĩ mô",         departmentCode: "QTKD", semester: 2, coefficient: 2 },
];
// Map departmentCode → departmentId sau khi seed department xong

// 3. Seed users
// 1 Admin (không có departmentIds)
{ email: "admin@nttu.edu.vn", password: "Admin@123", role: "admin", departmentIds: [] }
// 2 Giáo viên (có departmentIds)
{ email: "gv1@nttu.edu.vn", password: "Teacher@123", role: "teacher", departmentIds: [CNTT._id] }
{ email: "gv2@nttu.edu.vn", password: "Teacher@123", role: "teacher", departmentIds: [CNTT._id, KTKT._id] }

// 4. Seed classes (gán departmentId)
// 3 lớp: CNTT01 (CNTT), CNTT02 (CNTT), KTKT01 (KTKT)

// 5. Seed students + grades + run predictions như cũ

Dùng insertMany với ordered:false, chạy nhiều lần không bị lỗi.
```

**Prompt 2.4 — Routes CRUD Students + Classes:**

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

**Prompt 3.1 — Grade Model (hệ đại học NTTU):**

```
[DÙNG TEMPLATE CHUẨN]

Tạo src/models/Grade.js theo hệ tính điểm đại học NTTU:

Fields:
- studentId(ObjectId,ref:Student,required)
- classId(ObjectId,ref:Class,required)       // Lớp học phần
- subjectId(ObjectId,ref:Subject,required)
- departmentId(ObjectId,ref:Department)      // Cache
- schoolYearId(ObjectId,ref:SchoolYear,required)
- semester(Number,enum:[1,2],required)
- weights: { tx:Number, gk:Number, th:Number, tkt:Number }
  Copy từ Class.weights khi tạo (không cho sửa sau khi tạo)
- txScores([Number])          // [TX1, TX2, TX3...] — số lượng theo Class.txCount
- gkScore(Number,min:0,max:10)
- thScores([Number])          // [TH1, TH2, TH3] — nếu môn có thực hành
- tktScore(Number,min:0,max:10)
- txAvg(Number)               // tự tính
- thAvg(Number)               // tự tính
- finalScore(Number)          // tự tính theo weights
- gpa4(Number)                // 0.0 / 2.0 / 3.0 / 4.0
- letterGrade(enum:['A','B','C','F'])
- isDuThi(Boolean,default:true)
- isVangThi(Boolean,default:false)
- enteredBy(ObjectId,ref:User)
- timestamps:true
Index unique: { studentId, classId }

Pre-save hook — tính tự động theo thứ tự:
  1. txAvg = mean(txScores.filter(v => v != null))
  2. thAvg = mean(thScores.filter(v => v != null)) || 0
  3. finalScore = round(txAvg*(weights.tx/100) + gkScore*(weights.gk/100)
                      + thAvg*(weights.th/100) + tktScore*(weights.tkt/100), 2)
  4. Áp quy tắc NTTU theo thứ tự ưu tiên:
     if isVangThi            → F, 0.0
     else if tktScore < 4    → F, 0.0
     else if tktScore === 4  → C, 2.0
     else if finalScore >= 8.5 → A, 4.0
     else if finalScore >= 7.0 → B, 3.0
     else if finalScore >= 5.0 → C, 2.0
     else                      → F, 0.0
  5. Chỉ tính nếu tktScore đã có giá trị (không null)
     Nếu chưa có tktScore → để finalScore/gpa4/letterGrade = null (chưa có kết quả)
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

**Prompt 3.3 — Import Excel/CSV (môn học động từ DB):**

```
[DÙNG TEMPLATE CHUẨN]

Cài thêm package: npm install xlsx multer

Tạo src/services/importService.js — KHÔNG hardcode môn học,
toàn bộ danh sách môn load từ Subject collection:

1. getSubjectMap():
   - Load Subject.find({ isActive: true }) từ DB
   - Trả về Map: { "toan": "Toán", "van": "Ngữ Văn", ... }
   - Dùng cho cả việc nhận dạng cột Excel lẫn validate điểm

2. normalizeText(value):
   - Chuẩn hóa chuỗi: bỏ dấu, lowercase, trim
   - Dùng để so khớp tên cột Excel không phân biệt dấu

3. getHeaderKey(rawHeader, subjectMap):
   - Normalize rawHeader
   - Match cột cố định: "ma hs" → studentCode, "ho ten" → studentName,
     "so buoi vang" → attendanceAbsent, "hanh kiem" → conductScore
   - Match môn học: so normalize(subjectMap[code]) với header
     hoặc code === header → trả về code
   - KHÔNG hardcode tên môn — hoàn toàn dựa vào subjectMap từ DB

4. parseExcelFile(buffer, subjectMap):
   - Đọc sheet đầu tiên bằng xlsx
   - Map từng row theo getHeaderKey(header, subjectMap)
   - Trả về mảng raw rows với: row, studentCode, studentName,
     attendanceAbsent, conductScore, subjects(Map động)

5. validateRows(rows, classId, semester, schoolYearId, subjectMap):
   - Tìm student theo studentCode trong classId
   - Validate điểm: 0 ≤ điểm ≤ 10, là số hợp lệ
   - Validate hạnh kiểm: Tốt / Khá / Trung Bình / Yếu
   - Trả về { validRows, errorRows: [{ row, studentCode, studentName, error }] }

6. importValidRows(validRows, enteredBy):
   - insertMany với ordered:false
   - Bắt lỗi duplicate key (code 11000) → báo cáo riêng
   - Trả về { importedCount, duplicateErrors }

Tạo src/routes/grades.js bổ sung 3 import routes:

- GET /api/grades/import/template:
  Gọi getSubjectMap() để lấy danh sách môn HIỆN TẠI từ DB
  Generate file .xlsx động bằng xlsx:
    Hàng 1: Header màu xanh — "Mã HS", "Họ tên",
             [tên từng môn theo subjectMap], "Số buổi vắng", "Hạnh kiểm"
    Hàng 2-4: 3 dòng mẫu màu xám
    Sheet 2 "Hướng dẫn": ghi rõ quy tắc điền, danh sách môn hợp lệ
  Trả về file download — KHÔNG dùng file tĩnh

- POST /api/grades/import/preview:
  Multer nhận file (field: 'file', max 5MB, chỉ .xlsx/.csv)
  Nhận body: classId, semester, schoolYearId
  Gọi getSubjectMap() → parseExcelFile() → validateRows()
  KHÔNG lưu DB, trả về preview:
  { totalRows, validCount, errorCount, validRows, errorRows }

- POST /api/grades/import/excel:
  Tương tự preview + gọi thêm importValidRows()
  Trả về: { success, imported, skipped, duplicates, errors }
```

---

### 📅 NGÀY 4 — AI Engine: Generate Data + Train Model

**Prompt 4.1 — Generate Data:**

```
⚠️ QUAN TRỌNG — KHÔNG hardcode môn học trong file này.
Môn học do Admin quản lý trong MongoDB, generate_data.py phải đọc từ DB.
```

**Prompt 4.1 — Generate Data (đọc môn từ MongoDB):**

```
Tôi cần file Python ai-engine/data/generate_data.py
KHÔNG hardcode danh sách môn học — phải đọc từ MongoDB.

Yêu cầu:

1. Kết nối MongoDB:
   - Đọc MONGO_URI từ file .env (dùng python-dotenv)
   - MONGO_URI nằm ở thư mục backend/.env
   - Kết nối bằng pymongo, đọc collection "subjects"
   - Lọc: { isActive: true }
   - Lấy danh sách field: code, name, coefficient
   - Nếu không kết nối được → raise RuntimeError rõ ràng

2. Tạo dataset NUM_STUDENTS=1000 học sinh:
   - Với mỗi môn trong subjects từ DB:
     Tạo cột điểm tên = subject["code"] (float, 3.0-10.0)
   - Các cột cố định (không thay đổi dù môn thay đổi):
     diem_hk_truoc (float, 3.0-10.0)
     so_buoi_vang (int, 0-20)
     hanh_kiem (int: 0=Yếu, 1=TB, 2=Khá, 3=Tốt)
     ket_qua (label)

3. Tính điểm trung bình CÓ HỆ SỐ:
   tb_ky_nay = Σ(điểm_môn × coefficient) / Σ(coefficient)
   Sử dụng coefficient đọc từ DB, không hardcode

4. Logic gán nhãn (giống cũ):
   tb >= 8.0 và vắng <= 3 và hành kiểm >= 2 → Giỏi
   tb >= 6.5 và vắng <= 7 và hành kiểm >= 1 → Khá
   tb >= 5.0 và vắng <= 12                   → Trung Bình
   còn lại                                    → Yếu
   Thêm 10% noise (đổi nhãn 1 bậc ngẫu nhiên)

5. Lưu ra:
   - data/students.csv (các cột điểm động theo môn từ DB)
   - data/subject_codes.json: danh sách code theo đúng thứ tự đã dùng
     Ví dụ: ["ltcb", "csdl", "mmt", "diem_hk_truoc", "so_buoi_vang", "hanh_kiem"]
     File này dùng cho train.py để biết feature nào theo thứ tự nào

6. In ra:
   - Danh sách môn đọc được từ DB
   - Số mẫu, phân phối nhãn
   - Cảnh báo nếu < 3 môn active trong DB

Dependencies cần cài:
   pip install pymongo pandas numpy python-dotenv
```

**Prompt 4.2 — Train Model (đọc feature từ subject_codes.json):**

```
Tôi cần file Python ai-engine/train.py — KHÔNG hardcode feature names.

Yêu cầu:
1. Load data/students.csv
2. Load data/subject_codes.json để biết đúng thứ tự features
   feature_names = subject_codes.json (đã bao gồm cả diem_hk_truoc, so_buoi_vang, hanh_kiem)
3. X = df[feature_names], y = df["ket_qua"]
4. Encode label: Giỏi=3, Khá=2, Trung Bình=1, Yếu=0
5. Train/test split: 80/20, stratify=True, random_state=42
6. Train RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
7. In accuracy + classification_report + feature_importances
8. Lưu:
   - models/model.pkl       — trained model
   - models/feature_names.pkl  — list tên feature ĐÚNG THỨ TỰ (đọc từ subject_codes.json)
   - models/label_encoder.pkl  — dict { 0:"Yếu", 1:"Trung Bình", 2:"Khá", 3:"Giỏi" }

⚠️ Lý do lưu feature_names.pkl riêng:
   Khi predict, FastAPI phải build input vector đúng thứ tự này
   Nếu Admin thêm môn mới → phải chạy lại generate_data.py + train.py
   → feature_names.pkl tự cập nhật, FastAPI tự nhận môn mới

Thêm vào cuối train.py:
   print("\\n[DONE] Retrain xong. Khởi động lại FastAPI để load model mới.")
   print(f"Features ({len(feature_names)}): {feature_names}")
```

---

### 📅 NGÀY 5 — Python FastAPI

**Prompt 5.1 — FastAPI Server (input động theo feature_names.pkl):**

```
Tôi cần file Python ai-engine/main.py — FastAPI server chạy port 5000.
KHÔNG hardcode danh sách môn — dùng feature_names.pkl để biết input cần gì.

File ai-engine/schemas.py:
- PredictRequest:
  scores: dict[str, float]   # { "ltcb": 8.5, "csdl": 7.0, ... } — key là subject code
  diem_hk_truoc: float
  so_buoi_vang: int
  hanh_kiem: int             # 0=Yếu, 1=TB, 2=Khá, 3=Tốt

- PredictResponse:
  predicted_rank: str        # "Giỏi" / "Khá" / "Trung Bình" / "Yếu"
  confidence: float          # 0-100
  risk_level: str            # "low" / "medium" / "high"
  weak_subjects: list[str]   # code các môn điểm < 5.0
  suggestions: list[str]
  analysis: str

File main.py:
1. Khi khởi động: load model.pkl, feature_names.pkl, label_encoder.pkl
   In ra: "Model loaded. Features ({n}): {feature_names}"

2. GET /health:
   { "status": "ok", "model_loaded": true, "feature_count": n, "features": [...] }

3. POST /predict:
   - Nhận PredictRequest
   - Build input vector ĐÚNG THỨ TỰ feature_names:
     Với mỗi feature trong feature_names:
       Nếu là "diem_hk_truoc" → dùng request.diem_hk_truoc
       Nếu là "so_buoi_vang"  → dùng request.so_buoi_vang
       Nếu là "hanh_kiem"     → dùng request.hanh_kiem
       Còn lại                → dùng request.scores.get(feature, 0.0)
   - predict_proba → confidence = max probability * 100
   - risk_level: confidence < 60 → 'high', < 75 → 'medium', else → 'low'
   - weak_subjects: [code for code, score in scores.items() if score < 5.0]
   - suggestions: tạo list gợi ý dựa trên weak_subjects + so_buoi_vang
   - analysis: đoạn văn tiếng Việt ~3 câu tóm tắt tình hình

4. POST /predict-batch: nhận list[PredictRequest], trả list[PredictResponse]

5. GET /retrain-required:
   So sánh feature_names.pkl hiện tại với subject codes trong DB
   Trả { needs_retrain: bool, reason: str }
   ⚠️ Endpoint này để Node.js gọi kiểm tra sau khi Admin thêm/xóa môn

CORS: cho phép origin http://localhost:3000 và http://localhost:4200
```

**⚠️ Quy trình khi Admin thêm môn mới:**

```
1. Admin thêm môn qua UI → lưu vào Subject collection
2. Chạy lại: python data/generate_data.py   ← đọc môn mới từ DB
3. Chạy lại: python train.py                ← train lại với môn mới
4. Restart FastAPI: uvicorn main:app --reload ← load model.pkl mới
5. Model tự nhận môn mới, không cần sửa code
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

### 📅 NGÀY 10 — Quản lý Khoa + Môn học + Lớp + Học sinh

**Prompt 10.1 — Department Management (Admin):**

```
[DÙNG TEMPLATE CHUẨN]

Tạo features/departments/department-list/department-list.component.ts:
Chỉ hiện với Admin, guard route.

Giao diện:
1. BẢNG KHOA: Mã khoa | Tên khoa | Số môn | Số lớp | Số GV | Thao tác
   Nút: Xem chi tiết, Sửa, Xóa

2. DIALOG tạo/sửa khoa: Mã (code, readonly khi sửa), Tên khoa, Mô tả, Trưởng khoa

Tạo features/departments/department-detail/department-detail.component.ts:
Hiện 3 tab:
  Tab 1 "Môn học": danh sách môn thuộc khoa, filter theo học kỳ (HK1/HK2/Tất cả)
    Nút Thêm môn, Sửa, Bật/Tắt
  Tab 2 "Lớp học": danh sách lớp thuộc khoa theo năm học
  Tab 3 "Giáo viên": danh sách GV đang dạy khoa này
```

**Prompt 10.2 — User/Teacher Management (Admin):**

```
[DÙNG TEMPLATE CHUẨN]

Tạo features/users/user-list/user-list.component.ts [Admin only]:

BẢNG GIÁO VIÊN: Họ tên | Email | Khoa đang dạy | Trạng thái | Thao tác
  - Cột "Khoa đang dạy": hiện chip cho mỗi khoa (vd: [CNTT] [KTKT])
  - Nút: Sửa thông tin, Phân khoa, Bật/Tắt tài khoản

DIALOG "Tạo tài khoản GV":
  - Họ tên, email (@nttu.edu.vn), mật khẩu tạm
  - Phân khoa: checkbox list các khoa đang active
  - Validate: phải chọn ít nhất 1 khoa

DIALOG "Phân khoa":
  - Hiện danh sách tất cả khoa
  - Checkbox khoa đang dạy (đã chọn sẵn theo data hiện tại)
  - Nút Lưu → PATCH /api/users/:id/departments

Lưu ý: Admin không có trong danh sách GV này.
Admin quản lý admin qua màn hình Settings riêng.
```

**Prompt 10.3 — Subject Management (Admin):**

```
[DÙNG TEMPLATE CHUẨN]

Tạo features/subjects/subject-list/subject-list.component.ts [Admin only]:

BẢNG MÔN HỌC:
  Mã môn | Tên môn | Khoa | Học kỳ | Hệ số | Trạng thái | Thao tác
  Filter: dropdown Khoa + dropdown Học kỳ (HK1/HK2/Tất cả) + toggle Chỉ active

DIALOG thêm/sửa môn:
  - Mã môn (code): chỉ a-z+số, readonly khi sửa
  - Tên môn (name): required
  - Khoa (departmentId): dropdown các khoa active [Admin]
  - Học kỳ (semester): radio HK1 / HK2 / Cả hai
  - Hệ số (coefficient): 1-3
  - Khối áp dụng: checkbox [10] [11] [12]

Cảnh báo khi xóa:
  "Môn này đã có dữ liệu điểm. Hãy TẮT thay vì XÓA để giữ lịch sử."
```

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

**Prompt 11.1 — Grade Entry (nhập điểm hệ đại học NTTU):**

```
[DÙNG TEMPLATE CHUẨN]

Tạo features/grades/grade-entry/grade-entry.component.ts (standalone):

BƯỚC 1 — Chọn lớp học phần:
  - Dropdown: Năm học → Học kỳ → Lớp học phần (load theo khoa GV đang đăng nhập)
  - Sau khi chọn lớp: hiển thị thông tin:
    Tên môn | Số tín chỉ | Trọng số: TX(10%) GK(30%) TH(0%) TKT(60%)
  - Nút "Chỉnh trọng số" → mở dialog điều chỉnh % (tổng phải = 100%)

BƯỚC 2 — Chọn sinh viên:
  - Danh sách SV trong lớp (MatTable)
  - Click vào SV → chuyển sang form nhập điểm của SV đó
  - Badge màu: xanh = đã có điểm TKT, vàng = nhập một phần, xám = chưa nhập

BƯỚC 3 — Nhập điểm 1 sinh viên:
  Form gồm các phần:
  a. Điểm thường xuyên: [TX1] [TX2] [TX3] (số lượng theo txCount của lớp)
     Hiện trung bình TX real-time
  b. Điểm giữa kỳ: [GK]
  c. Điểm thực hành: [TH1] [TH2] [TH3] (ẩn nếu weights.th === 0)
     Hiện trung bình TH real-time
  d. Điểm thi kết thúc HP: [TKT]
     Nếu isVangThi = true → disable ô TKT, hiển thị "Vắng thi"
  e. Checkbox: Được dự thi HP, Vắng thi

  Preview điểm real-time (cập nhật khi nhập):
  ┌─────────────────────────────────────────┐
  │ Điểm tổng kết: 8.70  │  Thang 4: 4.0   │
  │ Xếp loại chữ: A      │  Kết quả: Đạt   │
  │ ⚠️ Nếu TKT = 4 → C dù điểm TB cao      │
  └─────────────────────────────────────────┘

  Nút Lưu → POST /api/grades
  Sau khi lưu → tự gọi POST /api/predictions/predict cho SV đó

Lưu ý:
  - Cho phép lưu điểm từng phần (chỉ TX, chưa có GK, TKT)
  - finalScore/letterGrade chỉ hiện khi đã có đủ điểm TKT
  - Validate: mỗi điểm 0-10, không âm
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
□ ERD: 9 entities với đầy đủ quan hệ
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
□ Angular v21 Standalone Components
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

| File      | Mục đích                                                              |
| --------- | --------------------------------------------------------------------- |
| `BUGS.md` | Ghi lại bug đã gặp + cách fix, AI đọc trước khi code để không lặp lại |
| `DONE.md` | Danh sách task đã hoàn thành, AI đọc để biết không làm lại            |

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

## 🐙 GIT & GITIGNORE

> Xem hướng dẫn đầy đủ trong file **`GIT.md`**
> Bao gồm: 4 file .gitignore, thứ tự khởi tạo, quy tắc branch, commit message, xử lý sự cố.

⚠️ **Nhớ tạo `.gitignore` TRƯỚC khi `git init`** — nếu không `node_modules` sẽ bị đẩy lên GitHub.

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

_Chúc bạn 100 điểm! 🎯_
