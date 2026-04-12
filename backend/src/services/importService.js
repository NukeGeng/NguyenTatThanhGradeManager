const XLSX = require("xlsx");
const Class = require("../models/Class");
const Student = require("../models/Student");
const StudentCurriculum = require("../models/StudentCurriculum");
const Grade = require("../models/Grade");

const DEFAULT_TX_COUNT = 3;
const DEFAULT_TH_COUNT = 3;

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const resolveRefId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value?._id) {
    return String(value._id);
  }

  return null;
};

const getHeaderKey = (rawHeader) => {
  const header = normalizeText(rawHeader).replace(/[_\-.]/g, " ");

  if (header === "ma hs" || header === "ma hoc sinh") return "studentCode";
  if (header === "ho ten" || header === "ho va ten") return "studentName";

  if (
    header === "gk" ||
    header === "diem gk" ||
    header === "giua ky" ||
    header === "diem giua ky"
  ) {
    return "gkScore";
  }

  if (
    header === "tkt" ||
    header === "diem tkt" ||
    header === "ket thuc hp" ||
    header === "diem ket thuc hp"
  ) {
    return "tktScore";
  }

  if (
    header === "du thi" ||
    header === "duoc du thi" ||
    header === "duoc du thi hp" ||
    header === "duoc du thi ket thuc hp"
  ) {
    return "isDuThi";
  }

  if (header === "vang thi" || header === "co vang thi") {
    return "isVangThi";
  }

  const txMatch = header.match(/^(?:diem\s*)?tx\s*(\d+)$/);
  if (txMatch) {
    return { type: "txScores", index: Math.max(0, Number(txMatch[1]) - 1) };
  }

  const thMatch = header.match(/^(?:diem\s*)?th\s*(\d+)$/);
  if (thMatch) {
    return { type: "thScores", index: Math.max(0, Number(thMatch[1]) - 1) };
  }

  return null;
};

const parseBooleanValue = (rawValue, defaultValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return defaultValue;
  }

  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  const normalized = normalizeText(rawValue);
  if (["1", "true", "yes", "y", "co", "dat", "x"].includes(normalized)) {
    return true;
  }

  if (
    ["0", "false", "no", "n", "khong", "ko", "v", "vang"].includes(normalized)
  ) {
    return false;
  }

  return defaultValue;
};

const parseNullableScore = (rawValue) => {
  if (
    rawValue === null ||
    rawValue === undefined ||
    String(rawValue).trim() === ""
  ) {
    return { value: null, isValid: true };
  }

  const numeric = Number(rawValue);
  if (Number.isNaN(numeric) || numeric < 0 || numeric > 10) {
    return { value: null, isValid: false };
  }

  return { value: Number(numeric.toFixed(2)), isValid: true };
};

const normalizeClassConfig = (classData) => {
  const txCount = Math.max(1, Number(classData?.txCount || DEFAULT_TX_COUNT));
  const hasTh = Number(classData?.weights?.th || 0) > 0;
  const thCount = hasTh ? DEFAULT_TH_COUNT : 0;

  return {
    txCount,
    thCount,
    hasTh,
    weights: {
      tx: Number(classData?.weights?.tx ?? 10),
      gk: Number(classData?.weights?.gk ?? 30),
      th: Number(classData?.weights?.th ?? 0),
      tkt: Number(classData?.weights?.tkt ?? 60),
    },
  };
};

const getEnrolledStudentsByClassId = async (classId, studentCodes = []) => {
  const [directStudentIds, registeredStudentIds] = await Promise.all([
    Student.distinct("_id", { classId }),
    StudentCurriculum.distinct("studentId", {
      "registrations.classId": classId,
    }),
  ]);

  const studentIds = Array.from(
    new Set(
      [...directStudentIds, ...registeredStudentIds]
        .filter(Boolean)
        .map((item) => String(item)),
    ),
  );

  if (!studentIds.length) {
    return [];
  }

  const query = {
    _id: { $in: studentIds },
  };

  if (Array.isArray(studentCodes) && studentCodes.length) {
    query.studentCode = { $in: studentCodes };
  }

  return Student.find(query)
    .select("_id studentCode fullName classId")
    .sort({ fullName: 1 })
    .lean();
};

const parseExcelFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  });

  return rows.map((row, index) => {
    const mappedRow = {
      row: index + 2,
      studentCode: null,
      studentName: null,
      txScores: [],
      gkScore: null,
      thScores: [],
      tktScore: null,
      isDuThi: null,
      isVangThi: null,
    };

    Object.entries(row).forEach(([header, value]) => {
      const key = getHeaderKey(header);
      if (!key) return;

      if (typeof key === "string") {
        if (key === "studentCode") {
          mappedRow.studentCode = String(value || "").trim();
          return;
        }

        if (key === "studentName") {
          mappedRow.studentName = String(value || "").trim();
          return;
        }

        if (key === "gkScore") {
          mappedRow.gkScore = value;
          return;
        }

        if (key === "tktScore") {
          mappedRow.tktScore = value;
          return;
        }

        if (key === "isDuThi") {
          mappedRow.isDuThi = value;
          return;
        }

        if (key === "isVangThi") {
          mappedRow.isVangThi = value;
        }

        return;
      }

      if (key.type === "txScores") {
        mappedRow.txScores[key.index] = value;
        return;
      }

      if (key.type === "thScores") {
        mappedRow.thScores[key.index] = value;
      }
    });

    return mappedRow;
  });
};

const validateRows = async (rows, classData, semester, schoolYearId) => {
  const errors = [];
  const validRows = [];

  const normalizedSemester = Number(semester);
  const classId = resolveRefId(classData?._id);

  if (!classId || !normalizedSemester || !schoolYearId) {
    return {
      validRows: [],
      errorRows: [
        {
          row: 0,
          studentCode: "",
          studentName: "",
          error: "Thiếu classId, semester hoặc schoolYearId",
        },
      ],
    };
  }

  if (
    Number(classData.semester) !== normalizedSemester ||
    String(resolveRefId(classData.schoolYearId)) !== String(schoolYearId)
  ) {
    return {
      validRows: [],
      errorRows: [
        {
          row: 0,
          studentCode: "",
          studentName: "",
          error: "Dữ liệu lớp không khớp với học kỳ hoặc năm học đã chọn",
        },
      ],
    };
  }

  const classConfig = normalizeClassConfig(classData);

  const studentCodes = rows
    .map((row) => String(row.studentCode || "").trim())
    .filter(Boolean);

  const students = await getEnrolledStudentsByClassId(classId, studentCodes);

  const studentMap = new Map(
    students.map((student) => [student.studentCode, student]),
  );

  for (const row of rows) {
    const studentCode = String(row.studentCode || "").trim();

    if (!studentCode) {
      errors.push({
        row: row.row,
        studentCode: "",
        studentName: row.studentName || "",
        error: "Thiếu Mã HS",
      });
      continue;
    }

    const student = studentMap.get(studentCode);
    if (!student) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: row.studentName || "",
        error: "Không tìm thấy học sinh trong lớp đã chọn",
      });
      continue;
    }

    const txScores = Array.from({ length: classConfig.txCount }, () => null);
    let hasRowError = false;

    for (let index = 0; index < classConfig.txCount; index += 1) {
      const rawTx = row.txScores?.[index];
      const parsed = parseNullableScore(rawTx);
      if (!parsed.isValid) {
        hasRowError = true;
        errors.push({
          row: row.row,
          studentCode,
          studentName: student.fullName,
          error: `Điểm TX ${index + 1} không hợp lệ: '${rawTx}'`,
        });
        break;
      }

      txScores[index] = parsed.value;
    }

    if (hasRowError) {
      continue;
    }

    const gkParsed = parseNullableScore(row.gkScore);
    if (!gkParsed.isValid) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: student.fullName,
        error: `Điểm GK không hợp lệ: '${row.gkScore}'`,
      });
      continue;
    }

    const thScores = Array.from({ length: classConfig.thCount }, () => null);
    for (let index = 0; index < classConfig.thCount; index += 1) {
      const rawTh = row.thScores?.[index];
      const parsed = parseNullableScore(rawTh);
      if (!parsed.isValid) {
        hasRowError = true;
        errors.push({
          row: row.row,
          studentCode,
          studentName: student.fullName,
          error: `Điểm TH ${index + 1} không hợp lệ: '${rawTh}'`,
        });
        break;
      }

      thScores[index] = parsed.value;
    }

    if (hasRowError) {
      continue;
    }

    const tktParsed = parseNullableScore(row.tktScore);
    if (!tktParsed.isValid) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: student.fullName,
        error: `Điểm TKT không hợp lệ: '${row.tktScore}'`,
      });
      continue;
    }

    const isDuThi = parseBooleanValue(row.isDuThi, true);
    const isVangThi = parseBooleanValue(row.isVangThi, false);
    const tktScore = isVangThi || !isDuThi ? null : tktParsed.value;

    const hasAnyScore =
      txScores.some((value) => value !== null) ||
      thScores.some((value) => value !== null) ||
      gkParsed.value !== null ||
      tktScore !== null;

    if (!hasAnyScore) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: student.fullName,
        error: "Không có điểm hợp lệ để import",
      });
      continue;
    }

    validRows.push({
      row: row.row,
      studentCode,
      studentName: student.fullName,
      gradePayload: {
        studentId: student._id,
        classId,
        subjectId: classData.subjectId,
        departmentId: classData.departmentId,
        schoolYearId,
        semester: normalizedSemester,
        weights: classConfig.weights,
        txScores,
        gkScore: gkParsed.value,
        thScores,
        tktScore,
        isDuThi,
        isVangThi,
      },
    });
  }

  return { validRows, errorRows: errors };
};

