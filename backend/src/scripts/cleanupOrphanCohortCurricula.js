require("dotenv").config();

const mongoose = require("mongoose");
const Student = require("../models/Student");
const StudentCurriculum = require("../models/StudentCurriculum");

const ENROLLED_YEAR = "2025";

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const cohortStudentIds = (
    await Student.find({ enrolledYear: ENROLLED_YEAR }).select("_id").lean()
  ).map((item) => item._id);

  const result = await StudentCurriculum.deleteMany({
    enrolledYear: ENROLLED_YEAR,
    studentId: { $nin: cohortStudentIds },
  });

  console.log(
    JSON.stringify(
      {
        enrolledYear: ENROLLED_YEAR,
        cohortStudents: cohortStudentIds.length,
        deletedOrphanStudentCurricula: result.deletedCount,
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
      // ignore disconnect error in cleanup script
    }
  });
