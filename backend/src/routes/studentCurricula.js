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

const parsePositiveInt = (value, fallback, maxValue = 1000) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(numeric), maxValue);
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value?._id) {
    return String(value._id);
  }

  return "";
};

const buildProgressSummary = (studentCurriculum, curriculum) => {
  if (!studentCurriculum || !curriculum) {
    return {
      totalRequired: 0,
      completed: 0,
      inProgress: 0,
      failed: 0,
      remaining: 0,
      creditsEarned: 0,
      creditsRequired: 0,
      progressPercent: 0,
    };
  }

  const curriculumItems = Array.isArray(curriculum.items)
    ? curriculum.items
    : [];
  const registrations = Array.isArray(studentCurriculum.registrations)
    ? studentCurriculum.registrations
    : [];

  const registrationMap = new Map();
  registrations.forEach((registration) => {
    const key = toId(registration.subjectId);
    if (!key) {
      return;
    }

    registrationMap.set(key, registration);
  });

  const details = curriculumItems.map((item) => {
    const key = toId(item.subjectId);
    const registration = registrationMap.get(key);

    let status = "not-started";
    if (registration?.status === "completed") {
      status = "completed";
    } else if (registration?.status === "failed") {
      status = "failed";
    } else if (
      registration?.status === "registered" ||
      registration?.status === "retaking"
    ) {
      status = "in-progress";
    }

    const letterGrade =
      registration?.gradeId?.letterGrade || registration?.letterGrade || "";
    if (letterGrade === "A" || letterGrade === "B" || letterGrade === "C") {
      status = "completed";
    }

    if (letterGrade === "F") {
      status = "failed";
    }

    return {
      status,
      credits: Number(item.credits || 0),
    };
  });

  const totalRequired = details.length;
  const completed = details.filter(
    (item) => item.status === "completed",
  ).length;
  const inProgress = details.filter(
    (item) => item.status === "in-progress",
  ).length;
  const failed = details.filter((item) => item.status === "failed").length;
  const remaining = details.filter(
    (item) => item.status === "not-started",
  ).length;

  const creditsRequired = details.reduce(
    (sum, item) => sum + Number(item.credits || 0),
    0,
  );
  const creditsEarned = details
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + Number(item.credits || 0), 0);

  const progressPercent =
    creditsRequired > 0
      ? Number(((creditsEarned / creditsRequired) * 100).toFixed(2))
      : 0;

  return {
    totalRequired,
    completed,
    inProgress,
    failed,
    remaining,
    creditsEarned,
    creditsRequired,
    progressPercent,
  };
};

const ensureAdvisorCanRead = (user, studentId) => {
  if (user.role !== "advisor") {
    return true;
  }

  return advisingIds(user).includes(String(studentId));
};

router.get("/advisor/students", async (req, res, next) => {
  try {
    if (!canManage(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem danh sách cố vấn",
      });
    }

    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 24, 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const query = {};
    if (req.user.role === "advisor") {
      const ids = advisingIds(req.user);
      if (!ids.length) {
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
          message: "Get advisor students overview successfully",
        });
      }

      query._id = { $in: ids };
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ fullName: searchRegex }, { studentCode: searchRegex }];
    }

    const [total, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .select("_id studentCode fullName classId majorId status enrolledYear")
        .populate("classId", "_id code name")
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (!students.length) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          pagination: {
            page,
            limit,
            total,
            totalPages: total > 0 ? Math.ceil(total / limit) : 0,
          },
        },
        message: "Get advisor students overview successfully",
      });
    }

    const studentIds = students.map((item) => item._id);

    const studentCurricula = await StudentCurriculum.find({
      studentId: { $in: studentIds },
    })
      .select("studentId curriculumId registrations")
      .populate("registrations.gradeId", "letterGrade gpa4")
      .lean();

    const studentCurriculumByStudentId = new Map(
      studentCurricula.map((item) => [String(item.studentId), item]),
    );

    const curriculumIds = Array.from(
      new Set(
        studentCurricula.map((item) => toId(item.curriculumId)).filter(Boolean),
      ),
    );

    const curricula = await Curriculum.find({ _id: { $in: curriculumIds } })
      .select("_id items totalCredits")
      .lean();

    const curriculumById = new Map(
      curricula.map((item) => [String(item._id), item]),
    );

    const items = students.map((student) => {
      const studentCurriculum = studentCurriculumByStudentId.get(
        String(student._id),
      );
      const curriculum = studentCurriculum
        ? curriculumById.get(toId(studentCurriculum.curriculumId))
        : null;

      return {
        student,
        progress: buildProgressSummary(studentCurriculum, curriculum),
        hasCurriculum: Boolean(studentCurriculum && curriculum),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        },
      },
      message: "Get advisor students overview successfully",
    });
  } catch (error) {
    return next(error);
  }
});

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

    const student = await Student.findById(req.params.studentId).select(
      "_id studentCode fullName majorId",
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
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

    const progress = await calculateProgress(req.params.studentId);

    if (!data) {
      return res.status(200).json({
        success: true,
        data: {
          studentCurriculum: null,
          progress,
        },
        message: "Student chưa được gán chương trình khung",
      });
    }

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
