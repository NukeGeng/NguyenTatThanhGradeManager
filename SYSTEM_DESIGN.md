# SYSTEM DESIGN — NTT Grade Manager

---

## A. TỔNG QUAN

### Website làm gì

**NTT Grade Manager** là hệ thống quản lý điểm số và học vụ dành riêng cho **Trường Đại học Nguyễn Tất Thành (NTTU)**. Hệ thống cho phép giảng viên nhập điểm, cố vấn học tập theo dõi tiến độ sinh viên, và quản trị viên vận hành toàn bộ cấu trúc đào tạo.

Điểm đặc biệt: tích hợp **AI Engine** (Machine Learning + LLM) dự đoán học lực, phát hiện rủi ro học tập, lập lộ trình cải thiện GPA, và trợ lý chatbot hỏi-đáp về học vụ theo thời gian thực.

### Mục tiêu chính

1. Số hoá toàn bộ quy trình nhập điểm và quản lý lớp học.
2. Phát hiện sớm sinh viên có nguy cơ rớt môn / học lực yếu qua AI.
3. Cung cấp công cụ tư vấn học vụ thông minh cho cố vấn.
4. Phân tích và dự đoán học lực sinh viên qua AI Machine Learning (FastAPI + scikit-learn).
5. Hỗ trợ tra cứu thông tin học vụ và xây dựng lộ trình học tập cá nhân hoá qua chatbot AI (RAG + LLM).

---

## B. CHỨC NĂNG

### Chức năng (Functional Requirements)

| Nhóm                     | Chức năng                                                                  |
| ------------------------ | -------------------------------------------------------------------------- |
| **Xác thực**             | Đăng nhập JWT, phân quyền 3 role: admin / teacher / advisor                |
| **Quản lý người dùng**   | CRUD user, gán khoa, gán lớp cố vấn, upload avatar                         |
| **Quản lý đơn vị**       | CRUD khoa (Department), ngành (Major), năm học (SchoolYear)                |
| **Quản lý môn học**      | CRUD môn học, hệ số, trọng số thành phần (TX/GK/TH/TKT)                    |
| **Quản lý lớp học**      | CRUD lớp học phần, gán giảng viên, cấu hình trọng số điểm                  |
| **Quản lý sinh viên**    | CRUD sinh viên, quản lý CTĐT, theo dõi theo cố vấn                         |
| **Nhập điểm**            | Nhập điểm từng thành phần (TX, GK, TH, TKT), tính tự động finalScore, GPA4 |
| **Chương trình đào tạo** | Xây dựng CTĐT theo ngành, môn bắt buộc/tự chọn, học kỳ                     |
| **Dự đoán học lực AI**   | Dự đoán xếp loại (Giỏi/Khá/TB/Yếu), mức độ rủi ro, môn yếu                 |
| **Lộ trình GPA**         | AI lập kế hoạch cải thiện GPA, phân bổ môn theo học kỳ                     |
| **Chatbot AI**           | Hỏi-đáp học vụ bằng ngôn ngữ tự nhiên (RAG + Gemini/Llama)                 |
| **Nhắn tin nội bộ**      | Chat theo phòng khoa (department) và nhắn tin trực tiếp (direct)           |
| **Thông báo**            | Thông báo real-time qua Socket.IO                                          |
| **Tin tức**              | Quản lý bài viết tin tức, phân loại theo slug                              |
| **Audit Log**            | Ghi log mọi hành động: CREATE/UPDATE/DELETE/LOGIN/PREDICT (TTL 90 ngày)    |
| **Thống kê**             | Dashboard tổng quan điểm, phân phối học lực, rủi ro theo lớp/khoa          |

### Phi chức năng (Non-Functional Requirements)

| Tiêu chí             | Yêu cầu                                                       |
| -------------------- | ------------------------------------------------------------- |
| **Bảo mật**          | JWT Bearer Token, bcrypt hash password, role-based middleware |
| **Hiệu năng**        | MongoDB index trên các field hay query; route-level cache     |
| **Realtime**         | Socket.IO cho chat và thông báo tức thì                       |
| **Streaming AI**     | SSE (Server-Sent Events) — không chờ toàn bộ câu trả lời AI   |
| **Khả năng mở rộng** | Monorepo tách biệt backend / frontend / AI engine             |
| **Quan sát**         | Audit log tự động xoá sau 90 ngày (MongoDB TTL index)         |
| **Upload file**      | Ảnh đính kèm tin nhắn, avatar người dùng                      |

---

## C. KỸ THUẬT

### Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│              Angular 21 SPA  —  port 4200                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST + SSE + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND  —  port 3000                     │
│   Express.js + Socket.IO                                     │
│                                                              │
│  Routes: auth / users / students / classes / grades /        │
│          predictions / curricula / messages / chatbot / …    │
│                                                              │
│  Services:  ragService  ──► MongoDB (đọc context)            │
│             geminiService ─► Gemini API (SSE stream)         │
│             llamaService ──► Ollama VPS (SSE stream)         │
│             aiService ────► AI Engine (REST)                 │
│             importService / curriculumService                 │
└───────────┬────────────────────────┬────────────────────────┘
            │                        │
            ▼                        ▼
┌───────────────────┐   ┌────────────────────────────────────┐
│  MongoDB Atlas    │   │  AI Engine  —  port 5000           │
│  student-ai-db    │   │  FastAPI + scikit-learn             │
│                   │   │                                    │
│  Collections:     │   │  POST /predict   (ML model)        │
│  users            │   │  POST /predict-all                 │
│  students         │   │  POST /gpa-roadmap                 │
│  classes          │   │  POST /retake-roadmap              │
│  subjects         │   │  POST /semester-plan               │
│  grades           │   └────────────────────────────────────┘
│  predictions      │
│  curricula        │   ┌────────────────────────────────────┐
│  messages         │   │  External LLM APIs                 │
│  departments      │   │                                    │
│  majors           │   │  Gemini API (Google)               │
│  schoolYears      │   │  Models: gemma-3-*-it, gemini-*    │
│  auditLogs        │   │  fallback theo thứ tự GEMINI_MODELS│
│  news             │   │                                    │
└───────────────────┘   │  Ollama VPS (llama3.2:1b)          │
                        │  http://184.174.37.227:11434        │
                        └────────────────────────────────────┘
```

---

### Use Case

```
Actor: Admin
  ├── UC01: Quản lý khoa / ngành / năm học
  ├── UC02: Quản lý người dùng (teacher, advisor)
  ├── UC03: Quản lý môn học
  ├── UC04: Quản lý chương trình đào tạo
  └── UC05: Xem audit log

Actor: Teacher (Giảng viên)
  ├── UC06: Quản lý lớp học phần
  ├── UC07: Nhập / sửa điểm sinh viên
  ├── UC08: Xem thống kê lớp
  └── UC09: Chat nội bộ

Actor: Advisor (Cố vấn học tập)
  ├── UC10: Xem danh sách sinh viên được cố vấn
  ├── UC11: Xem chi tiết điểm + dự đoán học lực từng sinh viên
  ├── UC12: Kích hoạt dự đoán AI / lộ trình GPA
  ├── UC13: Hỏi chatbot AI về sinh viên
  └── UC14: Chat nội bộ

Actor: System (Auto)
  ├── UC15: Tính toán finalScore / GPA4 khi lưu điểm
  ├── UC16: Ghi audit log mọi thao tác
  └── UC17: Phát thông báo realtime qua Socket.IO
```

---

### Sequence — Luồng Chatbot AI

```
User              Frontend           Backend /chatbot        ragService       Gemini/Llama
 │                    │                    │                      │                │
 │──── nhập câu hỏi ─►│                   │                      │                │
 │                    │──── POST /message ►│                      │                │
 │                    │                    │── detectIntent() ───►│                │
 │                    │                    │── fetchContextData() ►│               │
 │                    │                    │◄── ragContext ────────│                │
 │                    │                    │                      │                │
 │                    │                    │ [intent = roadmap/subject_weak?]       │
 │                    │                    │──────────────── SSE stream ───────────►│
 │                    │◄─── SSE chunks ───│◄────────────── text chunks ────────────│
 │◄── streaming text ─│                   │                      │                │
 │                    │                   │ [intent = student_info/grade?]         │
 │                    │                   │── streamDirect(ragContext) ─────────────
 │◄── streaming text ─│◄── SSE chunks ───│                      │                │
```

---

### Sequence — Luồng Nhập Điểm & Dự Đoán

```
Teacher        Frontend         Backend /grades       AI Engine        MongoDB
  │                │                  │                    │               │
  │── nhập điểm ──►│                  │                    │               │
  │                │── PUT /grades ──►│                    │               │
  │                │                  │── tính finalScore  │               │
  │                │                  │── tính GPA4        │               │
  │                │                  │── save Grade ─────────────────────►│
  │                │                  │── POST /predict ──►│               │
  │                │                  │                    │── ML model    │
  │                │                  │◄── predicted_rank  │               │
  │                │                  │    confidence      │               │
  │                │                  │    risk_level      │               │
  │                │                  │── save Prediction ────────────────►│
  │                │◄── response ────│                    │               │
```

---

### ERD (Entity Relationship)

```
Department (1) ──── (N) User          (departmentIds)
Department (1) ──── (0..1) User       (headId — trưởng khoa)
Department (1) ──── (N) Major
Department (1) ──── (N) Subject
Department (1) ──── (N) Class

