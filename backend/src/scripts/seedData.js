const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const connectDatabase = require("../config/database");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const User = require("../models/User");
const SchoolYear = require("../models/SchoolYear");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Grade = require("../models/Grade");

dotenv.config();

const buildStudents = (classes) => {
  const names = [
    "Nguyễn Văn An",
    "Trần Thị Bình",
    "Lê Hoàng Cường",
    "Phạm Thu Dung",
    "Hoàng Minh Đức",
    "Đặng Hải Hà",
    "Bùi Gia Huy",
    "Vũ Bảo Khánh",
    "Đỗ Minh Long",
    "Phan Quỳnh Mai",
    "Ngô Thành Nam",
    "Lý Thu Oanh",
    "Dương Gia Phúc",
    "Đinh Bích Quyên",
    "Võ Quốc Sơn",
    "Huỳnh Thanh Tâm",
    "Trương Minh Tú",
    "Phùng Ngọc Uyên",
    "Lâm Quốc Việt",
    "Tạ Bảo Yến",
    "Mai Gia Bảo",
    "Đoàn Ngọc Chi",
    "Triệu Minh Duy",
    "Hà Thu Giang",
    "Kiều Quốc Hưng",
    "Lưu Khánh Linh",
    "Chu Minh Phát",
    "Cao Như Quỳnh",
    "Thái Đức Sang",
    "Quách Bảo Trâm",
  ];

  return names.map((fullName, index) => {
    const classRef = classes[index % classes.length];
    return {
      studentCode: `HS${String(index + 1).padStart(4, "0")}`,
      fullName,
      classId: classRef._id,
      gender: index % 2 === 0 ? "male" : "female",
      status: "active",
      parentPhone: `09${String(10000000 + index)}`,
      parentName: `PH ${fullName}`,
    };
  });
};

const buildSampleScores = (subjects) =>
  subjects.map((subject) => ({
    subjectId: subject._id,
    subjectCode: subject.code,
    score: Number((6 + Math.random() * 3.5).toFixed(1)),
  }));

