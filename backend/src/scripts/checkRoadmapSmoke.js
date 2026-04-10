require("dotenv").config();

const mongoose = require("mongoose");
require("../models/Student");
require("../models/Subject");
require("../models/Curriculum");
const StudentCurriculum = require("../models/StudentCurriculum");
const { getGpaRoadmap, getRetakeRoadmap } = require("../services/aiService");

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const sc = await StudentCurriculum.findOne({
    registrations: { $exists: true, $ne: [] },
  })
    .select("studentId")
    .lean();

  if (!sc) {
    throw new Error(
      "Khong tim thay student co StudentCurriculum dang co dang ky",
    );
  }

  const studentId = String(sc.studentId);
  const gpa = await getGpaRoadmap(studentId, 3.2);
  const retake = await getRetakeRoadmap(studentId);

  console.log(
    JSON.stringify(
      {
        studentId,
        gpaPlanCount: Array.isArray(gpa.subjectPlans)
          ? gpa.subjectPlans.length
          : 0,
        semesterBreakdown: Array.isArray(gpa.semesterBreakdown)
          ? gpa.semesterBreakdown.length
          : 0,
        retakePlan: Array.isArray(retake.retakePlan)
          ? retake.retakePlan.length
          : 0,
        retakeUrgent: Array.isArray(retake.urgentRetakes)
          ? retake.urgentRetakes.length
          : 0,
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
    } catch (disconnectError) {
      // ignore disconnect error in smoke script
    }
  });
