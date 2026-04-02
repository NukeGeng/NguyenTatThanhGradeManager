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

const buildScoreArray = (count) =>
  Array.from({ length: count }, () =>
    Number((5 + Math.random() * 4.8).toFixed(1)),
  );

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
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "csdl",
      name: "Cơ sở dữ liệu",
      departmentCode: "CNTT",
      semester: 2,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "mmt",
      name: "Mạng máy tính",
      departmentCode: "CNTT",
      semester: 2,
      credits: 2,
      coefficient: 1,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "ktpm",
      name: "Kỹ thuật phần mềm",
      departmentCode: "CNTT",
      semester: 2,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 20, th: 30, tkt: 40 },
      txCount: 3,
    },
    {
      code: "co",
      name: "Cơ học",
      departmentCode: "KTKT",
      semester: 1,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "vl",
      name: "Vật lý đại cương",
      departmentCode: "KTKT",
      semester: 1,
      credits: 2,
      coefficient: 1,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "ktvm",
      name: "Kinh tế vi mô",
      departmentCode: "QTKD",
      semester: 1,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "ktvm2",
      name: "Kinh tế vĩ mô",
      departmentCode: "QTKD",
      semester: 2,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
  ]
    .filter((item) => departmentMap.has(item.departmentCode))
    .map((item) => ({
      code: item.code,
      name: item.name,
      departmentId: departmentMap.get(item.departmentCode)._id,
      semester: item.semester,
      credits: item.credits,
      coefficient: item.coefficient,
      category: "theory",
      defaultWeights: item.defaultWeights,
      txCount: item.txCount,
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
      code: "CNTT-LTCB-01",
      name: "Lớp Lập trình cơ bản 01",
      subjectCode: "ltcb",
      departmentId: departmentMap.get("CNTT")?._id,
      schoolYearId: schoolYear?._id,
      semester: 1,
      teacherId: teacher1?._id || null,
    },
    {
      code: "CNTT-CSDL-01",
      name: "Lớp Cơ sở dữ liệu 01",
      subjectCode: "csdl",
      departmentId: departmentMap.get("CNTT")?._id,
      schoolYearId: schoolYear?._id,
      semester: 2,
      teacherId: teacher2?._id || null,
    },
    {
      code: "KTKT-CO-01",
      name: "Lớp Cơ học 01",
      subjectCode: "co",
      departmentId: departmentMap.get("KTKT")?._id,
      schoolYearId: schoolYear?._id,
      semester: 1,
      teacherId: teacher2?._id || null,
    },
  ].filter((item) => item.departmentId && item.schoolYearId);

  const subjectDocs = await Subject.find({
    code: { $in: classPayloads.map((item) => item.subjectCode) },
  }).select("_id code defaultWeights txCount departmentId");

  const subjectByCode = new Map(
    subjectDocs.map((subject) => [subject.code, subject]),
  );

  const normalizedClassPayloads = classPayloads
    .map((payload) => {
      const subject = subjectByCode.get(payload.subjectCode);
      if (!subject) {
        return null;
      }

      return {
        code: payload.code,
        name: payload.name,
        subjectId: subject._id,
        departmentId: payload.departmentId,
        schoolYearId: payload.schoolYearId,
        semester: payload.semester,
        teacherId: payload.teacherId,
        weights: subject.defaultWeights,
        txCount: subject.txCount,
      };
    })
    .filter(Boolean);

  for (const payload of normalizedClassPayloads) {
    await Class.updateOne(
      {
        code: payload.code,
        schoolYearId: payload.schoolYearId,
        semester: payload.semester,
      },
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

  const allStudents = await Student.find({
    classId: { $in: classes.map((item) => item._id) },
  });

  const gradeDocs = allStudents.map((student) => {
    const classDoc = classes.find(
      (item) => String(item._id) === String(student.classId),
    );
    const txCount = Number(classDoc.txCount || 3);
    const hasPractice = Number(classDoc.weights?.th || 0) > 0;

    return {
      studentId: student._id,
      classId: classDoc._id,
      subjectId: classDoc.subjectId,
      departmentId: classDoc.departmentId,
      schoolYearId: schoolYear._id,
      semester: classDoc.semester,
      weights: classDoc.weights,
      txScores: buildScoreArray(txCount),
      gkScore: Number((5 + Math.random() * 4.5).toFixed(1)),
      thScores: hasPractice ? buildScoreArray(2) : [],
      tktScore: Number((4 + Math.random() * 5.5).toFixed(1)),
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
