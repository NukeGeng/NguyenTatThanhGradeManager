# 🚀 FEATURES_UPDATE.md — Prompt nâng cấp tính năng NttuGradeManager

> Đây là các tính năng MỚI cần thêm vào hệ thống hiện tại.
> Mỗi section là 1 prompt riêng — thực hiện theo đúng thứ tự từ 1→6.
> Dán DESIGN_SYSTEM.md + BUGS.md + DONE.md vào đầu mỗi prompt.

---

## THỨ TỰ THỰC HIỆN

```
Bước 1 → Cập nhật ERD (thêm bảng mới)
Bước 2 → Học kỳ 3 kỳ/năm (ảnh hưởng toàn hệ thống)
Bước 3 → Chương trình khung (Curriculum)
Bước 4 → Role Cố vấn học tập
Bước 5 → Chat real-time WebSocket
Bước 6 → Nâng cấp AI FastAPI (lộ trình GPA + học lại)
```

---

## 📦 BƯỚC 1 — CẬP NHẬT ERD (4 bảng mới)

```
[TEMPLATE CHUẨN DỰ ÁN]

Thêm 4 Mongoose models mới vào backend/src/models/:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. src/models/Major.js  (Ngành học)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  _id:           ObjectId,
  code:          String (unique, required, uppercase)   // "KTPM", "HTTT"
  name:          String (required)                      // "Kỹ thuật phần mềm"
  departmentId:  ObjectId (ref: Department, required)
  totalCredits:  Number (required)                      // Tổng tín chỉ toàn khóa
  durationYears: Number (default: 4)                    // Số năm đào tạo
  isActive:      Boolean (default: true)
  timestamps:    true
}
Index: code(unique), departmentId

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. src/models/Curriculum.js  (Chương trình khung)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  _id:        ObjectId,
  majorId:    ObjectId (ref: Major, required)
  schoolYear: String (required)                   // "2021-2025" — khóa học
  name:       String (required)                   // "CTĐT KTPM 2021"
  items: [{                                       // Danh sách môn trong CTĐT
    subjectId:        ObjectId (ref: Subject)
    subjectCode:      String                      // cache
    subjectName:      String                      // cache
    credits:          Number
    year:             Number (1-4)                // Năm thứ mấy
    semester:         Number (1-3)                // Học kỳ trong năm (1/2/3)
    subjectType:      Enum['required','elective','prerequisite']
    prerequisiteIds:  [ObjectId]                  // Môn tiên quyết
    note:             String
  }]
  totalCredits:  Number                           // Tự tính từ items
  isActive:      Boolean (default: true)
  createdBy:     ObjectId (ref: User)
  timestamps:    true
}
Index: majorId, schoolYear

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. src/models/StudentCurriculum.js  (Chương trình khung của SV)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  _id:           ObjectId,
  studentId:     ObjectId (ref: Student, required, unique)
  curriculumId:  ObjectId (ref: Curriculum, required)
  majorId:       ObjectId (ref: Major)            // cache
  advisorId:     ObjectId (ref: User)             // Cố vấn học tập
  enrolledYear:  String (required)                // "2021" — năm nhập học
  registrations: [{                               // Lịch sử đăng ký môn
    subjectId:     ObjectId (ref: Subject)
    subjectCode:   String
    classId:       ObjectId (ref: Class)          // Lớp HP đã đăng ký
    schoolYear:    String
    semester:      Number (1-3)
    status:        Enum['registered','completed','failed','retaking']
    gradeId:       ObjectId (ref: Grade)          // null nếu chưa có điểm
    gpa4:          Number                         // cache từ Grade
    letterGrade:   String                         // cache
  }]
  timestamps: true
}
Index: studentId(unique), advisorId, curriculumId

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. src/models/Message.js  (Chat)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  _id:          ObjectId,
  roomId:       String (required)              // "dept_CNTT" hoặc "admin_userId"
  roomType:     Enum['department','direct']    // nhóm khoa hoặc chat 1-1
  senderId:     ObjectId (ref: User, required)
  senderName:   String                         // cache
  content:      String (required, maxLength: 2000)
  isRead:       Boolean (default: false)
  readBy:       [ObjectId]                     // list userId đã đọc
  createdAt:    Date (default: Date.now)
}
Index: roomId + createdAt, senderId
TTL: giữ 180 ngày

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cập nhật model User: thêm field
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  role: Enum['admin', 'teacher', 'advisor']   // thêm 'advisor'
  advisingStudentIds: [ObjectId]              // SV được phân công cố vấn (chỉ advisor)

Cập nhật model SchoolYear: sửa semesters
  semesterNumber: Number (enum:[1,2,3])       // thêm HK3
  isOptional: Boolean (default: false)        // HK3 thường là học kỳ hè

Cập nhật model Student: thêm
  majorId:    ObjectId (ref: Major)
  enrolledYear: String                        // "2021"

Seed data mẫu:
  - 2 ngành cho khoa CNTT: KTPM + HTTT
  - 1 curriculum mẫu cho KTPM 2021 với 10 môn mẫu
```

