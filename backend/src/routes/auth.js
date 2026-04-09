const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Department = require("../models/Department");
const AuditLog = require("../models/AuditLog");
const auth = require("../middleware/auth");

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      departmentIds: (user.departmentIds || []).map((item) =>
        item?._id ? item._id : item,
      ),
      advisingStudentIds: (user.advisingStudentIds || []).map((item) =>
        item?._id ? item._id : item,
      ),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );

const createAuditLog = async (req, payload) => {
  try {
    await AuditLog.create({
      userId: payload.userId,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId || null,
      description: payload.description || "",
      oldData: payload.oldData || null,
      newData: payload.newData || null,
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
    });
  } catch (error) {
    // Ignore audit log failures to avoid breaking auth endpoints.
  }
};

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, departmentIds = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedRole = ["admin", "teacher", "advisor"].includes(role)
      ? role
      : "teacher";

    if (!Array.isArray(departmentIds)) {
      return res.status(400).json({
        success: false,
        message: "departmentIds must be an array",
      });
    }

    const normalizedDepartmentIds = departmentIds
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    const hasInvalidDepartmentId = normalizedDepartmentIds.some(
      (item) => !mongoose.Types.ObjectId.isValid(item),
    );

    if (hasInvalidDepartmentId) {
      return res.status(400).json({
        success: false,
        message: "departmentIds phải là ObjectId hợp lệ",
      });
    }

    if (
      (normalizedRole === "teacher" || normalizedRole === "advisor") &&
      normalizedDepartmentIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Teacher/Advisor must belong to at least one department",
      });
    }

    if (normalizedDepartmentIds.length > 0) {
      const count = await Department.countDocuments({
        _id: { $in: normalizedDepartmentIds },
      });
      if (count !== normalizedDepartmentIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some departmentIds are invalid",
        });
      }
    }

    const existedUser = await User.findOne({ email: email.toLowerCase() });
    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: normalizedRole,
      departmentIds: normalizedRole === "admin" ? [] : normalizedDepartmentIds,
      advisingStudentIds: [],
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: "Register successful",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentIds: user.departmentIds,
          advisingStudentIds: user.advisingStudentIds || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    })
      .select("+password")
      .populate("departmentIds", "_id code name");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    await createAuditLog(req, {
      userId: user._id,
      action: "LOGIN",
      resource: "auth",
      description: "User logged in",
    });

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentIds: user.departmentIds,
          advisingStudentIds: user.advisingStudentIds || [],
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", auth, async (req, res) => {
  await createAuditLog(req, {
    userId: req.user._id,
    action: "LOGOUT",
    resource: "auth",
    description: "User logged out",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("departmentIds", "_id code name")
    .populate("advisingStudentIds", "_id studentCode fullName");

  return res.status(200).json({
    success: true,
    data: user,
  });
});

router.put("/change-password", auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Change password successful",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
