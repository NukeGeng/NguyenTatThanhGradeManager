const XLSX = require("xlsx");
const Student = require("../models/Student");
const Grade = require("../models/Grade");

const CONDUCT_VALUES = ["Tốt", "Khá", "Trung Bình", "Yếu"];

const SUBJECT_HEADER_MAP = {
  toan: "Toán",
  van: "Ngữ Văn",
  anh: "Tiếng Anh",
  ly: "Vật Lý",
  hoa: "Hóa Học",
  sinh: "Sinh Học",
  su: "Lịch Sử",
  dia: "Địa Lý",
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getHeaderKey = (rawHeader) => {
  const header = normalizeText(rawHeader);

  if (header === "ma hs" || header === "ma hoc sinh") {
    return "studentCode";
  }

  if (header === "ho ten") {
    return "studentName";
  }

  if (header === "toan") return "toan";
  if (header === "ngu van" || header === "van") return "van";
  if (header === "tieng anh" || header === "anh") return "anh";
  if (header === "vat ly" || header === "ly") return "ly";
  if (header === "hoa hoc" || header === "hoa") return "hoa";
  if (header === "sinh hoc" || header === "sinh") return "sinh";
  if (header === "lich su" || header === "su") return "su";
  if (header === "dia ly" || header === "dia") return "dia";

  if (header === "so buoi vang") {
    return "attendanceAbsent";
  }

  if (header === "hanh kiem") {
    return "conductScore";
  }

  return null;
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
      attendanceAbsent: 0,
      conductScore: null,
      subjects: {},
    };

    Object.entries(row).forEach(([header, value]) => {
      const key = getHeaderKey(header);
      if (!key) {
        return;
      }

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

const validateRows = async (rows, classId, semester, schoolYearId) => {
  const errors = [];
  const validRows = [];

  const normalizedSemester = Number(semester);
  const normalizedSchoolYear = String(schoolYearId || "").trim();

  if (!classId || !normalizedSemester || !normalizedSchoolYear) {
    return {
      validRows: [],
      errorRows: [
        {
          row: 0,
          studentCode: "",
          error: "Thiếu classId, semester hoặc schoolYearId",
        },
      ],
    };
  }

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
        error: "Không tìm thấy học sinh",
      });
      continue;
    }

    const subjects = {};
    let hasSubjectValue = false;
    let hasRowError = false;

    Object.keys(SUBJECT_HEADER_MAP).forEach((subjectKey) => {
      const rawValue = row.subjects?.[subjectKey];

      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ""
      ) {
        return;
      }

      const numericScore = Number(rawValue);
      if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
        hasRowError = true;
        errors.push({
          row: row.row,
          studentCode,
          studentName: student.fullName,
          error: `Điểm ${SUBJECT_HEADER_MAP[subjectKey]} không hợp lệ: '${rawValue}'`,
        });
        return;
      }

      subjects[subjectKey] = numericScore;
      hasSubjectValue = true;
    });

    if (hasRowError) {
      continue;
    }

    if (!hasSubjectValue) {
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
        semester: normalizedSemester,
        schoolYear: normalizedSchoolYear,
        subjects,
        attendanceAbsent,
        conductScore,
      },
    });
  }

  return {
    validRows,
    errorRows: errors,
  };
};

const importValidRows = async (validRows, enteredBy) => {
  const docs = validRows.map((item) => ({
    ...item.gradePayload,
    enteredBy,
  }));

  if (docs.length === 0) {
    return {
      importedCount: 0,
      duplicateErrors: [],
    };
  }

  try {
    const inserted = await Grade.insertMany(docs, { ordered: false });
    return {
      importedCount: inserted.length,
      duplicateErrors: [],
    };
  } catch (error) {
    if (!error?.writeErrors) {
      throw error;
    }

    const duplicateErrors = error.writeErrors
      .filter((writeError) => writeError.code === 11000)
      .map((writeError) => ({
        index: writeError.index,
        message: "Đã tồn tại bảng điểm học kỳ này",
      }));

    const insertedCount = docs.length - error.writeErrors.length;

    return {
      importedCount: insertedCount,
      duplicateErrors,
    };
  }
};

module.exports = {
  parseExcelFile,
  validateRows,
  importValidRows,
};
