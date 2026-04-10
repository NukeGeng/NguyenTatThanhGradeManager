require("dotenv").config();

const mongoose = require("mongoose");
const StudentCurriculum = require("../models/StudentCurriculum");
const Curriculum = require("../models/Curriculum");

const ENROLLED_YEAR = "2025";

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const [studentCurricula, curricula] = await Promise.all([
    StudentCurriculum.find({ enrolledYear: ENROLLED_YEAR })
      .select("studentId curriculumId registrations")
      .lean(),
    Curriculum.find({ isActive: true }).select("_id items").lean(),
  ]);

  const expectedByCurriculumId = new Map();
  for (const curriculum of curricula) {
    const expected = (
      Array.isArray(curriculum.items) ? curriculum.items : []
    ).filter(
      (item) =>
        Number(item.year) === 1 && [1, 2, 3].includes(Number(item.semester)),
    ).length;
    expectedByCurriculumId.set(String(curriculum._id), expected);
  }

  let mismatchCount = 0;
  const mismatches = [];

  for (const sc of studentCurricula) {
    const curriculumId = String(sc.curriculumId || "");
    const expected = Number(expectedByCurriculumId.get(curriculumId) || 0);
    const actual = Array.isArray(sc.registrations)
      ? sc.registrations.length
      : 0;

    if (expected !== actual) {
      mismatchCount += 1;
      if (mismatches.length < 20) {
        mismatches.push({
          studentId: String(sc.studentId),
          curriculumId,
          expected,
          actual,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        enrolledYear: ENROLLED_YEAR,
        totalStudentCurricula: studentCurricula.length,
        mismatchCount,
        sampleMismatches: mismatches,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_error) {
      // ignore disconnect error
    }
  });
