# PlantUML Diagrams — NTT Grade Manager

---

## 1. Kiến trúc hệ thống (System Architecture)

```plantuml
@startuml SystemArchitecture
!theme plain
skinparam backgroundColor #FAFAFA
skinparam componentStyle rectangle
skinparam defaultFontName Arial

title Kiến trúc hệ thống — NTT Grade Manager

left to right direction

actor "Admin" as admin
actor "Giảng viên" as teacher
actor "Cố vấn" as advisor

package "Client — port 4200" #E8F4FD {
  component "[Angular 21 SPA]\nHTTP + SSE + WebSocket" as frontend
}

package "Backend — port 3000" #EDF7ED {
  component "[Express.js + Socket.IO]" as backend

  package "Routes" {
    component "auth / users / students\nclasses / grades / predictions\ncurricula / messages / chatbot / news" as routes
  }

  package "Services" {
    component "ragService" as rag
    component "geminiService" as gemini_svc
    component "llamaService" as llama_svc
    component "aiService" as ai_svc
  }
}

package "AI Engine — port 5000" #FFF3E0 {
  component "[FastAPI + scikit-learn]\nML Model (pickle)" as ai_engine
  component "POST /predict\nPOST /predict-all\nPOST /gpa-roadmap\nPOST /retake-roadmap\nPOST /semester-plan" as ai_routes
}

database "MongoDB Atlas\nstudent-ai-db" as mongo #F3E5F5

cloud "Gemini API (Google)\ngemma-3 / gemini-*\nSSE stream" as gemini_api #FCE4EC

cloud "Ollama VPS :11434\nllama3.2:1b\nSSE stream" as ollama #E3F2FD

admin --> frontend
teacher --> frontend
advisor --> frontend

frontend --> backend : HTTP REST\nSSE\nWebSocket

backend --> routes
routes --> rag
routes --> ai_svc

rag --> mongo : truy vấn context
ai_svc --> ai_engine : REST
ai_engine --> ai_routes

gemini_svc --> gemini_api : HTTPS SSE
llama_svc --> ollama : HTTP SSE

routes --> gemini_svc : roadmap /\nsubject_weak
routes --> llama_svc : general chat
routes --> mongo : CRUD

@enduml
```

---

## 2. Use Case Diagram

```plantuml
@startuml UseCaseDiagram
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName Arial
skinparam usecaseBorderColor #4F46E5
skinparam usecaseBackgroundColor #EEF2FF
skinparam actorBorderColor #1E3A5F
skinparam packageBorderColor #CBD5E1
skinparam packageBackgroundColor #F8FAFC

title Use Case — NTT Grade Manager

left to right direction

actor "Admin" as admin #FFE4E6
actor "Giảng viên" as teacher #D1FAE5
actor "Cố vấn" as advisor #DBEAFE
actor "Hệ thống" as system #FEF9C3

rectangle "NTT Grade Manager" {

  package "Quản trị" {
    usecase "Quản lý Khoa / Ngành\nNăm học" as mgmt_org
    usecase "Quản lý\nNgười dùng" as mgmt_user
    usecase "Quản lý Môn học\nCTDT" as mgmt_subject
    usecase "Xem Audit Log" as view_log
  }

  package "Lớp học & Điểm" {
    usecase "Quản lý\nLớp học phần" as mgmt_class
    usecase "Nhập / Sửa điểm" as enter_grade
    usecase "Xem thống kê lớp" as view_stats
  }

  package "Tư vấn sinh viên" {
    usecase "Xem danh sách\nsinh viên cố vấn" as view_students
    usecase "Xem điểm +\ndự đoán học lực" as view_predict
    usecase "Lộ trình GPA\n/ Dự đoán AI" as ai_roadmap
    usecase "Chatbot AI\nhỏi đáp học vụ" as chatbot
  }

  package "Giao tiếp & Tin tức" {
    usecase "Chat nội bộ\n(Khoa / Trực tiếp)" as chat
    usecase "Xem Tin tức" as news
  }

  package "Tự động" {
    usecase "Tính finalScore\n/ GPA4" as calc_grade
    usecase "Ghi Audit Log" as write_log
    usecase "Thông báo Realtime" as notify
  }
}

admin --> mgmt_org
admin --> mgmt_user
admin --> mgmt_subject
admin --> view_log
admin --> mgmt_class
admin --> enter_grade
admin --> chat

teacher --> mgmt_class
teacher --> enter_grade
teacher --> view_stats
teacher --> chat
teacher --> news

advisor --> view_students
advisor --> view_predict
advisor --> ai_roadmap
advisor --> chatbot
advisor --> chat
advisor --> news

system --> calc_grade
system --> write_log
system --> notify

enter_grade ..> calc_grade : <<include>>
enter_grade ..> write_log : <<include>>
ai_roadmap ..> write_log : <<include>>

@enduml
```

