const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const StudentCurriculum = require("../models/StudentCurriculum");
const Grade = require("../models/Grade");

dotenv.config();

const DEFAULT_WEIGHTS = {
  tx: 10,
  gk: 30,
  th: 0,
  tkt: 60,
};

const DEFAULT_TX_COUNT = 3;
const DEFAULT_TH_COUNT = 3;

const toObjectIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
};

const toValidScore = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10) {
    return null;
  }

  return Number(numeric.toFixed(2));
};

const randomScore = (min, max) => {
  const raw = min + Math.random() * (max - min);
  return Number(raw.toFixed(2));
};

const normalizeWeights = (gradeWeights, classWeights) => {
  const source = gradeWeights || classWeights || DEFAULT_WEIGHTS;
  const normalized = {
    tx: Number(source.tx ?? DEFAULT_WEIGHTS.tx),
    gk: Number(source.gk ?? DEFAULT_WEIGHTS.gk),
    th: Number(source.th ?? DEFAULT_WEIGHTS.th),
    tkt: Number(source.tkt ?? DEFAULT_WEIGHTS.tkt),
  };

  const total =
    Number(normalized.tx || 0) +
    Number(normalized.gk || 0) +
    Number(normalized.th || 0) +
    Number(normalized.tkt || 0);

  if (Math.abs(total - 100) > 0.0001) {
    return { ...DEFAULT_WEIGHTS };
  }

  return normalized;
};

const normalizeScoreArray = (existingScores, expectedCount, min, max) => {
  const scores = Array.isArray(existingScores) ? existingScores : [];
  const normalized = [];

  for (let index = 0; index < expectedCount; index += 1) {
    const existing = toValidScore(scores[index]);
    normalized.push(existing === null ? randomScore(min, max) : existing);
  }

  return normalized;
};

const mean = (scores) => {
  const valid = (scores || [])
    .map(toValidScore)
    .filter((score) => score !== null);

  if (!valid.length) {
    return 0;
  }

  const sum = valid.reduce((total, score) => total + score, 0);
  return Number((sum / valid.length).toFixed(2));
};

const deriveResult = ({
  txAvg,
  thAvg,
  gkScore,
  tktScore,
  isVangThi,
  weights,
}) => {
  if (tktScore === null || tktScore === undefined || tktScore === "") {
    return {
      finalScore: null,
      gpa4: null,
      letterGrade: null,
    };
  }

  const numericTkt = Number(tktScore);
  const numericGk = Number(gkScore || 0);

  const finalScore = Number(
    (
      txAvg * (Number(weights.tx || 0) / 100) +
      numericGk * (Number(weights.gk || 0) / 100) +
      thAvg * (Number(weights.th || 0) / 100) +
      numericTkt * (Number(weights.tkt || 0) / 100)
    ).toFixed(2),
  );

  if (isVangThi) {
    return {
      finalScore,
      gpa4: 0,
      letterGrade: "F",
    };
  }

  if (numericTkt < 4) {
    return {
      finalScore,
      gpa4: 0,
      letterGrade: "F",
    };
  }

  if (numericTkt === 4) {
    return {
      finalScore,
      gpa4: 2,
      letterGrade: "C",
    };
  }

  if (finalScore >= 8.5) {
    return {
      finalScore,
      gpa4: 4,
      letterGrade: "A",
    };
  }

  if (finalScore >= 7.0) {
    return {
      finalScore,
      gpa4: 3,
      letterGrade: "B",
    };
  }

  if (finalScore >= 5.0) {
    return {
      finalScore,
      gpa4: 2,
      letterGrade: "C",
    };
  }

  return {
    finalScore,
    gpa4: 0,
    letterGrade: "F",
  };
};

const needsBackfill = (gradeDoc, txCount, thCount) => {
  const txScores = Array.isArray(gradeDoc.txScores) ? gradeDoc.txScores : [];
  const thScores = Array.isArray(gradeDoc.thScores) ? gradeDoc.thScores : [];

  if (
    txScores.length < txCount ||
    txScores.some((score) => toValidScore(score) === null)
  ) {
    return true;
  }

  if (thCount > 0) {
    if (
      thScores.length < thCount ||
      thScores.some((score) => toValidScore(score) === null)
    ) {
      return true;
    }
  }

  if (
    toValidScore(gradeDoc.gkScore) === null ||
    toValidScore(gradeDoc.tktScore) === null
  ) {
    return true;
  }

  if (
    gradeDoc.finalScore === null ||
    gradeDoc.gpa4 === null ||
    !gradeDoc.letterGrade
  ) {
    return true;
  }

  if (gradeDoc.isVangThi === true || gradeDoc.isDuThi === false) {
    return true;
  }

  return false;
};

