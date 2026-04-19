const express = require("express");
const auth = require("../middleware/auth");
const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Prediction = require("../models/Prediction");
const {
  predictStudent,
  getGpaRoadmap,
  getRetakeRoadmap,
  getSemesterPlan,
} = require("../services/aiService");

const router = express.Router();

router.use(auth);

const getAllowedDepartmentIds = (user) =>
  (user.departmentIds || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

const getAdvisingStudentIds = (user) =>
  (user.advisingStudentIds || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

const mapPredictionFromAI = (payload) => ({
  predictedRank: payload?.predicted_rank,
  confidence: Number(payload?.confidence || 0),
  riskLevel: payload?.risk_level,
  weakSubjects: Array.isArray(payload?.weak_subjects)
    ? payload.weak_subjects
    : [],
  improveSubjects: Array.isArray(payload?.improve_subjects)
    ? payload.improve_subjects
    : [],
  suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
  analysis: payload?.analysis || "",
  dataCoverage: Number(payload?.data_coverage ?? 0),
  isLowData: Boolean(payload?.is_low_data ?? false),
});

const toObjectId = (value) => {
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

const toValidScore = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }

  if (numeric < 0) return 0;
  if (numeric > 10) return 10;
  return Number(numeric.toFixed(2));
};

const resolveGradeScoreForAI = (gradeDoc) => {
  const finalScore = toValidScore(gradeDoc?.finalScore);
  if (finalScore !== null) {
    return finalScore;
  }

  const tktScore = toValidScore(gradeDoc?.tktScore);
  if (tktScore !== null) {
    return tktScore;
  }

  const gkScore = toValidScore(gradeDoc?.gkScore);
  if (gkScore !== null) {
    return gkScore;
  }

  const txAvg = toValidScore(gradeDoc?.txAvg);
  if (txAvg !== null) {
    return txAvg;
  }

  return null;
};

/**
 * Build the AI predict input for a specific (studentId, schoolYearId, semester).
 * - scores  = grades of THAT semester only (matches training data structure)
 * - diem_hk_truoc = weighted average of ALL other (older) semester grades
 * - so_buoi_vang / hanh_kiem default to 0 / 2 when not stored on Grade docs
 */
const buildSemesterPredictInput = async (studentId, schoolYearId, semester) => {
  const [currentGrades, prevGrades] = await Promise.all([
    Grade.find({ studentId, schoolYearId, semester })
      .populate("subjectId", "code")
      .select("subjectId finalScore tktScore gkScore txAvg"),
    Grade.find({ studentId, $nor: [{ schoolYearId, semester }] }).select(
      "finalScore tktScore gkScore txAvg",
    ),
  ]);

  const scores = {};
  for (const item of currentGrades) {
    const code = String(item?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveGradeScoreForAI(item);
    if (score !== null) scores[code] = score;
  }

  const prevScores = prevGrades
    .map((g) => resolveGradeScoreForAI(g))
    .filter((v) => v !== null);

  const diemHkTruoc =
    prevScores.length > 0
      ? Number(
          (prevScores.reduce((s, v) => s + v, 0) / prevScores.length).toFixed(
            2,
          ),
        )
      : Object.values(scores).length > 0
        ? Number(
            (
              Object.values(scores).reduce((s, v) => s + v, 0) /
              Object.values(scores).length
            ).toFixed(2),
          )
        : 5;

  // finalScore = diem tong ket hoc ky nay (trung binh cac mon)
  const currentScoresArr = Object.values(scores);
  const finalScore =
    currentScoresArr.length > 0
      ? Number(
          (
            currentScoresArr.reduce((s, v) => s + v, 0) /
            currentScoresArr.length
          ).toFixed(2),
        )
      : diemHkTruoc;

  // gpa4: quy doi tu thang 10 (don gian)
  const gpa4 = Number(Math.min((finalScore / 10) * 4, 4).toFixed(2));

  return {
    scores,
    diem_hk_truoc: diemHkTruoc,
    so_buoi_vang: 0,
    hanh_kiem: 2,
    finalScore,
    gpa4,
  };
};

/**
 * Legacy helper used by /predict (gradeId) and /predict-class — now delegates to
 * buildSemesterPredictInput so both paths use the same correct logic.
 */
const buildRealtimePredictInput = async (baseGrade) => {
  const studentId = toObjectId(baseGrade?.studentId);
  const schoolYearId = toObjectId(baseGrade?.schoolYearId);
  const semester = Number(baseGrade?.semester || 0);

  if (!studentId || !schoolYearId || !semester) {
    return baseGrade;
  }

  const semesterInput = await buildSemesterPredictInput(
    studentId,
    schoolYearId,
    semester,
  );

  const plainBase =
    typeof baseGrade?.toObject === "function"
      ? baseGrade.toObject()
      : { ...baseGrade };

  return {
    ...plainBase,
    scores: semesterInput.scores,
    diem_hk_truoc: semesterInput.diem_hk_truoc,
  };
};

const populatePredictionQuery = (query) =>
  query
    .populate({
      path: "studentId",
      select: "studentCode fullName classId homeClassCode",
      populate: {
        path: "classId",
        select: "code name departmentId",
      },
    })
    .populate({
      path: "gradeId",
      select:
        "classId subjectId finalScore gpa4 letterGrade semester schoolYearId createdAt",
      populate: [
        { path: "classId", select: "code name departmentId" },
        { path: "subjectId", select: "code name credits" },
      ],
    });

const ensureCanReadStudent = async (user, studentId) => {
  const student = await Student.findById(studentId)
    .populate("classId", "departmentId")
    .select("_id classId");

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role === "advisor") {
    const advisingStudentIds = getAdvisingStudentIds(user);
    if (!advisingStudentIds.includes(String(student._id))) {
      const error = new Error(
        "Bạn không có quyền xem dữ liệu của học sinh này",
      );
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role !== "admin") {
    const allowedDepartmentIds = getAllowedDepartmentIds(user);
    if (!allowedDepartmentIds.includes(String(student.classId?.departmentId))) {
      const error = new Error(
        "Bạn không có quyền xem dữ liệu của học sinh này",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  return student;
};

router.post("/predict", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      return res.status(403).json({
        success: false,
        message: "Advisor không có quyền chạy dự đoán",
      });
    }

    const { gradeId } = req.body;

    if (!gradeId) {
      return res.status(400).json({
        success: false,
        message: "gradeId là bắt buộc",
      });
    }

    const grade = await Grade.findById(gradeId)
      .populate("subjectId", "code name")
      .populate("studentId", "_id classId")
      .select(
        "studentId classId departmentId subjectId schoolYearId semester finalScore gkScore tktScore txAvg conductScore hanhKiem so_buoi_vang attendanceAbsent diem_hk_truoc previousSemesterScore",
      );

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
          message: "Bạn không có quyền dự đoán cho lớp này",
        });
      }
    }

    const predictInput = await buildRealtimePredictInput(grade);
    const aiResult = await predictStudent(predictInput);
    const mappedPrediction = mapPredictionFromAI(aiResult);

    const prediction = await Prediction.create({
      studentId: grade.studentId?._id || grade.studentId,
      gradeId: grade._id,
      ...mappedPrediction,
    });

    const populatedPrediction = await populatePredictionQuery(
      Prediction.findById(prediction._id),
    );

    return res.status(201).json({
      success: true,
      data: populatedPrediction,
      message: "Predict student successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/predict-class", async (req, res, next) => {
  try {
    const { homeClassCode } = req.body;

    if (!homeClassCode) {
      return res.status(400).json({
        success: false,
        message: "homeClassCode là bắt buộc",
      });
    }

    // Advisors can only predict their own advising classes
    if (
      req.user.role === "advisor" ||
      (req.user.advisingClassCodes || []).length > 0
    ) {
      const advisingCodes = (req.user.advisingClassCodes || []).map(String);
      if (
        req.user.role !== "admin" &&
        !advisingCodes.includes(String(homeClassCode))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền dự đoán cho lớp này",
        });
      }
    }

    const students = await Student.find({
      homeClassCode: String(homeClassCode),
    })
      .select("_id studentCode homeClassCode")
      .lean();

    if (!students.length) {
      return res.status(200).json({
        success: true,
        data: {
          processed: 0,
          failed: 0,
          failures: [],
        },
        message: "Lớp chưa có sinh viên để dự đoán",
      });
    }

    const failures = [];
    let processed = 0;

    for (const student of students) {
      try {
        const predictInput = await buildOverallPredictInput(student._id);

        if (Object.keys(predictInput.scores).length === 0) {
          failures.push({
            studentId: String(student._id),
            studentCode: student.studentCode,
            message: "Chưa có điểm để dự đoán",
          });
          continue;
        }

        const aiResult = await predictStudent(predictInput);
        const mappedPrediction = mapPredictionFromAI(aiResult);

        await Prediction.create({
          studentId: student._id,
          ...mappedPrediction,
        });

        processed += 1;
      } catch (error) {
        failures.push({
          studentId: String(student._id),
          studentCode: student.studentCode,
          message: error?.message || "Không thể dự đoán",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed,
        failed: failures.length,
        failures,
      },
      message: "Predict class completed",
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Build the AI predict input using ALL grades from every semester the student has taken.
 * Calculates per-subject averages across all semesters for maximum data coverage.
 */
const buildOverallPredictInput = async (studentId) => {
  const allGrades = await Grade.find({ studentId })
    .populate("subjectId", "code")
    .select("subjectId finalScore tktScore gkScore txAvg");

  const scoresBySubject = {};
  for (const grade of allGrades) {
    const code = String(grade?.subjectId?.code || "").trim();
    if (!code) continue;
    const score = resolveGradeScoreForAI(grade);
    if (score === null) continue;
    if (!scoresBySubject[code]) scoresBySubject[code] = [];
    scoresBySubject[code].push(score);
  }

  const scores = {};
  for (const [code, vals] of Object.entries(scoresBySubject)) {
    scores[code] = Number(
      (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2),
    );
  }

  const allScores = Object.values(scores);
  const overallGpa =
    allScores.length > 0
      ? Number(
          (allScores.reduce((s, v) => s + v, 0) / allScores.length).toFixed(2),
        )
      : 5;

  const gpa4 = Number(Math.min((overallGpa / 10) * 4, 4).toFixed(2));

  return {
    scores,
    diem_hk_truoc: overallGpa,
    so_buoi_vang: 0,
    hanh_kiem: 2,
    finalScore: overallGpa,
    gpa4,
  };
};

/**
 * POST /predictions/predict-student
 * Trigger an AI prediction from the student detail page.
 * Body: { studentId, schoolYearId, semester }
 * Uses the selected semester's grade scores + previous semester GPA as input.
 */
router.post("/predict-student", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      return res.status(403).json({
        success: false,
        message: "Advisor không có quyền chạy dự đoán",
      });
    }

    const { studentId, schoolYearId, semester } = req.body;

    if (!studentId || !schoolYearId || !semester) {
      return res.status(400).json({
        success: false,
        message: "studentId, schoolYearId và semester là bắt buộc",
      });
    }

    const student = await Student.findById(studentId)
      .populate("classId", "departmentId")
      .select("_id classId");

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
      if (
        !allowedDepartmentIds.includes(String(student.classId?.departmentId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền dự đoán cho học sinh này",
        });
      }
    }

    const semesterInput = await buildSemesterPredictInput(
      String(student._id),
      schoolYearId,
      Number(semester),
    );

    if (Object.keys(semesterInput.scores).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Học kỳ này chưa có điểm môn học nào để dự đoán",
      });
    }

    const aiResult = await predictStudent(semesterInput);
    const mappedPrediction = mapPredictionFromAI(aiResult);

    const prediction = await Prediction.create({
      studentId: student._id,
      ...mappedPrediction,
    });

    const populatedPrediction = await populatePredictionQuery(
      Prediction.findById(prediction._id),
    );

    return res.status(201).json({
      success: true,
      data: populatedPrediction,
      message: "Dự đoán học lực thành công",
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /predictions/predict-student-overall
 * Predict using ALL semesters' grades (maximum data coverage).
 * Body: { studentId }
 */
router.post("/predict-student-overall", async (req, res, next) => {
  try {
    if (req.user.role === "advisor") {
      return res.status(403).json({
        success: false,
        message: "Advisor không có quyền chạy dự đoán",
      });
    }

    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId là bắt buộc",
      });
    }

    const student = await Student.findById(studentId)
      .populate("classId", "departmentId")
      .select("_id classId");

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
      if (
        !allowedDepartmentIds.includes(String(student.classId?.departmentId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền dự đoán cho học sinh này",
        });
      }
    }

    const overallInput = await buildOverallPredictInput(String(student._id));

    if (Object.keys(overallInput.scores).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Học sinh chưa có điểm môn học nào",
      });
    }

    const aiResult = await predictStudent(overallInput);
    const mappedPrediction = mapPredictionFromAI(aiResult);

    const prediction = await Prediction.create({
      studentId: student._id,
      ...mappedPrediction,
    });

    const populatedPrediction = await populatePredictionQuery(
      Prediction.findById(prediction._id),
    );

    return res.status(201).json({
      success: true,
      data: populatedPrediction,
      message: "Dự đoán toàn khóa học thành công",
    });
  } catch (error) {
    return next(error);
  }
});

