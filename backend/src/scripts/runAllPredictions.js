/**
 * runAllPredictions.js
 * Chạy dự đoán AI cho tất cả sinh viên có điểm số.
 * Yêu cầu: AI engine phải đang chạy trên cổng 5000 (hoặc AI_ENGINE_URL).
 *
 * Cách dùng:
 *   node src/scripts/runAllPredictions.js
 */
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Prediction = require("../models/Prediction");
const { predictStudent } = require("../services/aiService");

dotenv.config();

// Helpers (dựa theo logic trong predictions.js)
const toValidScore = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  if (numeric < 0) return 0;
  if (numeric > 10) return 10;
  return Number(numeric.toFixed(2));
};

const resolveScore = (gradeDoc) => {
  const finalScore = toValidScore(gradeDoc?.finalScore);
  if (finalScore !== null) return finalScore;
  const tktScore = toValidScore(gradeDoc?.tktScore);
  if (tktScore !== null) return tktScore;
  const gkScore = toValidScore(gradeDoc?.gkScore);
  if (gkScore !== null) return gkScore;
  const txAvg = toValidScore(gradeDoc?.txAvg);
  if (txAvg !== null) return txAvg;
  return null;
};

const buildPredictInput = async (studentId) => {
  const allGrades = await Grade.find({ studentId })
    .populate("subjectId", "code")
    .select("subjectId finalScore tktScore gkScore txAvg");

  const scoresBySubject = {};
  for (const grade of allGrades) {
    const code = String(grade?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveScore(grade);
    if (score === null) continue;
    if (!scoresBySubject[code]) scoresBySubject[code] = [];
    scoresBySubject[code].push(score);
  }

  const scores = {};
  for (const [code, values] of Object.entries(scoresBySubject)) {
    scores[code] = Number(
      (values.reduce((s, v) => s + v, 0) / values.length).toFixed(2),
    );
  }

  const allValues = Object.values(scores);
  const meanScore =
    allValues.length > 0
      ? Number(
          (allValues.reduce((s, v) => s + v, 0) / allValues.length).toFixed(2),
        )
      : 5;

  return {
    scores,
    diem_hk_truoc: meanScore,
    so_buoi_vang: 0,
    hanh_kiem: 2,
    finalScore: meanScore,
    gpa4: Number(Math.min((meanScore / 10) * 4, 4).toFixed(2)),
  };
};

const mapPrediction = (payload) => ({
  predictedRank: payload?.predicted_rank,
  confidence: Number(payload?.confidence || 0),
  riskLevel: payload?.risk_level,
  weakSubjects: Array.isArray(payload?.weak_subjects)
    ? payload.weak_subjects
    : [],
  improveSubjects: Array.isArray(payload?.improve_subjects)
    ? payload.improve_subjects
    : [],
  suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
  analysis: payload?.analysis || "",
  dataCoverage: Number(payload?.data_coverage ?? 0),
  isLowData: Boolean(payload?.is_low_data ?? false),
});

const BATCH_SIZE = 50;

const run = async () => {
  await connectDatabase();

  console.log("=== RUN ALL PREDICTIONS ===");

  // Lấy tất cả homeClassCode có sinh viên
  const homeClassCodes = await Student.distinct("homeClassCode", {
    homeClassCode: { $exists: true, $ne: "" },
  });

  console.log(`Tìm thấy ${homeClassCodes.length} lớp sinh hoạt`);

  let totalProcessed = 0;
  let totalFailed = 0;

  for (const homeClassCode of homeClassCodes) {
    const students = await Student.find({ homeClassCode })
      .select("_id studentCode homeClassCode")
      .lean();

    if (!students.length) continue;

    console.log(`  Lớp ${homeClassCode}: ${students.length} sinh viên...`);

    let classProcessed = 0;
    let classFailed = 0;

    // Xóa predictions cũ của lớp này trước khi tạo mới
    const studentIds = students.map((s) => s._id);
    await Prediction.deleteMany({ studentId: { $in: studentIds } });

    // Xử lý theo batch
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (student) => {
          try {
            const input = await buildPredictInput(student._id);

            if (Object.keys(input.scores).length === 0) {
              classFailed += 1;
              return;
            }

            const aiResult = await predictStudent(input);
            const prediction = mapPrediction(aiResult);

            await Prediction.create({
              studentId: student._id,
              ...prediction,
            });

            classProcessed += 1;
          } catch (_err) {
            classFailed += 1;
          }
        }),
      );
    }

    totalProcessed += classProcessed;
    totalFailed += classFailed;
    console.log(
      `    → ${classProcessed} thành công, ${classFailed} bỏ qua/lỗi`,
    );
  }

  console.log("");
  console.log(
    `Hoàn thành: ${totalProcessed} dự đoán, ${totalFailed} bỏ qua/lỗi`,
  );

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Lỗi:", err.message || err);
  try {
    await mongoose.connection.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
