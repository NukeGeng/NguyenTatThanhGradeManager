/**
 * batchPredictAll.js
 *
 * Batch-run AI predictions for ALL active students across ALL semesters
 * that have grade data, then also run an overall (all-semesters) prediction.
 *
 * Usage:
 *   node src/scripts/batchPredictAll.js              # run everything
 *   node src/scripts/batchPredictAll.js --dry-run    # no DB writes, counts only
 *   node src/scripts/batchPredictAll.js --overall-only  # skip per-semester, only overall
 *   node src/scripts/batchPredictAll.js --semester-only # skip overall predictions
 *   node src/scripts/batchPredictAll.js --concurrency=10 # parallel students (default 5)
 *
 * npm shortcut: npm run predict:batch-all (after adding to package.json)
 */

"use strict";

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Prediction = require("../models/Prediction");
const { predictStudent } = require("../services/aiService");

dotenv.config();

// ──────────────────────────────────────────────────────────────────────────────
// CLI flags
// ──────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const OVERALL_ONLY = args.includes("--overall-only");
const SEMESTER_ONLY = args.includes("--semester-only");
const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
const CONCURRENCY = concurrencyArg
  ? Math.max(1, parseInt(concurrencyArg.split("=")[1], 10) || 5)
  : 5;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers (mirrors logic in routes/predictions.js — kept in sync manually)
// ──────────────────────────────────────────────────────────────────────────────

const toValidScore = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < 0) return 0;
  if (n > 10) return 10;
  return Number(n.toFixed(2));
};

const resolveGradeScore = (gradeDoc) =>
  toValidScore(gradeDoc?.finalScore) ??
  toValidScore(gradeDoc?.tktScore) ??
  toValidScore(gradeDoc?.gkScore) ??
  toValidScore(gradeDoc?.txAvg);

/**
 * Build predict-input for a specific (studentId, schoolYearId, semester).
 * Returns null when the semester has no scoreable grades.
 */