---

## 3. ERD — Phần 1: Cấu trúc học thuật

```plantuml
@startuml ERD_Part1
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName Arial
skinparam entityBackgroundColor #EEF2FF
skinparam entityBorderColor #6366F1
skinparam nodesep 60
skinparam ranksep 90
skinparam defaultFontSize 11

scale max 1920 width
scale max 1080 height

title ERD (1/2) — Cấu trúc học thuật

left to right direction

' ===== CỘT 1 =====
together {
  entity "Department" as dept {
    * _id : ObjectId
    --
    code : String <<unique>>
    name : String
    headId : ObjectId <<FK User>>
  }
  entity "User" as user {
    * _id : ObjectId
    --
    email : String <<unique>>
    role : admin|teacher|advisor
    departmentIds : ObjectId[]
  }
}

' ===== CỘT 2 =====
together {
  entity "Major" as major {
    * _id : ObjectId
    --
    code : String <<unique>>
    departmentId : ObjectId <<FK>>
    totalCredits : Number
  }
  entity "SchoolYear" as sy {
    * _id : ObjectId
    --
    name : String <<unique>>
    semesters : embedded[]
    isCurrent : Boolean
  }
  entity "Subject" as subject {
    * _id : ObjectId
    --
    code : String <<unique>>
    departmentId : ObjectId <<FK>>
    credits : Number
    weights : {tx,gk,th,tkt}
  }
}

' ===== CỘT 3 =====
together {
  entity "Curriculum" as curriculum {
    * _id : ObjectId
    --
    majorId : ObjectId <<FK>>
    cohort : String
    items[] : {subjectId, year, semester}
  }
  entity "Class" as cls {
    * _id : ObjectId
    --
    code : String
    subjectId : ObjectId <<FK>>
    schoolYearId : ObjectId <<FK>>
    teacherId : ObjectId <<FK User>>
  }
  entity "Student" as student {
    * _id : ObjectId
    --
    studentCode : String <<unique>>
    classId : ObjectId <<FK>>
    majorId : ObjectId <<FK>>
    status : active|inactive|transferred
  }
}

dept ||--o{ user : ""
dept ||--o{ major : ""
dept ||--o{ subject : ""
dept ||--o{ cls : ""

major ||--o{ curriculum : ""
major ||--o{ student : ""

sy ||--o{ cls : ""
subject ||--o{ cls : ""
user }o--|| cls : "teacherId"
student }o--|| cls : ""

@enduml
```

---

## 4. ERD — Phần 2: Điểm số & Giao tiếp

