const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Department = require("../models/Department");
const SchoolYear = require("../models/SchoolYear");
const Subject = require("../models/Subject");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const query = {};

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = (req.user.departmentIds || []).map((item) =>
        item?._id ? String(item._id) : String(item),
      );

      query.departmentId = {
        $in: allowedDepartmentIds,
      };

      if (
        departmentId &&
        !allowedDepartmentIds.includes(String(departmentId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem khoa này",
        });
      }
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    const classes = await Class.find(query)
      .populate("subjectId", "_id code name credits")
      .populate("departmentId", "_id code name")
      .populate("schoolYearId", "_id name isCurrent")
      .populate("teacherId", "name email")
      .sort({ semester: 1, code: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: classes,
      message: "Get classes successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate("subjectId", "_id code name credits")
      .populate("departmentId", "_id code name")
      .populate("schoolYearId", "_id name isCurrent")
      .populate("teacherId", "name email");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: classData,
      message: "Get class detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/students", async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = (req.user.departmentIds || []).map((item) =>
        item?._id ? String(item._id) : String(item),
      );

      if (!allowedDepartmentIds.includes(String(classData.departmentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập lớp này",
        });
      }
    }

    const students = await Student.find({ classId: classData._id }).sort({
      fullName: 1,
    });

    return res.status(200).json({
      success: true,
      data: students,
      message: "Get class students successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", adminOnly, async (req, res, next) => {
  try {
    const {
      code,
      name,
      subjectId,
      departmentId,
      schoolYearId,
      semester,
      teacherId,
      weights,
      txCount,
    } = req.body;

    const normalizedCode = String(code || name || "").trim();

    if (
      !normalizedCode ||
      !subjectId ||
      !departmentId ||
      !schoolYearId ||
      !semester
    ) {
      return res.status(400).json({
        success: false,
        message:
          "code, subjectId, departmentId, schoolYearId, semester are required",
      });
    }

    const [department, schoolYear, subject] = await Promise.all([
      Department.findById(departmentId),
      SchoolYear.findById(schoolYearId),
      Subject.findById(subjectId),
    ]);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (!schoolYear) {
      return res.status(404).json({
        success: false,
        message: "School year not found",
      });
    }

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    if (String(subject.departmentId) !== String(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Môn học không thuộc khoa đã chọn",
      });
    }

    const classData = await Class.create({
      code: normalizedCode,
      name: String(name || normalizedCode).trim(),
      subjectId,
      departmentId,
      schoolYearId,
      semester: Number(semester),
      teacherId: teacherId || null,
      weights,
      txCount,
    });

    const populatedClass = await Class.findById(classData._id)
      .populate("subjectId", "_id code name credits")
      .populate("departmentId", "_id code name")
      .populate("schoolYearId", "_id name isCurrent")
      .populate("teacherId", "name email");

    return res.status(201).json({
      success: true,
      data: populatedClass,
      message: "Create class successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Class code already exists in this semester and school year",
      });
    }

    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền thực hiện",
      });
    }

    const allowedFields = [
      "code",
      "name",
      "subjectId",
      "departmentId",
      "schoolYearId",
      "semester",
      "teacherId",
      "weights",
      "txCount",
      "studentCount",
      "isActive",
    ];
    const payload = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.name) {
      payload.name = String(payload.name).trim();
    }

    const checkDepartmentId = payload.departmentId || undefined;

    if (checkDepartmentId !== undefined) {
      const department = await Department.findById(checkDepartmentId);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }
    }

    if (payload.subjectId !== undefined) {
      const subject = await Subject.findById(payload.subjectId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      if (
        checkDepartmentId &&
        String(subject.departmentId) !== String(checkDepartmentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Môn học không thuộc khoa đã chọn",
        });
      }
    }

    if (payload.schoolYearId !== undefined) {
      const schoolYear = await SchoolYear.findById(payload.schoolYearId);
      if (!schoolYear) {
        return res.status(404).json({
          success: false,
          message: "School year not found",
        });
      }
    }

    if (payload.semester !== undefined)
      payload.semester = Number(payload.semester);

    if (payload.studentCount !== undefined) {
      payload.studentCount = Math.max(0, Number(payload.studentCount));
    }

    const updatedClass = await Class.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("subjectId", "_id code name credits")
      .populate("departmentId", "_id code name")
      .populate("schoolYearId", "_id name isCurrent")
      .populate("teacherId", "name email");

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedClass,
      message: "Update class successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Admin mới có quyền thực hiện",
      });
    }

    const studentCount = await Student.countDocuments({
      classId: req.params.id,
    });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa lớp đang có học sinh",
      });
    }

    const deletedClass = await Class.findByIdAndDelete(req.params.id);

    if (!deletedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: deletedClass,
      message: "Delete class successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
