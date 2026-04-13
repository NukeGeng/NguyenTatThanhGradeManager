/**
 * cleanupKeepCnttOnly.js
 *
 * Xóa toàn bộ dữ liệu không phải CNTT (sinh viên, lớp học phần, grades,
 * student curricula, majors, departments).
 * Sau đó tạo lớp sinh hoạt cho sinh viên CNTT (tối đa 60 SV/lớp) và
 * cập nhật classId của từng sinh viên.
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Major = require("../models/Major");
const Curriculum = require("../models/Curriculum");
const StudentCurriculum = require("../models/StudentCurriculum");
const SchoolYear = require("../models/SchoolYear");

dotenv.config();

const CNTT_CODE = "CNTT";
const MAX_PER_CLASS = 60;
const SCHOOL_YEAR_NAME = "2025-2026";
const ENROLLED_YEAR = "2025";

const run = async () => {
  await connectDatabase();

  // ── 1. Tìm khoa CNTT ───────────────────────────────────────────────────────
  const cnttDept = await Department.findOne({ code: CNTT_CODE }).lean();
  if (!cnttDept) {
    throw new Error("Không tìm thấy khoa CNTT trong database.");
  }
  const cnttDeptId = cnttDept._id;
  console.log(`Đã tìm thấy khoa CNTT: ${cnttDept.name} (${cnttDeptId})`);

  // ── 2. Tìm tất cả majorId thuộc CNTT ───────────────────────────────────────
  const cnttMajors = await Major.find({ departmentId: cnttDeptId })
    .select("_id code name")
    .lean();
  const cnttMajorIds = cnttMajors.map((m) => String(m._id));
  console.log(
    `Majors CNTT (${cnttMajors.length}): ${cnttMajors.map((m) => m.code).join(", ")}`,
  );

  // ── 3. Tìm tất cả sinh viên CNTT (theo majorId) ────────────────────────────
  const cnttStudents = await Student.find({
    majorId: { $in: cnttMajorIds },
  })
    .select("_id")
    .lean();
  const cnttStudentIds = cnttStudents.map((s) => s._id);
  console.log(`Sinh viên CNTT: ${cnttStudentIds.length}`);

  // ── 4. Xóa grades, studentCurricula của sinh viên KHÔNG phải CNTT ──────────
  const nonCnttStudents = await Student.find({
    majorId: { $nin: cnttMajorIds },
  })
    .select("_id")
    .lean();
  const nonCnttStudentIds = nonCnttStudents.map((s) => s._id);
  console.log(`Sinh viên không phải CNTT cần xóa: ${nonCnttStudentIds.length}`);

  if (nonCnttStudentIds.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < nonCnttStudentIds.length; i += chunkSize) {
      const chunk = nonCnttStudentIds.slice(i, i + chunkSize);
      await Promise.all([
        Grade.deleteMany({ studentId: { $in: chunk } }),
        StudentCurriculum.deleteMany({ studentId: { $in: chunk } }),
      ]);
    }
    const delStudents = await Student.deleteMany({
      _id: { $in: nonCnttStudentIds },
    });
    console.log(`Đã xóa ${delStudents.deletedCount} sinh viên không phải CNTT`);
  }

  // ── 5. Xóa lớp học phần (Classes) không thuộc CNTT ─────────────────────────
  // Lớp học phần thuộc CNTT: departmentId = cnttDeptId
  const delClasses = await ClassModel.deleteMany({
    departmentId: { $ne: cnttDeptId },
  });
  console.log(
    `Đã xóa ${delClasses.deletedCount} lớp (học phần + sinh hoạt) không phải CNTT`,
  );

  // ── 6. Xóa subjects không thuộc CNTT ──────────────────────────────────────
  const delSubjects = await Subject.deleteMany({
    departmentId: { $ne: cnttDeptId },
  });
  console.log(`Đã xóa ${delSubjects.deletedCount} subjects không phải CNTT`);

  // ── 7. Xóa curricula không thuộc CNTT majors ──────────────────────────────
  const delCurricula = await Curriculum.deleteMany({
    majorId: { $nin: cnttMajorIds },
  });
  console.log(
    `Đã xóa ${delCurricula.deletedCount} chương trình không phải CNTT`,
  );

  // ── 8. Xóa majors không thuộc CNTT ───────────────────────────────────────
  const delMajors = await Major.deleteMany({
    departmentId: { $ne: cnttDeptId },
  });
  console.log(`Đã xóa ${delMajors.deletedCount} majors không phải CNTT`);

  // ── 9. Xóa departments không phải CNTT ────────────────────────────────────
  const delDepts = await Department.deleteMany({ code: { $ne: CNTT_CODE } });
  console.log(`Đã xóa ${delDepts.deletedCount} khoa không phải CNTT`);

  // ── 10. Lấy SchoolYear hiện tại ───────────────────────────────────────────
  const schoolYear = await SchoolYear.findOne({
    name: SCHOOL_YEAR_NAME,
  }).lean();
  if (!schoolYear) {
    throw new Error(`Không tìm thấy school year ${SCHOOL_YEAR_NAME}`);
  }

  // ── 11. Tạo/cập nhật subject placeholder cho lớp sinh hoạt CNTT ───────────
  const shSubjectCode = `sinhhoatcntt`;
  const shSubject = await Subject.findOneAndUpdate(
    { code: shSubjectCode },
    {
      $set: {
        code: shSubjectCode,
        name: "Lop sinh hoat CNTT",
        departmentId: cnttDeptId,
        credits: 2,
        semester: 1,
        coefficient: 1,
        category: "theory",
        defaultWeights: { tx: 0, gk: 0, th: 0, tkt: 100 },
        txCount: 1,
        isActive: false,
      },
    },
    { new: true, upsert: true },
  );
  console.log(`Subject lớp sinh hoạt: ${shSubject.code} (${shSubject._id})`);

  // ── 12. Lấy toàn bộ sinh viên CNTT với homeClassCode ─────────────────────
  const cnttStudentsFull = await Student.find({
    majorId: { $in: cnttMajorIds },
  })
    .select("_id homeClassCode enrolledYear")
    .lean();

  // ── 13. Nhóm sinh viên theo homeClassCode ────────────────────────────────
  // Nếu nhiều sinh viên có cùng homeClassCode → đã đúng
  // Nếu homeClassCode rỗng → gán lại theo thứ tự (60 SV/lớp)
  const grouped = new Map(); // homeClassCode → [studentId, ...]
  const noCode = [];

  for (const s of cnttStudentsFull) {
    if (s.homeClassCode && String(s.homeClassCode).trim()) {
      const code = String(s.homeClassCode).trim();
      if (!grouped.has(code)) grouped.set(code, []);
      grouped.get(code).push(s._id);
    } else {
      noCode.push(s._id);
    }
  }

  // Assign students without homeClassCode into new classes
  const yearSuffix = String(ENROLLED_YEAR).slice(-2);
  let letterOffset = grouped.size; // continue after existing codes

  while (noCode.length > 0) {
    const chunk = noCode.splice(0, MAX_PER_CLASS);
    const suffix = String.fromCharCode(65 + letterOffset);
    const code = `${yearSuffix}DCNTT1${suffix}`;
    if (!grouped.has(code)) grouped.set(code, []);
    grouped.get(code).push(...chunk);
    letterOffset += 1;
  }

  console.log(`Số lớp sinh hoạt CNTT sẽ tạo/cập nhật: ${grouped.size}`);

  // ── 14. Tạo Class documents cho từng lớp sinh hoạt ───────────────────────
  const homeroomOps = [];
  for (const [code] of grouped) {
    homeroomOps.push({
      updateOne: {
        filter: { code, schoolYearId: schoolYear._id, semester: 1 },
        update: {
          $set: {
            code,
            name: `Lớp sinh hoạt ${code}`,
            subjectId: shSubject._id,
            departmentId: cnttDeptId,
            schoolYearId: schoolYear._id,
            semester: 1,
            weights: { tx: 0, gk: 0, th: 0, tkt: 100 },
            txCount: 1,
            studentCount: 0,
            isActive: true,
          },
        },
        upsert: true,
      },
    });
  }
  if (homeroomOps.length > 0) {
    await ClassModel.bulkWrite(homeroomOps, { ordered: false });
  }

  // Lấy lại document sau upsert
  const homeroomDocs = await ClassModel.find({
    code: { $in: [...grouped.keys()] },
    schoolYearId: schoolYear._id,
    semester: 1,
  })
    .select("_id code")
    .lean();
  const homeroomByCode = new Map(homeroomDocs.map((d) => [d.code, d]));
  console.log(`Đã tạo/cập nhật ${homeroomDocs.length} lớp sinh hoạt CNTT`);

  // ── 15. Cập nhật classId + homeClassCode cho từng sinh viên ──────────────
  const studentUpdateOps = [];
  for (const [code, ids] of grouped) {
    const homeroomDoc = homeroomByCode.get(code);
    if (!homeroomDoc) {
      console.warn(`Không tìm thấy homeroom class doc cho ${code}`);
      continue;
    }
    for (const studentId of ids) {
      studentUpdateOps.push({
        updateOne: {
          filter: { _id: studentId },
          update: {
            $set: {
              classId: homeroomDoc._id,
              homeClassCode: code,
            },
          },
        },
      });
    }
  }

  if (studentUpdateOps.length > 0) {
    // bulkWrite theo batch 1000
    const chunkSize = 1000;
    for (let i = 0; i < studentUpdateOps.length; i += chunkSize) {
      await Student.bulkWrite(studentUpdateOps.slice(i, i + chunkSize), {
        ordered: false,
      });
    }
  }
  console.log(
    `Đã cập nhật classId + homeClassCode cho ${studentUpdateOps.length} sinh viên CNTT`,
  );

  // ── 16. Cập nhật studentCount cho các lớp sinh hoạt ──────────────────────
  const countOps = [];
  for (const [code, ids] of grouped) {
    const homeroomDoc = homeroomByCode.get(code);
    if (!homeroomDoc) continue;
    countOps.push({
      updateOne: {
        filter: { _id: homeroomDoc._id },
        update: { $set: { studentCount: ids.length } },
      },
    });
  }
  if (countOps.length > 0) {
    await ClassModel.bulkWrite(countOps, { ordered: false });
  }

  // ── 17. Tóm tắt ──────────────────────────────────────────────────────────
  console.log("\n=== HOÀN TẤT ===");
  console.log(
    `- Sinh viên CNTT còn lại: ${await Student.countDocuments({ majorId: { $in: cnttMajorIds } })}`,
  );
  console.log(`- Tổng sinh viên trong DB: ${await Student.countDocuments()}`);
  console.log(`- Tổng Class trong DB: ${await ClassModel.countDocuments()}`);
  console.log(
    `- Tổng Department trong DB: ${await Department.countDocuments()}`,
  );
  console.log(`- Tổng Major trong DB: ${await Major.countDocuments()}`);
  console.log("\nLớp sinh hoạt CNTT:");
  const finalCodes = [...grouped.entries()];
  finalCodes.sort((a, b) => (a[0] > b[0] ? 1 : -1));
  for (const [code, ids] of finalCodes) {
    console.log(`  ${code}: ${ids.length} sinh viên`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Lỗi:", err.message || err);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