const seed = async () => {
  await connectDatabase();

  const departments = [
    { code: "CNTT", name: "Công nghệ Thông tin" },
    { code: "KTKT", name: "Kỹ thuật - Kinh tế" },
    { code: "QTKD", name: "Quản trị Kinh doanh" },
  ];

  await Department.insertMany(departments, { ordered: false }).catch(() => {});
  const departmentDocs = await Department.find({
    code: { $in: departments.map((item) => item.code) },
  });
  const departmentMap = new Map(
    departmentDocs.map((item) => [item.code, item]),
  );

  const subjectSeeds = [
    {
      code: "ltcb",
      name: "Lập trình cơ bản",
      departmentCode: "CNTT",
      semester: 1,
      coefficient: 2,
    },
    {
      code: "csdl",
      name: "Cơ sở dữ liệu",
      departmentCode: "CNTT",
      semester: 2,
      coefficient: 2,
    },
    {
      code: "mmt",
      name: "Mạng máy tính",
      departmentCode: "CNTT",
      semester: 2,
      coefficient: 1,
    },
    {
      code: "ktpm",
      name: "Kỹ thuật phần mềm",
      departmentCode: "CNTT",
      semester: 2,
      coefficient: 2,
    },
    {
      code: "co",
      name: "Cơ học",
      departmentCode: "KTKT",
      semester: 1,
      coefficient: 2,
    },
    {
      code: "vl",
      name: "Vật lý đại cương",
      departmentCode: "KTKT",
      semester: 1,
      coefficient: 1,
    },
    {
      code: "ktvm",
      name: "Kinh tế vi mô",
      departmentCode: "QTKD",
      semester: 1,
      coefficient: 2,
    },
    {
      code: "ktvm2",
      name: "Kinh tế vĩ mô",
      departmentCode: "QTKD",
      semester: 2,
      coefficient: 2,
    },
  ]
    .filter((item) => departmentMap.has(item.departmentCode))
    .map((item) => ({
      code: item.code,
      name: item.name,
      departmentId: departmentMap.get(item.departmentCode)._id,
      semester: item.semester,
      coefficient: item.coefficient,
      category: "specialized",
    }));

  await Subject.insertMany(subjectSeeds, { ordered: false }).catch(() => {});

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const teacherPassword = await bcrypt.hash("Teacher@123", 10);

  const users = [
    {
      name: "System Admin",
      email: "admin@nttu.edu.vn",
      password: adminPassword,
      role: "admin",
      departmentIds: [],
    },
    {
      name: "Giáo viên 1",
      email: "gv1@nttu.edu.vn",
      password: teacherPassword,
      role: "teacher",
      departmentIds: [departmentMap.get("CNTT")?._id].filter(Boolean),
    },
    {
      name: "Giáo viên 2",
      email: "gv2@nttu.edu.vn",
      password: teacherPassword,
      role: "teacher",
      departmentIds: [
        departmentMap.get("CNTT")?._id,
        departmentMap.get("KTKT")?._id,
      ].filter(Boolean),
    },
  ];

  await User.insertMany(users, { ordered: false }).catch(() => {});

  const schoolYearPayload = {
    name: "2024-2025",
    startDate: new Date("2024-09-01"),
    endDate: new Date("2025-05-31"),
    isCurrent: true,
    semesters: [
      {
        semesterNumber: 1,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-01-15"),
        isCurrent: true,
      },
      {
        semesterNumber: 2,
        startDate: new Date("2025-01-16"),
        endDate: new Date("2025-05-31"),
        isCurrent: false,
      },
    ],
  };

  await SchoolYear.updateOne(
    { name: schoolYearPayload.name },
    { $setOnInsert: schoolYearPayload },
    { upsert: true },
  );
  const schoolYear = await SchoolYear.findOne({ name: schoolYearPayload.name });

  const teachers = await User.find({ role: "teacher" });
  const teacher1 = teachers.find((item) => item.email === "gv1@nttu.edu.vn");
  const teacher2 = teachers.find((item) => item.email === "gv2@nttu.edu.vn");

  const classPayloads = [
    {
      name: "CNTT01",
      departmentId: departmentMap.get("CNTT")?._id,
      gradeLevel: 11,
      schoolYearId: schoolYear?._id,
      teacherId: teacher1?._id || null,
    },
    {
      name: "CNTT02",
      departmentId: departmentMap.get("CNTT")?._id,
      gradeLevel: 11,
      schoolYearId: schoolYear?._id,
      teacherId: teacher2?._id || null,
    },
    {
      name: "KTKT01",
      departmentId: departmentMap.get("KTKT")?._id,
      gradeLevel: 12,
      schoolYearId: schoolYear?._id,
      teacherId: teacher2?._id || null,
    },
  ].filter((item) => item.departmentId && item.schoolYearId);

  for (const payload of classPayloads) {
    await Class.updateOne(
      { name: payload.name, schoolYearId: payload.schoolYearId },
      { $setOnInsert: payload },
      { upsert: true },
    );
  }

  const classes = await Class.find({ schoolYearId: schoolYear?._id });
  const students = buildStudents(classes);
  await Student.insertMany(students, { ordered: false }).catch(() => {});

  for (const classDoc of classes) {
    const count = await Student.countDocuments({ classId: classDoc._id });
    classDoc.studentCount = count;
    await classDoc.save();
  }

  const allSubjects = await Subject.find({ isActive: true });
  const allStudents = await Student.find({
    classId: { $in: classes.map((item) => item._id) },
  });

  const gradeDocs = allStudents.map((student) => {
    const classDoc = classes.find(
      (item) => String(item._id) === String(student.classId),
    );
    const classSubjects = allSubjects.filter(
      (subject) =>
        String(subject.departmentId) === String(classDoc.departmentId),
    );

    return {
      studentId: student._id,
      classId: classDoc._id,
      departmentId: classDoc.departmentId,
      schoolYearId: schoolYear._id,
      semester: 1,
      scores: buildSampleScores(classSubjects),
      attendanceAbsent: Math.floor(Math.random() * 5),
      conductScore: ["Tốt", "Khá", "Trung Bình"][Math.floor(Math.random() * 3)],
      enteredBy: teacher1?._id || null,
    };
  });

  await Grade.insertMany(gradeDocs, { ordered: false }).catch(() => {});

  console.log("Seed data completed");
  process.exit(0);
};

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
