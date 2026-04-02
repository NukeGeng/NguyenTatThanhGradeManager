const XLSX = require("xlsx");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Subject = require("../models/Subject");

const CONDUCT_VALUES = ["Tốt", "Khá", "Trung Bình", "Yếu"];

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getSubjectMap = async () => {
  const subjects = await Subject.find({ isActive: true }).sort({ name: 1 });
  return new Map(subjects.map((subject) => [subject.code, subject.name]));
};

const getHeaderKey = (rawHeader, subjectMap) => {
  const header = normalizeText(rawHeader);

  if (header === "ma hs" || header === "ma hoc sinh") return "studentCode";
  if (header === "ho ten") return "studentName";
  if (header === "so buoi vang") return "attendanceAbsent";
  if (header === "hanh kiem") return "conductScore";

  for (const [code, name] of subjectMap.entries()) {
    const normalizedName = normalizeText(name);
    if (header === normalizedName || header === normalizeText(code)) {
      return code;
    }
  }

  return null;
};

const parseExcelFile = (buffer, subjectMap) => {
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
      attendanceAbsent: 0,
      conductScore: null,
      subjects: {},
    };

    Object.entries(row).forEach(([header, value]) => {
      const key = getHeaderKey(header, subjectMap);
      if (!key) return;

      if (key === "studentCode") {
        mappedRow.studentCode = String(value || "").trim();
        return;
      }

      if (key === "studentName") {
        mappedRow.studentName = String(value || "").trim();
        return;
      }

      if (key === "attendanceAbsent") {
        mappedRow.attendanceAbsent = value;
        return;
      }

      if (key === "conductScore") {
        mappedRow.conductScore = value;
        return;
      }

      mappedRow.subjects[key] = value;
    });

    return mappedRow;
  });
};

const validateRows = async (
  rows,
  classId,
  semester,
  schoolYearId,
  subjectMap,
) => {
  const errors = [];
  const validRows = [];

  const normalizedSemester = Number(semester);

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

  const subjectCodes = [...subjectMap.keys()];
  const subjects = await Subject.find({ code: { $in: subjectCodes } }).select(
    "_id code",
  );
  const subjectEntityMap = new Map(subjects.map((item) => [item.code, item]));

  const studentCodes = rows
    .map((row) => String(row.studentCode || "").trim())
    .filter(Boolean);

  const students = await Student.find({
    classId,
    studentCode: { $in: studentCodes },
  }).select("_id studentCode fullName classId");

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

    const scores = [];
    let hasRowError = false;

    for (const code of subjectCodes) {
      const rawValue = row.subjects?.[code];
      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ""
      ) {
        continue;
      }

      const numericScore = Number(rawValue);
      if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
        hasRowError = true;
        errors.push({
          row: row.row,
          studentCode,
          studentName: student.fullName,
          error: `Điểm môn ${subjectMap.get(code)} không hợp lệ: '${rawValue}'`,
        });
        break;
      }

      const subjectEntity = subjectEntityMap.get(code);
      if (!subjectEntity) {
        hasRowError = true;
        errors.push({
          row: row.row,
          studentCode,
          studentName: student.fullName,
          error: `Môn học ${code} không tồn tại trong hệ thống`,
        });
        break;
      }

      scores.push({
        subjectId: subjectEntity._id,
        subjectCode: code,
        score: numericScore,
      });
    }

    if (hasRowError) continue;

    if (scores.length === 0) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: student.fullName,
        error: "Không có điểm môn học hợp lệ",
      });
      continue;
    }

    const attendanceAbsent = Number(row.attendanceAbsent ?? 0);
    if (Number.isNaN(attendanceAbsent) || attendanceAbsent < 0) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: student.fullName,
        error: `Số buổi vắng không hợp lệ: '${row.attendanceAbsent}'`,
      });
      continue;
    }

    const conductScore = row.conductScore
      ? String(row.conductScore).trim()
      : null;

    if (conductScore && !CONDUCT_VALUES.includes(conductScore)) {
      errors.push({
        row: row.row,
        studentCode,
        studentName: student.fullName,
        error: `Hạnh kiểm không hợp lệ: '${row.conductScore}'`,
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
        schoolYearId,
        semester: normalizedSemester,
        scores,
        attendanceAbsent,
        conductScore,
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

const generateTemplateWorkbook = (subjectMap) => {
  const workbook = XLSX.utils.book_new();
  const headers = [
    "Mã HS",
    "Họ tên",
    ...[...subjectMap.values()],
    "Số buổi vắng",
    "Hạnh kiểm",
  ];

  const sampleRows = [
    [
      "HS0001",
      "Nguyễn Văn A",
      ...[...subjectMap.keys()].map(() => 7.5),
      2,
      "Khá",
    ],
    ["HS0002", "Trần Thị B", ...[...subjectMap.keys()].map(() => 8), 0, "Tốt"],
    [
      "HS0003",
      "Lê Văn C",
      ...[...subjectMap.keys()].map(() => 6.5),
      4,
      "Trung Bình",
    ],
  ];

  const templateSheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");

  const guideRows = [
    ["HƯỚNG DẪN IMPORT"],
    ["- Điểm hợp lệ: 0 đến 10"],
    ["- Hạnh kiểm hợp lệ: Tốt | Khá | Trung Bình | Yếu"],
    ["- Mã HS phải đúng với lớp đã chọn"],
    ["- Danh sách môn hợp lệ:"],
    ...[...subjectMap.entries()].map(([code, name]) => [`${code}: ${name}`]),
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Hướng dẫn");

  return workbook;
};

module.exports = {
  getSubjectMap,
  normalizeText,
  getHeaderKey,
  parseExcelFile,
  validateRows,
  importValidRows,
  generateTemplateWorkbook,
};
