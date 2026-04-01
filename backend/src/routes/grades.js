const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const auth = require("../middleware/auth");
const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Class = require("../models/Class");
const {
  parseExcelFile,
  validateRows,
  importValidRows,
} = require("../services/importService");

const router = express.Router();

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

router.get("/import/template", async (req, res, next) => {
  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "grade_import_template.xlsx",
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        message: "Template file not found",
      });
    }

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="grade_import_template.xlsx"',
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.sendFile(templatePath);
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

    const rows = parseExcelFile(req.file.buffer);
    const { validRows, errorRows } = await validateRows(
      rows,
      classId,
      semester,
      schoolYearId,
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

    const rows = parseExcelFile(req.file.buffer);
    const { validRows, errorRows } = await validateRows(
      rows,
      classId,
      semester,
      schoolYearId,
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
    const {
      studentId,
      classId,
      semester,
      schoolYear,
      subjects,
      attendanceAbsent,
      conductScore,
    } = req.body;

    if (!studentId || !classId || !semester || !schoolYear) {
      return res.status(400).json({
        success: false,
        message: "studentId, classId, semester, schoolYear are required",
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

    const existedGrade = await Grade.findOne({
      studentId,
      semester: Number(semester),
      schoolYear: String(schoolYear).trim(),
    });

    if (existedGrade) {
      return res.status(409).json({
        success: false,
        message: "Grade already exists for this semester and school year",
      });
    }

    const grade = await Grade.create({
      studentId,
      classId,
      semester: Number(semester),
      schoolYear: String(schoolYear).trim(),
      subjects: subjects || {},
      attendanceAbsent: attendanceAbsent ?? 0,
      conductScore: conductScore || null,
    });

    const populatedGrade = await Grade.findById(grade._id)
      .populate("studentId")
      .populate("classId", "name grade schoolYear");

    return res.status(201).json({
      success: true,
      data: populatedGrade,
      message: "Create grade successfully",
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

router.put("/:id", async (req, res, next) => {
  try {
    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    const allowedFields = [
      "studentId",
      "classId",
      "semester",
      "schoolYear",
      "subjects",
      "attendanceAbsent",
      "conductScore",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "subjects") {
          grade.subjects = {
            ...(grade.subjects?.toObject?.() || grade.subjects || {}),
            ...req.body.subjects,
          };
        } else if (field === "semester") {
          grade.semester = Number(req.body.semester);
        } else if (field === "schoolYear") {
          grade.schoolYear = String(req.body.schoolYear).trim();
        } else {
          grade[field] = req.body[field];
        }
      }
    });

    await grade.save();

    const updatedGrade = await Grade.findById(grade._id)
      .populate("studentId")
      .populate("classId", "name grade schoolYear");

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
    const grades = await Grade.find({ studentId: req.params.studentId })
      .populate("studentId")
      .populate("classId", "name grade schoolYear")
      .sort({ schoolYear: 1, semester: 1 });

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
    const { semester, schoolYear } = req.query;
    const query = {
      classId: req.params.classId,
    };

    if (semester !== undefined) {
      query.semester = Number(semester);
    }

    if (schoolYear) {
      query.schoolYear = String(schoolYear).trim();
    }

    const grades = await Grade.find(query)
      .populate("studentId", "studentCode fullName classId")
      .populate("classId", "name grade schoolYear")
      .sort({ averageScore: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: grades,
      message: "Get class grades successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
