# Kịch bản thuyết trình — NTT Grade Manager

---

## SLIDE 1 — Trang bìa

**Nội dung slide:** Tên đề tài, logo trường, danh sách thành viên nhóm, GVHD

**Lời thuyết trình:**

> Kính chào thầy cô và các bạn. Nhóm em xin trình bày đề tài **"NTT Grade Manager — Hệ thống quản lý điểm số tích hợp trí tuệ nhân tạo"**, được xây dựng dành cho Trường Đại học Nguyễn Tất Thành.

> Thành viên nhóm gồm: _(điền tên thành viên)_ — dưới sự hướng dẫn của thầy/cô _(điền GVHD)_.

---

## SLIDE 2 — Mục lục

**Nội dung slide:**

- **A.** Tổng quan
- **B.** Chức năng & Phi chức năng
- **C.** Kiến trúc hệ thống & Công nghệ
- **D.** Phát triển & Khó khăn
- **E.** Demo

**Lời thuyết trình:**

> Bài thuyết trình gồm 6 phần. Nhóm sẽ đi theo thứ tự: tổng quan lý do và mục tiêu → chức năng hệ thống → kiến trúc kỹ thuật → công nghệ → quá trình phát triển → và demo trực tiếp.

---

## PHẦN A — TỔNG QUAN

### SLIDE 3 — Lý do chọn đề tài

**Nội dung slide:** 3 vấn đề thực tiễn + hướng giải quyết

| Vấn đề hiện tại                              | Hệ quả                                             |
| -------------------------------------------- | -------------------------------------------------- |
| Quản lý điểm qua Excel/sổ tay, rải rác       | Dễ nhầm lẫn, khó truy vết, mất thời gian           |
| Cố vấn theo dõi hàng trăm sinh viên thủ công | Không phát hiện kịp sinh viên có nguy cơ học yếu   |
| Thiếu kênh thông tin tập trung trong trường  | Thông báo, tin tức, nhắn tin bị phân tán nhiều nơi |

**Lời thuyết trình:**

> Trong quá trình học tại trường, nhóm em nhận thấy công tác quản lý điểm và hỗ trợ học tập còn rời rạc, một phần chưa được số hoá đồng bộ. Cố vấn học tập không có công cụ để phát hiện sớm sinh viên có nguy cơ rớt môn hay cải thiện GPA kịp thời.

> Từ bài nguyên nhân đó, nhóm em quyết định chọn đề tài quản lý sinh viên này với mục tiêu

---

### SLIDE 4 — Mục tiêu chính

**Nội dung slide:** 5 mục tiêu

| #   | Mục tiêu                                                                |
| --- | ----------------------------------------------------------------------- |
| 1   | Số hoá toàn bộ quy trình nhập điểm và quản lý lớp học                   |
| 2   | Tự động tính toán điểm số, xếp loại, GPA thang 4                        |
| 3   | Phát hiện sớm sinh viên có nguy cơ học yếu qua AI Machine Learning      |
| 4   | Chatbot AI hỗ trợ cố vấn tra cứu học lực và lập lộ trình GPA            |
| 5   | Xây dựng nền tảng giao tiếp nội bộ (chat, thông báo, tin tức) theo khoa |

**Lời thuyết trình:**

> Hệ thống hướng đến 5 mục tiêu cốt lõi. Đáng chú ý là mục tiêu 3 và 4 — đây là điểm khác biệt so với các hệ thống quản lý điểm thông thường: AI không chỉ dự đoán thụ động mà còn tích hợp chatbot để cố vấn có thể đặt câu hỏi bằng ngôn ngữ tự nhiên và nhận tư vấn cá nhân hoá dựa trên dữ liệu trong dự án.

---

## PHẦN B — CHỨC NĂNG & PHI CHỨC NĂNG

### SLIDE 5 — Chức năng (Functional Requirements)

**Nội dung slide:** Danh sách chức năng theo nhóm

| Nhóm             | Chức năng                                                                              |
| ---------------- | -------------------------------------------------------------------------------------- |
| Xác thực         | Đăng nhập hash theo(JWT), phân quyền 3 vai trò: Admin / Giảng viên / Cố vấn            |
| Quản lý hệ thống | Người dùng · Đơn vị (khoa/ngành) · Môn học · Lớp học · Sinh viên                       |
| Học vụ           | Chương trình đào tạo · Năm học · Đăng ký môn theo lộ trình                             |
| Điểm số          | Nhập điểm (TX · GK · TH · TKT) · Tính finalScore · GPA4 tự động                        |
| Dashboard        | Thống kê lớp · phân bố điểm · tỷ lệ đạt/rớt theo khoa/học kỳ, số sinh viên nguy cơ cao |
| lực              |
| Giao tiếp        | Nhắn tin nội bộ theo khoa · chat trực tiếp · thông báo realtime                        |
| Nội dung         | Tin tức · Thông báo toàn bộ giảng viên                                                 |
| Giám sát         | Nhật ký hệ thống (Audit Log) · tự xoá sau 90 ngày                                      |
| AI — Dự đoán     | Dự đoán học lực qua ML (RandomForest) · riskLevel · môn yếu                            |
| AI — Chatbot     | Chatbot RAG: lộ trình học cơ bản · tra cứu điểm dễ dàng với mssv                       |

**Lời thuyết trình:**

> Hệ thống gồm **10 nhóm chức năng** chính. Từ xác thực và phân quyền, quản lý toàn bộ danh mục học vụ, nhập điểm và tính toán tự động, cho đến Dashboard thống kê trực quan.

> Liệt kê từng nhóm có gì:
> đầu tiên là về nhóm xác thực: bao gồm đăng nhập mã hóa mật khẩu, chuẩn jwt, verify otp và phân quyền rõ ràng như admin/gv/cố vấn học tập
> Tiếp theo là nhóm quản lý hệ thống bao gồm các CRUD cơ bản về user, đơn vị như khoa/ ngành, môn học, lớp học, sinh viên

---

### SLIDE 6 — Phi chức năng (Non-Functional Requirements)

**Nội dung slide:** Bảng 7 tiêu chí

| Tiêu chí          | Giải pháp thực hiện                                                    |
| ----------------- | ---------------------------------------------------------------------- |
| Bảo mật           | JWT Bearer Token · bcrypt hash password · Role-based middleware        |
| Hiệu năng         | Route cache · server-side pagination · lazy loading module             |
| Realtime          | Socket.IO 4 — chat, thông báo tức thì                                  |
| Streaming AI      | SSE res.write() — phản hồi AI xuất hiện từng chữ, không chờ toàn bộ    |
| Khả năng mở rộng  | 3 service độc lập (Angular · Express · FastAPI) · dễ scale từng phần   |
| Upload file       | Multer — nhập điểm hàng loạt qua file Excel/CSV                        |
| Quan sát hệ thống | Audit Log toàn bộ thao tác · Dashboard theo dõi tỷ lệ đạt/rớt realtime |

**Lời thuyết trình:**

> Về phi chức năng, nhóm chú trọng 3 điểm:

> **Bảo mật**: JWT kiểm soát phiên, verify otp đăng nhập, bcrypt hash mật khẩu, mỗi role chỉ truy cập đúng phạm vi dữ liệu của mình qua middleware.

> **Realtime & Streaming**: Socket.IO cho chat tức thì; SSE cho phản hồi AI — người dùng thấy từng chữ xuất hiện ngay, không phải chờ toàn bộ câu trả lời.

> **Khả năng mở rộng**: Kiến trúc 3 service tách biệt, mỗi phần có thể scale độc lập mà không ảnh hưởng nhau.

---

## PHẦN C — KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ

### SLIDE 7 — Sơ đồ kiến trúc tổng thể

**Nội dung slide:** Diagram SystemArchitecture từ planuml.md

**Lời thuyết trình:**

> Kiến trúc gồm **3 tầng** chính:

> **Tầng Client**: Angular 21 SPA — port 4200. Giao tiếp với Backend qua HTTP REST API, nhận SSE cho AI stream, và WebSocket cho chat realtime.

> **Tầng Backend**: Express.js + Socket.IO — port 3000. Trung tâm điều phối: xử lý routes, gọi ragService lấy context từ MongoDB, định tuyến câu hỏi sang Gemini API hoặc Ollama VPS, gọi AI Engine khi có request gọi dự đoán.

> **Tầng AI & Data**: FastAPI (port 5000) xử lý Machine Learning;Gemini API và Ollama self-hosted VPS phục vụ 2 loại LLM.; MongoDB Atlas lưu toàn bộ 14 collection;

---

### SLIDE 8 — Công nghệ sử dụng

**Nội dung slide:** Bảng tóm tắt tech stack theo tầng

| Tầng      | Công nghệ                                                          |
| --------- | ------------------------------------------------------------------ |
| Frontend  | Angular 21 · Angular Material · TypeScript · SCSS · Chart.js 4     |
| Backend   | Node.js · Express.js 4 · Socket.IO 4 · JWT · bcryptjs · Mongoose 8 |
| AI Engine | FastAPI (Python) · scikit-learn · Gemini API · Ollama llama3.2     |
| Database  | MongoDB Atlas · Mongoose ODM                                       |
| Công cụ   | VSCode · Postman · Git & GitHub                                    |

**Lời thuyết trình:**

> Stack dự án chia theo 3 tầng. Frontend dùng Angular 21 với Material UI và Chart.js. Backend là Node.js + Express với Socket.IO cho realtime. AI Engine gồm FastAPI chạy scikit-learn cho ML prediction, Gemini API và Ollama LLaMA cho chatbot. Database là MongoDB Atlas trên cloud.

---

### SLIDE 9 — Use Case Diagram

**Nội dung slide:** Diagram UseCaseDiagram từ planuml.md

**Lời thuyết trình:**

> Sơ đồ Use Case có **4 actor**:

> - **Admin**: Toàn quyền hệ thống — cấu trúc tổ chức, người dùng, chương trình đào tạo, audit log.
> - **Giảng viên**: Quản lý lớp học, nhập điểm — khi lưu điểm hệ thống tự động tính toán và ghi log.
> - **Cố vấn học tập**: Trọng tâm của AI — xem điểm, kích hoạt dự đoán, xem lộ trình GPA, hỏi chatbot.
> - **Hệ thống**: Tự động chạy 3 tác vụ nền: tính điểm, ghi audit log, phát thông báo realtime.

---

### SLIDE 10 — ERD Phần 1: Cấu trúc học thuật

**Nội dung slide:** Diagram ERD_Part1 từ planuml.md

**Lời thuyết trình:**

> Database có **14 collection**, chia làm 2 sơ đồ. Phần 1 là **cấu trúc học thuật** — nền tảng dữ liệu:

> - **Cột trái**: Department (khoa) quản lý User (giảng viên, cố vấn).
> - **Cột giữa**: Department liên kết ra Major (ngành), Subject (môn học), SchoolYear (năm học).
> - **Cột phải**: Class là trung tâm — mỗi lớp học phần thuộc một môn, một năm học, một giảng viên. Curriculum định nghĩa lộ trình theo ngành. Student gắn với lớp chủ nhiệm và ngành học.

---

### SLIDE 11 — ERD Phần 2: Điểm số & Giao tiếp

**Nội dung slide:** Diagram ERD_Part2 từ planuml.md

**Lời thuyết trình:**

> Phần 2 là **luồng nghiệp vụ chính** — từ điểm số đến kết quả AI:

> - **Cột trái**: Student, Class, Curriculum, User — nguồn dữ liệu đầu vào.
> - **Cột giữa**: Grade lưu toàn bộ điểm; StudentCurriculum theo dõi tiến độ đăng ký môn — trạng thái: registered / completed / failed / retaking.
> - **Cột phải**: Prediction là output của AI — xếp loại, rủi ro, môn yếu; Message và News cho giao tiếp nội bộ; AuditLog ghi nhật ký với TTL 90 ngày.

> Quan hệ quan trọng: một Grade sau khi lưu sẽ trigger tạo Prediction tương ứng — cầu nối giữa điểm số thực và AI.

---

## PHẦN D — PHÁT TRIỂN & KHÓ KHĂN

### SLIDE 12 — Khó khăn gặp phải

**Nội dung slide:** 2 hệ AI trong dự án

**Nội dung slide:** Danh sách khó khăn chính

**Nội dung slide:** Danh sách khó khăn chính

| Khó khăn                       | Mô tả                                                                      |
| ------------------------------ | -------------------------------------------------------------------------- |
| AI khó tối ưu                  | Mô hình ML cần dữ liệu đa dạng; RAG phải calibrate ngưỡng intent detection |
| LLaMA VPS độ trễ cao           | Self-hosted Ollama trên VPS — latency lên đến 5-10 giây mỗi câu            |
| Gemini API quota               | Free tier bị giới hạn request/phút, dễ bị lỗi 429 khi test nhiều           |
| ERD phức tạp                   | 14 collection với nhiều quan hệ chéo — khó thiết kế tránh vòng lặp         |
| Streaming + Realtime song song | SSE và Socket.IO cùng lúc cần quản lý kết nối cẩn thận                     |

**Lời thuyết trình:**

> Nhóm gặp 2 khó khăn kỹ thuật lớn nhất: độ trễ của LLaMA tự host trên VPS, và quota giới hạn của Gemini API trong quá trình phát triển. Ngoài ra việc thiết kế RAG để phát hiện đúng ý định câu hỏi mất khá nhiều thời gian tinh chỉnh.

---

### SLIDE 13 — Cách khắc phục

**Nội dung slide:** Giải pháp tương ứng

| Khó khăn                | Cách khắc phục                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| LLaMA độ trễ cao        | Dùng SSE Streaming — người dùng thấy từng chữ ngay, không cảm nhận độ trễ full response           |
| Gemini quota 429        | Multi-model fallback chain: gemma-3-1b → 4b → 12b → 27b → flash-lite — tự chuyển khi hết quota    |
| AI intent detection sai | Tách riêng routerService với keyword matching + context history — phân loại 5 loại intent rõ ràng |
| ML dữ liệu ít           | Sinh dữ liệu tổng hợp bằng script generate_data.py với phân phối thực tế                          |
| Memory leak SSE         | Đăng ký req.on('close') để cleanup kết nối khi client ngắt kết nối giữa chừng                     |

**Lời thuyết trình:**

> Giải pháp hiệu quả nhất là **Streaming SSE** — thay vì đợi LLaMA trả về toàn bộ câu trả lời, hệ thống stream từng token ngay khi có. Người dùng thấy AI "đang gõ" nên không cảm nhận được độ trễ thực sự của model.

> Với Gemini, fallback chain giải quyết hoàn toàn vấn đề quota — hệ thống luôn có model sẵn sàng mà không cần báo lỗi cho người dùng.

---

### SLIDE 14 — Hướng phát triển

**Nội dung slide:** Roadmap tiếp theo

| Hướng             | Mô tả                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Mobile App        | Phiên bản React Native / Flutter cho sinh viên tra cứu điểm                      |
| Nâng cấp ML       | Train trên dữ liệu thực trường NTT · thêm feature: chuyên cần, kết quả rèn luyện |
| LLM tốt hơn       | Nâng cấp Ollama lên server mạnh hơn · hoặc fine-tune model theo domain giáo dục  |
| Push notification | FCM / Web Push cho thông báo điểm, cảnh báo rủi ro ra thiết bị di động           |
| Báo cáo PDF       | Xuất báo cáo học lực sinh viên theo học kỳ tự động                               |
| Tích hợp LMS      | Kết nối với hệ thống quản lý học tập hiện có của trường                          |

**Lời thuyết trình:**

> Hướng phát triển gần nhất là **Mobile App** để sinh viên trực tiếp tra cứu điểm và nhận cảnh báo học lực — hiện tại hệ thống chủ yếu phục vụ giảng viên và cố vấn.

> Về AI, khi có dữ liệu thực từ trường NTT, mô hình ML sẽ được train lại để độ chính xác cao hơn đáng kể so với dữ liệu tổng hợp hiện tại.

---

## PHẦN E — DEMO

### SLIDE 15 — Demo & Kết luận

**Nội dung slide:** Tóm tắt điểm nổi bật + chuyển sang demo trực tiếp

| Điểm nổi bật     |                                                     |
| ---------------- | --------------------------------------------------- |
| Số hoá nghiệp vụ | Nhập điểm → tính toán tự động → audit log           |
| AI tự động       | Lưu điểm → ML dự đoán ngay, không cần thao tác thêm |
| Chatbot RAG      | Trả lời dựa trên dữ liệu thực — không hallucinate   |
| Realtime         | Socket.IO + SSE — chat và AI stream tức thì         |
| Kiến trúc sạch   | 3 service độc lập · dễ bảo trì · dễ mở rộng         |

**Lời thuyết trình:**

> **NTT Grade Manager** giải quyết trọn vẹn bài toán từ ban đầu: số hoá quản lý điểm, phát hiện sớm sinh viên có nguy cơ, và hỗ trợ cố vấn bằng AI thực sự dựa trên dữ liệu trường.

> Nhóm em xin mời thầy cô xem phần demo trực tiếp. Sau đó nhóm sẵn sàng giải đáp các câu hỏi từ thầy cô.

---

_Tổng thời gian dự kiến: 20–25 phút_
_Phân bổ: Slide 1-2 (1 phút) → A Tổng quan (3 phút) → B Chức năng (4 phút) → C Kiến trúc & Công nghệ (6 phút) → D Phát triển (3 phút) → E Demo (5-8 phút)_