Major (1) ──── (N) Curriculum
Major (1) ──── (N) Student

Curriculum (1) ──── (N) CurriculumItem → Subject
  CurriculumItem: subjectId, year, semester, subjectType (required/elective/prerequisite), prerequisiteIds[]

SchoolYear (1) ──── (N) Class
SchoolYear embeds semesters[]

Class (1) ──── (1) Subject
Class (1) ──── (0..1) Teacher (User)
Class (1) ──── (1) Department
Class (1) ──── (1) SchoolYear
Class (1) ──── (N) Grade
Class (1) ──── (N) StudentCurriculum.registrations (via classId)

Student (1) ──── (N) Grade
Student (1) ──── (N) Prediction
Student (1) ──── (1) StudentCurriculum

StudentCurriculum (1) ──── (1) Student
StudentCurriculum (1) ──── (1) Curriculum
StudentCurriculum embeds registrations[]
  registration: subjectId, classId, schoolYear, semester,
                status (registered/completed/failed/retaking),
                gradeId, gpa4, letterGrade

Grade (N) ──── (1) Student
Grade (N) ──── (1) Class
Grade (N) ──── (1) Subject
Grade (N) ──── (1) SchoolYear
Grade (1) ──── (0..1) Prediction

Prediction (N) ──── (1) Student
Prediction (N) ──── (0..1) Grade

Message (N) ──── (1) User (sender)
Message grouped by roomId:
  dept_<departmentId>         → phòng khoa
  direct_<userId1>_<userId2>  → nhắn tin trực tiếp

News (N) ──── (0..1) User (authorId)
News: title, summary, content, imageUrl, category, isActive, publishedAt

AuditLog (N) ──── (1) User
AuditLog: action (CREATE/UPDATE/DELETE/LOGIN/LOGOUT/PREDICT), resource,
          resourceId, oldData, newData, ipAddress — TTL 90 ngày
```

**Tổng số collection: 14**

| Collection           | Mô tả                                          |
| -------------------- | ---------------------------------------------- |
| `departments`        | Khoa/đơn vị đào tạo                            |
| `majors`             | Ngành học                                      |
| `schoolyears`        | Năm học + học kỳ                               |
| `subjects`           | Môn học (mã, tên, tín chỉ, trọng số)           |
| `curricula`          | Chương trình đào tạo theo ngành                |
| `classes`            | Lớp học phần (môn + năm học + giảng viên)      |
| `users`              | Tài khoản (admin / teacher / advisor)          |
| `students`           | Sinh viên                                      |
| `studentcurriculums` | Tiến độ CTĐT của từng sinh viên                |
| `grades`             | Điểm số (TX/GK/TH/TKT → finalScore, GPA4)      |
| `predictions`        | Kết quả dự đoán AI (xếp loại, rủi ro, môn yếu) |
| `messages`           | Tin nhắn nội bộ (chat khoa + chat trực tiếp)   |
| `news`               | Bài viết tin tức                               |
| `auditlogs`          | Nhật ký thao tác hệ thống                      |

**Sơ đồ quan hệ chi tiết:**

```
┌──────────────┐    ┌──────────────┐    ┌───────────────────┐
│  Department  │───►│    Major     │───►│    Curriculum     │
│  _id         │    │  _id         │    │  _id              │
│  code        │    │  code        │    │  majorId          │
│  name        │    │  name        │    │  cohort           │
│  headId ─────┼──┐ │  departmentId│    │  totalCredits     │
└──────┬───────┘  │ │  totalCredits│    │  items[]          │
       │          │ └──────────────┘    │    subjectId      │
       │ 1:N      │                     │    year/semester  │
       ▼          │                     │    subjectType    │
┌──────────────┐  │ ┌──────────────┐   └───────────────────┘
│    User      │◄─┘ │  SchoolYear  │
│  _id         │    │  _id         │
│  name/email  │    │  name        │
│  role        │    │  semesters[] │
│  departmentIds    └──────┬───────┘
└──────────────┘           │ 1:N
                           ▼
                    ┌──────────────┐
                    │    Class     │
                    │  _id         │
                    │  code        │
                    │  subjectId ──┼──► Subject
                    │  departmentId┼──► Department
                    │  schoolYearId┼──► SchoolYear
                    │  teacherId ──┼──► User
                    │  weights{}   │
                    └──────┬───────┘
                           │ 1:N
                           ▼
