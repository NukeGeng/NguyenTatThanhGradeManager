const mongoose = require("mongoose");
const Subject = require("./Subject");

const weightsSchema = new mongoose.Schema(
  {
    tx: { type: Number, min: 0, max: 100 },
    gk: { type: Number, min: 0, max: 100 },
    th: { type: Number, min: 0, max: 100 },
    tkt: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const classSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Class code is required"],
      trim: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "subjectId is required"],
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "departmentId is required"],
    },
    schoolYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolYear",
      required: [true, "schoolYearId is required"],
    },
    semester: {
      type: Number,
      enum: [1, 2, 3],
      required: [true, "semester is required"],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    weights: {
      type: weightsSchema,
      default: undefined,
    },
    txCount: {
      type: Number,
      min: 1,
      max: 5,
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

classSchema.pre("validate", async function preValidate(next) {
  try {
    if (!this.name && this.code) {
      this.name = this.code;
    }

    if (!this.subjectId) {
      return next();
    }

    const subject = await Subject.findById(this.subjectId).select(
      "defaultWeights txCount departmentId",
    );

    if (!subject) {
      return next(new Error("subjectId không tồn tại"));
    }

    if (!this.departmentId) {
      this.departmentId = subject.departmentId;
    }

    if (!this.weights) {
      this.weights = {
        tx: Number(subject.defaultWeights?.tx ?? 10),
        gk: Number(subject.defaultWeights?.gk ?? 30),
        th: Number(subject.defaultWeights?.th ?? 0),
        tkt: Number(subject.defaultWeights?.tkt ?? 60),
      };
    }

    if (!this.txCount) {
      this.txCount = Number(subject.txCount || 3);
    }

    const sum =
      Number(this.weights.tx || 0) +
      Number(this.weights.gk || 0) +
      Number(this.weights.th || 0) +
      Number(this.weights.tkt || 0);

    if (sum !== 100) {
      return next(new Error("weights phải có tổng bằng 100"));
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

classSchema.index({ code: 1, schoolYearId: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Class", classSchema);
