# 🔐 ADD_OTP_PROMPT.md — Thêm OTP vào Login hiện tại

> Dán DESIGN_SYSTEM.md + BUGS.md vào đầu mỗi prompt.
> Thực hiện đúng thứ tự: Prompt 1 (Backend) → Prompt 2 (Frontend).

---

## 🔵 PROMPT 1 — Backend: Thêm OTP service + 2 endpoint

```
[TEMPLATE CHUẨN DỰ ÁN]

Tôi có sẵn trang login với email + password.
Cần thêm OTP xác thực qua Gmail vào luồng login HIỆN TẠI.
KHÔNG viết lại, chỉ THÊM VÀO các file sau.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CÀI THÊM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cd backend && npm install nodemailer

Thêm vào backend/.env:
  GMAIL_USER=your_gmail@gmail.com
  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE MỚI 1: src/services/otpService.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lưu OTP trong Map (không cần DB):
const otpStore = new Map()
// otpStore.set(email, { otp, expiresAt, attempts })

Export 3 hàm:

generateOtp(email):
  otp = Math.floor(100000 + Math.random() * 900000).toString()
  expiresAt = Date.now() + 5 * 60 * 1000
  otpStore.set(email, { otp, expiresAt, attempts: 0 })
  return otp

verifyOtp(email, inputOtp):
  const record = otpStore.get(email)
  if (!record) throw new Error("OTP không tồn tại hoặc đã hết hạn")
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email)
    throw new Error("OTP đã hết hạn, vui lòng yêu cầu mã mới")
  }
  record.attempts++
  if (record.attempts > 5) {
    otpStore.delete(email)
    throw new Error("Nhập sai quá 5 lần, vui lòng gửi lại mã mới")
  }
  if (record.otp !== inputOtp) throw new Error("Mã OTP không chính xác")
  otpStore.delete(email)
  return true

clearOtp(email): otpStore.delete(email)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE MỚI 2: src/services/emailService.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

Export hàm sendOtpEmail(toEmail, otp, userName):
  Gửi email HTML:
  - Subject: "[NttuGradeManager] Mã xác thực OTP"
  - HTML body:
    * Header nền navy #1a3464: text "NttuGradeManager"
    * Body trắng padding 32px:
      - "Xin chào [userName],"
      - "Mã OTP đăng nhập của bạn:"
      - Box OTP: font monospace, font-size 32px, font-weight bold,
        letter-spacing 12px, nền #eff6ff, viền 2px solid #2563eb,
        border-radius 8px, padding 16px 32px, text-align center
        → chứa số OTP 6 chữ số
      - "Mã có hiệu lực trong 5 phút."
      - Dòng cảnh báo màu đỏ: "Không chia sẻ mã này cho bất kỳ ai."
    * Footer nền #f8fafc: "Trường ĐH Nguyễn Tất Thành — Khoa CNTT"

  DEV mode: nếu NODE_ENV === "development"
    console.log(`[DEV OTP] ${toEmail}: ${otp}`)
    return (không gửi email thật)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SỬA FILE: src/routes/auth.js (THÊM 2 endpoint)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KHÔNG xóa hoặc sửa bất kỳ endpoint nào hiện có.
Chỉ thêm 2 endpoint mới phía dưới:

--- THÊM ENDPOINT: POST /api/auth/send-otp ---

Body: { email }

Logic:
  1. Tìm user theo email, kiểm tra isActive
     → 404 nếu không tìm thấy
     → 403 nếu tài khoản bị khóa
  2. generateOtp(email)
  3. await sendOtpEmail(email, otp, user.name)
  4. Trả về:
     {
       success: true,
       message: "Mã OTP đã được gửi",
       maskedEmail: email thay ký tự giữa bằng ***
         (ví dụ: "nguyen.van.an@nttu.edu.vn" → "ngu***@nttu.edu.vn")
     }

  Rate limit đơn giản (dùng Map riêng):
    Tối đa 3 lần gửi/email trong 10 phút
    → 429 "Gửi OTP quá nhiều lần, thử lại sau ít phút"

--- THÊM ENDPOINT: POST /api/auth/verify-otp ---

Body: { email, otp }

Logic:
  1. verifyOtp(email, otp)
     Nếu throw → 400 với message của error
  2. Tìm user theo email
  3. Ký JWT: { id, role, departmentIds, name }
  4. Cập nhật lastLogin
  5. Ghi auditLog nếu có (action: "LOGIN_SUCCESS")
  6. Trả về:
     {
       success: true,
       token,
       user: { id, name, email, role, departmentIds }
     }
```

---

## 🟢 PROMPT 2 — Frontend: Thêm OTP vào Login component hiện tại

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM]

