const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendOtpEmail(toEmail, otp, userName) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV OTP] ${toEmail}: ${otp}`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="480" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a3464;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.5px;">NttuGradeManager</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">Xin chào <strong>${userName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;">Mã OTP đăng nhập của bạn:</p>

              <div style="background:#eff6ff;border:2px solid #2563eb;border-radius:8px;padding:16px 32px;text-align:center;margin-bottom:24px;">
                <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:12px;color:#1a3464;">${otp}</span>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Mã có hiệu lực trong <strong>5 phút</strong>.</p>
              <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">Không chia sẻ mã này cho bất kỳ ai.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">Trường ĐH Nguyễn Tất Thành &mdash; Khoa CNTT</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"NttuGradeManager" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "[NttuGradeManager] Mã xác thực OTP",
    html,
  });
}

module.exports = { sendOtpEmail };