---

## 📅 BƯỚC 2 — HỌC KỲ 3 KỲ/NĂM

```
[TEMPLATE CHUẨN DỰ ÁN]

Cập nhật toàn bộ hệ thống để hỗ trợ 3 học kỳ/năm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend — tìm và sửa TẤT CẢ chỗ hardcode semester
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. src/models/Grade.js:
   semester: Number (enum:[1,2,3], required)   // ← thêm 3

2. src/models/Class.js:
   semester: Number (enum:[1,2,3], required)

3. src/models/Subject.js:
   semester: Enum[1, 2, 3, 'all'] (default: 'all')

4. src/routes/grades.js, classes.js, subjects.js:
   Tất cả validation: if (![1,2,3].includes(semester)) → lỗi

5. Seed data SchoolYear: thêm HK3
   semesters: [
     { semesterNumber: 1, startDate: '2024-09-01', endDate: '2024-12-31', isOptional: false },
     { semesterNumber: 2, startDate: '2025-01-01', endDate: '2025-04-30', isOptional: false },
     { semesterNumber: 3, startDate: '2025-05-01', endDate: '2025-08-31', isOptional: true }
   ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend — cập nhật tất cả dropdown học kỳ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tìm tất cả MatSelect/dropdown học kỳ và thêm option HK3:
  <mat-option [value]="1">Học kỳ 1 (T9-T12)</mat-option>
  <mat-option [value]="2">Học kỳ 2 (T1-T4)</mat-option>
  <mat-option [value]="3">Học kỳ 3 — Hè (T5-T8)</mat-option>

Thêm badge "Hè" màu vàng cho semester = 3 trong mọi bảng hiển thị.

Cập nhật filter bar tất cả trang /classes, /grades, /subjects.
```

---

## 📚 BƯỚC 3 — CHƯƠNG TRÌNH KHUNG

