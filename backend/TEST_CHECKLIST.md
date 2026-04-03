# TEST CHECKLIST - BACKEND (POSTMAN)

## AUTH

| Method | Endpoint           | Body                                                                                                                                         | Expected Response                                                                      |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| POST   | /api/auth/register | { "name": "Teacher Test", "email": "gvtest@nttu.edu.vn", "password": "Teacher@123", "role": "teacher", "departmentIds": ["<departmentId>"] } | 201, success=true, trả user mới (không trả password) hoặc 404 nếu route chưa implement |
| POST   | /api/auth/login    | { "email": "admin@nttu.edu.vn", "password": "Admin@123" }                                                                                    | 200, success=true, có token JWT + thông tin user                                       |
| POST   | /api/auth/login    | { "email": "admin@nttu.edu.vn", "password": "SaiMatKhau123" }                                                                                | 401, success=false, message báo sai thông tin đăng nhập                                |
| GET    | /api/auth/me       | Không body, Header: Authorization Bearer <token_hợp_lệ>                                                                                      | 200, success=true, trả đúng user hiện tại + departmentIds                              |
| GET    | /api/auth/me       | Không body, Header: Authorization Bearer <token_hết_hạn>                                                                                     | 401, success=false, message "Invalid or expired token"                                 |

## STUDENTS

| Method | Endpoint                        | Body                                                                                                  | Expected Response                                                            |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| POST   | /api/students                   | { "fullName": "Nguyen Van A", "gender": "male", "classId": "<classId>", "parentPhone": "0900000001" } | 201, success=true, studentCode tự tăng dạng HS0001..., class.studentCount +1 |
| GET    | /api/students                   | Không body                                                                                            | 200, success=true, trả danh sách học sinh                                    |
| GET    | /api/students?classId=<classId> | Không body                                                                                            | 200, success=true, chỉ trả học sinh thuộc classId đã lọc                     |
| GET    | /api/students/:id               | Không body                                                                                            | 200, success=true, trả chi tiết học sinh theo id                             |
| PUT    | /api/students/:id               | { "fullName": "Nguyen Van A Updated", "status": "inactive" }                                          | 200, success=true, dữ liệu học sinh được cập nhật                            |
| DELETE | /api/students/:id               | Không body                                                                                            | 200, success=true, xóa thành công, class.studentCount -1                     |

## CLASSES

| Method | Endpoint         | Body                                                                                                                                                                  | Expected Response                     |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| POST   | /api/classes     | { "code": "012307749599", "subjectId": "<subjectId>", "departmentId": "<departmentId>", "schoolYearId": "<schoolYearId>", "semester": 1, "teacherId": "<teacherId>" } | 201, success=true, tạo lớp thành công |
| GET    | /api/classes     | Không body                                                                                                                                                            | 200, success=true, trả danh sách lớp  |
| GET    | /api/classes/:id | Không body                                                                                                                                                            | 200, success=true, trả chi tiết lớp   |
| PUT    | /api/classes/:id | { "teacherId": "<teacherId_moi>", "isActive": true }                                                                                                                  | 200, success=true, lớp được cập nhật  |
| DELETE | /api/classes/:id | Không body                                                                                                                                                            | 200, success=true, xóa lớp thành công |

## GRADES

| Method | Endpoint                                                          | Body                                                                                                                          | Expected Response                                                               |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| POST   | /api/grades                                                       | { "studentId": "<studentId>", "classId": "<classId>", "txScores": [8, 7, 9], "gkScore": 7.5, "thScores": [8], "tktScore": 8 } | 201, success=true, tạo bảng điểm, finalScore/gpa4/letterGrade được tính tự động |
| POST   | /api/grades                                                       | { "studentId": "<studentId>", "classId": "<classId>", "txScores": [6, 6, 7], "gkScore": 6.5, "tktScore": 6 }                  | 409, success=false, báo lỗi trùng bảng điểm trong cùng kỳ/lớp                   |
| PUT    | /api/grades/:id                                                   | { "txScores": [9, 9, 8], "gkScore": 8.5, "tktScore": 9 }                                                                      | 200, success=true, average/finalScore/gpa4/letterGrade tự tính lại              |
| GET    | /api/grades/student/:studentId                                    | Không body                                                                                                                    | 200, success=true, trả lịch sử điểm của học sinh                                |
| GET    | /api/grades/class/:classId?semester=1&schoolYearId=<schoolYearId> | Không body                                                                                                                    | 200, success=true, trả điểm cả lớp đúng bộ lọc                                  |

## PREDICTIONS

| Method | Endpoint                            | Body                                                  | Expected Response                                                   |
| ------ | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| POST   | /api/predictions/predict            | { "gradeId": "<gradeId_hợp_lệ>" }                     | 201, success=true, trả prediction và lưu vào DB                     |
| POST   | /api/predictions/predict            | { "gradeId": "661111111111111111111111" }             | 404, success=false, message "Grade not found"                       |
| POST   | /api/predictions/predict            | { "gradeId": "<gradeId_hợp_lệ>" } (khi AI Engine tắt) | 500, success=false, message chứa lỗi gọi AI Engine                  |
| GET    | /api/predictions/student/:studentId | Không body                                            | 200, success=true, trả lịch sử dự đoán sort mới nhất trước          |
| GET    | /api/predictions/class/:classId     | Không body                                            | 200, success=true, trả dự đoán mới nhất của từng học sinh trong lớp |
| GET    | /api/predictions/alerts             | Không body                                            | 200, success=true, chỉ trả danh sách học sinh riskLevel=high        |
