const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentCode: {
      type: String,
      required: [true, "Student code is required"],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: null,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },
    majorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      default: null,
    },
    enrolledYear: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    parentName: {
      type: String,
      trim: true,
      default: "",
    },
    parentPhone: {
      type: String,
      trim: true,
      default: "",
    },
    parentEmail: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "transferred"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

studentSchema.index({ classId: 1, status: 1 });
studentSchema.index({ majorId: 1 });

module.exports = mongoose.model("Student", studentSchema);
