/**
 * rebalanceGrades.js
 * Tái phân phối điểm KTPM: A=30%, B=50%, C=15%, F=5%
 * → diem_hk_truoc trung bình ~7.7 → hầu hết "medium" risk
 * Sau đó chạy lại dự đoán AI cho 500 SV
 */
require("dotenv").config();
const connectDatabase = require("../config/database");
const mongoose = require("mongoose");
const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Prediction = require("../models/Prediction");
const StudentCurriculum = require("../models/StudentCurriculum");
const Subject = require("../models/Subject");
const { predictStudent } = require("../services/aiService");

const CNTT_DEPT_ID = "69cf35dd4d2438f53ab0cccc";

const clamp = (v) => Number(Math.min(10, Math.max(0, Number(v))).toFixed(2));
const randBetween = (lo, hi) =>
  Number((lo + Math.random() * (hi - lo)).toFixed(1));

const GRADE_MAP = {
  A: { range: [8.6, 9.7], gpa4: 4 },
  B: { range: [7.1, 8.4], gpa4: 3 },
  C: { range: [5.1, 6.9], gpa4: 2 },
  F: { range: [2.8, 4.8], gpa4: 0 },
};

// Phân phối mới: A=30%, B=50%, C=15%, F=5%
// → diem_hk_truoc ~7.7 → chỉ ~5-8% high risk
const pickLetter = () => {
  const r = Math.random();
  if (r < 0.3) return "A";
  if (r < 0.8) return "B";
  if (r < 0.95) return "C";
  return "F";
};