// GET /predictions/latest-summary?studentIds=id1,id2,...
// Returns { studentId, createdAt, predictedRank, riskLevel }[] for the latest prediction of each student
router.get("/latest-summary", async (req, res, next) => {
  try {
    const rawIds = req.query.studentIds;
    if (!rawIds) {
      return res
        .status(400)
        .json({ success: false, message: "studentIds is required" });
    }
    const ids = String(rawIds).split(",").filter(Boolean);
    if (ids.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Aggregate: for each studentId pick the most recent prediction
    const results = await Prediction.aggregate([
      {
        $match: {
          studentId: {
            $in: ids.map((id) =>
              require("mongoose").Types.ObjectId.createFromHexString(id),
            ),
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$studentId",
          createdAt: { $first: "$createdAt" },
          predictedRank: { $first: "$predictedRank" },
          riskLevel: { $first: "$riskLevel" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: results.map((r) => ({
        studentId: String(r._id),
        createdAt: r.createdAt,
        predictedRank: r.predictedRank,
        riskLevel: r.riskLevel,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/student/:studentId", async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate("classId", "departmentId")
      .select("_id classId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (req.user.role === "advisor") {
      const advisingStudentIds = getAdvisingStudentIds(req.user);
      if (!advisingStudentIds.includes(String(student._id))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem dự đoán của học sinh này",
        });
      }
    } else if (req.user.role !== "admin") {
      const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
      if (
        !allowedDepartmentIds.includes(String(student.classId?.departmentId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem dự đoán của học sinh này",
        });
      }
    }

    const predictions = await populatePredictionQuery(
      Prediction.find({ studentId: req.params.studentId }).sort({
        createdAt: -1,
      }),
    );

    return res.status(200).json({
      success: true,
      data: predictions,
      message: "Get student predictions successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/class/:classId", async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.classId).select(
      "_id departmentId code name",
    );

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
          message: "Bạn không có quyền xem dự đoán của lớp này",
        });
      }
    }

    const students = await Student.find({ classId: classData._id }).select(
      "_id studentCode fullName classId",
    );
    const studentIds = students.map((item) => item._id);

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Lớp chưa có học sinh",
      });
    }

    const predictions = await populatePredictionQuery(
      Prediction.find({ studentId: { $in: studentIds } }).sort({
        createdAt: -1,
      }),
    );

    const latestMap = new Map();
    for (const prediction of predictions) {
      const studentId = String(
        prediction.studentId?._id || prediction.studentId,
      );
      if (!latestMap.has(studentId)) {
        latestMap.set(studentId, prediction);
      }
    }

    return res.status(200).json({
      success: true,
      data: Array.from(latestMap.values()),
      message: "Get class latest predictions successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/alerts", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit, 10) || 50),
    );

    // Use DB-side aggregation to find the latest prediction per student,
    // then keep only those whose most-recent prediction is "high" risk.
    // This avoids loading thousands of prediction records into memory.
    const latestHighRisk = await Prediction.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$studentId",
          latestId: { $first: "$_id" },
          riskLevel: { $first: "$riskLevel" },
        },
      },
      { $match: { riskLevel: "high" } },
    ]);

    const latestIds = latestHighRisk.map((r) => r.latestId);

    // Populate the matched prediction documents
    let allPopulated = await populatePredictionQuery(
      Prediction.find({ _id: { $in: latestIds } }).sort({ createdAt: -1 }),
    );

    // Role-based access filter
    if (req.user.role !== "admin") {
      allPopulated = allPopulated.filter((item) => {
        if (req.user.role === "advisor") {
          const advisingStudentIds = getAdvisingStudentIds(req.user);
          return advisingStudentIds.includes(
            String(item.studentId?._id || item.studentId),
          );
        }

        const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
        return allowedDepartmentIds.includes(
          String(item.studentId?.classId?.departmentId),
        );
      });
    }

    // Scope filter: classId > departmentId
    const classIdFilter =
      req.query.classId && req.query.classId !== "all"
        ? String(req.query.classId)
        : null;
    const departmentIdFilter =
      req.query.departmentId && req.query.departmentId !== "all"
        ? String(req.query.departmentId)
        : null;

    if (classIdFilter) {
      allPopulated = allPopulated.filter((item) => {
        const cls = item.studentId?.classId;
        const itemClassId =
          typeof cls === "string" ? cls : String(cls?._id || "");
        return itemClassId === classIdFilter;
      });
    } else if (departmentIdFilter) {
      allPopulated = allPopulated.filter((item) => {
        const dept = item.studentId?.classId?.departmentId;
        const itemDeptId =
          typeof dept === "string" ? dept : String(dept?._id || "");
        return itemDeptId === departmentIdFilter;
      });
    }

    const homeClassCodeFilter =
      req.query.homeClassCode && req.query.homeClassCode !== "all"
        ? String(req.query.homeClassCode)
        : null;
    if (homeClassCodeFilter) {
      allPopulated = allPopulated.filter(
        (item) =>
          String(item.studentId?.homeClassCode || "") === homeClassCodeFilter,
      );
    }

    const total = allPopulated.length;
    const pageData = allPopulated.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      success: true,
      data: {
        items: pageData,
        total,
        page,
        limit,
      },
      message: "Get high risk alerts successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/student/:studentId/gpa-roadmap", async (req, res, next) => {
  try {
    await ensureCanReadStudent(req.user, req.params.studentId);

    const targetGpa = Number(req.query.targetGpa || 3.2);
    const data = await getGpaRoadmap(req.params.studentId, targetGpa);

    return res.status(200).json({
      success: true,
      data,
      message: "Get GPA roadmap successfully",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
});

router.get("/student/:studentId/retake-roadmap", async (req, res, next) => {
  try {
    await ensureCanReadStudent(req.user, req.params.studentId);

    const data = await getRetakeRoadmap(req.params.studentId);

    return res.status(200).json({
      success: true,
      data,
      message: "Get retake roadmap successfully",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
});

router.post("/student/:studentId/semester-plan", async (req, res, next) => {
  try {
    await ensureCanReadStudent(req.user, req.params.studentId);

    const { registeredClassIds = [], targetGpa = 3.2 } = req.body;
    const data = await getSemesterPlan(
      req.params.studentId,
      registeredClassIds,
      targetGpa,
    );

    return res.status(200).json({
      success: true,
      data,
      message: "Get semester plan successfully",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
});

module.exports = router;
