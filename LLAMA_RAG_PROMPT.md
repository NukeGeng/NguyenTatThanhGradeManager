# 🔍 LLAMA_RAG_PROMPT.md — Llama truy cập data MongoDB (RAG)

> Không cần vector DB, không cần embedding.
> Phân tích câu hỏi → query MongoDB → nhét data vào prompt → Llama trả lời.
> Dán BUGS.md + DONE.md vào đầu prompt trước khi gửi.

---

## 🔵 PROMPT — Nâng cấp llamaService.js để truy cập data MongoDB

```
[TEMPLATE CHUẨN DỰ ÁN]

Nâng cấp src/services/llamaService.js hiện có.
Thêm khả năng RAG: tự động truy vấn MongoDB dựa trên câu hỏi,
nhét data thật vào prompt trước khi gọi Llama.
KHÔNG sửa phần gọi Ollama API, chỉ THÊM các hàm mới.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM FILE: src/services/ragService.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Import các model cần thiết:
  const Student    = require("../models/Student")
  const Grade      = require("../models/Grade")
  const Prediction = require("../models/Prediction")
  const Class      = require("../models/Class")
  const Department = require("../models/Department")
  const Subject    = require("../models/Subject")

════════════════════════════════════
PHẦN 1 — Intent Detector
Phân tích câu hỏi để biết cần query data gì
════════════════════════════════════

Export hàm detectIntent(message):
  Phân tích message bằng regex + keyword matching,
  trả về object: { intents: string[], entities: object }

  Danh sách intent và keyword tương ứng:
  ┌─────────────────────────────────────────────────────────────┐
  │ Intent              │ Keywords                              │
  ├─────────────────────────────────────────────────────────────┤
  │ "student_info"      │ sinh viên, học sinh, em, sv, mã sv    │
  │ "grade_query"       │ điểm, gpa, kết quả, xếp loại, học lực│
  │ "risk_alert"        │ rủi ro, nguy cơ, cảnh báo, yếu, F    │
  │ "class_info"        │ lớp, lớp học, học phần, hp            │
  │ "department_stats"  │ khoa, thống kê, tổng, toàn khoa       │
  │ "roadmap"           │ lộ trình, cải thiện, tăng gpa, mục tiêu│
  │ "subject_weak"      │ môn yếu, học lại, cải thiện môn       │
  │ "curriculum"        │ chương trình, ctđt, tín chỉ, ngành    │
  └─────────────────────────────────────────────────────────────┘

  Trích xuất entities từ message:
    studentCode: regex /\b\d{6,10}\b/  → mã SV
    studentName: nếu có tên người VN (Nguyễn/Trần/Lê... + họ tên)
    className:   regex /lớp\s+\S+/i
    semester:    regex /học kỳ\s*(\d)/i → số HK
    targetGpa:   regex /(\d+[.,]\d+)/ khi có "mục tiêu", "đạt", "lên"
    limit:       regex /top\s*(\d+)/ hoặc /(\d+)\s*sinh viên/

  Ví dụ output:
    detectIntent("sinh viên 0001234 điểm học kỳ 1 như nào?")
    → { intents: ["student_info","grade_query"], entities: { studentCode: "0001234", semester: 1 } }

════════════════════════════════════
PHẦN 2 — Data Fetcher
Query MongoDB theo intent
════════════════════════════════════

Export hàm fetchContextData(intents, entities, userContext):
  userContext = { userId, role, departmentIds }  ← từ JWT để filter đúng quyền

  Trả về object context chứa data thật từ DB.
  Mỗi intent có 1 query riêng. Chạy song song bằng Promise.all.

  --- Intent: student_info ---
  let query = {}
  if entities.studentCode → query.studentCode = entities.studentCode
  if entities.studentName → query.fullName = { $regex: entities.studentName, $options: "i" }
  // Giáo viên chỉ thấy SV trong khoa mình
  if userContext.role === "teacher" → query.departmentId = { $in: userContext.departmentIds }
  const students = await Student.find(query).limit(entities.limit || 5)
    .populate("classId", "name code")
    .populate("majorId", "name code")
    .lean()
  context.students = students.map(s => ({
    maSV:   s.studentCode,
    hoTen:  s.fullName,
    lop:    s.classId?.name,
    nganh:  s.majorId?.name,
    trangThai: s.status,
  }))

  --- Intent: grade_query ---
  // Lấy điểm của SV tìm được ở trên hoặc theo classId
  const studentIds = context.students?.map(s => s._id) || []
  const gradeQuery = { studentId: { $in: studentIds } }
  if entities.semester → gradeQuery.semester = entities.semester
  const grades = await Grade.find(gradeQuery)
    .populate("studentId", "fullName studentCode")
    .populate("classId", "name subjectName")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
  context.grades = grades.map(g => ({
    maSV:      g.studentId?.studentCode,
    hoTen:     g.studentId?.fullName,
    monHoc:    g.classId?.subjectName || g.classId?.name,
    diemTK:    g.finalScore,
    gpa4:      g.gpa4,
    xepLoai:   g.letterGrade,
    hocKy:     g.semester,
  }))

  --- Intent: risk_alert ---
  const alertQuery = { riskLevel: "high" }
  if userContext.role === "teacher":
    // Chỉ lấy SV trong lớp GV đang phụ trách
    const myClasses = await Class.find({ teacherId: userContext.userId }, "_id")
    alertQuery["classId"] = { $in: myClasses.map(c => c._id) }
  const alerts = await Prediction.find(alertQuery)
    .populate("studentId", "fullName studentCode")
    .populate("classId", "name subjectName")
    .sort({ createdAt: -1 })
    .limit(entities.limit || 10)
    .lean()
  context.riskAlerts = alerts.map(a => ({
    maSV:       a.studentId?.studentCode,
    hoTen:      a.studentId?.fullName,
    lop:        a.classId?.name,
    duDoan:     a.predictedRank,
    ruiRo:      a.riskLevel,
    monYeu:     a.weakSubjects?.join(", "),
  }))

  --- Intent: class_info ---
  const classQuery = {}
  if entities.className → classQuery.name = { $regex: entities.className, $options: "i" }
  if userContext.role === "teacher" → classQuery.teacherId = userContext.userId
  const classes = await Class.find(classQuery)
    .populate("subjectId", "name credits")
    .limit(5).lean()
  context.classes = classes.map(c => ({
    maLop:      c.code,
    tenLop:     c.name,
    monHoc:     c.subjectId?.name,
    siSo:       c.studentCount,
    hocKy:      c.semester,
  }))

  --- Intent: department_stats (Admin only) ---
  if userContext.role !== "admin" → bỏ qua intent này
  const depts = await Department.find({ isActive: true }).lean()
  const stats = await Promise.all(depts.map(async d => {
    const studentCount = await Student.countDocuments({ departmentId: d._id })
    const highRisk     = await Prediction.countDocuments({ riskLevel: "high", departmentId: d._id })
    return { khoa: d.name, sinhVien: studentCount, nguyCoCao: highRisk }
  }))
  context.departmentStats = stats

  --- Intent: curriculum ---
  if context.students?.length > 0:
    const StudentCurriculum = require("../models/StudentCurriculum")
    const sc = await StudentCurriculum.findOne({ studentId: context.students[0]._id })
      .populate("curriculumId").lean()
    if sc:
      const completed = sc.registrations?.filter(r => r.status === "completed").length || 0
      const total     = sc.curriculumId?.items?.length || 0
      context.curriculum = {
        tenCTDT:       sc.curriculumId?.name,
        tinChiYeuCau:  sc.curriculumId?.totalCredits,
        monDaHoan:     completed,
        tongMon:       total,
        tienDo:        total > 0 ? `${Math.round(completed/total*100)}%` : "N/A",
      }

  return context

════════════════════════════════════
PHẦN 3 — Context Builder
Chuyển data thô thành đoạn văn context cho Llama
════════════════════════════════════

Export hàm buildContextString(contextData):
  Chuyển object data thành string ngắn gọn, dễ đọc cho Llama.

  let parts = []

  if contextData.students?.length:
    parts.push("THÔNG TIN SINH VIÊN:")
    contextData.students.forEach(s =>
      parts.push(`  - ${s.hoTen} (${s.maSV}) | Lớp: ${s.lop} | Ngành: ${s.nganh} | TT: ${s.trangThai}`)
    )

  if contextData.grades?.length:
    parts.push("KẾT QUẢ HỌC TẬP:")
    contextData.grades.forEach(g =>
      parts.push(`  - ${g.hoTen} (${g.maSV}) | ${g.monHoc} HK${g.hocKy}: ${g.diemTK} điểm | ${g.xepLoai} (GPA4: ${g.gpa4})`)
    )

  if contextData.riskAlerts?.length:
    parts.push(`CẢNH BÁO RỦI RO (${contextData.riskAlerts.length} SV nguy cơ cao):`)
    contextData.riskAlerts.forEach(a =>
      parts.push(`  - ${a.hoTen} (${a.maSV}) | ${a.lop} | Dự đoán: ${a.duDoan} | Môn yếu: ${a.monYeu}`)
    )

  if contextData.classes?.length:
    parts.push("THÔNG TIN LỚP HỌC:")
    contextData.classes.forEach(c =>
      parts.push(`  - ${c.maLop}: ${c.tenLop} | Môn: ${c.monHoc} | Sĩ số: ${c.siSo} | HK${c.hocKy}`)
    )

  if contextData.departmentStats?.length:
    parts.push("THỐNG KÊ THEO KHOA:")
    contextData.departmentStats.forEach(d =>
      parts.push(`  - ${d.khoa}: ${d.sinhVien} SV | Nguy cơ cao: ${d.nguyCoHigh}`)
    )

  if contextData.curriculum:
    const c = contextData.curriculum
    parts.push(`TIẾN ĐỘ CTĐT: ${c.tenCTDT} | Đã hoàn thành ${c.monDaHoan}/${c.tongMon} môn (${c.tienDo}) | Yêu cầu ${c.tinChiYeuCau} TC`)

  if parts.length === 0:
    return ""  // không có data → không thêm context

  return "=== DỮ LIỆU TỪ HỆ THỐNG ===\n" + parts.join("\n") + "\n=========================="

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SỬA src/routes/chatbot.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Import ragService:
  const { detectIntent, fetchContextData, buildContextString } = require("../services/ragService")

Sửa POST /api/chatbot/message, thêm RAG vào đầu handler:

  // Lấy tin nhắn cuối cùng của user
  const lastUserMsg = messages.filter(m => m.role === "user").pop()

  // 1. Phát hiện intent và entity
  const { intents, entities } = detectIntent(lastUserMsg.content)

  // 2. Query data nếu có intent liên quan đến data
  let contextString = ""
  const dataIntents = ["student_info","grade_query","risk_alert","class_info","department_stats","curriculum"]
  if (intents.some(i => dataIntents.includes(i))):
    try:
      const userContext = {
        userId:        req.user.id,
        role:          req.user.role,
        departmentIds: req.user.departmentIds || [],
      }
      const contextData  = await fetchContextData(intents, entities, userContext)
      contextString      = buildContextString(contextData)
    catch (err):
      console.error("[RAG] Lỗi query data:", err.message)
      // Không fail — vẫn tiếp tục với prompt không có context

  // 3. Inject context vào messages trước khi gọi Llama
  // Thêm 1 message "system" tạm thời chứa context
  const messagesWithContext = contextString
    ? [
        ...messages.slice(0, -1),  // tất cả trừ tin cuối
        {
          role: "user",
          content: contextString + "\n\nCâu hỏi: " + lastUserMsg.content
        }
      ]
    : messages

  // 4. Gọi Llama với messages đã có context
  await chatWithLlama(messagesWithContext, (chunk) => {
    res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
  })
  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`)
  res.end()
