require("dotenv").config();

const mongoose = require("mongoose");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const StudentCurriculum = require("../models/StudentCurriculum");

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const [classDocs, studentClassIds, gradeClassIds, curriculumClassRows] =
    await Promise.all([
      ClassModel.find({}).select("_id code name semester schoolYearId").lean(),
      Student.distinct("classId", { classId: { $exists: true, $ne: null } }),
      Grade.distinct("classId", { classId: { $exists: true, $ne: null } }),
      StudentCurriculum.aggregate([
        { $unwind: "$registrations" },
        {
          $match: {
            "registrations.classId": { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$registrations.classId",
          },
        },
      ]),
    ]);

  const usedClassIdSet = new Set([
    ...studentClassIds.map((item) => String(item)),
    ...gradeClassIds.map((item) => String(item)),
    ...curriculumClassRows.map((item) => String(item._id)),
  ]);

  const orphanClasses = classDocs.filter(
    (item) => !usedClassIdSet.has(String(item._id)),
  );

  if (orphanClasses.length === 0) {
    console.log(
      JSON.stringify(
        {
          totalClasses: classDocs.length,
          usedClassCount: usedClassIdSet.size,
          orphanClassCount: 0,
          deletedCount: 0,
          message: "Khong co lop hoc phan rong de xoa",
        },
        null,
        2,
      ),
    );
    return;
  }

  const orphanIds = orphanClasses.map((item) => item._id);
  const deleteResult = await ClassModel.deleteMany({ _id: { $in: orphanIds } });

  const sample = orphanClasses.slice(0, 20).map((item) => ({
    id: String(item._id),
    code: item.code,
    name: item.name,
    semester: item.semester,
  }));

  console.log(
    JSON.stringify(
      {
        totalClasses: classDocs.length,
        usedClassCount: usedClassIdSet.size,
        orphanClassCount: orphanClasses.length,
        deletedCount: Number(deleteResult.deletedCount || 0),
        sampleDeletedClasses: sample,
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