const importValidRows = async (validRows, enteredBy) => {
  const docs = validRows.map((item) => ({
    ...item.gradePayload,
    enteredBy,
  }));

  if (docs.length === 0) {
    return { importedCount: 0, duplicateErrors: [] };
  }

  try {
    const inserted = await Grade.insertMany(docs, { ordered: false });
    return { importedCount: inserted.length, duplicateErrors: [] };
  } catch (error) {
    if (!error?.writeErrors) {
      throw error;
    }

    const duplicateErrors = error.writeErrors
      .filter((writeError) => writeError.code === 11000)
      .map((writeError) => ({
        index: writeError.index,
        message: "Đã tồn tại bảng điểm của sinh viên trong lớp học phần này",
      }));

    const importedCount = docs.length - error.writeErrors.length;
    return { importedCount, duplicateErrors };
  }
};

const generateTemplateWorkbook = (templateOptions = {}) => {
  const workbook = XLSX.utils.book_new();
  const txCount = Math.max(
    1,
    Number(templateOptions.txCount || DEFAULT_TX_COUNT),
  );
  const hasTh = templateOptions.hasTh !== false;
  const thCount = hasTh
    ? Math.max(1, Number(templateOptions.thCount || DEFAULT_TH_COUNT))
    : 0;

  const headers = [
    "Mã HS",
    "Họ tên",
    ...Array.from({ length: txCount }, (_, index) => `TX${index + 1}`),
    "GK",
    ...Array.from({ length: thCount }, (_, index) => `TH${index + 1}`),
    "TKT",
    "Được dự thi HP",
    "Vắng thi",
  ];

  const enrolledStudents = Array.isArray(templateOptions.students)
    ? templateOptions.students
    : [];

  const makeBlankScoreRow = (studentCode, studentName) => [
    studentCode,
    studentName,
    ...Array.from({ length: txCount }, () => ""),
    "",
    ...Array.from({ length: thCount }, () => ""),
    "",
    1,
    0,
  ];

  const sampleRows = enrolledStudents.length
    ? enrolledStudents.map((student) =>
        makeBlankScoreRow(student.studentCode || "", student.fullName || ""),
      )
    : [
        makeBlankScoreRow("HS0001", "Nguyen Van A"),
        makeBlankScoreRow("HS0002", "Tran Thi B"),
        makeBlankScoreRow("HS0003", "Le Van C"),
      ];

  const templateSheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");

  const guideRows = [
    ["HƯỚNG DẪN IMPORT ĐIỂM"],
    [
      templateOptions.classCode
        ? `Lớp học phần: ${templateOptions.classCode}${
            templateOptions.className ? ` - ${templateOptions.className}` : ""
          }`
        : "Lớp học phần: theo lựa chọn trên màn import",
    ],
    [
      templateOptions.classCode
        ? `So sinh vien trong mau: ${Number(templateOptions.studentCount || 0)}`
        : "Mau chung: chua gan danh sach sinh vien",
    ],
    ["- Điểm hợp lệ: 0 đến 10"],
    ["- TX/GK/TH/TKT để trống nếu chưa có điểm"],
    ["- Cột 'Được dự thi HP': 1/0, true/false, có/không"],
    ["- Cột 'Vắng thi': 1/0, true/false, có/không"],
    ["- Mã HS phải thuộc đúng lớp học phần đang chọn"],
    ["- Cấu trúc cột phải giữ nguyên như sheet Template"],
  ];

  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Hướng dẫn");

  return workbook;
};

const getTemplateOptionsByClassId = async (classId) => {
  if (!classId) {
    return null;
  }

  const classData = await Class.findById(classId)
    .select("_id code name txCount weights departmentId")
    .lean();

  if (!classData) {
    return null;
  }

  const classConfig = normalizeClassConfig(classData);
  const students = await getEnrolledStudentsByClassId(classData._id);

  return {
    classCode: classData.code,
    className: classData.name || classData.code,
    departmentId: resolveRefId(classData.departmentId),
    txCount: classConfig.txCount,
    thCount: classConfig.thCount,
    hasTh: classConfig.hasTh,
    students: students.map((student) => ({
      _id: String(student._id),
      studentCode: String(student.studentCode || ""),
      fullName: String(student.fullName || ""),
    })),
    studentCount: students.length,
  };
};

module.exports = {
  normalizeText,
  getHeaderKey,
  parseExcelFile,
  validateRows,
  importValidRows,
  generateTemplateWorkbook,
  getTemplateOptionsByClassId,
};
