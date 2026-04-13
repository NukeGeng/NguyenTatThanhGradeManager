const Student = require("../models/Student");

const advisorAccess = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role === "admin") {
      return next();
    }

    const advisingClassCodes = (req.user?.advisingClassCodes || []).map(String);
    if (!advisingClassCodes.length) {
      return res.status(403).json({
        success: false,
        message: "Chỉ cố vấn học tập hoặc admin có quyền truy cập",
      });
    }

    const studentId =
      req.params.studentId ||
      req.params.id ||
      req.body.studentId ||
      req.query.studentId;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId là bắt buộc",
      });
    }

    const student =
      await Student.findById(studentId).select("_id homeClassCode");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (advisingClassCodes.includes(String(student.homeClassCode))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập sinh viên này",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = advisorAccess;
