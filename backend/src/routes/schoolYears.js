const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const SchoolYear = require("../models/SchoolYear");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const data = await SchoolYear.find().sort({ startDate: -1 });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get("/current", async (req, res, next) => {
  try {
    const data = await SchoolYear.findOne({ isCurrent: true });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await SchoolYear.findById(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "School year not found" });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { name, startDate, endDate, semesters = [] } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "name, startDate, endDate are required",
      });
    }

    const data = await SchoolYear.create({
      name: String(name).trim(),
      startDate,
      endDate,
      semesters,
      createdBy: req.user._id,
    });

    return res
      .status(201)
      .json({
        success: true,
        data,
        message: "Create school year successfully",
      });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", adminOnly, async (req, res, next) => {
  try {
    const payload = {};
    ["name", "startDate", "endDate", "semesters"].forEach((field) => {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    });

    if (payload.name !== undefined) {
      payload.name = String(payload.name).trim();
    }

    const data = await SchoolYear.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "School year not found" });
    }

    return res
      .status(200)
      .json({
        success: true,
        data,
        message: "Update school year successfully",
      });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/set-current", adminOnly, async (req, res, next) => {
  try {
    const data = await SchoolYear.findById(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "School year not found" });
    }

    await SchoolYear.updateMany({}, { $set: { isCurrent: false } });
    data.isCurrent = true;
    await data.save();

    return res
      .status(200)
      .json({
        success: true,
        data,
        message: "Set current school year successfully",
      });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
