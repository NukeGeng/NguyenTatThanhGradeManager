const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Subject code is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+$/, "Code only allows a-z and numbers"],
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "departmentId is required"],
    },
    semester: {
      type: mongoose.Schema.Types.Mixed,
      enum: [1, 2, "both"],
      default: "both",
    },
    coefficient: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    category: {
      type: String,
      enum: ["science", "social", "language", "specialized", "other"],
      default: "other",
    },
    gradeLevel: {
      type: [Number],
      default: [10, 11, 12],
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

subjectSchema.index({ departmentId: 1, semester: 1 });

module.exports = mongoose.model("Subject", subjectSchema);