```
[TEMPLATE CHUẨN DỰ ÁN]

Tạo đầy đủ backend + frontend cho quản lý chương trình khung.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend API — src/routes/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/routes/majors.js [Admin]:
  GET    /api/majors?departmentId=     Danh sách ngành (filter theo khoa)
  GET    /api/majors/:id               Chi tiết ngành
  POST   /api/majors                   Tạo ngành mới
  PUT    /api/majors/:id               Sửa ngành
  DELETE /api/majors/:id               Xóa (chỉ khi chưa có curriculum)

src/routes/curricula.js [Admin + Advisor read]:
  GET    /api/curricula?majorId=       Danh sách CTĐT theo ngành
  GET    /api/curricula/:id            Chi tiết CTĐT đầy đủ (populate subjects)
  POST   /api/curricula                Tạo CTĐT mới (Admin)
  PUT    /api/curricula/:id            Cập nhật toàn bộ (Admin)
  POST   /api/curricula/:id/items      Thêm môn vào CTĐT
  DELETE /api/curricula/:id/items/:subjectId  Xóa môn khỏi CTĐT

src/routes/studentCurricula.js:
  GET    /api/student-curricula/:studentId    Xem CTĐT + tiến độ của SV
  POST   /api/student-curricula               Gán CTĐT cho SV (Admin/Advisor)
  PUT    /api/student-curricula/:studentId/registrations  Cập nhật đăng ký môn

src/services/curriculumService.js:
  calculateProgress(studentId):
    - Đếm môn đã hoàn thành / tổng môn
    - Tổng tín chỉ tích lũy / tổng tín chỉ yêu cầu
    - Phân loại: completed / in-progress / not-started / failed
    - Trả về object { totalRequired, completed, inProgress, failed, remaining,
                      creditsEarned, creditsRequired, progressPercent }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend — features/curricula/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trang /majors (Admin only):
  - Grid card các ngành theo khoa
  - Mỗi card: tên ngành, mã, số CTĐT, tổng tín chỉ
  - Click → /curricula?majorId=

Trang /curricula (Admin only):
  - Bảng danh sách CTĐT
  - Click → trang chi tiết CTĐT

Trang chi tiết CTĐT /curricula/:id:
  Layout dạng TIMELINE theo năm học:
  Năm 1 (HK1, HK2, HK3) → Năm 2 → Năm 3 → Năm 4
  Mỗi học kỳ là 1 column card:
    - Tên học kỳ + năm
    - Danh sách môn dạng list: [icon] Tên môn (N TC) [badge type]
    - Badge type: "Bắt buộc" navy / "Tự chọn" xám / "Tiên quyết" cam
    - Footer card: X môn | Y tín chỉ
  Nút "Thêm môn" vào từng học kỳ
  Nút "Xuất PDF chương trình khung"

Trang tiến độ SV /students/:id/curriculum:
  Dành cho Advisor xem:
  Timeline giống trên NHƯNG mỗi môn có thêm:
    - Icon trạng thái: ✓ (completed xanh) / → (in-progress xanh nhạt)
      / ✗ (failed đỏ) / ○ (chưa học xám)
    - Điểm + xếp loại (nếu đã có)
  Progress bar tổng: "X/Y tín chỉ (Z%)"
  Section "Môn cần học lại": list môn F/C nếu có
```

---

## 👨‍🏫 BƯỚC 4 — ROLE CỐ VẤN HỌC TẬP

```
[TEMPLATE CHUẨN DỰ ÁN]

Thêm role 'advisor' (Cố vấn học tập) vào hệ thống.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. src/middleware/auth.js:
   Cập nhật JWT payload: { id, role, departmentIds, advisingStudentIds }

2. src/middleware/advisorAccess.js (mới):
   Kiểm tra advisor có quyền xem sinh viên đó không:
   if role==='admin' → pass
   if role==='advisor' → kiểm tra studentId có trong advisingStudentIds không
   → 403 nếu không phải SV được phân công

3. src/routes/users.js (Admin):
   Thêm vào POST/PUT user:
   - role có thể là 'advisor'
   - Nếu role='advisor': cho phép set advisingStudentIds[]
   PATCH /api/users/:id/advising-students   Gán/bỏ SV được cố vấn

4. Quyền của Advisor:
   ✅ XEM: /api/students (chỉ SV mình cố vấn)
   ✅ XEM: /api/grades/student/:id (chỉ SV mình)
   ✅ XEM: /api/student-curricula/:studentId (tiến độ CTĐT)
   ✅ XEM: /api/predictions/student/:id (dự đoán AI)
   ✅ GHI: nhận xét cố vấn vào StudentCurriculum
   ✅ CHAT: với admin + với GV cùng khoa
   ❌ KHÔNG: nhập/sửa điểm
   ❌ KHÔNG: xem SV không được phân công

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thêm vào sidebar (role=advisor):
  Section "CỐ VẤN":
    - Sinh viên của tôi (icon: graduation-cap)
    - Tiến độ học tập (icon: trending-up)
    - Lộ trình GPA (icon: target)

Trang /advisor/students:
  Danh sách SV được phân công cố vấn
  Mỗi SV: avatar + tên + mã SV + ngành + GPA tích lũy + tiến độ tín chỉ (bar)
  Badge cảnh báo nếu có môn F hoặc GPA < 2.0
  Click → xem trang chi tiết tiến độ + lộ trình AI

Trang /advisor/students/:id:
  3 tab:
  Tab 1 "Tổng quan": GPA tích lũy, tín chỉ, thống kê A/B/C/F
  Tab 2 "Tiến độ CTĐT": timeline chương trình khung như mô tả ở Bước 3
  Tab 3 "Lộ trình AI": kết quả từ AI engine (xem Bước 6)

Cập nhật trang /users (Admin):
  Thêm option role "Cố vấn học tập" trong dialog tạo user
  Nút "Phân SV cố vấn" → dialog checkbox list SV theo ngành
```

