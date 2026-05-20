# NguyenTatThanhGradeManager

Hệ thống quản lý điểm, sinh viên, lớp học phần, chương trình đào tạo và cảnh báo học tập cho Trường Đại học Nguyễn Tất Thành.

Dự án gồm 3 phần chính:

- `backend/`: API Node.js/Express, MongoDB, JWT, Socket.IO, upload file, chatbot và tích hợp AI engine.
- `frontend/`: ứng dụng Angular cho giao diện quản trị, giáo viên, cố vấn học tập và sinh viên.
- `ai-engine/`: FastAPI Python dùng scikit-learn để dự đoán học lực, rủi ro học tập, lộ trình GPA và kế hoạch học lại.

## Cần Hiểu Gì Trước Khi Chạy Dự Án

### Luồng hoạt động tổng quát

Frontend Angular gọi API về:

```text
http://localhost:3000/api
```

Backend Express xử lý nghiệp vụ, đọc/ghi MongoDB, xác thực JWT và gọi AI engine khi cần dự đoán:

```text
http://localhost:5000
```

Các port mặc định:

```text
http://localhost:3000   -> Node.js Backend API
http://localhost:4200   -> Angular Frontend
http://localhost:5000   -> Python FastAPI AI Engine
MongoDB Atlas/local     -> Database
```

### Thứ tự nên đọc code

1. `backend/src/index.js`: điểm khởi động backend, middleware và route chính.
2. `backend/src/models/`: schema MongoDB như User, Student, Class, Grade, Subject, Prediction, Curriculum.
3. `backend/src/routes/`: nghiệp vụ API theo từng module.
4. `backend/src/middleware/`: xác thực, phân quyền, audit log và xử lý lỗi.
5. `backend/src/services/aiService.js`: backend gọi sang AI engine.
6. `ai-engine/main.py`: các API AI như `/predict`, `/predict-batch`, `/gpa-roadmap`, `/retake-roadmap`.
7. `frontend/src/app/app.routes.ts`: cấu trúc route frontend.
8. `frontend/src/app/core/services/api.service.ts`: service Angular gọi backend.

### Vai trò người dùng

- `admin`: quản trị khoa/phòng, giáo viên, môn học, lớp, chương trình đào tạo.
- `teacher`: nhập điểm, xem điểm, quản lý lớp phụ trách.
- `advisor`: cố vấn học tập, theo dõi sinh viên, xem cảnh báo và tư vấn lộ trình.

Khi đọc một API, nên kiểm tra middleware đi kèm route đó vì quyền truy cập nằm chủ yếu trong `backend/src/middleware/`.

### Dữ liệu mẫu

Script seed nằm trong:

- `backend/src/scripts/seedData.js`: seed nhỏ, dùng demo nhanh.
- `backend/src/scripts/seedLargeScaleData.js`: seed lớn, khuyến nghị dùng vì có dữ liệu CTĐT và lớp học phần đầy đủ hơn.

Tài khoản mẫu sau khi seed:

- Admin: `admin@nttu.edu.vn` / `Admin@123`
- Giáo viên mẫu: `gv1@nttu.edu.vn` / `Teacher@123`
- Giáo viên mẫu: `gv2@nttu.edu.vn` / `Teacher@123`

### AI engine và model

AI engine đọc model từ:

- `ai-engine/models/model.pkl`
- `ai-engine/models/feature_names.pkl`
- `ai-engine/models/label_encoder.pkl`

Dữ liệu train nằm trong:

- `ai-engine/data/students.csv`
- `ai-engine/data/subject_codes.json`

Khi admin thêm hoặc xóa môn học, nên chạy lại `python data/generate_data.py` và `python train.py`, sau đó restart FastAPI để load model mới.

## Cần Cài Gì

### Bắt buộc

1. Node.js LTS, khuyến nghị Node 20 hoặc mới hơn.
2. npm, đi kèm Node.js.
3. Python 3.10 hoặc 3.11.
4. MongoDB Atlas hoặc MongoDB local.
5. Git.

### Khuyến nghị

- Postman để test API bằng collection trong `postman/`.
- MongoDB Compass để xem database.
- VS Code để phát triển.

### Tùy chọn

- Ollama nếu muốn chạy chatbot Llama.
- Gemini API key nếu muốn dùng Gemini.
- Gmail App Password nếu muốn gửi OTP email thật. Khi development có thể đặt `NODE_ENV=development` để OTP in ra console.

