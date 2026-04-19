/**
 * resetStudentData.js
 * Xóa toàn bộ Student, Grade, Prediction, StudentCurriculum.
 * Sau khi chạy xong, chạy tiếp:
 *   node src/scripts/seedLargeScaleData.js    -- tạo lại sinh viên
 *   node src/scripts/runAllPredictions.js      -- chạy dự đoán
 */
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Prediction = require("../models/Prediction");
const StudentCurriculum = require("../models/StudentCurriculum");

dotenv.config();

const run = async () => {
  await connectDatabase();

  console.log("=== RESET STUDENT DATA ===");
  console.log("Đang xóa dữ liệu...");

  const [students, grades, predictions, curricula] = await Promise.all([
    Student.deleteMany({}),
    Grade.deleteMany({}),
    Prediction.deleteMany({}),
    StudentCurriculum.deleteMany({}),
  ]);

  console.log(`✓ Đã xóa ${students.deletedCount} sinh viên`);
  console.log(`✓ Đã xóa ${grades.deletedCount} bảng điểm`);
  console.log(`✓ Đã xóa ${predictions.deletedCount} dự đoán`);
  console.log(`✓ Đã xóa ${curricula.deletedCount} lộ trình học`);
  console.log("");
  console.log("Tiếp theo:");
  console.log("  1) node src/scripts/seedLargeScaleData.js");
  console.log(
    "  2) (Đảm bảo AI engine đang chạy) node src/scripts/runAllPredictions.js",
  );

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Lỗi khi reset:", err.message || err);
  try {
    await mongoose.connection.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