---

## 💬 BƯỚC 5 — CHAT REAL-TIME WEBSOCKET

```
[TEMPLATE CHUẨN DỰ ÁN]

Xây dựng chat real-time dùng Socket.io.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend — cài thêm package
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
npm install socket.io

src/socket.js (file mới):
  Khởi tạo Socket.io server, gắn vào Express HTTP server
  Middleware xác thực JWT cho socket connection:
    socket.handshake.auth.token → verify → gắn socket.data.user

  Events xử lý:
  'join_room':    client join room (dept_CNTT hoặc admin_{userId})
  'leave_room':   client leave room
  'send_message': { roomId, roomType, content }
    → validate → lưu vào MongoDB Message model
    → emit 'new_message' đến tất cả user trong room
  'mark_read':    { roomId } → cập nhật isRead cho messages chưa đọc
  'typing':       { roomId } → broadcast 'user_typing' đến room (không lưu DB)

  Rooms logic:
    - "dept_{deptCode}": tất cả user có departmentId tương ứng
    - "admin_support": room 1-1 giữa user với admin
      roomId format: "direct_{userId1}_{userId2}" (sort ID để unique)

src/routes/messages.js:
  GET /api/messages/rooms          Danh sách room user đang tham gia
                                   Kèm unreadCount + lastMessage
  GET /api/messages/:roomId        Lịch sử tin nhắn (paginate, 50/page)
                                   ?before=messageId (load thêm cũ hơn)
  GET /api/messages/unread-count   Tổng số tin chưa đọc (cho notification bell)
  DELETE /api/messages/:id         Xóa tin nhắn của chính mình

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend — features/chat/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
npm install socket.io-client

src/app/core/services/socket.service.ts:
  Khởi tạo socket với auth token
  connect() / disconnect()
  joinRoom(roomId) / leaveRoom(roomId)
  sendMessage(roomId, roomType, content)
  onNewMessage(): Observable<Message>
  onUserTyping(): Observable<{roomId, userName}>
  markRead(roomId)

Trang /chat:
  Layout 2 cột:

  CỘT TRÁI (danh sách room, width 280px):
    Header: "Tin nhắn" + badge tổng unread
    Search tìm room
    Section "Nhóm khoa":
      Mỗi khoa mình thuộc → 1 room item
      Avatar: icon building-2 màu navy
      Tên khoa + lastMessage preview + time + unread badge
    Section "Hỗ trợ kỹ thuật":
      Room "Admin hỗ trợ" (chat 1-1 với admin)
      Avatar: icon shield màu gold

  CỘT PHẢI (chat window):
    Topbar: tên room + số thành viên + nút info
    Messages area (scroll):
      Tin nhắn người khác: avatar trái, bubble xám nhạt
      Tin nhắn của mình: bubble xanh navy, bên phải
      Ngày gộp: dòng phân cách "Hôm nay", "Hôm qua"
      Typing indicator: "... đang nhập" với animation dots
    Input area:
      Textarea (max 2000 ký tự, Enter gửi, Shift+Enter xuống dòng)
      Nút gửi (lucide-icon name="send")
      Hiện ký tự còn lại khi > 1800

  Thêm vào Notification Bell (topbar):
    Hiện badge đỏ tổng unread messages
    Dropdown: preview 3 tin nhắn mới nhất
    Link "Xem tất cả" → /chat

Sidebar: thêm menu item "Tin nhắn" với badge unread count
  Section "TỔNG QUAN":
    - Dashboard
    - Tin tức
    - Tin nhắn (icon: message-circle) + badge số unread ← MỚI
```

---

## 🤖 BƯỚC 6 — NÂNG CẤP AI FASTAPI (Lộ trình GPA + Học lại)

