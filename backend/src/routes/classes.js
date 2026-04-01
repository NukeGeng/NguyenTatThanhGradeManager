const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Department = require("../models/Department");
const SchoolYear = require("../models/SchoolYear");

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
      .populate("departmentId", "_id code name")
      .populate("schoolYearId", "_id name isCurrent")
      .populate("teacherId", "name email")
      .sort({ gradeLevel: 1, name: 1 });

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
    const { name, departmentId, gradeLevel, schoolYearId, teacherId } =
      req.body;

    if (!name || !departmentId || !gradeLevel || !schoolYearId) {
      return res.status(400).json({
        success: false,
        message: "name, departmentId, gradeLevel, schoolYearId are required",
      });
    }

    const [department, schoolYear] = await Promise.all([
      Department.findById(departmentId),
      SchoolYear.findById(schoolYearId),
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

    const classData = await Class.create({
      name: name.trim(),
      departmentId,
      gradeLevel: Number(gradeLevel),
      schoolYearId,
      teacherId: teacherId || null,
    });

    const populatedClass = await Class.findById(classData._id)
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
        message: "Class name already exists in this school year",
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
      "name",
      "departmentId",
      "gradeLevel",
      "schoolYearId",
      "teacherId",
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

    if (payload.departmentId !== undefined) {
      const department = await Department.findById(payload.departmentId);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
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

    if (payload.gradeLevel !== undefined) {
      payload.gradeLevel = Number(payload.gradeLevel);
    }

    if (payload.studentCount !== undefined) {
      payload.studentCount = Math.max(0, Number(payload.studentCount));
    }

    const updatedClass = await Class.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
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