```

---

## 💬 Ví dụ prompt được gửi đến Llama

**User hỏi:** "Sinh viên Nguyễn Văn An điểm như thế nào?"

**Prompt thực tế gửi Llama:**
```
=== DỮ LIỆU TỪ HỆ THỐNG ===
THÔNG TIN SINH VIÊN:
  - Nguyễn Văn An (0000001234) | Lớp: CNTT01 | Ngành: KTPM | TT: active
KẾT QUẢ HỌC TẬP:
  - Nguyễn Văn An (0000001234) | Lập trình cơ bản HK1: 7.5 điểm | B (GPA4: 3.0)
  - Nguyễn Văn An (0000001234) | Cơ sở dữ liệu HK1: 4.2 điểm | F (GPA4: 0.0)
==========================

Câu hỏi: Sinh viên Nguyễn Văn An điểm như thế nào?
```

**Llama trả lời dựa trên data thật**, không bịa.

---

## ✅ CHECKLIST

```
□ ragService.js tạo mới với 3 hàm: detectIntent, fetchContextData, buildContextString
□ detectIntent nhận dạng đúng intent từ tiếng Việt
□ fetchContextData filter đúng quyền (teacher chỉ thấy khoa mình)
□ buildContextString tạo text ngắn gọn phù hợp context window 2048 token
□ chatbot.js inject context trước khi gọi Llama
□ Nếu RAG query lỗi → vẫn trả lời bình thường (không crash)
□ Context string không vượt quá ~800 token (~3200 ký tự)

Test:
  Hỏi: "Có bao nhiêu sinh viên nguy cơ cao?"
  → Llama trả lời con số thật từ DB

  Hỏi: "Lớp CNTT01 có bao nhiêu người?"
  → Llama trả lời sĩ số thật

  Hỏi: "Thời tiết hôm nay thế nào?"
  → Không có intent data → Llama tự trả lời bình thường
```