```
[TEMPLATE CHUẨN DỰ ÁN]

Nâng cấp ai-engine/main.py — thêm 3 endpoint mới cho lộ trình học tập.
Giữ nguyên endpoint /predict và /predict-batch cũ.
Lộ trình GPA dùng thuật toán tính toán (không cần ML).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ai-engine/schemas.py — thêm schemas mới
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SubjectResult(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int
    gpa4: float            # điểm đã đạt (0 nếu chưa học)
    letterGrade: str       # "A","B","C","F","" nếu chưa học
    status: str            # "completed","failed","not_started"
    isRequired: bool       # bắt buộc hay tự chọn

class GpaRoadmapRequest(BaseModel):
    studentCode: str
    currentGpaAccumulated: float        # GPA tích lũy hiện tại
    totalCreditsEarned: int             # Tín chỉ đã tích lũy
    completedSubjects: list[SubjectResult]
    remainingSubjects: list[SubjectResult]  # Môn chưa học theo CTĐT
    targetGpa: float                    # Mục tiêu: 3.2 (Giỏi) hoặc 3.6 (Xuất sắc)

class SubjectPlan(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int
    targetGrade: str            # "A" hoặc "B"
    targetGpa4: float
    priority: str               # "critical","high","normal"
    reason: str                 # Tại sao cần đạt grade này
    semester: int               # Đề xuất học kỳ nào (1/2/3)
    year: int                   # Năm thứ mấy

class RetakeSubject(BaseModel):
    subjectCode: str
    subjectName: str
    credits: int
    currentGrade: str           # "C" hoặc "F"
    currentGpa4: float
    targetGrade: str            # Cần đạt tối thiểu bao nhiêu
    urgency: str                # "urgent"(F) / "recommended"(C)
    prerequisiteFor: list[str]  # Môn tiên quyết cho môn nào
    suggestedSemester: int
    reason: str

class GpaRoadmapResponse(BaseModel):
    studentCode: str
    currentGpa: float
    targetGpa: float
    targetLabel: str            # "Giỏi" hoặc "Xuất sắc"
    isAchievable: bool
    requiredGpaRemaining: float # GPA cần đạt ở các môn còn lại
    subjectPlans: list[SubjectPlan]
    summary: str                # Tóm tắt bằng tiếng Việt
    semesterBreakdown: list[dict]  # Kế hoạch từng học kỳ

class RetakeRoadmapRequest(BaseModel):
    studentCode: str
    failedSubjects: list[SubjectResult]    # Môn F
    weakSubjects: list[SubjectResult]      # Môn C
    remainingSubjects: list[SubjectResult] # Môn chưa học
    currentSemester: int
    currentYear: int

class RetakeRoadmapResponse(BaseModel):
    studentCode: str
    urgentRetakes: list[RetakeSubject]     # Môn F — cần học lại ngay
    recommendedRetakes: list[RetakeSubject] # Môn C — nên cải thiện
    retakePlan: list[dict]                 # Lịch học lại theo kỳ
    note: str

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ai-engine/main.py — thêm 3 endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /gpa-roadmap  (Lộ trình đạt GPA mục tiêu)
  Logic thuần Python — KHÔNG dùng ML model:

  1. Tính GPA tích lũy hiện tại đã cho sẵn
  2. Tính tổng tín chỉ còn lại = sum(credits of remainingSubjects)
  3. Tính GPA cần đạt ở phần còn lại:
     required_remaining = (target * total_future_credits - current_gpa * credits_earned)
                          / remaining_credits
  4. Nếu required_remaining > 4.0 → isAchievable = False
     → vẫn trả về kế hoạch tốt nhất có thể
  5. Với mỗi môn còn lại, phân loại:
     - Môn bắt buộc + nhiều tín chỉ → priority="critical"
     - Môn tiên quyết cho nhiều môn → priority="high"
     - Còn lại → priority="normal"
  6. Gán targetGrade:
     Nếu required_remaining >= 3.8 → hầu hết cần A
     Nếu required_remaining >= 3.2 → mix A và B
     Nếu required_remaining >= 2.5 → hầu hết B
  7. Sắp xếp môn vào từng học kỳ (tối đa 5-6 môn/kỳ, ưu tiên tiên quyết)
  8. Tạo summary tiếng Việt:
     "Để đạt GPA 3.2 (Giỏi), bạn cần đạt trung bình X điểm GPA
      trong Y môn còn lại. Cần đặc biệt chú ý môn [tên môn] vì..."

POST /retake-roadmap  (Lộ trình học lại môn yếu)
  Logic:
  1. Phân loại:
     - Môn F: urgency="urgent" — ảnh hưởng GPA nhiều, cần học lại ngay HK sau
     - Môn C: urgency="recommended" — nên cải thiện nếu còn slot
  2. Kiểm tra tiên quyết:
     Môn F mà là tiên quyết cho môn khác chưa học → đánh dấu cực kỳ ưu tiên
  3. Sắp xếp lịch học lại:
     HK tiếp theo: ưu tiên môn F là tiên quyết
     HK sau nữa: môn F còn lại + môn C quan trọng
     Tối đa 2 môn học lại/kỳ (để không quá tải)
  4. Tính GPA cải thiện nếu học lại thành công

POST /semester-plan  (Kế hoạch 1 học kỳ cụ thể)
  Input: danh sách môn đăng ký kỳ này + GPA hiện tại + mục tiêu
  Output:
    - Dự báo GPA kỳ này nếu đạt mục tiêu
    - Cần học môn nào đạt A, môn nào B là đủ
    - Cảnh báo môn nào cần chú ý nhất (dựa trên predict từ ML)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Node.js — cập nhật aiService.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thêm 3 hàm mới:
  getGpaRoadmap(studentId, targetGpa):
    → Load StudentCurriculum của SV
    → Build GpaRoadmapRequest từ DB
    → Gọi POST /gpa-roadmap
    → Cache kết quả 1 giờ (tránh gọi lại quá nhiều)

  getRetakeRoadmap(studentId):
    → Load grades, lọc F và C
    → Load curriculum còn lại
    → Gọi POST /retake-roadmap

  getSemesterPlan(studentId, registeredClassIds):
    → Load điểm hiện tại
    → Gọi POST /semester-plan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend — features/roadmap/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trang /advisor/students/:id (tab "Lộ trình AI"):
  2 section:

  SECTION 1 — Lộ trình GPA:
    Header: 2 nút chọn mục tiêu:
      [Mục tiêu Giỏi GPA ≥ 3.2] [Mục tiêu Xuất sắc GPA ≥ 3.6]
      Nút active: nền navy

    Nếu isAchievable = true:
      Banner xanh: "✓ Có thể đạt được với kế hoạch học tập phù hợp"
    Nếu isAchievable = false:
      Banner vàng: "⚠ Cần nỗ lực rất cao — GPA cần đạt ở phần còn lại: X"

    Summary text: đoạn văn từ AI

    Bảng kế hoạch môn học:
    Cột: Môn học | Tín chỉ | Ưu tiên | Cần đạt | Học kỳ đề xuất | Lý do
    Màu theo priority:
      critical → badge đỏ "Cốt lõi"
      high → badge cam "Quan trọng"
      normal → badge xám "Thông thường"
    Target grade badge A/B màu xanh/lam

  SECTION 2 — Môn cần học lại:
    Chỉ hiện nếu có môn F hoặc C

    Subsection "Học lại ngay" (môn F):
      Card đỏ nhạt, icon alert-triangle
      List môn + lý do + học kỳ đề xuất

    Subsection "Nên cải thiện" (môn C):
      Card vàng nhạt, icon alert-circle
      List môn + benefit nếu cải thiện

    Timeline kế hoạch học lại:
      Hiển thị HK1 → HK2 → HK3 với môn cần học từng kỳ

Loading state: skeleton loader
Error state: "Không thể tải lộ trình. Vui lòng thử lại."
```

