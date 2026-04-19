/**
 * repredictKTPM.js — Chạy lại AI predictions cho 500 SV KTPM
 * Grades đã được rebalance, chỉ cần chạy lại predictions
 */
require("dotenv").config();
const connectDatabase = require("../config/database");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Prediction = require("../models/Prediction");
const { predictStudent } = require("../services/aiService");

const mapPrediction = (p) => ({
  predictedRank: p?.predicted_rank,
  confidence: Number(p?.confidence || 0),
  riskLevel: p?.risk_level,
  weakSubjects: Array.isArray(p?.weak_subjects) ? p.weak_subjects : [],
  improveSubjects: Array.isArray(p?.improve_subjects) ? p.improve_subjects : [],
  suggestions: Array.isArray(p?.suggestions) ? p.suggestions : [],
  analysis: p?.analysis || "",
  dataCoverage: Number(p?.data_coverage ?? 0),
  isLowData: Boolean(p?.is_low_data ?? false),
});

const run = async () => {
  await connectDatabase();
  console.log("=== RE-PREDICT KTPM (500 SV) ===\n");

  const students = await Student.find({ homeClassCode: /^23DKP/ })
    .select("_id")
    .lean();
  console.log("SV KTPM:", students.length);

  const studentIds = students.map((s) => s._id);

  // Xóa predictions cũ
  const del = await Prediction.deleteMany({ studentId: { $in: studentIds } });
  console.log("Đã xóa predictions:", del.deletedCount);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < students.length; i++) {
    const sv = students[i];
    try {
      const grades = await Grade.find({ studentId: sv._id })
        .populate("subjectId", "code")
        .select("subjectId finalScore tktScore gkScore txAvg")
        .lean();

      const bySubject = {};
      for (const g of grades) {
        const code = String(g?.subjectId?.code || "").trim();
        if (!code) continue;
        const n = Number(g.finalScore ?? g.tktScore ?? g.gkScore ?? 0);
        if (!bySubject[code]) bySubject[code] = [];
        bySubject[code].push(Number(n.toFixed(2)));
      }

      const scores = {};
      for (const [code, vals] of Object.entries(bySubject)) {
        scores[code] = Number(
          (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2),
        );
      }

      const allVals = Object.values(scores);
      if (!allVals.length) {
        fail++;
        continue;
      }

      const mean = Number(
        (allVals.reduce((s, v) => s + v, 0) / allVals.length).toFixed(2),
      );

      const input = {
        scores,
        diem_hk_truoc: mean,
        so_buoi_vang: 0,
        hanh_kiem: 2,
        finalScore: mean,
        gpa4: Number(Math.min((mean / 10) * 4, 4).toFixed(2)),
      };

      const result = await predictStudent(input);
      await Prediction.create({
        studentId: sv._id,
        ...mapPrediction(result),
      });
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 3) console.error("  Lỗi SV", i, ":", e.message);
    }

    if ((i + 1) % 50 === 0) {
      process.stdout.write(`\r  Dự đoán: ${i + 1}/${students.length}`);
    }
  }

  console.log(`\nok=${ok} fail=${fail}`);

  // Thống kê
  const dist = await Prediction.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
  ]);
  console.log("\nPhân phối rủi ro:");
  dist.forEach((d) => console.log(`  ${d._id}: ${d.count}`));

  process.exit(0);
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
