const express = require("express");
const auth = require("../middleware/auth");
const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Prediction = require("../models/Prediction");
const { predictStudent } = require("../services/aiService");

const router = express.Router();

router.use(auth);

const getAllowedDepartmentIds = (user) =>
  (user.departmentIds || []).map((item) =>
    item?._id ? String(item._id) : String(item),
  );

const mapPredictionFromAI = (payload) => ({
  predictedRank: payload?.predicted_rank,
  confidence: Number(payload?.confidence || 0),
  riskLevel: payload?.risk_level,
  weakSubjects: Array.isArray(payload?.weak_subjects)
    ? payload.weak_subjects
    : [],
  suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
  analysis: payload?.analysis || "",
});

const populatePredictionQuery = (query) =>
  query
    .populate({
      path: "studentId",
      select: "studentCode fullName classId",
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

router.post("/predict", async (req, res, next) => {
  try {
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
        "studentId classId departmentId subjectId finalScore gkScore tktScore txAvg conductScore hanhKiem so_buoi_vang attendanceAbsent diem_hk_truoc previousSemesterScore",
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

    const aiResult = await predictStudent(grade);
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
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId là bắt buộc",
      });
    }

    const classData = await Class.findById(classId).select(
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
          message: "Bạn không có quyền dự đoán cho lớp này",
        });
      }
    }

    const grades = await Grade.find({ classId: classData._id })
      .populate("subjectId", "code name")
      .populate("studentId", "_id classId")
      .select(
        "studentId classId departmentId subjectId finalScore gkScore tktScore txAvg conductScore hanhKiem so_buoi_vang attendanceAbsent diem_hk_truoc previousSemesterScore",
      );

    if (!grades.length) {
      return res.status(200).json({
        success: true,
        data: {
          processed: 0,
          failed: 0,
          failures: [],
        },
        message: "Lớp chưa có bảng điểm để dự đoán",
      });
    }

    const failures = [];
    let processed = 0;

    for (const grade of grades) {
      try {
        const aiResult = await predictStudent(grade);
        const mappedPrediction = mapPredictionFromAI(aiResult);

        await Prediction.create({
          studentId: grade.studentId?._id || grade.studentId,
          gradeId: grade._id,
          ...mappedPrediction,
        });

        processed += 1;
      } catch (error) {
        failures.push({
          gradeId: String(grade._id),
          studentId: String(grade.studentId?._id || grade.studentId),
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

    if (req.user.role !== "admin") {
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
    const predictions = await populatePredictionQuery(
      Prediction.find({}).sort({ createdAt: -1 }),
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

    const latestPredictions = Array.from(latestMap.values());
    const highRiskPredictions = latestPredictions.filter(
      (item) => item.riskLevel === "high",
    );

    const filteredData =
      req.user.role === "admin"
        ? highRiskPredictions
        : highRiskPredictions.filter((item) => {
            const allowedDepartmentIds = getAllowedDepartmentIds(req.user);
            return allowedDepartmentIds.includes(
              String(item.studentId?.classId?.departmentId),
            );
          });

    return res.status(200).json({
      success: true,
      data: filteredData,
      message: "Get high risk alerts successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
