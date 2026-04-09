const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const auth = require("../middleware/auth");
const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Class = require("../models/Class");
const SchoolYear = require("../models/SchoolYear");
const {
  getSubjectMap,
  parseExcelFile,
  validateRows,
  importValidRows,
  generateTemplateWorkbook,
} = require("../services/importService");

const router = express.Router();

const isValidSemester = (value) => [1, 2, 3].includes(Number(value));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isAllowed = /\.(xlsx|csv)$/i.test(file.originalname || "");
    if (!isAllowed) {
      return cb(new Error("Chỉ hỗ trợ file .xlsx hoặc .csv"));
    }
    return cb(null, true);
  },
});

const uploadSingleFile = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

router.use(auth);

const getAllowedDepartmentIds = (user) =>
  (user.departmentIds || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

const getAdvisingStudentIds = (user) =>
  (user.advisingStudentIds || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

const normalizeScoreArray = (scores) => {
  if (!Array.isArray(scores)) {
    return [];
  }

  return scores.map((score) => {
    if (score === null || score === undefined || score === "") {
      return null;
    }

    const numeric = Number(score);
    return Number.isNaN(numeric) ? null : numeric;
  });
};

const normalizeScore = (score) => {
  if (score === null || score === undefined || score === "") {
    return null;
  }

  const numeric = Number(score);
  return Number.isNaN(numeric) ? null : numeric;
};

const populateGradeQuery = (query) =>
  query
    .populate("studentId", "studentCode fullName classId")
    .populate(
      "classId",
      "code name subjectId semester departmentId schoolYearId weights txCount",
    )
    .populate("subjectId", "_id code name credits coefficient")
    .populate("schoolYearId", "_id name isCurrent");

router.get("/import/template", async (req, res, next) => {
  try {
    const subjectMap = await getSubjectMap();
    const workbook = generateTemplateWorkbook(subjectMap);
    const fileBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="grade_import_template.xlsx"',
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.status(200).send(fileBuffer);
  } catch (error) {
    return next(error);
  }
});

router.post("/import/preview", async (req, res, next) => {
  try {
    await uploadSingleFile(req, res);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Thiếu file upload",
      });
    }

    const { classId, semester, schoolYearId } = req.body;
    if (!classId || !semester || !schoolYearId) {
      return res.status(400).json({
        success: false,
        message: "classId, semester, schoolYearId là bắt buộc",
      });
    }

    const subjectMap = await getSubjectMap();
    const rows = parseExcelFile(req.file.buffer, subjectMap);
    const { validRows, errorRows } = await validateRows(
      rows,
      classId,
      semester,
      schoolYearId,
      subjectMap,
    );

    return res.status(200).json({
      success: true,
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errorRows.length,
      validRows,
      errorRows,
    });
  } catch (error) {
    if (
      error?.message?.includes("Chỉ hỗ trợ file") ||
      error?.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "File vượt quá 5MB"
            : error.message,
      });
    }

    return next(error);
  }
});

