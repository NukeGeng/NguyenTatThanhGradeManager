const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const departmentAccess = require("../middleware/departmentAccess");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const User = require("../models/User");
const Class = require("../models/Class");
const Student = require("../models/Student");

const router = express.Router();

const normalizeSemesterValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const numeric = Number(value);
  return [1, 2, 3].includes(numeric) ? numeric : null;
};

router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role !== "admin") {
      const departmentIds = (req.user.departmentIds || []).map((item) =>
        item?._id ? item._id : item,
      );
      query = { _id: { $in: departmentIds } };
    }

    const departments = await Department.find(query)
      .populate("headId", "_id name email")
      .sort({ code: 1 });

    return res.status(200).json({
      success: true,
      data: departments,
      message: "Get departments successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", departmentAccess, async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id).populate(
      "headId",
      "_id name email",
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const [subjects, teachers] = await Promise.all([
      Subject.find({ departmentId: department._id }).sort({ name: 1 }),
      User.find({
        departmentIds: department._id,
        role: { $in: ["teacher", "advisor"] },
      })
        .select("_id name email isActive")
        .sort({ name: 1 }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...department.toObject(),
        subjects,
        teachers,
      },
      message: "Get department detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/subjects", departmentAccess, async (req, res, next) => {
  try {
    const { semester } = req.query;
    const query = { departmentId: req.params.id };

    if (semester !== undefined) {
      const normalizedSemester = normalizeSemesterValue(semester);
      if (normalizedSemester === null) {
        return res.status(400).json({
          success: false,
          message: "semester phải thuộc [1,2,3]",
        });
      }

      query.$or = [{ semester: "all" }, { semester: normalizedSemester }];
    }

    const subjects = await Subject.find(query).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: subjects,
      message: "Get department subjects successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/classes", departmentAccess, async (req, res, next) => {
  try {
    const classes = await Class.find({ departmentId: req.params.id })
      .populate("teacherId", "_id name email")
      .populate("schoolYearId", "_id name isCurrent")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: classes,
      message: "Get department classes successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/stats", adminOnly, async (req, res, next) => {
  try {
    const departmentId = req.params.id;

    const [subjects, classes, teachers] = await Promise.all([
      Subject.countDocuments({ departmentId }),
      Class.countDocuments({ departmentId }),
      User.countDocuments({
        departmentIds: departmentId,
        role: { $in: ["teacher", "advisor"] },
      }),
    ]);

    const classDocs = await Class.find({ departmentId }).select("_id");
    const classIds = classDocs.map((item) => item._id);
    const students = classIds.length
      ? await Student.countDocuments({ classId: { $in: classIds } })
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        subjects,
        classes,
        teachers,
        students,
      },
      message: "Get department stats successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { code, name, description, headId } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "code and name are required",
      });
    }

    const department = await Department.create({
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      headId: headId || null,
    });

    return res.status(201).json({
      success: true,
      data: department,
      message: "Create department successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Department code already exists",
      });
    }

    return next(error);
  }
});

router.put("/:id", adminOnly, async (req, res, next) => {
  try {
    const payload = {};
    const allowedFields = ["name", "description", "headId", "isActive"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.name !== undefined) payload.name = String(payload.name).trim();
    if (payload.description !== undefined) {
      payload.description = String(payload.description).trim();
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedDepartment) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedDepartment,
      message: "Update department successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    const [classCount, subjectCount] = await Promise.all([
      Class.countDocuments({ departmentId: req.params.id }),
      Subject.countDocuments({ departmentId: req.params.id }),
    ]);

    if (classCount > 0 || subjectCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa khoa đang có lớp hoặc môn học",
      });
    }

    const deletedDepartment = await Department.findByIdAndDelete(req.params.id);
    if (!deletedDepartment) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: deletedDepartment,
      message: "Delete department successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
