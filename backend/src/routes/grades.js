const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const XLSX = require("xlsx");
const auth = require("../middleware/auth");
const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Class = require("../models/Class");
const StudentCurriculum = require("../models/StudentCurriculum");
const SchoolYear = require("../models/SchoolYear");
const Department = require("../models/Department");
const {
  getTemplateOptionsByClassId,
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

const DASHBOARD_GRADE_LETTERS = ["A", "B", "C", "F"];
const DASHBOARD_SEMESTERS = [1, 2, 3];

const normalizeFilterValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "all") {
    return null;
  }

  return normalized;
};

const toDashboardClassOption = (classDoc) => ({
  _id: String(classDoc._id),
  code: classDoc.code,
  name: classDoc.name || classDoc.code,
  semester: Number(classDoc.semester || 1),
  departmentId: String(classDoc.departmentId),
});

const toDashboardStudentOption = (studentDoc) => ({
  _id: String(studentDoc._id),
  studentCode: studentDoc.studentCode,
  fullName: studentDoc.fullName,
  classId: String(studentDoc.classId),
});

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
    const classId = String(req.query.classId || "").trim();
    const templateOptions = classId
      ? await getTemplateOptionsByClassId(classId)
      : null;

    if (classId && !templateOptions) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học phần để tạo mẫu import",
      });
    }

    if (classId && req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
      if (
        !allowedDepartmentIds.includes(String(templateOptions.departmentId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền tải mẫu import của lớp này",
        });
      }
    }

    const workbook = generateTemplateWorkbook(templateOptions || undefined);
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

    const classData = await Class.findById(classId)
      .select(
        "_id subjectId departmentId schoolYearId semester weights txCount",
      )
      .lean();

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
          message: "Bạn không có quyền import điểm cho lớp này",
        });
      }
    }

    const rows = parseExcelFile(req.file.buffer);
    const { validRows, errorRows } = await validateRows(
      rows,
      classData,
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

    const classData = await Class.findById(classId)
      .select(
        "_id subjectId departmentId schoolYearId semester weights txCount",
      )
      .lean();

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
          message: "Bạn không có quyền import điểm cho lớp này",
        });
      }
    }

    const rows = parseExcelFile(req.file.buffer);
    const { validRows, errorRows } = await validateRows(
      rows,
      classData,
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

    const isDirectMember =
      String(resolveRefId(student.classId)) === String(classData._id);

    let isRegisteredMember = false;
    if (!isDirectMember) {
      isRegisteredMember = Boolean(
        await StudentCurriculum.exists({
          studentId: student._id,
          registrations: {
            $elemMatch: {
              classId: classData._id,
            },
          },
        }),
      );
    }

    if (!isDirectMember && !isRegisteredMember) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên chưa đăng ký lớp học phần đã chọn",
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

router.get("/summary/dashboard", async (req, res, next) => {
  try {
    const classScopeQuery = {};
    const activeOnly =
      String(req.query.activeOnly || "true").toLowerCase() !== "false";
    const normalizedDepartmentId = normalizeFilterValue(req.query.departmentId);
    const normalizedSemester = normalizeFilterValue(req.query.semester);
    const normalizedClassId = normalizeFilterValue(req.query.classId);
    const normalizedStudentId = normalizeFilterValue(req.query.studentId);

    if (
      normalizedSemester !== null &&
      !isValidSemester(Number(normalizedSemester))
    ) {
      return res.status(400).json({
        success: false,
        message: "semester phải thuộc [1,2,3] hoặc all",
      });
    }

    const allowedDepartmentIds =
      req.user.role === "admin" ? [] : getAllowedDepartmentIds(req.user);

    if (req.user.role !== "admin") {
      classScopeQuery.departmentId = { $in: allowedDepartmentIds };
    }

    if (normalizedDepartmentId) {
      if (
        req.user.role !== "admin" &&
        !allowedDepartmentIds.includes(normalizedDepartmentId)
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem khoa này",
        });
      }

      classScopeQuery.departmentId = normalizedDepartmentId;
    }

    if (normalizedSemester) {
      classScopeQuery.semester = Number(normalizedSemester);
    }

    const [departmentDocs, classesInScope] = await Promise.all([
      Department.find(
        req.user.role === "admin" ? {} : { _id: { $in: allowedDepartmentIds } },
      )
        .select("_id code name")
        .sort({ code: 1 })
        .lean(),
      Class.find(classScopeQuery)
        .select("_id code name semester departmentId")
        .sort({ semester: 1, code: 1, createdAt: -1 })
        .lean(),
    ]);

    const classOptionRows = classesInScope.map(toDashboardClassOption);
    const classIdSetInScope = new Set(classOptionRows.map((item) => item._id));

    let metricClassIds = classOptionRows.map((item) => item._id);
    if (normalizedClassId) {
      if (!classIdSetInScope.has(normalizedClassId)) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem học phần này",
        });
      }

      metricClassIds = [normalizedClassId];
    }

    // Build ObjectIds for both class-scope queries and curriculum lookup
    const metricClassObjectIds = metricClassIds
      .map((id) =>
        mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null,
      )
      .filter(Boolean);

    // Validate normalizedStudentId against expanded scope:
    // student must belong via direct classId OR via curriculum registration
    if (normalizedStudentId) {
      const [studentInDirectClass, studentInCurriculum] = await Promise.all([
        Student.findOne({
          _id: normalizedStudentId,
          classId: { $in: metricClassIds },
          ...(activeOnly ? { status: "active" } : {}),
        })
          .select("_id")
          .lean(),
        metricClassObjectIds.length
          ? StudentCurriculum.findOne({
              studentId: normalizedStudentId,
              "registrations.classId": { $in: metricClassObjectIds },
            })
              .select("studentId")
              .lean()
          : Promise.resolve(null),
      ]);

      if (!studentInDirectClass && !studentInCurriculum) {
        return res.status(400).json({
          success: false,
          message:
            "Sinh viên không thuộc phạm vi lọc hiện tại hoặc bạn không có quyền truy cập",
        });
      }
    }

    // Find students via both paths: direct Student.classId AND StudentCurriculum registrations
    // This ensures semester 2/3 classes (học phần) count students registered via curriculum
    const [directClassStudentIds, curriculumStudentIds] = await Promise.all([
      metricClassIds.length
        ? Student.distinct("_id", { classId: { $in: metricClassIds } })
        : Promise.resolve([]),
      metricClassObjectIds.length
        ? StudentCurriculum.distinct("studentId", {
            "registrations.classId": { $in: metricClassObjectIds },
          })
        : Promise.resolve([]),
    ]);

    const unionStudentIdStrings = [
      ...new Set([
        ...directClassStudentIds.map(String),
        ...curriculumStudentIds.map(String),
      ]),
    ];

    // Only populate students dropdown when a specific class is selected,
    // to avoid returning thousands of students in the response payload.
    const studentOptionRows =
      normalizedClassId && unionStudentIdStrings.length
        ? await Student.find({
            _id: { $in: unionStudentIdStrings },
            ...(activeOnly ? { status: "active" } : {}),
          })
            .select("_id studentCode fullName classId")
            .sort({ fullName: 1 })
            .limit(200)
            .lean()
        : [];

    const zeroDataPayload = {
      success: true,
      data: {
        totalStudents: 0,
        totalClasses: metricClassIds.length,
        gradeCounts: {
          A: 0,
          B: 0,
          C: 0,
          F: 0,
        },
        filterOptions: {
          departments: departmentDocs.map((item) => ({
            _id: String(item._id),
            code: item.code,
            name: item.name,
          })),
          semesters: DASHBOARD_SEMESTERS,
          classes: classOptionRows,
          students: studentOptionRows.map(toDashboardStudentOption),
        },
        appliedFilters: {
          departmentId: normalizedDepartmentId || "all",
          semester: normalizedSemester || "all",
          classId: normalizedClassId || "all",
          studentId: normalizedStudentId || "all",
          activeOnly,
        },
      },
      message: "Get dashboard summary successfully",
    };

    if (!metricClassIds.length) {
      return res.status(200).json(zeroDataPayload);
    }

    // Compute scoped student IDs for metrics (counts + grade aggregation).
    // studentOptionRows is intentionally empty when no class filter is set (payload size),
    // so total-student count must be derived directly from unionStudentIdStrings instead.
    const rawScopedIds =
      activeOnly && unionStudentIdStrings.length
        ? await Student.distinct("_id", {
            _id: { $in: unionStudentIdStrings },
            status: "active",
          })
        : unionStudentIdStrings;

    const scopedStudentIds = normalizedStudentId
      ? rawScopedIds.filter((id) => String(id) === normalizedStudentId)
      : rawScopedIds;

    const totalStudents = scopedStudentIds.length;

    if (!scopedStudentIds.length) {
      return res.status(200).json(zeroDataPayload);
    }

    // metricClassObjectIds already built above

    const scopedStudentObjectIds = scopedStudentIds
      .map((id) =>
        mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null,
      )
      .filter(Boolean);

    const normalizedStudentObjectId =
      normalizedStudentId &&
      mongoose.Types.ObjectId.isValid(normalizedStudentId)
        ? new mongoose.Types.ObjectId(normalizedStudentId)
        : null;

    if (!metricClassObjectIds.length || !scopedStudentObjectIds.length) {
      return res.status(200).json(zeroDataPayload);
    }

    const gradeRows = await Grade.aggregate([
      {
        $match: {
          classId: { $in: metricClassObjectIds },
          studentId: { $in: scopedStudentObjectIds },
          letterGrade: { $in: DASHBOARD_GRADE_LETTERS },
          ...(normalizedStudentObjectId
            ? { studentId: normalizedStudentObjectId }
            : {}),
        },
      },
      {
        $group: {
          _id: "$letterGrade",
          count: { $sum: 1 },
        },
      },
    ]);

    const gradeCounts = {
      A: 0,
      B: 0,
      C: 0,
      F: 0,
    };

    gradeRows.forEach((item) => {
      if (item?._id && gradeCounts[item._id] !== undefined) {
        gradeCounts[item._id] = Number(item.count || 0);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalClasses: metricClassIds.length,
        gradeCounts,
        filterOptions: {
          departments: departmentDocs.map((item) => ({
            _id: String(item._id),
            code: item.code,
            name: item.name,
          })),
          semesters: DASHBOARD_SEMESTERS,
          classes: classOptionRows,
          students: studentOptionRows.map(toDashboardStudentOption),
        },
        appliedFilters: {
          departmentId: normalizedDepartmentId || "all",
          semester: normalizedSemester || "all",
          classId: normalizedClassId || "all",
          studentId: normalizedStudentId || "all",
          activeOnly,
        },
      },
      message: "Get dashboard summary successfully",
    });
  } catch (error) {
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

    const classObjectIds = grades
      .map((item) => resolveRefId(item.classId))
      .filter((value) => mongoose.Types.ObjectId.isValid(value))
      .map((value) => new mongoose.Types.ObjectId(value));

    const classAverageRows = classObjectIds.length
      ? await Grade.aggregate([
          {
            $match: {
              classId: { $in: classObjectIds },
              finalScore: { $ne: null },
            },
          },
          {
            $group: {
              _id: "$classId",
              avgFinalScore: { $avg: "$finalScore" },
            },
          },
        ])
      : [];

    const classAverageMap = new Map(
      classAverageRows.map((item) => [
        String(item._id),
        Number(Number(item.avgFinalScore || 0).toFixed(2)),
      ]),
    );

    const gradePayload = grades.map((grade) => {
      const classId = resolveRefId(grade.classId);
      const gradeObject = grade?.toObject ? grade.toObject() : grade;

      return {
        ...gradeObject,
        classAverageScore: classId
          ? (classAverageMap.get(classId) ?? null)
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: gradePayload,
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
