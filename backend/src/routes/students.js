const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Student = require("../models/Student");
const Class = require("../models/Class");

const router = express.Router();

router.use(auth);

const generateStudentCode = async () => {
  const lastStudent = await Student.findOne({ studentCode: /^HS\d{4,}$/ })
    .sort({ studentCode: -1 })
    .select("studentCode");

  const lastNumber = lastStudent
    ? Number(lastStudent.studentCode.replace(/^HS/, ""))
    : 0;

  return `HS${String(lastNumber + 1).padStart(4, "0")}`;
};

router.get("/", async (req, res, next) => {
  try {
    const { classId, status } = req.query;
    const query = {};

    if (classId) {
      query.classId = classId;
    }

    if (status) {
      query.status = status;
    }

    const students = await Student.find(query)
      .populate("classId", "name")
      .sort({ fullName: 1 });

    return res.status(200).json({
      success: true,
      data: students,
      message: "Get students successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate("classId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
      message: "Get student detail successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { fullName, dateOfBirth, gender, classId, parentPhone, status } =
      req.body;

    if (!fullName || !classId) {
      return res.status(400).json({
        success: false,
        message: "fullName and classId are required",
      });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    await session.withTransaction(async () => {
      const studentCode = await generateStudentCode();

      const createdStudents = await Student.create(
        [
          {
            studentCode,
            fullName: String(fullName).trim(),
            dateOfBirth: dateOfBirth || null,
            gender,
            classId,
            parentPhone: parentPhone || "",
            status: status || "active",
          },
        ],
        { session },
      );

      await Class.findByIdAndUpdate(
        classId,
        { $inc: { studentCount: 1 } },
        { session },
      );

      const createdStudent = await Student.findById(createdStudents[0]._id)
        .populate("classId", "name")
        .session(session);

      res.status(201).json({
        success: true,
        data: createdStudent,
        message: "Create student successfully",
      });
    });
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
  } finally {
    await session.endSession();
  }
});

router.put("/:id", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const allowedFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "classId",
      "parentPhone",
      "status",
    ];

    const payload = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.fullName) {
      payload.fullName = String(payload.fullName).trim();
    }

    await session.withTransaction(async () => {
      const currentStudent = await Student.findById(req.params.id).session(
        session,
      );

      if (!currentStudent) {
        res.status(404).json({
          success: false,
          message: "Student not found",
        });
        return;
      }

      if (
        payload.classId &&
        String(payload.classId) !== String(currentStudent.classId)
      ) {
        const newClass = await Class.findById(payload.classId).session(session);
        if (!newClass) {
          res.status(404).json({
            success: false,
            message: "New class not found",
          });
          return;
        }

        await Class.findByIdAndUpdate(
          currentStudent.classId,
          { $inc: { studentCount: -1 } },
          { session },
        );
        await Class.findByIdAndUpdate(
          payload.classId,
          { $inc: { studentCount: 1 } },
          { session },
        );
      }

      await Student.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
        session,
      });

      const updatedStudent = await Student.findById(req.params.id)
        .populate("classId", "name")
        .session(session);

      res.status(200).json({
        success: true,
        data: updatedStudent,
        message: "Update student successfully",
      });
    });
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
  } finally {
    await session.endSession();
  }
});

router.delete("/:id", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const student = await Student.findById(req.params.id).session(session);

      if (!student) {
        res.status(404).json({
          success: false,
          message: "Student not found",
        });
        return;
      }

      await Student.findByIdAndDelete(req.params.id, { session });
      await Class.findByIdAndUpdate(
        student.classId,
        { $inc: { studentCount: -1 } },
        { session },
      );

      res.status(200).json({
        success: true,
        data: student,
        message: "Delete student successfully",
      });
    });
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
  } finally {
    await session.endSession();
  }
});

module.exports = router;