router.post("/import/excel", async (req, res, next) => {
  try {
    await uploadSingleFile(req, res);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Thiếu file upload",
      });
    }

    const { classId, semester, schoolYearId } = req.body;
    if (!classId || !semester || !schoolYearId) {
      return res.status(400).json({
        success: false,
        message: "classId, semester, schoolYearId là bắt buộc",
      });
    }

    const subjectMap = await getSubjectMap();
    const rows = parseExcelFile(req.file.buffer, subjectMap);
    const { validRows, errorRows } = await validateRows(
      rows,
      classId,
      semester,
      schoolYearId,
      subjectMap,
    );

    const { importedCount, duplicateErrors } = await importValidRows(
      validRows,
      req.user?._id,
    );

    const duplicateMapped = duplicateErrors.map((item) => {
      const rowData = validRows[item.index];
      return {
        row: rowData?.row ?? 0,
        studentCode: rowData?.studentCode ?? "",
        error: item.message,
      };
    });

    const allErrors = [...errorRows, ...duplicateMapped];
    const skipped = allErrors.length;

    return res.status(200).json({
      success: true,
      imported: importedCount,
      skipped,
      duplicates: duplicateMapped,
      errors: allErrors,
    });
  } catch (error) {
    if (
      error?.message?.includes("Chỉ hỗ trợ file") ||
      error?.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "File vượt quá 5MB"
            : error.message,
      });
    }

    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      return res.status(403).json({
        success: false,
        message: "Advisor không có quyền nhập điểm",
      });
    }

    const {
      studentId,
      classId,
      subjectId,
      semester,
      schoolYearId,
      weights,
      txScores,
      gkScore,
      thScores,
      tktScore,
      isDuThi,
      isVangThi,
      departmentId,
    } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({
        success: false,
        message: "studentId và classId là bắt buộc",
      });
    }

    const [student, classData] = await Promise.all([
      Student.findById(studentId),
      Class.findById(classId),
    ]);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (String(student.classId) !== String(classData._id)) {
      return res.status(400).json({
        success: false,
        message: "Học sinh không thuộc lớp đã chọn",
      });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);

      if (!allowedDepartmentIds.includes(String(classData.departmentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền nhập điểm cho lớp này",
        });
      }
    }

    const existedGrade = await Grade.findOne({
      studentId,
      classId,
    });

    if (existedGrade) {
      return res.status(409).json({
        success: false,
        message: "Bảng điểm của sinh viên trong lớp học phần này đã tồn tại",
      });
    }

    const finalSchoolYearId = schoolYearId || classData.schoolYearId;
    const finalSemester = semester || classData.semester;

    if (!isValidSemester(finalSemester)) {
      return res.status(400).json({
        success: false,
        message: "semester phải thuộc [1,2,3]",
      });
    }

    const schoolYear = await SchoolYear.findById(finalSchoolYearId);
    if (!schoolYear) {
      return res.status(404).json({
        success: false,
        message: "SchoolYear not found",
      });
    }

    const grade = await Grade.create({
      studentId,
      classId,
      subjectId: subjectId || classData.subjectId,
      departmentId: departmentId || classData.departmentId,
      schoolYearId: finalSchoolYearId,
      semester: Number(finalSemester),
      weights,
      txScores: normalizeScoreArray(txScores),
      gkScore: normalizeScore(gkScore),
      thScores: normalizeScoreArray(thScores),
      tktScore: normalizeScore(tktScore),
      isDuThi: isDuThi !== undefined ? Boolean(isDuThi) : true,
      isVangThi: isVangThi !== undefined ? Boolean(isVangThi) : false,
      enteredBy: req.user._id,
    });

    const populatedGrade = await populateGradeQuery(Grade.findById(grade._id));

    return res.status(201).json({
      success: true,
      data: populatedGrade,
      message: "Create grade successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bảng điểm của sinh viên trong lớp học phần này đã tồn tại",
      });
    }

    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      return res.status(403).json({
        success: false,
        message: "Advisor không có quyền sửa điểm",
      });
    }

    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    const classData = await Class.findById(grade.classId).select(
      "departmentId",
    );

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
      if (!allowedDepartmentIds.includes(String(classData?.departmentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền cập nhật điểm cho lớp này",
        });
      }
    }

    const allowedFields = [
      "txScores",
      "gkScore",
      "thScores",
      "tktScore",
      "isDuThi",
      "isVangThi",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "txScores" || field === "thScores") {
          grade[field] = normalizeScoreArray(req.body[field]);
        } else if (field === "gkScore" || field === "tktScore") {
          grade[field] = normalizeScore(req.body[field]);
        } else {
          grade[field] = req.body[field];
        }
      }
    });

    await grade.save();

    const updatedGrade = await populateGradeQuery(Grade.findById(grade._id));

    return res.status(200).json({
      success: true,
      data: updatedGrade,
      message: "Update grade successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Grade already exists for this semester and school year",
      });
    }

    return next(error);
  }
});

router.get("/student/:studentId", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      const advisingStudentIds = getAdvisingStudentIds(req.user);
      if (!advisingStudentIds.includes(String(req.params.studentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem điểm của sinh viên này",
        });
      }
    }

    const grades = await populateGradeQuery(
      Grade.find({ studentId: req.params.studentId }).sort({
        schoolYearId: 1,
        semester: 1,
        createdAt: 1,
      }),
    );

    return res.status(200).json({
      success: true,
      data: grades,
      message: "Get student grades successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/class/:classId", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      return res.status(403).json({
        success: false,
        message: "Advisor không có quyền xem bảng điểm toàn lớp",
      });
    }

    const { semester, schoolYearId } = req.query;
    const query = {
      classId: req.params.classId,
    };

    if (semester !== undefined) {
      if (!isValidSemester(semester)) {
        return res.status(400).json({
          success: false,
          message: "semester phải thuộc [1,2,3]",
        });
      }

      query.semester = Number(semester);
    }

    if (schoolYearId) {
      query.schoolYearId = schoolYearId;
    }

    const classData = await Class.findById(req.params.classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);

      if (!allowedDepartmentIds.includes(String(classData.departmentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem điểm của lớp này",
        });
      }
    }

    const grades = await populateGradeQuery(
      Grade.find(query).sort({ finalScore: -1, createdAt: -1 }),
    );

    return res.status(200).json({
      success: true,
      data: grades,
      message: "Get class grades successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const grade = await populateGradeQuery(Grade.findById(req.params.id));

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
      if (!allowedDepartmentIds.includes(String(grade.classId?.departmentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem bảng điểm này",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: grade,
      message: "Get grade detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