const buildFullGradePayload = (classDoc, existingGrade = null) => {
  const txCount = Math.max(1, Number(classDoc.txCount || DEFAULT_TX_COUNT));
  const weights = normalizeWeights(existingGrade?.weights, classDoc.weights);
  const hasTh = Number(weights.th || 0) > 0;
  const thCount = hasTh ? DEFAULT_TH_COUNT : 0;

  const txScores = normalizeScoreArray(
    existingGrade?.txScores,
    txCount,
    6.0,
    9.5,
  );
  const thScores = hasTh
    ? normalizeScoreArray(existingGrade?.thScores, thCount, 6.0, 9.5)
    : [];

  const gkScore = (() => {
    const existing = toValidScore(existingGrade?.gkScore);
    return existing === null ? randomScore(6.0, 9.5) : existing;
  })();

  const tktScore = (() => {
    const existing = toValidScore(existingGrade?.tktScore);
    return existing === null ? randomScore(5.0, 9.5) : existing;
  })();

  const txAvg = mean(txScores);
  const thAvg = mean(thScores);

  const result = deriveResult({
    txAvg,
    thAvg,
    gkScore,
    tktScore,
    isVangThi: false,
    weights,
  });

  return {
    weights,
    txScores,
    gkScore,
    thScores,
    tktScore,
    isDuThi: true,
    isVangThi: false,
    txAvg,
    thAvg,
    finalScore: result.finalScore,
    gpa4: result.gpa4,
    letterGrade: result.letterGrade,
  };
};

const run = async () => {
  await connectDatabase();

  const classes = await ClassModel.find({})
    .select(
      "_id code subjectId departmentId schoolYearId semester weights txCount",
    )
    .lean();

  if (!classes.length) {
    console.log("Khong co lop hoc phan nao de backfill diem.");
    await mongoose.disconnect();
    return;
  }

  let totalClassesTouched = 0;
  let totalEnrollments = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  for (const classDoc of classes) {
    const [directStudentIds, registeredStudentIds] = await Promise.all([
      Student.distinct("_id", { classId: classDoc._id }),
      StudentCurriculum.distinct("studentId", {
        "registrations.classId": classDoc._id,
      }),
    ]);

    const studentIds = Array.from(
      new Set(
        [...directStudentIds, ...registeredStudentIds]
          .filter(Boolean)
          .map((item) => String(item)),
      ),
    );

    if (!studentIds.length) {
      continue;
    }

    totalClassesTouched += 1;
    totalEnrollments += studentIds.length;

    const existingGrades = await Grade.find({
      classId: classDoc._id,
      studentId: { $in: studentIds },
    })
      .select(
        "_id studentId txScores gkScore thScores tktScore isDuThi isVangThi finalScore gpa4 letterGrade weights",
      )
      .lean();

    const existingByStudentId = new Map(
      existingGrades.map((gradeDoc) => [
        toObjectIdString(gradeDoc.studentId),
        gradeDoc,
      ]),
    );

    const createDocs = [];
    const updateOps = [];

    for (const studentId of studentIds) {
      const existing = existingByStudentId.get(studentId);

      if (!existing) {
        const payload = buildFullGradePayload(classDoc);
        createDocs.push({
          studentId,
          classId: classDoc._id,
          subjectId: classDoc.subjectId,
          departmentId: classDoc.departmentId,
          schoolYearId: classDoc.schoolYearId,
          semester: Number(classDoc.semester || 1),
          enteredBy: null,
          ...payload,
        });
        continue;
      }

      const txCount = Math.max(1, Number(classDoc.txCount || DEFAULT_TX_COUNT));
      const effectiveWeights = normalizeWeights(
        existing.weights,
        classDoc.weights,
      );
      const thCount =
        Number(effectiveWeights.th || 0) > 0 ? DEFAULT_TH_COUNT : 0;

      if (!needsBackfill(existing, txCount, thCount)) {
        continue;
      }

      const payload = buildFullGradePayload(classDoc, existing);
      updateOps.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: payload,
          },
        },
      });
    }

    if (createDocs.length) {
      await Grade.insertMany(createDocs, { ordered: false });
      totalCreated += createDocs.length;
    }

    if (updateOps.length) {
      await Grade.bulkWrite(updateOps, { ordered: false });
      totalUpdated += updateOps.length;
    }

    if (createDocs.length || updateOps.length) {
      console.log(
        `${classDoc.code}: enrollments=${studentIds.length}, created=${createDocs.length}, updated=${updateOps.length}`,
      );
    }
  }

  console.log("=====================================");
  console.log(`Classes touched: ${totalClassesTouched}`);
  console.log(`Enrollments scanned: ${totalEnrollments}`);
  console.log(`Grades created: ${totalCreated}`);
  console.log(`Grades updated: ${totalUpdated}`);
  console.log("Prefill grade process completed.");

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Prefill grade process failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
