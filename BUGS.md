# 🐛 BUGS.md — Nhật ký Bug & Fix

> **Mục đích:** Ghi lại mọi bug đã gặp và cách fix.
> Dán file này vào đầu prompt mỗi ngày để AI không lặp lại bug cũ.

**Cách ghi:**

```
## [BUG-XXX] Tên bug ngắn gọn
- Ngày: DD/MM/YYYY
- File/Vị trí: đường dẫn file bị lỗi
- Mô tả: bug xảy ra như thế nào
- Nguyên nhân: tại sao bị
- Fix: đã sửa như thế nào
- Trạng thái: ✅ Đã fix / 🔄 Đang fix
```

---

## DANH SÁCH BUG

## [BUG-001] Lỗi thiếu thư viện Python khi train model

- Ngày: 02/04/2026
- File/Vị trí: ai-engine/train.py
- Mô tả: Pylance báo lỗi import không resolve được pandas và sklearn khi tạo train.py.
- Nguyên nhân: Môi trường .venv chưa cài đủ package cho AI Engine.
- Fix: Cấu hình Python environment cho workspace và cài packages: pandas, scikit-learn, numpy, pymongo, python-dotenv.
- Trạng thái: ✅ Đã fix

---

## TEMPLATE THÊM BUG MỚI

```
## [BUG-001]
- Ngày:
- File:
- Mô tả:
- Nguyên nhân:
- Fix:
- Trạng thái:
```
