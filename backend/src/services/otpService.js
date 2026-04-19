// In-memory OTP store — no DB required
const otpStore = new Map();

function generateOtp(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(email, { otp, expiresAt, attempts: 0 });
  return otp;
}

function verifyOtp(email, inputOtp) {
  const record = otpStore.get(email);
  if (!record) throw new Error("OTP không tồn tại hoặc đã hết hạn");

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    throw new Error("OTP đã hết hạn, vui lòng yêu cầu mã mới");
  }

  record.attempts++;
  if (record.attempts > 5) {
    otpStore.delete(email);
    throw new Error("Nhập sai quá 5 lần, vui lòng gửi lại mã mới");
  }

  if (record.otp !== inputOtp) throw new Error("Mã OTP không chính xác");

  otpStore.delete(email);
  return true;
}

function clearOtp(email) {
  otpStore.delete(email);
}

module.exports = { generateOtp, verifyOtp, clearOtp };
