/**
 * resetAndSeedCNTTOnly.js
 * 1. Xóa toàn bộ Student, Grade, Prediction, StudentCurriculum
 * 2. Xóa Department, Major, Class của các khoa KHÔNG phải CNTT
 * 3. Tạo lại 500 sinh viên CNTT với tên Việt có dấu
 * 4. Gán sinh viên vào lớp sinh hoạt + đăng ký lớp học phần CNTT
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Department = require("../models/Department");
const Major = require("../models/Major");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Prediction = require("../models/Prediction");
const StudentCurriculum = require("../models/StudentCurriculum");
const Curriculum = require("../models/Curriculum");
const SchoolYear = require("../models/SchoolYear");

dotenv.config();

// ── Tên theo yêu cầu ────────────────────────────────────────────────────────
const LAST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Phan",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
];
const MIDDLE_NAMES = [
  "Minh",
  "Gia",
  "Thành",
  "Quốc",
  "Hữu",
  "Văn",
  "Thị",
  "Ngọc",
  "Thu",
  "Phương",
];
const FIRST_NAMES = [
  "Anh",
  "Huy",
  "Nam",
  "Đức",
  "Linh",
  "Trang",
  "Vy",
  "Hào",
  "Tùng",
  "Sơn",
];

const buildName = (seed) => {
  const n = Math.max(1, seed);
  return `${LAST_NAMES[(n * 17 + 3) % LAST_NAMES.length]} ${MIDDLE_NAMES[(n * 19 + 5) % MIDDLE_NAMES.length]} ${FIRST_NAMES[(n * 23 + 7) % FIRST_NAMES.length]}`;
};

const buildParentName = (seed) => {
  const n = Math.max(1, seed);
  return `${LAST_NAMES[(n * 29 + 11) % LAST_NAMES.length]} ${MIDDLE_NAMES[(n * 31 + 13) % MIDDLE_NAMES.length]} ${FIRST_NAMES[(n * 37 + 17) % FIRST_NAMES.length]}`;
};

const clamp = (v) => {
  const n = Number(v);
  if (isNaN(n)) return 0;
  return Number(Math.min(10, Math.max(0, n)).toFixed(2));
};

const randBetween = (min, max) =>
  Number((min + Math.random() * (max - min)).toFixed(1));

const LETTER_RANGES = {
  A: [8.6, 9.7],
  B: [7.1, 8.4],
  C: [5.1, 6.9],
  F: [2.8, 4.8],
};
const LETTER_GPA4 = { A: 4, B: 3, C: 2, F: 0 };

const pickLetter = () => {
  const r = Math.random();
  if (r < 0.2) return "A";
  if (r < 0.55) return "B";
  if (r < 0.85) return "C";
  return "F";
};

const buildGrade = (studentId, classDoc, schoolYearId, counter) => {
  const letter = pickLetter();
  const [lo, hi] = LETTER_RANGES[letter];
  const base = randBetween(lo, hi);
  const txScores = Array.from({ length: classDoc.txCount || 3 }, () =>
    clamp(base + (Math.random() * 1.4 - 0.7)),
  );
  const txAvg = Number(
    (txScores.reduce((s, v) => s + v, 0) / txScores.length).toFixed(2),
  );
  const gkScore = clamp(base + (Math.random() * 1.6 - 0.8));
  const tktScore = clamp(base + (Math.random() * 1.4 - 0.7));
  const w = classDoc.weights || { tx: 10, gk: 30, th: 0, tkt: 60 };
  const finalScore = clamp(
    txAvg * (w.tx / 100) + gkScore * (w.gk / 100) + tktScore * (w.tkt / 100),
  );

  return {
    studentId,
    classId: classDoc._id,
    subjectId: classDoc.subjectId,
    departmentId: classDoc.departmentId,
    schoolYearId,
    semester: classDoc.semester,
    weights: w,
    txScores,
    gkScore,
    thScores: [],
    tktScore,
    txAvg,
    thAvg: 0,
    finalScore,
    gpa4: LETTER_GPA4[letter],
    letterGrade: letter,
    isDuThi: true,
    isVangThi: false,
    so_buoi_vang: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const TARGET = 500;

const run = async () => {
  await connectDatabase();
  console.log("=== RESET & SEED CNTT ONLY ===\n");

  // 1. Xóa dữ liệu sinh viên
  console.log(
    "Bước 1: Xóa toàn bộ Student / Grade / Prediction / StudentCurriculum...",
  );
  const [rSt, rGr, rPr, rSc] = await Promise.all([
    Student.deleteMany({}),
    Grade.deleteMany({}),
    Prediction.deleteMany({}),
    StudentCurriculum.deleteMany({}),
  ]);
  console.log(
    `  ✓ ${rSt.deletedCount} sinh viên, ${rGr.deletedCount} điểm, ${rPr.deletedCount} dự đoán, ${rSc.deletedCount} lộ trình\n`,
  );

  // 2. Xóa khoa / ngành / lớp không phải CNTT
  console.log("Bước 2: Xóa khoa / ngành / lớp không phải CNTT...");
  const cnttDept = await Department.findOne({ code: "CNTT" });
  if (!cnttDept) throw new Error("Không tìm thấy Department CNTT!");

  const otherDepts = await Department.find({ _id: { $ne: cnttDept._id } })
    .select("_id")
    .lean();
  const otherDeptIds = otherDepts.map((d) => d._id);

  const [rDept, rMajor, rClass] = await Promise.all([
    Department.deleteMany({ _id: { $in: otherDeptIds } }),
    Major.deleteMany({ departmentId: { $in: otherDeptIds } }),
    ClassModel.deleteMany({ departmentId: { $in: otherDeptIds } }),
  ]);
  console.log(
    `  ✓ Xóa ${rDept.deletedCount} khoa, ${rMajor.deletedCount} ngành, ${rClass.deletedCount} lớp ngoài CNTT\n`,
  );

  // 3. Lấy data CNTT hiện có
  console.log("Bước 3: Đọc dữ liệu CNTT...");
  const cnttMajors = await Major.find({ departmentId: cnttDept._id }).lean();
  const allCnttClasses = await ClassModel.find({
    departmentId: cnttDept._id,
  }).lean();

  const homeroomClasses = allCnttClasses.filter(
    (c) => !String(c.code).includes("-"),
  );
  const subjectClasses = allCnttClasses.filter((c) =>
    String(c.code).includes("-"),
  );

  if (!homeroomClasses.length) throw new Error("Không có lớp sinh hoạt CNTT!");
  if (!subjectClasses.length) throw new Error("Không có lớp học phần CNTT!");

  console.log(`  Lớp sinh hoạt: ${homeroomClasses.length}`);
  console.log(`  Lớp học phần: ${subjectClasses.length}`);

  // SchoolYear
  let schoolYear = await SchoolYear.findOne({ isActive: true });
  if (!schoolYear)
    schoolYear = await SchoolYear.findOne({}).sort({ createdAt: -1 });
  if (!schoolYear) throw new Error("Không có SchoolYear!");
  console.log(`  Năm học: ${schoolYear.name}`);

  // Curriculum CNTT (optional)
  const curriculum = await Curriculum.findOne({
    majorId: { $in: cnttMajors.map((m) => m._id) },
  }).lean();

  // 4. Group subject classes by semester để đăng ký hợp lý
  const semGroups = {};
  for (const cls of subjectClasses) {
    const sem = Number(cls.semester || 1);
    if (!semGroups[sem]) semGroups[sem] = [];
    semGroups[sem].push(cls);
  }
  const semesters = Object.keys(semGroups).map(Number).sort();
  console.log(`  Học kỳ có lớp học phần: ${semesters.join(", ")}\n`);

  // 5. Tạo 500 sinh viên
  console.log(`Bước 4: Tạo ${TARGET} sinh viên CNTT...`);

  const students = [];
  const grades = [];
  const curricula = [];

  // Tìm mã code cao nhất hiện tại để không trùng
  let maxCode = 0;
  const existing = await Student.find({}).select("studentCode").lean();
  for (const s of existing) {
    const num = Number(String(s.studentCode || "").replace(/\D/g, ""));
    if (!isNaN(num) && num > maxCode) maxCode = num;
  }

  for (let i = 0; i < TARGET; i++) {
    const seed = maxCode + i + 1;
    const studentId = new mongoose.Types.ObjectId();
    const homeroomClass = homeroomClasses[i % homeroomClasses.length];
    const major = cnttMajors[i % cnttMajors.length];

    const studentDoc = {
      _id: studentId,
      studentCode: `HS${String(seed).padStart(6, "0")}`,
      fullName: buildName(seed),
      dateOfBirth: new Date(2003, i % 12, 1 + (i % 27)),
      gender: i % 2 === 0 ? "male" : "female",
      classId: homeroomClass._id,
      majorId: major?._id || null,
      enrolledYear: "2025",
      homeClassCode: homeroomClass.code,
      parentName: buildParentName(seed),
      parentPhone: `09${String(10000000 + (seed % 90000000)).padStart(8, "0")}`,
      address: "TP HCM",
      status: "active",
    };
    students.push(studentDoc);

    // Đăng ký + tạo điểm cho các học kỳ đã qua (bỏ HK đang học = HK3 hoặc HK cuối)
    const registrations = [];
    const pastSemesters = semesters.slice(0, -1); // bỏ HK cuối cùng

    for (const sem of pastSemesters) {
      const semClasses = semGroups[sem] || [];
      // Mỗi sinh viên lấy tối đa 6 môn/HK, phân phối đều theo index
      const take = semClasses.filter(
        (_, idx) =>
          idx % Math.max(1, Math.floor(semClasses.length / 6)) ===
          i % Math.max(1, Math.floor(semClasses.length / 6)),
      );
      const classBatch = take.length ? take : semClasses.slice(0, 3);

      for (const cls of classBatch) {
        const gradeDoc = buildGrade(studentId, cls, schoolYear._id, seed);
        const gradeId = new mongoose.Types.ObjectId();
        grades.push({ _id: gradeId, ...gradeDoc });

        registrations.push({
          subjectId: cls.subjectId,
          classId: cls._id,
          schoolYear: schoolYear.name,
          semester: cls.semester,
          status: gradeDoc.letterGrade === "F" ? "failed" : "completed",
          gradeId,
          gpa4: gradeDoc.gpa4,
          letterGrade: gradeDoc.letterGrade,
        });
      }
    }

    // HK đang học (HK cuối) - đăng ký chưa có điểm
    const currentSem = semesters[semesters.length - 1];
    const currentClasses = (semGroups[currentSem] || []).slice(0, 4);
    for (const cls of currentClasses) {
      registrations.push({
        subjectId: cls.subjectId,
        classId: cls._id,
        schoolYear: schoolYear.name,
        semester: cls.semester,
        status: "registered",
        gradeId: null,
        gpa4: null,
        letterGrade: "",
      });
    }

    if (curriculum) {
      curricula.push({
        studentId,
        curriculumId: curriculum._id,
        majorId: major?._id || curriculum.majorId,
        enrolledYear: "2025",
        registrations,
      });
    }
  }

  // Insert theo chunk
  const CHUNK = 500;
  console.log(`  Inserting ${students.length} students...`);
  for (let i = 0; i < students.length; i += CHUNK) {
    await Student.insertMany(students.slice(i, i + CHUNK), {
      ordered: false,
    }).catch(() => {});
  }

  console.log(`  Inserting ${grades.length} grades...`);
  for (let i = 0; i < grades.length; i += CHUNK) {
    await Grade.insertMany(grades.slice(i, i + CHUNK), {
      ordered: false,
    }).catch(() => {});
  }

  if (curricula.length) {
    console.log(`  Inserting ${curricula.length} curricula...`);
    for (let i = 0; i < curricula.length; i += CHUNK) {
      await StudentCurriculum.insertMany(curricula.slice(i, i + CHUNK), {
        ordered: false,
      }).catch(() => {});
    }
  }

  // Cập nhật studentCount cho homeroom classes
  for (const hc of homeroomClasses) {
    const count = await Student.countDocuments({ classId: hc._id });
    await ClassModel.updateOne({ _id: hc._id }, { studentCount: count });
  }

  // Summary
  const [finalStudents, finalGrades, finalClasses, finalDepts] =
    await Promise.all([
      Student.countDocuments(),
      Grade.countDocuments(),
      ClassModel.countDocuments(),
      Department.countDocuments(),
    ]);

  console.log("\n=== HOÀN THÀNH ===");
  console.log(`  Departments: ${finalDepts} (chỉ CNTT)`);
  console.log(
    `  Classes: ${finalClasses} (${homeroomClasses.length} sinh hoạt + ${subjectClasses.length} học phần)`,
  );
  console.log(`  Students: ${finalStudents}`);
  console.log(`  Grades: ${finalGrades}`);
  console.log("\nBước tiếp: npm run predict:all (nếu AI engine đang chạy)");

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
