const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const Curriculum = require("../models/Curriculum");
const Major = require("../models/Major");
const Subject = require("../models/Subject");

const router = express.Router();

router.use(auth);

const canReadCurriculum = (role) => role === "admin" || role === "advisor";

router.get("/", async (req, res, next) => {
  try {
    if (!canReadCurriculum(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem chương trình khung",
      });
    }

    const query = {};
    if (req.query.majorId) {
      query.majorId = req.query.majorId;
    }

    const data = await Curriculum.find(query)
      .populate("majorId", "_id code name")
      .sort({ schoolYear: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data,
      message: "Get curricula successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!canReadCurriculum(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem chương trình khung",
      });
    }

    const data = await Curriculum.findById(req.params.id)
      .populate("majorId", "_id code name")
      .populate("items.subjectId", "_id code name credits");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Curriculum not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: "Get curriculum detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { majorId, schoolYear, name, items = [], isActive } = req.body;

    if (!majorId || !schoolYear || !name) {
      return res.status(400).json({
        success: false,
        message: "majorId, schoolYear, name are required",
      });
    }

    const major = await Major.findById(majorId);
    if (!major) {
      return res.status(404).json({
        success: false,
        message: "Major not found",
      });
    }

    const data = await Curriculum.create({
      majorId,
      schoolYear: String(schoolYear).trim(),
      name: String(name).trim(),
      items: Array.isArray(items) ? items : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user._id,
    });

    const populated = await Curriculum.findById(data._id)
      .populate("majorId", "_id code name")
      .populate("items.subjectId", "_id code name credits");

    return res.status(201).json({
      success: true,
      data: populated,
      message: "Create curriculum successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", adminOnly, async (req, res, next) => {
  try {
    const payload = {};
    ["majorId", "schoolYear", "name", "items", "isActive"].forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.majorId !== undefined) {
      const major = await Major.findById(payload.majorId);
      if (!major) {
        return res.status(404).json({
          success: false,
          message: "Major not found",
        });
      }
    }

    const data = await Curriculum.findById(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Curriculum not found",
      });
    }

    Object.assign(data, payload);
    await data.save();

    const populated = await Curriculum.findById(data._id)
      .populate("majorId", "_id code name")
      .populate("items.subjectId", "_id code name credits");

    return res.status(200).json({
      success: true,
      data: populated,
      message: "Update curriculum successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/items", adminOnly, async (req, res, next) => {
  try {
    const {
      subjectId,
      year,
      semester,
      subjectType,
      prerequisiteIds = [],
      note = "",
    } = req.body;

    if (!subjectId || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: "subjectId, year, semester are required",
      });
    }

    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: "Curriculum not found",
      });
    }

    const subject = await Subject.findById(subjectId).select(
      "_id code name credits",
    );
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    curriculum.items.push({
      subjectId: subject._id,
      subjectCode: subject.code,
      subjectName: subject.name,
      credits: Number(subject.credits || 0),
      year: Number(year),
      semester: Number(semester),
      subjectType: subjectType || "required",
      prerequisiteIds,
      note,
    });

    await curriculum.save();

    const populated = await Curriculum.findById(curriculum._id)
      .populate("majorId", "_id code name")
      .populate("items.subjectId", "_id code name credits");

    return res.status(200).json({
      success: true,
      data: populated,
      message: "Add curriculum item successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/items/:subjectId", adminOnly, async (req, res, next) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) {
      return res.status(404).json({
        success: false,
        message: "Curriculum not found",
      });
    }

    const nextItems = curriculum.items.filter(
      (item) => String(item.subjectId) !== String(req.params.subjectId),
    );

    curriculum.items = nextItems;
    await curriculum.save();

    const populated = await Curriculum.findById(curriculum._id)
      .populate("majorId", "_id code name")
      .populate("items.subjectId", "_id code name credits");

    return res.status(200).json({
      success: true,
      data: populated,
      message: "Remove curriculum item successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
