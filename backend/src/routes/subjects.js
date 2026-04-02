const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const Subject = require("../models/Subject");
const Department = require("../models/Department");
const Grade = require("../models/Grade");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const { departmentId, semester, isActive } = req.query;
    const query = {};

    if (req.user.role !== "admin") {
      query.departmentId = {
        $in: (req.user.departmentIds || []).map((item) =>
          item?._id ? item._id : item,
        ),
      };
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    if (semester !== undefined) {
      query.$or = [{ semester: "both" }, { semester: Number(semester) }];
    }

    if (isActive !== undefined) {
      query.isActive = String(isActive) === "true";
    }

    const subjects = await Subject.find(query)
      .populate("departmentId", "_id code name")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: subjects,
      message: "Get subjects successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate(
      "departmentId",
      "_id code name",
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
      message: "Get subject detail successfully",
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
      departmentId,
      semester,
      credits,
      coefficient,
      category,
      defaultWeights,
      txCount,
      gradeLevel,
      isActive,
    } = req.body;

    if (
      !code ||
      !name ||
      !departmentId ||
      semester === undefined ||
      credits === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "code, name, departmentId, semester, credits are required",
      });
    }

    if (!/^[a-z0-9]+$/.test(String(code).trim())) {
      return res.status(400).json({
        success: false,
        message: "code chỉ được chứa a-z và số",
      });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const parsedWeights = defaultWeights || undefined;
    if (parsedWeights) {
      const weightSum =
        Number(parsedWeights.tx || 0) +
        Number(parsedWeights.gk || 0) +
        Number(parsedWeights.th || 0) +
        Number(parsedWeights.tkt || 0);

      if (weightSum !== 100) {
        return res.status(400).json({
          success: false,
          message: "defaultWeights phải có tổng bằng 100",
        });
      }
    }

    const subject = await Subject.create({
      code: String(code).trim().toLowerCase(),
      name: String(name).trim(),
      departmentId,
      semester,
      credits: Number(credits),
      coefficient,
      category,
      defaultWeights: parsedWeights,
      txCount,
      gradeLevel,
      isActive,
    });

    const populated = await Subject.findById(subject._id).populate(
      "departmentId",
      "_id code name",
    );

    return res.status(201).json({
      success: true,
      data: populated,
      message: "Create subject successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Subject code already exists",
      });
    }

    return next(error);
  }
});

router.put("/:id", adminOnly, async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const allowedFields = [
      "name",
      "credits",
      "coefficient",
      "category",
      "defaultWeights",
      "txCount",
      "gradeLevel",
      "semester",
      "departmentId",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        subject[field] = req.body[field];
      }
    });

    await subject.save();

    const populated = await Subject.findById(subject._id).populate(
      "departmentId",
      "_id code name",
    );

    return res.status(200).json({
      success: true,
      data: populated,
      message: "Update subject successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/toggle", adminOnly, async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    subject.isActive = !subject.isActive;
    await subject.save();

    return res.status(200).json({
      success: true,
      data: { _id: subject._id, isActive: subject.isActive },
      message: "Toggle subject successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const gradeCount = await Grade.countDocuments({
      $or: [{ subjectId: subject._id }, { "scores.subjectCode": subject.code }],
    });

    if (gradeCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Môn học đã có dữ liệu điểm, không thể xóa",
      });
    }

    await Subject.findByIdAndDelete(subject._id);

    return res.status(200).json({
      success: true,
      data: subject,
      message: "Delete subject successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