const buildSemesterInput = async (studentId, schoolYearId, semester) => {
  const [currentGrades, prevGrades] = await Promise.all([
    Grade.find({ studentId, schoolYearId, semester })
      .populate("subjectId", "code")
      .select("subjectId finalScore tktScore gkScore txAvg")
      .lean(),
    Grade.find({ studentId, $nor: [{ schoolYearId, semester }] })
      .select("finalScore tktScore gkScore txAvg")
      .lean(),
  ]);

  const scores = {};
  for (const g of currentGrades) {
    const code = String(g?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveGradeScore(g);
    if (score !== null) scores[code] = score;
  }

  if (Object.keys(scores).length === 0) return null;

  const prevArr = prevGrades.map(resolveGradeScore).filter((v) => v !== null);

  const diemHkTruoc =
    prevArr.length > 0
      ? Number((prevArr.reduce((s, v) => s + v, 0) / prevArr.length).toFixed(2))
      : Number(
          (
            Object.values(scores).reduce((s, v) => s + v, 0) /
            Object.values(scores).length
          ).toFixed(2),
        );

  const curArr = Object.values(scores);
  const finalScore = Number(
    (curArr.reduce((s, v) => s + v, 0) / curArr.length).toFixed(2),
  );
  const gpa4 = Number(Math.min((finalScore / 10) * 4, 4).toFixed(2));

  return {
    scores,
    diem_hk_truoc: diemHkTruoc,
    so_buoi_vang: 0,
    hanh_kiem: 2,
    finalScore,
    gpa4,
  };
};

/**
 * Build predict-input using ALL grades of a student (overall / cross-semester).
 * Returns null when the student has no scoreable grades at all.
 */
const buildOverallInput = async (studentId) => {
  const allGrades = await Grade.find({ studentId })
    .populate("subjectId", "code")
    .select("subjectId finalScore tktScore gkScore txAvg")
    .lean();

  const bySubject = {};
  for (const g of allGrades) {
    const code = String(g?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveGradeScore(g);
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

  if (Object.keys(scores).length === 0) return null;

  const arr = Object.values(scores);
  const overallGpa = Number(
    (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2),
  );
  const gpa4 = Number(Math.min((overallGpa / 10) * 4, 4).toFixed(2));

  return {
    scores,
    diem_hk_truoc: overallGpa,
    so_buoi_vang: 0,
    hanh_kiem: 2,
    finalScore: overallGpa,
    gpa4,
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Per-student prediction runner
// ──────────────────────────────────────────────────────────────────────────────

const PROGRESS_EVERY = 10; // print progress every N students

const predictOneStudent = async (student, counters) => {
  const studentId = String(student._id);
  let semestersDone = 0;
  let semestersFailed = 0;

  if (!OVERALL_ONLY) {
    // Discover all (schoolYearId, semester) combos that have grades
    const semesterGroups = await Grade.aggregate([
      { $match: { studentId: student._id } },
      {
        $group: {
          _id: { schoolYearId: "$schoolYearId", semester: "$semester" },
        },
      },
    ]);

    for (const group of semesterGroups) {
      const { schoolYearId, semester } = group._id;
      if (![1, 2, 3].includes(semester)) continue;

      try {
        const input = await buildSemesterInput(
          studentId,
          String(schoolYearId),
          semester,
        );
        if (!input) {
          counters.semesterSkipped += 1;
          continue;
        }

        if (!DRY_RUN) {
          const aiResult = await predictStudent(input);
          await Prediction.create({
            studentId: student._id,
            predictedRank: aiResult?.predicted_rank,
            confidence: Number(aiResult?.confidence || 0),
            riskLevel: aiResult?.risk_level,
            weakSubjects: Array.isArray(aiResult?.weak_subjects)
              ? aiResult.weak_subjects
              : [],
            improveSubjects: Array.isArray(aiResult?.improve_subjects)
              ? aiResult.improve_subjects
              : [],
            suggestions: Array.isArray(aiResult?.suggestions)
              ? aiResult.suggestions
              : [],
            analysis: aiResult?.analysis || "",
            dataCoverage: Number(aiResult?.data_coverage ?? 0),
            isLowData: Boolean(aiResult?.is_low_data ?? false),
          });
        }

        semestersDone += 1;
        counters.semesterDone += 1;
      } catch (err) {
        semestersFailed += 1;
        counters.semesterFailed += 1;
        counters.failures.push({
          studentId,
          type: "semester",
          schoolYearId: String(schoolYearId),
          semester,
          error: err?.message || String(err),
        });
      }
    }
  }

  if (!SEMESTER_ONLY) {
    try {
      const input = await buildOverallInput(studentId);
      if (input) {
        if (!DRY_RUN) {
          const aiResult = await predictStudent(input);
          await Prediction.create({
            studentId: student._id,
            predictedRank: aiResult?.predicted_rank,
            confidence: Number(aiResult?.confidence || 0),
            riskLevel: aiResult?.risk_level,
            weakSubjects: Array.isArray(aiResult?.weak_subjects)
              ? aiResult.weak_subjects
              : [],
            improveSubjects: Array.isArray(aiResult?.improve_subjects)
              ? aiResult.improve_subjects
              : [],
            suggestions: Array.isArray(aiResult?.suggestions)
              ? aiResult.suggestions
              : [],
            analysis: aiResult?.analysis || "",
            dataCoverage: Number(aiResult?.data_coverage ?? 0),
            isLowData: Boolean(aiResult?.is_low_data ?? false),
          });
        }
        counters.overallDone += 1;
      } else {
        counters.overallSkipped += 1;
      }
    } catch (err) {
      counters.overallFailed += 1;
      counters.failures.push({
        studentId,
        type: "overall",
        error: err?.message || String(err),
      });
    }
  }

  return { semestersDone, semestersFailed };
};

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

const runBatch = async (students, counters) => {
  // Process in chunks of CONCURRENCY
  for (let i = 0; i < students.length; i += CONCURRENCY) {
    const chunk = students.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map((student) => predictOneStudent(student, counters)),
    );

    counters.processed += chunk.length;
    if (
      counters.processed % PROGRESS_EVERY === 0 ||
      i + CONCURRENCY >= students.length
    ) {
      process.stdout.write(
        `\r  Progress: ${counters.processed}/${counters.total} students | ` +
          `semester: ${counters.semesterDone} ok / ${counters.semesterFailed} err | ` +
          `overall: ${counters.overallDone} ok / ${counters.overallFailed} err`,
      );
    }
  }
  process.stdout.write("\n");
};

const main = async () => {
  console.log("=".repeat(60));
  console.log("  Batch Predict All Students");
  console.log("=".repeat(60));
  if (DRY_RUN) console.log("  [DRY RUN] No data will be written.");
  if (OVERALL_ONLY) console.log("  Mode: overall predictions only");
  if (SEMESTER_ONLY) console.log("  Mode: per-semester predictions only");
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log("-".repeat(60));

  await connectDatabase();

  const students = await Student.find({ status: "active" })
    .select("_id studentCode fullName")
    .lean();

  console.log(`  Found ${students.length} active students`);

  if (!students.length) {
    console.log("  Nothing to do. Exiting.");
    await mongoose.connection.close();
    process.exit(0);
  }

  const counters = {
    total: students.length,
    processed: 0,
    semesterDone: 0,
    semesterFailed: 0,
    semesterSkipped: 0,
    overallDone: 0,
    overallFailed: 0,
    overallSkipped: 0,
    failures: [],
  };

  const startMs = Date.now();
  await runBatch(students, counters);
  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);

  console.log("=".repeat(60));
  console.log("  SUMMARY");
  console.log("-".repeat(60));
  console.log(`  Students processed : ${counters.processed}`);
  if (!OVERALL_ONLY) {
    console.log(`  Semester predictions:`);
    console.log(`    Created  : ${counters.semesterDone}`);
    console.log(`    Skipped  : ${counters.semesterSkipped} (no grades)`);
    console.log(`    Failed   : ${counters.semesterFailed}`);
  }
  if (!SEMESTER_ONLY) {
    console.log(`  Overall predictions:`);
    console.log(`    Created  : ${counters.overallDone}`);
    console.log(`    Skipped  : ${counters.overallSkipped} (no grades)`);
    console.log(`    Failed   : ${counters.overallFailed}`);
  }
  console.log(`  Elapsed            : ${elapsedSec}s`);
  if (DRY_RUN) console.log("  [DRY RUN] Nothing was written.");

  if (counters.failures.length > 0) {
    console.log(`\n  FAILURES (${counters.failures.length}):`);
    for (const f of counters.failures.slice(0, 20)) {
      const label =
        f.type === "semester"
          ? `  [${f.type}] student=${f.studentId} sy=${f.schoolYearId} sem=${f.semester}`
          : `  [${f.type}] student=${f.studentId}`;
      console.log(`${label} → ${f.error}`);
    }
    if (counters.failures.length > 20) {
      console.log(`  ... and ${counters.failures.length - 20} more`);
    }
  }

  console.log("=".repeat(60));
  await mongoose.connection.close();
  process.exit(counters.failures.length > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
