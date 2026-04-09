const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const Major = require("../models/Major");
const Department = require("../models/Department");
const Curriculum = require("../models/Curriculum");

const router = express.Router();

router.use(auth, adminOnly);

router.get("/", async (req, res, next) => {
  try {
    const query = {};
    if (req.query.departmentId) {
      query.departmentId = req.query.departmentId;
    }

    const majors = await Major.find(query)
      .populate("departmentId", "_id code name")
      .sort({ code: 1 });

    return res.status(200).json({
      success: true,
      data: majors,
      message: "Get majors successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const major = await Major.findById(req.params.id).populate(
      "departmentId",
      "_id code name",
    );

    if (!major) {
      return res.status(404).json({
        success: false,
        message: "Major not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: major,
      message: "Get major detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { code, name, departmentId, totalCredits, durationYears, isActive } =
      req.body;

    if (!code || !name || !departmentId || !totalCredits) {
      return res.status(400).json({
        success: false,
        message: "code, name, departmentId, totalCredits are required",
      });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const major = await Major.create({
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      departmentId,
      totalCredits: Number(totalCredits),
      durationYears: durationYears ? Number(durationYears) : 4,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const populated = await Major.findById(major._id).populate(
      "departmentId",
      "_id code name",
    );

    return res.status(201).json({
      success: true,
      data: populated,
      message: "Create major successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Major code already exists",
      });
    }

    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const payload = {};
    [
      "name",
      "departmentId",
      "totalCredits",
      "durationYears",
      "isActive",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.name !== undefined) {
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

    if (payload.totalCredits !== undefined) {
      payload.totalCredits = Number(payload.totalCredits);
    }

    if (payload.durationYears !== undefined) {
      payload.durationYears = Number(payload.durationYears);
    }

    const major = await Major.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate("departmentId", "_id code name");

    if (!major) {
      return res.status(404).json({
        success: false,
        message: "Major not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: major,
      message: "Update major successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const major = await Major.findById(req.params.id);
    if (!major) {
      return res.status(404).json({
        success: false,
        message: "Major not found",
      });
    }

    const curriculumCount = await Curriculum.countDocuments({
      majorId: major._id,
    });
    if (curriculumCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa ngành vì đã có chương trình khung",
      });
    }

    await Major.findByIdAndDelete(major._id);

    return res.status(200).json({
      success: true,
      data: major,
      message: "Delete major successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
