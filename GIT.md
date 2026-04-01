# 🐙 GIT.md — Hướng dẫn Git cho NttuGradeManager

---

## ⚠️ QUAN TRỌNG — Tạo `.gitignore` TRƯỚC KHI `git init`

Nếu `git add .` trước khi có `.gitignore`, toàn bộ `node_modules` (hàng trăm MB) sẽ bị đẩy lên GitHub — rất khó xóa về sau.

**Thứ tự đúng:**
```
Tạo .gitignore → git init → git add . → git status kiểm tra → git commit
```

---

## 📄 4 File `.gitignore` cần tạo

### `/.gitignore` (root — bao toàn bộ project)
```gitignore
# Tất cả node_modules trong mọi thư mục con
**/node_modules/

# Python
**/__pycache__/
**/*.pyc
**/venv/
**/.venv/

# Model files — nặng, train lại được, không cần push
**/models/*.pkl
**/models/*.joblib
**/data/*.csv

# Environment files — KHÔNG BAO GIỜ push lên GitHub
**/.env
**/.env.*
!**/.env.example

# Build output
**/dist/
**/.angular/

# Logs
**/*.log

# OS
.DS_Store
Thumbs.db
```

---

### `/backend/.gitignore`
```gitignore
# Dependencies
node_modules/

# Environment — TUYỆT ĐỐI không push
.env
.env.local
.env.production

# Logs
logs/
*.log
npm-debug.log*

# File upload tạm
uploads/
temp/

# OS
.DS_Store
Thumbs.db
```

---

### `/ai-engine/.gitignore`
```gitignore
# Python cache
__pycache__/
*.py[cod]
*.pyo
*.pyd
.Python

# Virtual environment — không push
venv/
env/
.venv/

# Model files — nặng, không push (chạy train.py để tạo lại)
models/*.pkl
models/*.joblib

# Data giả để train — không cần push
data/*.csv

# Jupyter
.ipynb_checkpoints/

# OS
.DS_Store
```

---

### `/frontend/.gitignore`
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
.angular/
.angular/cache/

# Environment
.env
src/environments/environment.prod.ts

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln
```

---

## 🚀 Khởi tạo Git đúng thứ tự

```bash
# Bước 1: Tạo 4 file .gitignore (copy từ trên xuống đúng vị trí)

# Bước 2: Init git
git init

# Bước 3: Thêm file
git add .

# Bước 4: KIỂM TRA trước khi commit — node_modules KHÔNG được xuất hiện
git status
# Nếu thấy node_modules trong danh sách → dừng lại, kiểm tra lại .gitignore

# Bước 5: Commit đầu tiên
git commit -m "init: project structure"

# Bước 6: Đẩy lên GitHub
git remote add origin https://github.com/username/NttuGradeManager.git
git push -u origin main
```

---

## 🌿 Quy tắc đặt tên Branch

```
main          → code ổn định, đã test
dev           → branch phát triển chính
feature/...   → tính năng mới
fix/...       → sửa bug

Ví dụ:
  feature/grade-import
  feature/ai-prediction
  fix/jwt-expired
  fix/import-excel-error
```

```bash
# Tạo branch mới từ dev
git checkout dev
git checkout -b feature/grade-import

# Sau khi làm xong → merge về dev
git checkout dev
git merge feature/grade-import
```

---

## 📝 Quy tắc viết Commit Message

```
Cấu trúc: <type>: <mô tả ngắn>

type:
  init      → khởi tạo project / cấu trúc
  feat      → thêm tính năng mới
  fix       → sửa bug
  refactor  → cải thiện code, không thêm tính năng
  style     → chỉnh UI/CSS
  docs      → cập nhật tài liệu
  chore     → việc vặt (update package, config...)

Ví dụ:
  init: project structure backend + frontend + ai-engine
  feat: add grade import Excel API
  feat: add AI prediction for whole class
  fix: jwt token expired during demo
  fix: multer cannot parse FormData
  refactor: split importService into validate + save
  docs: update README with quick start guide
```

---

## 🆘 Xử lý sự cố thường gặp

### Lỡ push `node_modules` lên rồi
```bash
# Xóa khỏi git tracking (KHÔNG xóa file thật trên máy)
echo "node_modules/" >> .gitignore
git rm -r --cached node_modules
git rm -r --cached ai-engine/venv
git add .
git commit -m "fix: remove node_modules and venv from tracking"
git push
```

### Lỡ commit file `.env` chứa password/secret
```bash
# Xóa khỏi tracking
git rm --cached backend/.env
git rm --cached ai-engine/.env
echo ".env" >> .gitignore
git add .
git commit -m "fix: remove .env from tracking"
git push

# ⚠️ Quan trọng: đổi password MongoDB và JWT_SECRET ngay
# vì GitHub lưu lịch sử, ai cũng đọc được commit cũ
```

### Muốn hoàn tác commit gần nhất (chưa push)
```bash
git reset --soft HEAD~1    # hoàn tác commit, giữ lại thay đổi
git reset --hard HEAD~1    # hoàn tác commit, XÓA luôn thay đổi
```

### Xem lịch sử commit đẹp
```bash
git log --oneline --graph --all
```

---

## 💡 Prompt AI tạo gitignore nhanh

Nếu muốn AI generate lại:
```
Tạo 4 file .gitignore cho project NttuGradeManager:
1. /.gitignore (root)       — dùng ** pattern, bao toàn bộ project
2. /backend/.gitignore      — Node.js Express, multer uploads/, .env
3. /ai-engine/.gitignore    — Python FastAPI, venv/, models/*.pkl, data/*.csv
4. /frontend/.gitignore     — Angular v21, .angular/cache/, dist/

Bao gồm: node_modules, .env, __pycache__, venv, dist, .angular,
*.pkl, .DS_Store, Thumbs.db. Comment giải thích từng nhóm bằng tiếng Việt.
```
