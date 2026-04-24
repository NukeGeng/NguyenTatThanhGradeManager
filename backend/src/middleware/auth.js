const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student");
const Class = require("../models/Class");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id || payload.userId;

    const user = await User.findById(userId)
      .select("-password")
      .populate("departmentIds", "_id code name")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Resolve advisingStudentIds from advisingClassCodes for advisor accounts.
    // Seed data only populates advisingClassCodes (homeroom class codes like "NH22CNTT01"),
    // so we derive advisingStudentIds at login time from those homeroom classes.
    if (
      user.role === "advisor" &&
      !(user.advisingStudentIds || []).length &&
      (user.advisingClassCodes || []).length
    ) {
      const homeroomClasses = await Class.find({
        code: { $in: user.advisingClassCodes },
      })
        .select("_id")
        .lean();

      if (homeroomClasses.length) {
        const homeroomClassIds = homeroomClasses.map((c) => c._id);
        const advisees = await Student.find({
          classId: { $in: homeroomClassIds },
        })
          .select("_id")
          .lean();
        user.advisingStudentIds = advisees.map((s) => s._id);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = auth;