┌──────────────┐    ┌──────────────┐    ┌───────────────────┐
│   Student    │───►│    Grade     │───►│    Prediction     │
│  _id         │    │  _id         │    │  _id              │
│  studentCode │    │  studentId   │    │  studentId        │
│  fullName    │    │  classId     │    │  gradeId          │
│  classId     │    │  subjectId   │    │  predictedRank    │
│  majorId     │    │  schoolYearId│    │  confidence       │
│  status      │    │  txScores[]  │    │  riskLevel        │
└──────┬───────┘    │  gkScore     │    │  weakSubjects[]   │
       │            │  tktScore    │    │  suggestions[]    │
       │            │  finalScore  │    └───────────────────┘
       │            │  gpa4        │
       │            └──────────────┘
       │
       ▼
┌──────────────────────────┐
│    StudentCurriculum     │
│  studentId               │
│  curriculumId            │
│  registrations[]         │
│    subjectId             │
│    classId               │
│    semester/schoolYear   │
│    status                │
│    gradeId / gpa4        │
└──────────────────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Message    │   │     News     │   │  AuditLog    │
│  roomId      │   │  title       │   │  userId      │
│  roomType    │   │  category    │   │  action      │
│  senderId ───┼──►│  authorId ───┼──►│  resource    │
│  content     │   │  publishedAt │   │  oldData     │
│  messageType │   │  isActive    │   │  newData     │
│  imageUrl    │   └──────────────┘   │  TTL 90 ngày │
│  formTitle   │                      └──────────────┘
└──────────────┘
```

---

## D. TECH STACK

### Frontend

| Hạng mục   | Công nghệ                                                   |
| ---------- | ----------------------------------------------------------- |
| Framework  | **Angular 21** (Standalone Components)                      |
| UI Library | **Angular Material 21**                                     |
| Icons      | **lucide-angular**                                          |
| Charts     | **Chart.js 4**                                              |
| Realtime   | **Socket.IO Client 4**                                      |
| HTTP       | Angular `HttpClient` + SSE (`EventSource` / `fetch` stream) |
| Routing    | Angular Router với lazy-loading                             |
| State      | Component-level (Services + RxJS)                           |
| Styling    | SCSS + Angular Material theming + inline component styles   |
| Build tool | Angular CLI / `@angular/build` (esbuild)                    |
| Language   | TypeScript 5.9                                              |

### Backend

| Hạng mục     | Công nghệ                                     |
| ------------ | --------------------------------------------- |
| Runtime      | **Node.js**                                   |
| Framework    | **Express.js 4**                              |
| Database     | **MongoDB Atlas** (Mongoose 8)                |
| Auth         | **JWT** (jsonwebtoken) + bcryptjs             |
| Realtime     | **Socket.IO 4**                               |
| AI Streaming | **SSE** (Server-Sent Events) — `res.write()`  |
| Email        | **Nodemailer** (Gmail SMTP)                   |
| File upload  | `multer` (ảnh tin nhắn, avatar)               |
| Logging      | Audit log tự viết vào MongoDB                 |
| Cache        | Route-level in-memory cache (`routeCache.js`) |

### AI

| Hạng mục                | Công nghệ                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| AI Engine framework     | **FastAPI** (Python)                                                                                            |
| ML model                | **scikit-learn** (RandomForest / GradientBoosting — pickle)                                                     |
| Features                | điểm học kỳ trước, số buổi vắng, hạnh kiểm, finalScore, GPA4                                                    |
| Output                  | predicted_rank, confidence, risk_level, weak_subjects                                                           |
| Risk logic              | Rule-based (`risk_logic.py`) — calibrate theo khoảng cách ngưỡng                                                |
| LLM General chat        | **Ollama** (llama3.2:1b) — self-hosted VPS                                                                      |
| LLM Analysis            | **Gemini API** (Google) — multi-model fallback                                                                  |
| Gemini models (ưu tiên) | gemma-3-1b-it → gemma-3-4b-it → gemma-3-12b-it → gemma-3-27b-it → gemma-3-2b-it → gemini-3.1-flash-lite-preview |
| RAG                     | Custom `ragService.js` — truy MongoDB lấy context → inject vào prompt                                           |
| Routing AI              | Gemini ← roadmap/subject_weak \| Direct stream ← DB queries \| Llama ← general chat                             |

### Network / Infra

| Hạng mục   | Chi tiết                                                        |
| ---------- | --------------------------------------------------------------- |
| Database   | MongoDB Atlas (cloud) — `mongodb+srv://...`                     |
| LLM VPS    | Ollama tự host tại `http://184.174.37.227:11434`                |
| Gemini     | Google Generative Language API `v1beta`                         |
| Dev ports  | Frontend: 4200 \| Backend: 3000 \| AI Engine: 5000              |
| Monorepo   | `concurrently` chạy 3 service cùng lúc (`npm run dev`)          |
| Môi trường | `.env` tại `backend/.env` — dùng chung cho backend và AI engine |

### DEMO:
