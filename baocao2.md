## Mô tả đề tài

Hệ thống Quản lý Điểm học sinh được xây dựng nhằm hỗ trợ nhà trường trong việc theo dõi, đánh giá và phân tích kết quả học tập của học sinh một cách toàn diện. Hệ thống không chỉ đơn giản là nơi lưu trữ điểm số mà còn tích hợp công nghệ trí tuệ nhân tạo (AI) để dự đoán học lực và cảnh báo sớm rủi ro học tập, giúp giáo viên và cố vấn học tập can thiệp kịp thời trước khi học sinh rơi vào tình trạng yếu kém.
Ngoài ra, hệ thống còn tích hợp tính năng nhắn tin theo thời gian thực (real-time chat) giữa các giảng viên trong cùng khoa, tạo kênh trao đổi thông tin nhanh chóng mà không cần dùng đến ứng dụng bên ngoài. Để đáp ứng đầy đủ nghiệp vụ của một trường đại học, hệ thống được thiết kế với phân quyền rõ ràng cho ba nhóm người dùng chính:

**Đối với Quản trị viên (Admin):**

Quản lý người dùng hệ thống (admin, giảng viên, cố vấn học tập)
Quản lý danh mục: khoa, ngành học, lớp học, môn học, năm học
Quản lý chương trình đào tạo theo từng ngành, từng năm, từng học kỳ
Xem dashboard tổng quan: tổng số học sinh, lớp học, tỉ lệ học lực toàn trường
Quản lý dữ liệu điểm toàn hệ thống và theo dõi cảnh báo rủi ro

**Đối với Giảng viên (Teacher):**

Quản lý danh sách học sinh theo lớp và khoa được phân công
Nhập điểm thủ công hoặc nhập hàng loạt qua file Excel/CSV (hỗ trợ thành phần điểm: TX, GK, TH, TKT)
Tải file mẫu nhập điểm được điền sẵn danh sách học sinh theo lớp
Xem và quản lý kết quả dự đoán học lực của từng học sinh
Kích hoạt dự đoán AI cho toàn lớp sau khi nhập điểm
Chat nội bộ theo phòng khoa (real-time)

**Đối với Cố vấn học tập (Advisor):**

Xem danh sách và hồ sơ chi tiết học sinh được phân công cố vấn
Theo dõi tiến độ học tập: điểm từng môn, GPA từng học kỳ, biểu đồ kết quả
Xem lộ trình GPA mục tiêu và danh sách môn cần học lại (roadmap)
Nhận cảnh báo học sinh có rủi ro cao (nguy cơ học lực yếu)
Chat trực tiếp (direct message) với giảng viên khác

**Tính năng tích hợp AI:**

- Mô hình Random Forest được huấn luyện trên dữ liệu điểm theo môn học, điểm học kỳ trước, số buổi vắng, hạnh kiểm
- Dự đoán xếp loại học lực: Giỏi / Khá / Trung Bình / Yếu
- Đánh giá mức độ rủi ro: thấp / trung bình / cao
- Gợi ý môn học yếu cần cải thiện và các đề xuất cụ thể
- Lập lộ trình GPA và kế hoạch học lại theo học kỳ
- Engine AI chạy độc lập bằng Python / FastAPI, giao tiếp với backend Node.js qua HTTP

Hệ thống được xây dựng trên kiến trúc ba tầng (Three-tier Architecture) với frontend Angular 21, backend Node.js/Express, cơ sở dữ liệu MongoDB và AI engine Python/FastAPI, đảm bảo khả năng mở rộng và bảo trì lâu dài.