Tôi có sẵn login.component.ts với form email + password hoạt động.
Cần THÊM vào form hiện tại:
  - Nút "Gửi mã OTP" ngay dưới ô mật khẩu
  - 6 ô nhập OTP xuất hiện sau khi bấm gửi
  - Nút "Xác nhận" thay thế/bổ sung vào luồng submit

KHÔNG viết lại component, chỉ mô tả những thay đổi cần thêm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO AuthService (giữ nguyên code cũ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thêm 2 method mới:

sendOtp(email: string): Observable<any>
  → POST /api/auth/send-otp với body { email }

verifyOtp(email: string, otp: string): Observable<any>
  → POST /api/auth/verify-otp với body { email, otp }
  → Nếu success: lưu token vào localStorage (giống login cũ)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM STATE VÀO LoginComponent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thêm các property sau (KHÔNG xóa property cũ):

otpSent        = false       // true sau khi bấm "Gửi OTP"
otpDigits      = ['','','','','','']  // 6 ô OTP
otpError       = ''
otpLoading     = false
countdown      = 0           // đếm ngược 5 phút (giây)
resendCooldown = 0           // đếm ngược cho phép gửi lại (60 giây)
private countdownTimer: any
private resendTimer: any

get fullOtp(): string { return this.otpDigits.join('') }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO TEMPLATE HTML (sau ô password)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thêm đúng vị trí này trong template — phía sau mat-form-field password,
trước button submit hiện tại:

<!-- NÚT GỬI OTP (hiện khi chưa gửi) -->
@if (!otpSent) {
  <button type="button" class="btn-send-otp"
          [disabled]="loginForm.get('email')?.invalid || isLoading"
          (click)="onSendOtp()">
    <lucide-icon name="send" [size]="15"></lucide-icon>
    <span>{{ otpLoading ? 'Đang gửi...' : 'Gửi mã OTP' }}</span>
  </button>
}

<!-- KHU VỰC OTP (hiện sau khi đã gửi) -->
@if (otpSent) {
  <div class="otp-section">

    <!-- Thông báo đã gửi -->
    <div class="otp-notice">
      <lucide-icon name="mail-check" [size]="16"></lucide-icon>
      <span>Mã OTP đã gửi đến email của bạn</span>
      <span class="otp-countdown" [class.urgent]="countdown <= 60">
        {{ formatCountdown(countdown) }}
      </span>
    </div>

    <!-- 6 ô nhập OTP -->
    <div class="otp-grid">
      @for (digit of otpDigits; track $index) {
        <input
          class="otp-input"
          [class.filled]="digit !== ''"
          [class.error]="otpError !== ''"
          type="text"
          inputmode="numeric"
          maxlength="1"
          [value]="digit"
          (input)="onOtpInput($index, $event)"
          (keydown)="onOtpKeydown($index, $event)"
          (paste)="onOtpPaste($event)"
          [id]="'otp-' + $index"
          autocomplete="one-time-code"
        />
      }
    </div>

    <!-- Lỗi OTP -->
    @if (otpError) {
      <div class="otp-error">
        <lucide-icon name="alert-circle" [size]="14"></lucide-icon>
        {{ otpError }}
      </div>
    }

    <!-- Gửi lại OTP -->
    <div class="otp-resend">
      @if (resendCooldown > 0) {
        <span class="resend-disabled">Gửi lại sau {{ resendCooldown }}s</span>
      } @else {
        <button type="button" class="resend-btn" (click)="onResendOtp()">
          <lucide-icon name="refresh-cw" [size]="13"></lucide-icon>
          Gửi lại mã OTP
        </button>
      }
    </div>

  </div>
}

Sửa button submit hiện tại:
  Nếu otpSent = false → disabled (phải gửi OTP trước mới submit được)
  Nếu otpSent = true  → enabled khi fullOtp.length === 6

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM METHOD VÀO LoginComponent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

onSendOtp():
  if (!loginForm.get('email')?.valid) return
  otpLoading = true
  otpError = ''
  authService.sendOtp(loginForm.value.email).subscribe({
    next: () => {
      otpSent = true
      otpLoading = false
      startCountdown(300)
      startResendCooldown(60)
      // focus ô OTP đầu tiên sau 100ms
      setTimeout(() => document.getElementById('otp-0')?.focus(), 100)
    },
    error: (err) => {
      otpError = err.error?.message || 'Không thể gửi OTP, thử lại sau'
      otpLoading = false
    }
  })

onOtpInput(index: number, event: Event):
  const val = (event.target as HTMLInputElement).value.replace(/\D/g,'')
  otpDigits[index] = val.slice(-1)
  otpError = ''
  if (val && index < 5) {
    document.getElementById(`otp-${index + 1}`)?.focus()
  }
  if (fullOtp.length === 6) onSubmit()  // auto submit khi đủ 6 số

onOtpKeydown(index: number, event: KeyboardEvent):
  if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
    document.getElementById(`otp-${index - 1}`)?.focus()
  }