---

## 📊 CẬP NHẬT ERD — QUAN HỆ MỚI

```
Thêm vào tóm tắt quan hệ (sau khi hoàn thành tất cả bước):

Major        → Department (n:1), Curriculum (1-n), Student (1-n)
Curriculum   → Major (n:1), Subject (n:n qua items[])
StudentCurriculum → Student (1:1), Curriculum (n:1), User/Advisor (n:1)
Message      → User (n:1 sender), roomId (string key)
User         → thêm role 'advisor', advisingStudentIds[]
SchoolYear   → semesters có thêm HK3 isOptional
```

---

## 🛣️ CẬP NHẬT APP ROUTES (Angular)

```
Thêm vào app.routes.ts:

{ path: 'majors',      canActivate:[authGuard,adminGuard],
  loadComponent: () => import('./features/majors/...') }

{ path: 'curricula',   canActivate:[authGuard,adminGuard],
  loadComponent: () => import('./features/curricula/...') }

{ path: 'curricula/:id', canActivate:[authGuard,adminGuard],
  loadComponent: () => import('./features/curricula/detail/...') }

{ path: 'advisor',     canActivate:[authGuard,advisorGuard],
  loadComponent: () => import('./features/advisor/...') }

{ path: 'advisor/students/:id', canActivate:[authGuard,advisorGuard],
  loadComponent: () => import('./features/advisor/student-detail/...') }

{ path: 'chat',        canActivate:[authGuard],
  loadComponent: () => import('./features/chat/...') }

Tạo thêm:
  core/guards/advisor.guard.ts  — kiểm tra role === 'advisor' || 'admin'
  core/guards/admin.guard.ts    — kiểm tra role === 'admin'
```

