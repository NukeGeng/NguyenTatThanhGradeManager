/**
 * fixClassNamesAndPredict.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bước 1: Đổi tên lớp học phần từ KTPM-SHORT-NN → KTPM-SHORT-23DKPNN
 * Bước 2: Nhập đầy đủ điểm cho HK3 (đang "đăng ký", chưa có điểm)
 * Bước 3: Chạy dự đoán AI hàng loạt cho 500 sinh viên
 * ─────────────────────────────────────────────────────────────────────────────
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const ClassModel = require("../models/Class");
const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Prediction = require("../models/Prediction");
const { predictStudent } = require("../services/aiService");

dotenv.config();

// ── Helpers điểm số (giống resetAndSeedKTPM.js) ──────────────────────────────
const clamp = (v) => Number(Math.min(10, Math.max(0, Number(v))).toFixed(2));
const randBetween = (lo, hi) =>
  Number((lo + Math.random() * (hi - lo)).toFixed(1));

const GRADE_MAP = {
  A: { range: [8.6, 9.7], gpa4: 4 },
  B: { range: [7.1, 8.4], gpa4: 3 },
  C: { range: [5.1, 6.9], gpa4: 2 },
  F: { range: [2.8, 4.8], gpa4: 0 },
};

const pickLetter = () => {
  const r = Math.random();
  if (r < 0.3) return "A";
  if (r < 0.8) return "B";
  if (r < 0.95) return "C";
  return "F";
};

const generateScores = (classDoc) => {
  const letter = pickLetter();
  const { range, gpa4 } = GRADE_MAP[letter];
  const base = randBetween(range[0], range[1]);
  const w = classDoc.weights || { tx: 10, gk: 30, th: 0, tkt: 60 };
  const txCount = classDoc.txCount || 2;
  const txScores = Array.from({ length: txCount }, () =>
    clamp(base + (Math.random() * 1.4 - 0.7)),
  );
  const txAvg = Number(
    (txScores.reduce((s, v) => s + v, 0) / txScores.length).toFixed(2),
  );
  const gkScore = clamp(base + (Math.random() * 1.6 - 0.8));
  const tktScore = clamp(base + (Math.random() * 1.4 - 0.7));
  const finalScore = clamp(
    txAvg * (w.tx / 100) + gkScore * (w.gk / 100) + tktScore * (w.tkt / 100),
  );
  return {
    txScores,
    txAvg,
    gkScore,
    tktScore,
    finalScore,
    letterGrade: letter,
    gpa4,
  };
};

// ── Helpers prediction (tương tự runAllPredictions.js) ───────────────────────
const toValidScore = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Number(Math.min(10, Math.max(0, n)).toFixed(2));
};

const resolveScore = (g) => {
  const f = toValidScore(g?.finalScore);
  if (f !== null) return f;
  const t = toValidScore(g?.tktScore);
  if (t !== null) return t;
  const k = toValidScore(g?.gkScore);
  if (k !== null) return k;
  const x = toValidScore(g?.txAvg);
  if (x !== null) return x;
  return null;
};

const buildPredictInput = async (studentId) => {
  const allGrades = await Grade.find({ studentId })
    .populate("subjectId", "code")
    .select("subjectId finalScore tktScore gkScore txAvg")
    .lean();

  const map = {};
  for (const gr of allGrades) {
    const code = String(gr?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveScore(gr);
    if (score === null) continue;
    if (!map[code]) map[code] = [];
    map[code].push(score);
  }

  const scores = {};
  for (const [code, vals] of Object.entries(map)) {
    scores[code] = Number(
      (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2),
    );
  }

  const allVals = Object.values(scores);
  const mean = allVals.length
    ? Number((allVals.reduce((s, v) => s + v, 0) / allVals.length).toFixed(2))
    : 5;

  return {
    scores,
    diem_hk_truoc: mean,
    so_buoi_vang: 0,
    hanh_kiem: 2,
    finalScore: mean,
    gpa4: Number(Math.min((mean / 10) * 4, 4).toFixed(2)),
  };
};

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

// ── Main ─────────────────────────────────────────────────────────────────────
const run = async () => {
  await connectDatabase();
  console.log("=== FIX CLASS NAMES + FILL HK3 GRADES + PREDICT ===\n");

  // ════════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: Đổi tên lớp học phần KTPM-SHORT-NN → KTPM-SHORT-23DKPNN
  // ════════════════════════════════════════════════════════════════════════════
  console.log("Bước 1: Đổi tên lớp học phần...");

  const subjectClasses = await ClassModel.find({ code: /^KTPM-/ }).lean();
  let renamed = 0;
  const bulkRenameOps = [];

  for (const cls of subjectClasses) {
    // Match: KTPM-SHORT-01 → KTPM-SHORT-23DKP01
    const match = cls.code.match(/^(KTPM-.+-)(\d{2})$/);
    if (!match) continue;
    const prefix = match[1]; // e.g. "KTPM-TOANA1-"
    const num = match[2]; // e.g. "01"
    const newCode = `${prefix}23DKP${num}`;
    bulkRenameOps.push({
      updateOne: {
        filter: { _id: cls._id },
        update: { $set: { code: newCode } },
      },
    });
    renamed++;
  }

  if (bulkRenameOps.length) {
    await ClassModel.bulkWrite(bulkRenameOps);
  }
  console.log(`  ✓ Đổi tên ${renamed} lớp học phần\n`);

  // In mẫu để kiểm tra
  const samples = await ClassModel.find({ code: /^KTPM-/ })
    .sort({ code: 1 })
    .limit(5)
    .select("code semester")
    .lean();
  console.log("  Mẫu tên mới:");
  samples.forEach((s) => console.log(`    ${s.code} (HK${s.semester})`));
  console.log("");

  // ════════════════════════════════════════════════════════════════════════════
  // BƯỚC 2: Nhập đầy đủ điểm HK3 (finalScore = null → có điểm)
  // ════════════════════════════════════════════════════════════════════════════
  console.log("Bước 2: Nhập điểm đầy đủ cho HK3...");

  const hk3Grades = await Grade.find({ semester: 3, finalScore: null })
    .select("_id classId")
    .lean();

  console.log(`  Tìm thấy ${hk3Grades.length} bản ghi HK3 chưa có điểm`);

  // Cache classDoc để không query lặp lại
  const classCache = new Map();
  const getClass = async (classId) => {
    const key = String(classId);
    if (!classCache.has(key)) {
      const doc = await ClassModel.findById(classId)
        .select("weights txCount")
        .lean();
      classCache.set(
        key,
        doc || { weights: { tx: 10, gk: 30, th: 0, tkt: 60 }, txCount: 2 },
      );
    }
    return classCache.get(key);
  };

  const BATCH_SIZE_UPDATE = 500;
  let gradeUpdated = 0;

  for (let i = 0; i < hk3Grades.length; i += BATCH_SIZE_UPDATE) {
    const batch = hk3Grades.slice(i, i + BATCH_SIZE_UPDATE);
    const updateOps = await Promise.all(
      batch.map(async (gr) => {
        const cls = await getClass(gr.classId);
        const {
          txScores,
          txAvg,
          gkScore,
          tktScore,
          finalScore,
          letterGrade,
          gpa4,
        } = generateScores(cls);
        return {
          updateOne: {
            filter: { _id: gr._id },
            update: {
              $set: {
                txScores,
                txAvg,
                gkScore,
                tktScore,
                finalScore,
                letterGrade,
                gpa4,
                isDuThi: true,
                isVangThi: false,
              },
            },
          },
        };
      }),
    );
    await Grade.bulkWrite(updateOps, { ordered: false });
    gradeUpdated += batch.length;
    process.stdout.write(
      `\r  Cập nhật: ${gradeUpdated}/${hk3Grades.length} điểm HK3`,
    );
  }
  console.log(`\n  ✓ Đã nhập ${gradeUpdated} điểm HK3 đầy đủ\n`);

  // Kiểm tra nhanh
  const stillNull = await Grade.countDocuments({
    semester: 3,
    finalScore: null,
  });
  console.log(`  Còn ${stillNull} bản ghi HK3 chưa có điểm (phải = 0)\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // BƯỚC 3: Chạy dự đoán AI hàng loạt cho 500 sinh viên
  // ════════════════════════════════════════════════════════════════════════════
  console.log("Bước 3: Chạy dự đoán AI hàng loạt...");

  const homeClassCodes = await Student.distinct("homeClassCode", {
    homeClassCode: { $exists: true, $ne: "" },
  });
  console.log(`  Tìm thấy ${homeClassCodes.length} lớp sinh hoạt\n`);

  let totalOk = 0;
  let totalFail = 0;
  const PREDICT_BATCH = 50;

  for (const homeClassCode of homeClassCodes.sort()) {
    const students = await Student.find({ homeClassCode })
      .select("_id studentCode")
      .lean();
    if (!students.length) continue;

    // Xóa predictions cũ
    await Prediction.deleteMany({
      studentId: { $in: students.map((s) => s._id) },
    });

    let classOk = 0;
    let classFail = 0;

    for (let i = 0; i < students.length; i += PREDICT_BATCH) {
      const batch = students.slice(i, i + PREDICT_BATCH);
      await Promise.allSettled(
        batch.map(async (sv) => {
          try {
            const input = await buildPredictInput(sv._id);
            if (!Object.keys(input.scores).length) {
              classFail++;
              return;
            }
            const aiResult = await predictStudent(input);
            const pred = mapPrediction(aiResult);
            await Prediction.create({ studentId: sv._id, ...pred });
            classOk++;
          } catch {
            classFail++;
          }
        }),
      );
    }

    totalOk += classOk;
    totalFail += classFail;
    console.log(
      `  Lớp ${homeClassCode}: ${classOk}/${students.length} thành công` +
        (classFail ? ` (${classFail} lỗi)` : ""),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // KẾT QUẢ
  // ════════════════════════════════════════════════════════════════════════════
  const [totalPred, hk3WithScore] = await Promise.all([
    Prediction.countDocuments(),
    Grade.countDocuments({ semester: 3, finalScore: { $ne: null } }),
  ]);

  console.log("\n=== HOÀN THÀNH ===");
  console.log(`  Lớp học phần đã đổi tên : ${renamed}`);
  console.log(`  Điểm HK3 đã nhập        : ${gradeUpdated}`);
  console.log(`  Điểm HK3 có finalScore  : ${hk3WithScore}`);
  console.log(`  Dự đoán thành công       : ${totalOk}/${totalOk + totalFail}`);
  console.log(`  Tổng Prediction trong DB : ${totalPred}`);

  process.exit(0);
};

run().catch((err) => {
  console.error("LỖI:", err.message || err);
  process.exit(1);
});