function buildGrade(studentId, cls, schoolYearId) {
  const letter = pickLetter();
  const { range, gpa4 } = GRADE_MAP[letter];
  const base = randBetween(range[0], range[1]);
  const w = cls.weights || { tx: 10, gk: 30, th: 0, tkt: 60 };
  const txCount = cls.txCount || 2;
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
    studentId,
    classId: cls._id,
    subjectId: cls.subjectId,
    departmentId: new mongoose.Types.ObjectId(CNTT_DEPT_ID),
    schoolYearId,
    semester: cls.semester,
    weights: w,
    txScores,
    txAvg,
    gkScore,
    thScores: [],
    thAvg: 0,
    tktScore,
    finalScore,
    gpa4,
    letterGrade: letter,
    isDuThi: true,
    isVangThi: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Prediction helpers ────────────────────────────────────────────────────────
const resolveScore = (g) => {
  const candidates = [g?.finalScore, g?.tktScore, g?.gkScore, g?.txAvg];
  for (const v of candidates) {
    const n = Number(v);
    if (!Number.isNaN(n) && n >= 0 && n <= 10) return Number(n.toFixed(2));
  }
  return null;
};

const buildOverallPredictInput = async (studentId) => {
  const grades = await Grade.find({ studentId })
    .populate("subjectId", "code")
    .select("subjectId finalScore tktScore gkScore txAvg")
    .lean();

  const bySubject = {};
  for (const g of grades) {
    const code = String(g?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveScore(g);
    if (score === null) continue;
    if (!bySubject[code]) bySubject[code] = [];
    bySubject[code].push(score);
  }

  const scores = {};
  for (const [code, vals] of Object.entries(bySubject)) {
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
  console.log("=== REBALANCE GRADES (A=30% B=50% C=15% F=5%) ===\n");

  // Lấy danh sách SV KTPM (nhận diện qua homeClassCode bắt đầu bằng 23DKP)
  const students = await Student.find({ homeClassCode: /^23DKP/ })
    .select("_id")
    .lean();
  if (!students.length) {
    console.log("Không có SV KTPM nào.");
    process.exit(0);
  }
  console.log(`Số SV KTPM: ${students.length}`);

  const studentIds = students.map((s) => s._id);

  // Lấy tất cả lớp học phần KTPM đang dùng (từ Grade)
  const existingGrades = await Grade.find({
    studentId: { $in: studentIds },
  })
    .select("classId schoolYearId semester studentId")
    .lean();

  // Build map classId → class info (cần weights, txCount, subjectId, semester)
  const classIds = [...new Set(existingGrades.map((g) => String(g.classId)))];
  const classes = await Class.find({ _id: { $in: classIds } })
    .select("_id subjectId weights txCount semester schoolYearId")
    .lean();
  const classMap = new Map(classes.map((c) => [String(c._id), c]));

  // Xóa grades cũ
  console.log("Xóa grades cũ...");
  const deleted = await Grade.deleteMany({ studentId: { $in: studentIds } });
  console.log(`Đã xóa: ${deleted.deletedCount} grades`);

  // Tạo lại grades
  console.log("Tạo lại grades...");
  const newGrades = [];
  for (const g of existingGrades) {
    const cls = classMap.get(String(g.classId));
    if (!cls) continue;
    const sy = cls.schoolYearId || g.schoolYearId;
    newGrades.push(buildGrade(g.studentId, cls, sy));
  }

  // Insert theo batch 1000
  let insertedCount = 0;
  for (let i = 0; i < newGrades.length; i += 1000) {
    const batch = newGrades.slice(i, i + 1000);
    await Grade.insertMany(batch, { ordered: false });
    insertedCount += batch.length;
    process.stdout.write(`\rInserted: ${insertedCount}/${newGrades.length}`);
  }
  console.log(`\nGrades tạo lại: ${insertedCount}`);

  // Cập nhật StudentCurriculum.registrations
  console.log("\nCập nhật StudentCurriculum.registrations...");
  const subjectIds2 = [
    ...new Set(newGrades.map((g) => String(g.subjectId)).filter(Boolean)),
  ];
  const subjects = await Subject.find({ _id: { $in: subjectIds2 } })
    .select("_id code")
    .lean();
  const codeMap = new Map(subjects.map((s) => [String(s._id), s.code]));

  const byStudent = new Map();
  for (const g of newGrades) {
    const sid = String(g.studentId);
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(g);
  }

  // Lấy _id của các grade mới vừa insert
  const insertedGrades = await Grade.find({
    studentId: { $in: studentIds },
  })
    .select(
      "_id studentId subjectId classId semester finalScore gpa4 letterGrade",
    )
    .lean();

  const byStudentFull = new Map();
  for (const g of insertedGrades) {
    const sid = String(g.studentId);
    if (!byStudentFull.has(sid)) byStudentFull.set(sid, []);
    byStudentFull.get(sid).push(g);
  }

  let scUpdated = 0;
  for (const [studentId, grades] of byStudentFull) {
    const registrations = grades.map((g) => {
      const isCompleted = g.finalScore !== null && g.finalScore !== undefined;
      let status = "registered";
      if (isCompleted) {
        status = g.gpa4 !== null && g.gpa4 > 0 ? "completed" : "failed";
      }
      return {
        subjectId: g.subjectId,
        subjectCode: codeMap.get(String(g.subjectId)) || "",
        classId: g.classId,
        schoolYear: "2023-2024",
        semester: g.semester,
        status,
        gradeId: g._id,
        gpa4: g.gpa4 ?? null,
        letterGrade: g.letterGrade || "",
      };
    });
    await StudentCurriculum.updateOne(
      { studentId },
      { $set: { registrations } },
    );
    scUpdated++;
  }
  console.log(`StudentCurriculum updated: ${scUpdated}`);

  // Xóa predictions cũ
  console.log("\nXóa predictions cũ...");
  const delPred = await Prediction.deleteMany({
    studentId: { $in: studentIds },
  });
  console.log(`Xóa predictions: ${delPred.deletedCount}`);

  // Chạy dự đoán lại
  console.log("\nChạy AI predictions...");
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < students.length; i++) {
    const sv = students[i];
    try {
      const input = await buildOverallPredictInput(sv._id);
      if (Object.keys(input.scores).length === 0) {
        fail++;
        continue;
      }
      const aiResult = await predictStudent(input);
      if (aiResult) {
        await Prediction.create({
          studentId: sv._id,
          ...mapPrediction(aiResult),
        });
        ok++;
      } else {
        fail++;
      }
    } catch {
      fail++;
    }
    if ((i + 1) % 50 === 0) {
      process.stdout.write(`\r  Dự đoán: ${i + 1}/${students.length}`);
    }
  }
  console.log(`\nDự đoán xong: ok=${ok}, fail=${fail}`);

  // Thống kê phân phối
  const dist = await Grade.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $group: { _id: "$letterGrade", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log("\nPhân phối điểm mới:");
  dist.forEach((d) => console.log(`  ${d._id}: ${d.count}`));

  const riskDist = await Prediction.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$studentId", risk: { $first: "$riskLevel" } } },
    { $group: { _id: "$risk", count: { $sum: 1 } } },
  ]);
  console.log("\nPhân phối rủi ro:");
  riskDist.forEach((r) => console.log(`  ${r._id}: ${r.count}`));

  process.exit(0);
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
