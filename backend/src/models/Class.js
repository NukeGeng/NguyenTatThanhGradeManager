const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "departmentId is required"],
    },
    gradeLevel: {
      type: Number,
      required: [true, "gradeLevel is required"],
      min: 10,
      max: 12,
    },
    schoolYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolYear",
      required: [true, "schoolYearId is required"],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    studentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

classSchema.index({ name: 1, schoolYearId: 1 }, { unique: true });

module.exports = mongoose.model("Class", classSchema);