## Setup Lần Đầu

Nếu clone từ GitHub:

```bash
git clone https://github.com/NukeGeng/NguyenTatThanhGradeManager.git
cd NguyenTatThanhGradeManager
```

### 1. Cài thư viện backend

```bash
cd backend
npm install
cp .env.example .env
```

Trên Windows PowerShell, nếu không dùng được `cp`, chạy:

```powershell
Copy-Item .env.example .env
```

Sau đó mở `backend/.env` và điền cấu hình thật.

### 2. Cài thư viện frontend

```bash
cd ../frontend
npm install
```

### 3. Tạo môi trường Python cho AI engine

```bash
cd ../ai-engine
python -m venv venv
```

Windows:

```powershell
venv\Scripts\activate
pip install -r requirements.txt
```

macOS/Linux:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Cấu hình file `backend/.env`

Nội dung mẫu:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@web.ffndrbj.mongodb.net/?appName=web
JWT_SECRET=nttu_grade_manager_secret_key_2026
JWT_EXPIRES_IN=7d
AI_ENGINE_URL=http://localhost:5000
NODE_ENV=development
```

Nếu dùng MongoDB local, có thể thay `MONGO_URI` bằng:

```env
MONGO_URI=mongodb://127.0.0.1:27017/student-ai-db
```

Biến môi trường tùy chọn cho chatbot/email:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
ADMIN_NOTIFY_EMAIL=admin@example.com
```

### 5. Seed dữ liệu mẫu

Đảm bảo MongoDB đang chạy và `backend/.env` đã đúng `MONGO_URI`, sau đó:

```bash
cd ../backend
npm run seed:large
```

`seed:large` là lựa chọn khuyến nghị vì có dữ liệu chương trình đào tạo và lớp học phần đầy đủ hơn.

Nếu chỉ cần dữ liệu nhỏ để demo nhanh:

```bash
npm run seed
```

### 6. Generate data và train AI model

Sau khi database đã có dữ liệu Subject, chạy:

```bash
cd ../ai-engine
venv\Scripts\activate
python data/generate_data.py
python train.py
```

Trên macOS/Linux:

```bash
cd ../ai-engine
source venv/bin/activate
python data/generate_data.py
python train.py
```

## Chạy Dự Án Hằng Ngày

Theo `COMMANDS.md`, nên mở 3 terminal riêng biệt cho 3 service chính.

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

Backend chạy tại:

```text
http://localhost:3000
```

### Terminal 2: AI Engine

Cách khuyến nghị nếu virtualenv nằm trong `ai-engine/venv`:

```powershell
cd ai-engine
venv\Scripts\activate
uvicorn main:app --port 5000 --reload
```

Nếu bạn tạo virtualenv ở thư mục gốc là `.venv`, có thể chạy từ thư mục gốc:

```powershell
.\.venv\Scripts\uvicorn.exe --app-dir ai-engine main:app --port 5000 --reload
```

AI engine chạy tại:

```text
http://localhost:5000
```

### Terminal 3: Frontend

```bash
cd frontend
npx ng serve
```

Frontend chạy tại:

```text
http://localhost:4200
```

### Terminal 4: Seed lại dữ liệu nếu cần

Chỉ chạy khi muốn tạo lại dữ liệu mẫu:

```bash
cd backend
npm run seed:large
```

## Chạy Nhanh Bằng Script Gốc

Ở thư mục gốc có script chạy đồng thời 3 phần:

```bash
npm install
npm run dev
```

Lưu ý: script `npm run dev` ở thư mục gốc ưu tiên Python tại `ai-engine/venv`. Nếu không có, script sẽ thử dùng `.venv` ở thư mục gốc.

## Kiểm Tra Health

Kiểm tra backend:

```bash
curl http://localhost:3000/api/health
```

Kiểm tra AI engine:

```bash
curl http://localhost:5000/health
```

Kiểm tra MongoDB:

```text
Xem terminal backend. Nếu có log "MongoDB connected" là backend đã kết nối database thành công.
```