```plantuml
@startuml ERD_Part2
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName Arial
skinparam entityBackgroundColor #FFF7ED
skinparam entityBorderColor #F59E0B
skinparam nodesep 60
skinparam ranksep 90
skinparam defaultFontSize 11

scale max 1920 width
scale max 1080 height

title ERD (2/2) — Điểm số & Giao tiếp

left to right direction

' ===== CỘT 1: Nguồn =====
together {
  entity "Student" as student {
    * _id : ObjectId
    --
    studentCode : String <<unique>>
    majorId : ObjectId <<FK>>
    classId : ObjectId <<FK>>
  }
  entity "Class" as cls {
    * _id : ObjectId
    --
    code : String
    subjectId : ObjectId <<FK>>
    schoolYearId : ObjectId <<FK>>
  }
  entity "Curriculum" as curriculum {
    * _id : ObjectId
    --
    majorId : ObjectId <<FK>>
    cohort : String
  }
  entity "User" as user {
    * _id : ObjectId
    --
    role : admin|teacher|advisor
  }
}

' ===== CỘT 2: Giao dịch =====
together {
  entity "Grade" as grade {
    * _id : ObjectId
    --
    studentId : ObjectId <<FK>>
    classId : ObjectId <<FK>>
    subjectId : ObjectId <<FK>>
    schoolYearId : ObjectId <<FK>>
    finalScore : Number
    gpa4 : Number
    letterGrade : A|B|C|D|F
  }
  entity "StudentCurriculum" as sc {
    * _id : ObjectId
    --
    studentId : ObjectId <<FK>>
    curriculumId : ObjectId <<FK>>
    registrations[] : {classId,\nstatus, gradeId, gpa4}
  }
}

' ===== CỘT 3: Kết quả & Log =====
together {
  entity "Prediction" as pred {
    * _id : ObjectId
    --
    studentId : ObjectId <<FK>>
    gradeId : ObjectId <<FK>>
    predictedRank : Giỏi|Khá|TB|Yếu
    riskLevel : low|medium|high
    weakSubjects : String[]
  }
  entity "Message" as msg {
    * _id : ObjectId
    --
    roomId : String
    senderId : ObjectId <<FK User>>
    messageType : text|image|form
  }
  entity "News" as news {
    * _id : ObjectId
    --
    title : String
    authorId : ObjectId <<FK User>>
    publishedAt : Date
  }
  entity "AuditLog" as audit {
    * _id : ObjectId
    --
    userId : ObjectId <<FK User>>
    action : CREATE|UPDATE|DELETE|...
    createdAt : Date <<TTL 90d>>
  }
}

student ||--o{ grade : ""
student ||--o{ pred : ""
student ||--|| sc : ""

cls ||--o{ grade : ""
curriculum ||--o{ sc : ""

grade ||--o| pred : ""

user ||--o{ msg : "senderId"
user ||--o{ news : "authorId"
user ||--o{ audit : ""

@enduml
```

---

## 5. Sequence — Chatbot AI (RAG + LLM)

```plantuml
@startuml SequenceChatbot
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName Arial
skinparam sequenceMessageAlign center
skinparam maxMessageSize 120
skinparam sequenceBoxBackgroundColor #F8FAFC
skinparam sequenceParticipantBackgroundColor #EEF2FF
skinparam sequenceParticipantBorderColor #6366F1
skinparam responseMessageBelowArrow true

title Sequence Diagram — Chatbot AI (RAG + LLM)

actor "Cố vấn / User" as user
participant "Frontend\n(Angular)" as fe
participant "Backend\n/api/chatbot" as be
participant "ragService" as rag
database "MongoDB" as db
participant "geminiService\n(Gemini API)" as gemini
participant "llamaService\n(Ollama VPS)" as llama

user -> fe : Nhập câu hỏi
fe -> be : POST /message\n{ messages[], roomId }
activate be

be -> rag : detectIntent(lastMessage)
rag --> be : intent (roadmap / grade_query / general / ...)

be -> rag : fetchContextData(intent, studentCode)
rag -> db : query Student, Grade,\nPrediction, Curriculum
db --> rag : raw data
rag --> be : ragContext (buildContextString)

alt intent = roadmap | subject_weak
  be -> gemini : chatWithGemini(ragContext, question)
  activate gemini
  gemini --> be : SSE text chunks (stream)
  deactivate gemini
  be --> fe : SSE stream (text/event-stream)

else intent = student_info | grade_query | risk_alert | department_stats
  be -> be : streamDirect(ragContext)
  be --> fe : SSE stream (direct DB data)

else general chat
  be -> llama : chatWithLlama(messages + context)
  activate llama
  llama --> be : SSE text chunks (stream)
  deactivate llama
  be --> fe : SSE stream (text/event-stream)
end

fe --> user : Hiển thị từng chunk (streaming)
deactivate be

@enduml
```

