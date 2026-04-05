# ⚡ COMMANDS.md — Lệnh chạy dự án NttuGradeManager

> Copilot / AI đọc file này để biết lệnh nào cần chạy trong từng tình huống.

---

## 🆕 SETUP LẦN ĐẦU (máy mới / git clone)

```bash
# 1. Clone repo
git clone https://github.com/NukeGeng/NguyenTatThanhGradeManager.git
cd NguyenTatThanhGradeManager

# 2. Backend — cài thư viện + tạo .env
cd backend
npm install
cp .env.example .env
# → Mở file .env và điền đầy đủ các giá trị bên dưới

# 3. Frontend — cài thư viện
cd ../frontend
npm install

# 4. AI Engine — tạo virtual env + cài thư viện
cd ../ai-engine
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# 5. Train model lần đầu (phải có MongoDB đang chạy + đã seed Subject)
python data/generate_data.py
python train.py

# 6. Seed dữ liệu mẫu vào MongoDB
cd ../backend
npm run seed
```

---

## 🔐 NỘI DUNG FILE `.env` (backend)

Tạo file `backend/.env` với nội dung sau, điền giá trị thật:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@web.ffndrbj.mongodb.net/?appName=web
JWT_SECRET=nttu_grade_manager_secret_key_2026
JWT_EXPIRES_IN=7d
AI_ENGINE_URL=http://localhost:5000
NODE_ENV=development
```

---

## ▶️ CHẠY DỰ ÁN (hằng ngày)

Mở **4 terminal riêng biệt**, chạy theo thứ tự:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → Server chạy tại http://localhost:3000

# Terminal 2 — AI Engine
cd ai-engine
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
uvicorn main:app --port 5000 --reload
# → AI API chạy tại http://localhost:5000

# Terminal 3 — Frontend
cd frontend
npx ng serve
# → App chạy tại http://localhost:4200

# Terminal 4 — (tuỳ chọn) Seed data
cd backend
npm run seed
```

---

## 🔄 KHI GIT PULL VỀ MÁY MỚI

```bash
git pull

# Nếu có thay đổi package.json
cd backend  && npm install
cd frontend && npm install

# Nếu có thay đổi requirements.txt
cd ai-engine
pip install -r requirements.txt

# Nếu Admin đã thêm môn học mới → retrain model
cd ai-engine
python data/generate_data.py
python train.py
# Sau đó restart FastAPI để load model mới
```

---

## 🤖 RETRAIN AI MODEL (khi Admin thêm/xóa môn học)

```bash
cd ai-engine
# Kích hoạt venv nếu chưa
venv\Scripts\activate

# Bước 1: Gen lại data từ MongoDB (đọc môn mới)
python data/generate_data.py

# Bước 2: Train lại model
python train.py

# Bước 3: Restart FastAPI để load model.pkl mới
# Ctrl+C terminal FastAPI rồi chạy lại:
uvicorn main:app --port 5000 --reload
```

---

## 🗄️ DATABASE

```bash
# Seed dữ liệu mẫu (chỉ chạy 1 lần hoặc khi muốn reset)
cd backend
npm run seed

# Xóa toàn bộ data và seed lại từ đầu
npm run seed:reset   # nếu có script này
```

---

## 📦 CẬP NHẬT REQUIREMENTS (máy cũ trước khi push)

```bash
# Chạy trên máy đang phát triển, sau khi cài thêm thư viện Python
cd ai-engine
pip freeze > requirements.txt
git add requirements.txt
git commit -m "chore: update requirements.txt"
git push
```

---

## 🩺 KIỂM TRA HEALTH

```bash
# Kiểm tra Backend đang chạy
curl http://localhost:3000/api/auth/me

# Kiểm tra AI Engine đang chạy
curl http://localhost:5000/health

# Kiểm tra MongoDB kết nối (xem log terminal Backend)
# → "MongoDB connected" là OK

# Kiểm tra port đang dùng
netstat -ano | findstr :3000   # Windows
lsof -i :3000                  # macOS/Linux
```

---

## 🛑 DỪNG TẤT CẢ

```bash
# Mỗi terminal: Ctrl + C

# Hoặc kill theo port (Windows)
netstat -ano | findstr :3000
taskkill /PID <số_pid> /F

# Kill theo port (macOS/Linux)
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:5000)
```

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

```
Lỗi: "Cannot connect to AI Engine"
Fix: Kiểm tra terminal AI Engine đang chạy port 5000
     curl http://localhost:5000/health

Lỗi: "MongoDB connection failed" / "ETIMEOUT"
Fix: Kiểm tra MONGO_URI trong .env
     Whitelist IP 0.0.0.0/0 trên MongoDB Atlas
     Kiểm tra DNS: nslookup web.ffndrbj.mongodb.net

Lỗi: "model.pkl not found"
Fix: cd ai-engine && python train.py

Lỗi: "Cannot find module" (Node.js)
Fix: cd backend && npm install

Lỗi: "ModuleNotFoundError" (Python)
Fix: cd ai-engine && pip install -r requirements.txt

Lỗi: JWT expired khi demo
Fix: Đổi JWT_EXPIRES_IN=30d trong backend/.env
     Restart backend

Lỗi: Angular "NullInjectorError"
Fix: Thêm service vào providers[] hoặc app.config.ts

Lỗi: DNS timed out (EAI_AGAIN / ETIMEOUT)
Fix: echo "nameserver 8.8.8.8" > /etc/resolv.conf  (Linux)
     Đổi DNS thủ công sang 8.8.8.8 trong Network Settings (Windows)
```

---

## 📁 CẤU TRÚC PORTS

```
http://localhost:3000   → Node.js Backend API
http://localhost:4200   → Angular Frontend
http://localhost:5000   → Python FastAPI AI Engine
MongoDB Atlas           → Cloud (không cần port local)
```
