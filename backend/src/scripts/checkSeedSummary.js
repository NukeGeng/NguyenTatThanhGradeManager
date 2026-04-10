require("dotenv").config();

const mongoose = require("mongoose");
const Student = require("../models/Student");
const StudentCurriculum = require("../models/StudentCurriculum");
const Major = require("../models/Major");
const Department = require("../models/Department");
const ClassModel = require("../models/Class");

const ENROLLED_YEAR = "2025";
const MAX_STUDENTS_PER_CLASS = 60;

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const [
    totalStudents,
    cohortStudents,
    totalStudentCurriculum,
    cohortStudentCurriculum,
    totalStudentCurriculumWithRegistrations,
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ enrolledYear: ENROLLED_YEAR }),
    StudentCurriculum.countDocuments(),
    StudentCurriculum.countDocuments({ enrolledYear: ENROLLED_YEAR }),
    StudentCurriculum.countDocuments({
      enrolledYear: ENROLLED_YEAR,
      registrations: { $exists: true, $ne: [] },
    }),
  ]);

  const [majorDocs, departmentDocs, studentsByMajorAgg, classRegistrationAgg] =
    await Promise.all([
      Major.find({ isActive: true })
        .select("_id code name departmentId durationYears durationLabel")
        .lean(),
      Department.find({ isActive: true }).select("_id code name").lean(),
      Student.aggregate([
        {
          $match: {
            enrolledYear: ENROLLED_YEAR,
            majorId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$majorId",
            count: { $sum: 1 },
          },
        },
      ]),
      StudentCurriculum.aggregate([
        {
          $match: {
            enrolledYear: ENROLLED_YEAR,
          },
        },
        {
          $unwind: "$registrations",
        },
        {
          $match: {
            "registrations.classId": { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$registrations.classId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const majorById = new Map(majorDocs.map((item) => [String(item._id), item]));
  const departmentById = new Map(
    departmentDocs.map((item) => [String(item._id), item]),
  );

  const departmentDistributionMap = new Map();
  const majorDistribution = studentsByMajorAgg
    .map((item) => {
      const major = majorById.get(String(item._id));
      if (!major) {
        return null;
      }

      const department = departmentById.get(String(major.departmentId));
      const departmentCode = department?.code || "UNKNOWN";
      const departmentName = department?.name || "Unknown";

      const currentDepartmentTotal =
        departmentDistributionMap.get(departmentCode) || 0;
      departmentDistributionMap.set(
        departmentCode,
        currentDepartmentTotal + Number(item.count || 0),
      );

      return {
        majorCode: major.code,
        majorName: major.name,
        departmentCode,
        departmentName,
        durationYears: major.durationYears,
        durationLabel: major.durationLabel,
        studentCount: Number(item.count || 0),
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.studentCount - a.studentCount ||
        a.majorCode.localeCompare(b.majorCode),
    );

  const departmentDistribution = Array.from(departmentDistributionMap.entries())
    .map(([departmentCode, studentCount]) => {
      const department = departmentDocs.find(
        (item) => item.code === departmentCode,
      );
      return {
        departmentCode,
        departmentName: department?.name || "Unknown",
        studentCount,
      };
    })
    .sort(
      (a, b) =>
        b.studentCount - a.studentCount ||
        a.departmentCode.localeCompare(b.departmentCode),
    );

  const maxClassRegistration = classRegistrationAgg.reduce(
    (maxValue, item) => Math.max(maxValue, Number(item.count || 0)),
    0,
  );

  const overflowClassRows = classRegistrationAgg
    .filter((item) => Number(item.count || 0) > MAX_STUDENTS_PER_CLASS)
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0));

  let overflowClasses = [];
  if (overflowClassRows.length > 0) {
    const classIds = overflowClassRows.map((item) => item._id);
    const classDocs = await ClassModel.find({ _id: { $in: classIds } })
      .select("_id code name semester")
      .lean();

    const classById = new Map(
      classDocs.map((item) => [String(item._id), item]),
    );

    overflowClasses = overflowClassRows.slice(0, 20).map((item) => {
      const classDoc = classById.get(String(item._id));
      return {
        classId: String(item._id),
        classCode: classDoc?.code || null,
        className: classDoc?.name || null,
        semester: classDoc?.semester || null,
        studentCount: Number(item.count || 0),
      };
    });
  }

  console.log(
    JSON.stringify(
      {
        enrolledYear: ENROLLED_YEAR,
        totalStudents,
        cohortStudents,
        totalStudentCurriculum,
        cohortStudentCurriculum,
        totalStudentCurriculumWithRegistrations,
        maxClassRegistration,
        hasClassOverflow: overflowClassRows.length > 0,
        overflowClassCount: overflowClassRows.length,
        overflowClasses,
        departmentDistribution,
        majorDistribution,
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
      // ignore disconnect error in summary script
    }
  });
