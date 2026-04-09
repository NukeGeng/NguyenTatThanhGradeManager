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
const Major = require("../models/Major");
const Curriculum = require("../models/Curriculum");

dotenv.config();

const buildStudents = (classes, majorByDepartmentCode) => {
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
    const departmentCode = classRef?.departmentCode || "";
    const majorRef = majorByDepartmentCode.get(departmentCode) || null;

    return {
      studentCode: `HS${String(index + 1).padStart(4, "0")}`,
      fullName,
      classId: classRef._id,
      majorId: majorRef?._id || null,
      enrolledYear: "2021",
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

  const majorSeeds = [
    {
      code: "KTPM",
      name: "Kỹ thuật phần mềm",
      departmentId: departmentMap.get("CNTT")?._id,
      totalCredits: 140,
      durationYears: 4,
      isActive: true,
    },
    {
      code: "HTTT",
      name: "Hệ thống thông tin",
      departmentId: departmentMap.get("CNTT")?._id,
      totalCredits: 138,
      durationYears: 4,
      isActive: true,
    },
  ].filter((item) => item.departmentId);

  await Major.insertMany(majorSeeds, { ordered: false }).catch(() => {});
  const majorDocs = await Major.find({ code: { $in: ["KTPM", "HTTT"] } });
  const majorMap = new Map(majorDocs.map((item) => [item.code, item]));

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
      code: "tthcm",
      name: "Tư tưởng Hồ Chí Minh",
      departmentCode: "CNTT",
      semester: 1,
      credits: 2,
      coefficient: 1,
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
      code: "ctdlgt",
      name: "Cấu trúc dữ liệu và giải thuật",
      departmentCode: "CNTT",
      semester: 2,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "hdh",
      name: "Hệ điều hành",
      departmentCode: "CNTT",
      semester: 3,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "cnpm",
      name: "Công nghệ phần mềm",
      departmentCode: "CNTT",
      semester: 3,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 20, th: 30, tkt: 40 },
      txCount: 3,
    },
    {
      code: "ttnt",
      name: "Trí tuệ nhân tạo",
      departmentCode: "CNTT",
      semester: 3,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    },
    {
      code: "attt",
      name: "An toàn thông tin",
      departmentCode: "CNTT",
      semester: 3,
      credits: 3,
      coefficient: 2,
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
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

  const curriculumSubjectCodes = [
    "ltcb",
    "tthcm",
    "csdl",
    "mmt",
    "ktpm",
    "ctdlgt",
    "hdh",
    "cnpm",
    "ttnt",
    "attt",
  ];

  const curriculumSubjects = await Subject.find({
    code: { $in: curriculumSubjectCodes },
  }).select("_id code name credits");

  const curriculumSubjectByCode = new Map(
    curriculumSubjects.map((subject) => [subject.code, subject]),
  );

  const curriculumLayout = [
    { code: "ltcb", year: 1, semester: 1, subjectType: "required" },
    { code: "tthcm", year: 1, semester: 1, subjectType: "required" },
    { code: "csdl", year: 1, semester: 2, subjectType: "required" },
    { code: "mmt", year: 1, semester: 2, subjectType: "required" },
    { code: "ktpm", year: 2, semester: 2, subjectType: "required" },
    { code: "ctdlgt", year: 2, semester: 2, subjectType: "prerequisite" },
    { code: "hdh", year: 2, semester: 3, subjectType: "required" },
    { code: "cnpm", year: 3, semester: 3, subjectType: "required" },
    { code: "ttnt", year: 4, semester: 1, subjectType: "elective" },
    { code: "attt", year: 4, semester: 2, subjectType: "elective" },
  ];

  const curriculumItems = curriculumLayout
    .map((item) => {
      const subject = curriculumSubjectByCode.get(item.code);
      if (!subject) {
        return null;
      }

      return {
        subjectId: subject._id,
        subjectCode: subject.code,
        subjectName: subject.name,
        credits: Number(subject.credits || 0),
        year: item.year,
        semester: item.semester,
        subjectType: item.subjectType,
        prerequisiteIds: [],
        note: "",
      };
    })
    .filter(Boolean);

  if (majorMap.get("KTPM") && curriculumItems.length > 0) {
    const totalCredits = curriculumItems.reduce(
      (sum, item) => sum + Number(item.credits || 0),
      0,
    );

    await Curriculum.updateOne(
      {
        majorId: majorMap.get("KTPM")._id,
        schoolYear: "2021-2025",
      },
      {
        $setOnInsert: {
          majorId: majorMap.get("KTPM")._id,
          schoolYear: "2021-2025",
          name: "CTĐT KTPM 2021",
          items: curriculumItems,
          totalCredits,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }

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
    endDate: new Date("2025-08-31"),
    isCurrent: true,
    semesters: [
      {
        semesterNumber: 1,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2024-12-31"),
        isCurrent: true,
        isOptional: false,
      },
      {
        semesterNumber: 2,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-04-30"),
        isCurrent: false,
        isOptional: false,
      },
      {
        semesterNumber: 3,
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-08-31"),
        isCurrent: false,
        isOptional: true,
      },
    ],
  };

  await SchoolYear.updateOne(
    { name: schoolYearPayload.name },
    { $set: schoolYearPayload },
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
    {
      code: "CNTT-HDH-HE-01",
      name: "Lớp Hệ điều hành hè 01",
      subjectCode: "hdh",
      departmentId: departmentMap.get("CNTT")?._id,
      schoolYearId: schoolYear?._id,
      semester: 3,
      teacherId: teacher1?._id || null,
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

  const classes = await Class.find({ schoolYearId: schoolYear?._id }).populate(
    "departmentId",
    "code",
  );
  const classesWithDepartmentCode = classes.map((item) => ({
    ...item.toObject(),
    departmentCode:
      typeof item.departmentId === "string"
        ? ""
        : item.departmentId?.code || "",
  }));

  const majorByDepartmentCode = new Map([
    ["CNTT", majorMap.get("KTPM") || null],
    ["KTKT", null],
    ["QTKD", null],
  ]);

  const students = buildStudents(
    classesWithDepartmentCode,
    majorByDepartmentCode,
  );
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