onOtpPaste(event: ClipboardEvent):
  event.preventDefault()
  const text = event.clipboardData?.getData('text')?.replace(/\D/g,'') || ''
  if (text.length === 6) {
    otpDigits = text.split('')
    document.getElementById('otp-5')?.focus()
    if (fullOtp.length === 6) setTimeout(() => onSubmit(), 100)
  }

onResendOtp():
  if (resendCooldown > 0) return
  otpDigits = ['','','','','','']
  otpError = ''
  onSendOtp()

Sửa onSubmit() hiện tại — thêm vào đầu hàm:
  Nếu form login invalid → return
  Nếu otpSent = false → otpError = 'Vui lòng gửi và nhập mã OTP trước'  → return
  Nếu fullOtp.length !== 6 → otpError = 'Vui lòng nhập đủ 6 số OTP'  → return

  Thay vì gọi authService.login() như cũ, gọi:
  authService.verifyOtp(loginForm.value.email, fullOtp).subscribe({
    next: () => {
      clearInterval(countdownTimer)
      router.navigate(['/dashboard'])
    },
    error: (err) => {
      otpError = err.error?.message || 'OTP không chính xác'
      otpDigits = ['','','','','','']
      setTimeout(() => document.getElementById('otp-0')?.focus(), 50)
    }
  })

startCountdown(seconds: number):
  countdown = seconds
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown--
    if (countdown <= 0) {
      clearInterval(countdownTimer)
      otpSent = false
      otpDigits = ['','','','','','']
      otpError = 'Mã OTP đã hết hạn, vui lòng gửi lại'
    }
  }, 1000)

startResendCooldown(seconds: number):
  resendCooldown = seconds
  const t = setInterval(() => {
    resendCooldown--
    if (resendCooldown <= 0) clearInterval(t)
  }, 1000)

formatCountdown(s: number): string:
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2,'0')}`

ngOnDestroy(): clearInterval(countdownTimer)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO login.component.scss
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.btn-send-otp {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .65rem 1.5rem;
  margin-top: .5rem;
  border: 1.5px solid var(--blue);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--blue);
  font-size: .875rem;
  font-weight: 600;
  font-family: 'Be Vietnam Pro', sans-serif;
  cursor: pointer;
  transition: all .15s;
  &:hover:not(:disabled) { background: var(--blue-pale); }
  &:disabled { opacity: .45; cursor: not-allowed; }
}

.otp-section {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}

.otp-notice {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .8rem;
  color: var(--text-sub);
  background: var(--blue-pale);
  border-radius: var(--radius-sm);
  padding: .5rem .75rem;
  lucide-icon { color: var(--blue); }
}

.otp-countdown {
  margin-left: auto;
  font-weight: 700;
  font-family: monospace;
  color: var(--blue);
  font-size: .85rem;
  &.urgent { color: var(--red); }
}

.otp-grid {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.otp-input {
  width: 46px;
  height: 54px;
  border: 1.5px solid var(--gray-200);
  border-radius: 8px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
  font-family: monospace;
  color: var(--navy);
  outline: none;
  transition: all .15s;
  &:focus {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(37,99,235,.1);
  }
  &.filled { border-color: var(--navy); background: var(--blue-pale); }
  &.error  { border-color: var(--red);  background: var(--red-pale);  }
}

.otp-error {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .8rem;
  color: var(--red);
  lucide-icon { flex-shrink: 0; }
}

.otp-resend {
  text-align: center;
  font-size: .8rem;
}

.resend-disabled { color: var(--text-muted); }

.resend-btn {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  background: none;
  border: none;
  color: var(--blue);
  font-size: .8rem;
  font-weight: 600;
  font-family: 'Be Vietnam Pro', sans-serif;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  &:hover { color: var(--navy); }
}
```

---

## ✅ CHECKLIST

```
Backend:
□ npm install nodemailer
□ GMAIL_USER + GMAIL_APP_PASSWORD trong .env
□ otpService.js tạo mới
□ emailService.js tạo mới
□ POST /api/auth/send-otp thêm vào auth.js
□ POST /api/auth/verify-otp thêm vào auth.js

Frontend:
□ 2 method mới trong AuthService
□ 6 ô OTP tự nhảy focus, hỗ trợ paste
□ Đếm ngược 5 phút, resend cooldown 60s
□ Auto submit khi nhập đủ 6 số
□ Button submit disabled cho đến khi OTP đủ 6 số
□ OTP hết hạn → ẩn khu vực OTP + hiện thông báo

Test nhanh (dev mode):
  NODE_ENV=development → OTP log ra console, không gửi email thật
  Kiểm tra console backend: "[DEV OTP] email@nttu.edu.vn: 123456"
```
