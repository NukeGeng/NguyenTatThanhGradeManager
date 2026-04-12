require("dotenv").config();

const connectDatabase = require("../config/database");
const Class = require("../models/Class");
const Student = require("../models/Student");
const StudentCurriculum = require("../models/StudentCurriculum");
const Grade = require("../models/Grade");

async function main() {
  await connectDatabase();

  const classes = await Class.find({ isActive: true })
    .select("_id classCode")
    .lean();

  let expectedEnrollments = 0;
  let gradeRecords = 0;
  let missingGrades = 0;
  const missingSamples = [];

  for (const cls of classes) {
    const [directStudents, curriculumStudents] = await Promise.all([
      Student.find({ classId: cls._id }).select("_id").lean(),
      StudentCurriculum.find({ "registrations.classId": cls._id })
        .select("studentId")
        .lean(),
    ]);

    const enrolledIds = new Set();
    directStudents.forEach((s) => enrolledIds.add(String(s._id)));
    curriculumStudents.forEach((s) => {
      if (s.studentId) enrolledIds.add(String(s.studentId));
    });

    const enrolledList = Array.from(enrolledIds);
    const expected = enrolledList.length;
    expectedEnrollments += expected;

    if (expected === 0) continue;

    const gradeCount = await Grade.countDocuments({
      classId: cls._id,
      studentId: { $in: enrolledList },
    });

    gradeRecords += gradeCount;

    const missing = expected - gradeCount;
    if (missing > 0) {
      missingGrades += missing;
      if (missingSamples.length < 20) {
        missingSamples.push(`${cls.classCode}:${missing}`);
      }
    }
  }

  console.log(`classes=${classes.length}`);
  console.log(`expected_enrollments=${expectedEnrollments}`);
  console.log(`existing_grades_for_enrollments=${gradeRecords}`);
  console.log(`missing_grades=${missingGrades}`);

  if (missingSamples.length > 0) {
    console.log(`missing_samples=${missingSamples.join(", ")}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Coverage check failed:", error);
  process.exit(1);
});
