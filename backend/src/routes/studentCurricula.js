const express = require("express");
const auth = require("../middleware/auth");
const StudentCurriculum = require("../models/StudentCurriculum");
const Curriculum = require("../models/Curriculum");
const Student = require("../models/Student");
const { calculateProgress } = require("../services/curriculumService");

const router = express.Router();

router.use(auth);

const canManage = (role) => role === "admin" || role === "advisor";
const advisingIds = (user) =>
  (user.advisingStudentIds || []).map((item) => String(item?._id || item));

const ensureAdvisorCanRead = (user, studentId) => {
  if (user.role !== "advisor") {
    return true;
  }

  return advisingIds(user).includes(String(studentId));
};

router.get("/:studentId", async (req, res, next) => {
  try {
    if (!canManage(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem tiến độ chương trình khung",
      });
    }

    if (!ensureAdvisorCanRead(req.user, req.params.studentId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem sinh viên này",
      });
    }

    const data = await StudentCurriculum.findOne({
      studentId: req.params.studentId,
    })
      .populate("studentId", "_id studentCode fullName majorId")
      .populate("majorId", "_id code name")
      .populate("advisorId", "_id name email")
      .populate("curriculumId")
      .populate("registrations.subjectId", "_id code name credits")
      .populate("registrations.classId", "_id code name semester")
      .populate("registrations.gradeId", "_id finalScore gpa4 letterGrade");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student curriculum not found",
      });
    }

    const progress = await calculateProgress(req.params.studentId);

    return res.status(200).json({
      success: true,
      data: {
        studentCurriculum: data,
        progress,
      },
      message: "Get student curriculum successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (!canManage(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền gán chương trình khung",
      });
    }

    const { studentId, curriculumId, majorId, advisorId, enrolledYear } =
      req.body;

    if (!studentId || !curriculumId || !enrolledYear) {
      return res.status(400).json({
        success: false,
        message: "studentId, curriculumId, enrolledYear are required",
      });
    }

    if (!ensureAdvisorCanRead(req.user, studentId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền gán cho sinh viên này",
      });
    }

    const [student, curriculum] = await Promise.all([
      Student.findById(studentId),
      Curriculum.findById(curriculumId),
    ]);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: "Curriculum not found",
      });
    }

    const data = await StudentCurriculum.findOneAndUpdate(
      { studentId },
      {
        $set: {
          curriculumId,
          majorId: majorId || student.majorId || null,
          advisorId: advisorId || null,
          enrolledYear: String(enrolledYear).trim(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    )
      .populate("studentId", "_id studentCode fullName")
      .populate("curriculumId")
      .populate("majorId", "_id code name")
      .populate("advisorId", "_id name email");

    return res.status(201).json({
      success: true,
      data,
      message: "Assign curriculum successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:studentId/registrations", async (req, res, next) => {
  try {
    if (!canManage(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật đăng ký môn",
      });
    }

    if (!ensureAdvisorCanRead(req.user, req.params.studentId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật sinh viên này",
      });
    }

    const { registrations = [] } = req.body;
    if (!Array.isArray(registrations)) {
      return res.status(400).json({
        success: false,
        message: "registrations must be an array",
      });
    }

    const data = await StudentCurriculum.findOneAndUpdate(
      { studentId: req.params.studentId },
      { $set: { registrations } },
      { new: true, runValidators: true },
    )
      .populate("studentId", "_id studentCode fullName")
      .populate("curriculumId")
      .populate("majorId", "_id code name")
      .populate("advisorId", "_id name email")
      .populate("registrations.subjectId", "_id code name credits")
      .populate("registrations.classId", "_id code name semester")
      .populate("registrations.gradeId", "_id finalScore gpa4 letterGrade");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student curriculum not found",
      });
    }

    const progress = await calculateProgress(req.params.studentId);

    return res.status(200).json({
      success: true,
      data: {
        studentCurriculum: data,
        progress,
      },
      message: "Update registrations successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