---

## ✅ CHECKLIST TỔNG

```
Bước 1 — ERD:
□ Major model
□ Curriculum model (với items[])
□ StudentCurriculum model (với registrations[])
□ Message model
□ User model: thêm role 'advisor', advisingStudentIds
□ SchoolYear: thêm HK3 isOptional
□ Student: thêm majorId, enrolledYear

Bước 2 — Học kỳ 3 kỳ/năm:
□ Tất cả enum semester → [1,2,3]
□ Tất cả dropdown frontend có HK3
□ Badge "Hè" cho semester=3

Bước 3 — Chương trình khung:
□ API majors CRUD
□ API curricula CRUD + items
□ API student-curricula + tiến độ
□ curriculumService.calculateProgress()
□ UI trang /majors
□ UI trang /curricula/:id (timeline theo năm)
□ UI tiến độ SV (timeline với trạng thái môn)

Bước 4 — Cố vấn học tập:
□ Middleware advisorAccess
□ API phân SV cho cố vấn
□ UI sidebar cho role advisor
□ UI /advisor/students
□ UI /advisor/students/:id (3 tab)

Bước 5 — Chat WebSocket:
□ socket.io backend + JWT auth
□ socket.service.ts Angular
□ UI /chat (2 cột: rooms + window)
□ Badge unread trên sidebar + notification bell
□ Typing indicator

Bước 6 — AI Nâng cấp:
□ 3 endpoint FastAPI mới: /gpa-roadmap /retake-roadmap /semester-plan
□ Schemas Pydantic đầy đủ
□ Node.js aiService: 3 hàm mới + cache
□ UI lộ trình GPA (2 target button)
□ UI môn học lại (urgent + recommended)
□ Timeline kế hoạch học lại
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

```
1. Thực hiện ĐÚNG THỨ TỰ Bước 1→6:
   Bước 1 (ERD) là nền tảng cho tất cả bước sau.

2. Sau Bước 1: chạy lại seed data để có data test:
   npm run seed

3. Chat (Bước 5) cần cập nhật index.js backend:
   Đổi từ app.listen() sang httpServer.listen()
   const httpServer = require('http').createServer(app)
   const io = require('./socket')(httpServer)

4. AI Bước 6 KHÔNG train lại model ML — chỉ thêm
   endpoint tính toán thuần Python. Vẫn giữ model.pkl cũ.

5. Khi deploy: Socket.io cần sticky sessions nếu dùng
   nhiều instance — hiện tại 1 VPS thì không cần lo.
```

Update sau ngày 15/4
mã lớp riêng cho mỗi học sinh để cố vấn quản lý
gọi dự đoán cho lớp là mã lớp riêng gắn với mỗi sinh viên: 1 lớp sẽ có 60 sinh viên và 1 vố vấn học tập ví dụ như lớp 23DKTPM1A,1B,1C sẽ có 60 học sinh
logic gọi AI dự đoán ở lớp học phần như hiện tại là sai.
xây dựng lại tên lớp học phần cho đúng định dạng
ví dụ như học phần cơ sở lập trình sẽ có định dạng Mã lớp riêng + tên học phần: 23DKTPM-Cơ sở lập trình