Kiểm tra port đang dùng trên Windows:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :4200
netstat -ano | findstr :5000
```

## Khi Git Pull Code Mới

```bash
git pull
```

Nếu có thay đổi `package.json` hoặc `package-lock.json`:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Nếu có thay đổi `ai-engine/requirements.txt`:

```bash
cd ai-engine
venv\Scripts\activate
pip install -r requirements.txt
```

Nếu admin đã thêm/xóa môn học hoặc danh sách Subject thay đổi:

```bash
cd ai-engine
venv\Scripts\activate
python data/generate_data.py
python train.py
```

Sau đó restart terminal FastAPI.

## Retrain AI Model

Chạy khi admin thêm/xóa môn học hoặc model không còn khớp dữ liệu:

```bash
cd ai-engine
venv\Scripts\activate
python data/generate_data.py
python train.py
uvicorn main:app --port 5000 --reload
```

Nếu đang chạy FastAPI, dừng bằng `Ctrl + C` rồi chạy lại để load `model.pkl` mới.

## Build Frontend

```bash
cd frontend
npm run build
```

Hoặc từ thư mục gốc:

```bash
npm run build:frontend
```

## Test API Bằng Postman

Postman collection nằm trong:

- `postman/collections/NTT-Grade-Manager-API-Tests/`
- `postman/environments/local.environment.yaml`
- `postman/globals/workspace.globals.yaml`

Thứ tự test nên đi từ:

1. Health check.
2. Auth login.
3. Departments, classes, students.
4. Grades.
5. Predictions.

## Dừng Tất Cả Service

Ở từng terminal, bấm:

```text
Ctrl + C
```

Kill theo port trên Windows:

```powershell
netstat -ano | findstr :3000
taskkill /PID <so_pid> /F
```

Kill theo port trên macOS/Linux:

```bash
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:5000)
```

## Lỗi Thường Gặp

### `Cannot connect to AI Engine`

Kiểm tra AI engine có chạy port `5000` chưa:

```bash
curl http://localhost:5000/health
```

### `MongoDB connection failed` hoặc `ETIMEOUT`

Kiểm tra:

- `MONGO_URI` trong `backend/.env`.
- MongoDB Atlas đã whitelist IP chưa.
- Username/password trong connection string có đúng không.
- DNS có phân giải được host MongoDB không.

Với MongoDB Atlas có thể kiểm tra:

```bash
nslookup web.ffndrbj.mongodb.net
```

### `model.pkl not found` hoặc AI báo model chưa load

Chạy lại:

```bash
cd ai-engine
venv\Scripts\activate
python data/generate_data.py
python train.py
```

Sau đó restart FastAPI.

### `Cannot find module`

Cài lại thư viện Node.js:

```bash
cd backend
npm install
```

Hoặc:

```bash
cd frontend
npm install
```

### `ModuleNotFoundError`

Cài lại thư viện Python:

```bash
cd ai-engine
venv\Scripts\activate
pip install -r requirements.txt
```

### JWT expired khi demo

Đổi trong `backend/.env`:

```env
JWT_EXPIRES_IN=30d
```

Sau đó restart backend.

### Angular `NullInjectorError`

Kiểm tra service đã được provide trong `providers[]`, `app.config.ts` hoặc có `providedIn: 'root'` chưa.

## Cấu Trúc Thư Mục Chính

```text
.
├── backend/
│   ├── src/config/        # Kết nối database
│   ├── src/middleware/    # Auth, phân quyền, audit, error handler
│   ├── src/models/        # Mongoose schema
│   ├── src/routes/        # API routes
│   ├── src/scripts/       # Seed/reset/fix data
│   └── src/services/      # AI, email, chatbot, import
├── frontend/
│   └── src/app/
│       ├── core/          # Services, guards, interceptors
│       ├── features/      # Màn hình theo module nghiệp vụ
│       └── shared/        # Component/model/style dùng chung
├── ai-engine/
│   ├── data/              # Dữ liệu train
│   ├── models/            # Model đã train
│   ├── main.py            # FastAPI app
│   └── train.py           # Train model
└── postman/               # Collection test API
```

## Ghi Chú Khi Phát Triển

- Không đổi port tùy tiện nếu chưa sửa các URL hard-code trong frontend/backend.
- Khi sửa model trong `backend/src/models/`, nên kiểm tra route và seed script liên quan.
- Khi sửa danh sách môn học, nên generate data và train lại AI model.
- Khi sửa API response, nên cập nhật interface Angular trong `frontend/src/app/shared/models/interfaces.ts`.
- Khi debug auth, kiểm tra token ở frontend và middleware `backend/src/middleware/auth.js`.
