const express = require("express");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const User = require("../models/User");
const Department = require("../models/Department");

const router = express.Router();

router.use(auth, adminOnly);

router.get("/", async (req, res, next) => {
  try {
    const query = { role: "teacher" };

    if (req.query.departmentId) {
      query.departmentIds = req.query.departmentId;
    }

    const users = await User.find(query)
      .select("-password")
      .populate("departmentIds", "_id code name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users,
      message: "Get users successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("departmentIds", "_id code name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: "Get user detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = "teacher",
      departmentIds = [],
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, password are required",
      });
    }

    const normalizedRole = role === "admin" ? "admin" : "teacher";

    if (normalizedRole === "teacher" && departmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Teacher must belong to at least one department",
      });
    }

    if (departmentIds.length > 0) {
      const count = await Department.countDocuments({
        _id: { $in: departmentIds },
      });

      if (count !== departmentIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some departmentIds are invalid",
        });
      }
    }

    const existedUser = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: normalizedRole,
      departmentIds: normalizedRole === "admin" ? [] : departmentIds,
    });

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("departmentIds", "_id code name");

    return res.status(201).json({
      success: true,
      data: populated,
      message: "Create user successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const payload = {};
    const allowedFields = ["name", "email", "phone", "avatar"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.name !== undefined) payload.name = String(payload.name).trim();
    if (payload.email !== undefined)
      payload.email = String(payload.email).toLowerCase().trim();

    const user = await User.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .populate("departmentIds", "_id code name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: "Update user successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/departments", async (req, res, next) => {
  try {
    const { departmentIds = [] } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "teacher") {
      return res.status(400).json({
        success: false,
        message: "Only teacher can update departmentIds",
      });
    }

    const count = await Department.countDocuments({
      _id: { $in: departmentIds },
    });
    if (count !== departmentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some departmentIds are invalid",
      });
    }

    if (departmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Teacher must belong to at least one department",
      });
    }

    user.departmentIds = departmentIds;
    await user.save();

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("departmentIds", "_id code name");

    return res.status(200).json({
      success: true,
      data: populated,
      message: "Update departments successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/toggle", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      data: { _id: user._id, isActive: user.isActive },
      message: "Toggle user status successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa admin cuối cùng",
        });
      }
    }

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      data: user,
      message: "Delete user successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
