const mongoose = require("mongoose");

const weightsSchema = new mongoose.Schema(
  {
    tx: { type: Number, default: 10, min: 0, max: 100 },
    gk: { type: Number, default: 30, min: 0, max: 100 },
    th: { type: Number, default: 0, min: 0, max: 100 },
    tkt: { type: Number, default: 60, min: 0, max: 100 },
  },
  { _id: false },
);

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
    credits: {
      type: Number,
      required: [true, "credits is required"],
      min: 1,
      max: 5,
      default: 3,
    },
    semester: {
      type: mongoose.Schema.Types.Mixed,
      enum: [1, 2, 3, "all"],
      default: "all",
    },
    coefficient: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    category: {
      type: String,
      enum: [
        "theory",
        "practice",
        "both",
        "science",
        "social",
        "language",
        "specialized",
        "other",
      ],
      default: "theory",
    },
    defaultWeights: {
      type: weightsSchema,
      default: () => ({ tx: 10, gk: 30, th: 0, tkt: 60 }),
    },
    txCount: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
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

subjectSchema.pre("validate", function preValidate(next) {
  const weights = this.defaultWeights || {};
  const sum =
    Number(weights.tx || 0) +
    Number(weights.gk || 0) +
    Number(weights.th || 0) +
    Number(weights.tkt || 0);

  if (sum !== 100) {
    return next(new Error("defaultWeights phải có tổng bằng 100"));
  }

  if (!this.coefficient && this.credits) {
    this.coefficient = this.credits;
  }

  return next();
});

subjectSchema.index({ departmentId: 1, semester: 1 });

module.exports = mongoose.model("Subject", subjectSchema);
