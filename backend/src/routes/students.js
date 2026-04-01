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

    if (req.user.role !== "admin") {
      const classes = await Class.find({
        departmentId: {
          $in: (req.user.departmentIds || []).map((item) =>
            item?._id ? item._id : item,
          ),
        },
      }).select("_id");

      query.classId = { $in: classes.map((item) => item._id) };
    }

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
    const student = await Student.findById(req.params.id).populate(
      "classId",
      "name departmentId gradeLevel schoolYearId",
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = (req.user.departmentIds || []).map((item) =>
        item?._id ? String(item._id) : String(item),
      );

      if (
        !allowedDepartmentIds.includes(String(student.classId?.departmentId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập học sinh này",
        });
      }
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

    if (req.user.role !== "admin") {
      const allowedDepartmentIds = (req.user.departmentIds || []).map((item) =>
        item?._id ? String(item._id) : String(item),
      );

      if (!allowedDepartmentIds.includes(String(classData.departmentId))) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền tạo học sinh cho lớp này",
        });
      }
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
            address: req.body.address || "",
            parentName: req.body.parentName || "",
            parentPhone: parentPhone || "",
            parentEmail: req.body.parentEmail || "",
            avatar: req.body.avatar || "",
            status: status || "active",
            notes: req.body.notes || "",
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
        .populate("classId", "name departmentId gradeLevel schoolYearId")
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
      "address",
      "parentName",
      "parentPhone",
      "parentEmail",
      "avatar",
      "status",
      "notes",
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

      if (req.user.role !== "admin") {
        const currentClass = await Class.findById(
          currentStudent.classId,
        ).session(session);
        const allowedDepartmentIds = (req.user.departmentIds || []).map(
          (item) => (item?._id ? String(item._id) : String(item)),
        );

        if (
          !allowedDepartmentIds.includes(String(currentClass?.departmentId))
        ) {
          res.status(403).json({
            success: false,
            message: "Bạn không có quyền cập nhật học sinh này",
          });
          return;
        }
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

        if (req.user.role !== "admin") {
          const allowedDepartmentIds = (req.user.departmentIds || []).map(
            (item) => (item?._id ? String(item._id) : String(item)),
          );

          if (!allowedDepartmentIds.includes(String(newClass.departmentId))) {
            res.status(403).json({
              success: false,
              message: "Bạn không có quyền chuyển học sinh sang lớp này",
            });
            return;
          }
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
        .populate("classId", "name departmentId gradeLevel schoolYearId")
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

      if (req.user.role !== "admin") {
        const studentClass = await Class.findById(student.classId).session(
          session,
        );
        const allowedDepartmentIds = (req.user.departmentIds || []).map(
          (item) => (item?._id ? String(item._id) : String(item)),
        );

        if (
          !allowedDepartmentIds.includes(String(studentClass?.departmentId))
        ) {
          res.status(403).json({
            success: false,
            message: "Bạn không có quyền xóa học sinh này",
          });
          return;
        }
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
