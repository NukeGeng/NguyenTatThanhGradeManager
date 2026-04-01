const express = require("express");
const auth = require("../middleware/auth");
const Class = require("../models/Class");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const { schoolYear, grade } = req.query;
    const query = {};

    if (schoolYear) {
      query.schoolYear = schoolYear;
    }

    if (grade) {
      query.grade = Number(grade);
    }

    const classes = await Class.find(query)
      .populate("teacherId", "name email")
      .sort({ grade: 1, name: 1 });

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
    const classData = await Class.findById(req.params.id).populate(
      "teacherId",
      "name email",
    );

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

router.post("/", async (req, res, next) => {
  try {
    const { name, grade, schoolYear, teacherId } = req.body;

    if (!name || !grade || !schoolYear) {
      return res.status(400).json({
        success: false,
        message: "name, grade, schoolYear are required",
      });
    }

    const classData = await Class.create({
      name: name.trim(),
      grade: Number(grade),
      schoolYear: schoolYear.trim(),
      teacherId: teacherId || null,
    });

    return res.status(201).json({
      success: true,
      data: classData,
      message: "Create class successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Class already exists",
      });
    }

    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const allowedFields = [
      "name",
      "grade",
      "schoolYear",
      "teacherId",
      "studentCount",
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

    if (payload.schoolYear) {
      payload.schoolYear = String(payload.schoolYear).trim();
    }

    if (payload.grade !== undefined) {
      payload.grade = Number(payload.grade);
    }

    if (payload.studentCount !== undefined) {
      payload.studentCount = Math.max(0, Number(payload.studentCount));
    }

    const updatedClass = await Class.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate("teacherId", "name email");

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