---

## 6. Sequence — Nhập Điểm & Dự Đoán AI

```plantuml
@startuml SequenceGrade
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName Arial
skinparam sequenceMessageAlign center
skinparam maxMessageSize 120
skinparam sequenceBoxBackgroundColor #F8FAFC
skinparam sequenceParticipantBackgroundColor #ECFDF5
skinparam sequenceParticipantBorderColor #10B981
skinparam responseMessageBelowArrow true

title Sequence Diagram — Nhập Điểm & Dự Đoán AI

actor "Giảng viên" as teacher
participant "Frontend\n(Angular)" as fe
participant "Backend\n/api/grades" as be
participant "aiService" as ai_svc
participant "AI Engine\n(FastAPI)" as ai_engine
database "MongoDB" as db

teacher -> fe : Nhập TX / GK / TH / TKT
fe -> be : PUT /api/grades/:id\n{ txScores, gkScore, tktScore }
activate be

be -> be : tính txAvg, thAvg
be -> be : tính finalScore\n(theo weights)
be -> be : tính GPA4\n(thang 4)

be -> db : save Grade
db --> be : Grade saved

be -> ai_svc : predictForGrade(grade, student)
ai_svc -> ai_engine : POST /predict\n{ scores, finalScore, gpa4,\n  diem_hk_truoc, so_buoi_vang }
activate ai_engine
ai_engine -> ai_engine : ML model.predict()
ai_engine -> ai_engine : calibrate_confidence()
ai_engine -> ai_engine : infer_risk_level()
ai_engine --> ai_svc : { predictedRank, confidence,\n  riskLevel, weakSubjects }
deactivate ai_engine

ai_svc -> db : save / update Prediction
db --> ai_svc : Prediction saved
ai_svc --> be : prediction result

be --> fe : { grade, prediction }
fe --> teacher : Hiển thị điểm + xếp loại AI

@enduml
```

---

## 7. Sequence — Đăng nhập & Phân quyền

```plantuml
@startuml SequenceAuth
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName Arial
skinparam sequenceMessageAlign center
skinparam maxMessageSize 120
skinparam sequenceBoxBackgroundColor #F8FAFC
skinparam sequenceParticipantBackgroundColor #FFF7ED
skinparam sequenceParticipantBorderColor #F59E0B
skinparam responseMessageBelowArrow true

title Sequence Diagram — Đăng nhập & Phân quyền JWT

actor "Người dùng" as user
participant "Frontend\n(Angular)" as fe
participant "Backend\n/api/auth" as be
database "MongoDB" as db

user -> fe : Nhập email / password
fe -> be : POST /api/auth/login
activate be

be -> db : User.findOne({ email })
db --> be : User document (với password hash)

be -> be : bcrypt.compare(password, hash)

alt Mật khẩu đúng
  be -> be : jwt.sign({ id, role }, JWT_SECRET)
  be -> db : update lastLogin
  be --> fe : { token, user: { id, name, role, ... } }
  fe -> fe : lưu token vào localStorage
  fe --> user : Redirect → Dashboard

else Mật khẩu sai
  be --> fe : 401 Unauthorized
  fe --> user : Hiển thị lỗi
end

deactivate be

== Gọi API có bảo vệ ==

user -> fe : Thao tác cần quyền
fe -> be : Request + Authorization: Bearer <token>
activate be
be -> be : jwt.verify(token)
be -> db : User.findById(payload.id)
db --> be : User (role, departmentIds)

alt role hợp lệ (auth / adminOnly / advisorAccess)
  be --> fe : 200 + dữ liệu
else Không đủ quyền
  be --> fe : 403 Forbidden
end
deactivate be

@enduml
```
