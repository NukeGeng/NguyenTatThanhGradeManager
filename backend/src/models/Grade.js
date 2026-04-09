const mongoose = require("mongoose");
const ClassModel = require("./Class");

const weightsSchema = new mongoose.Schema(
  {
    tx: { type: Number, min: 0, max: 100, default: 10 },
    gk: { type: Number, min: 0, max: 100, default: 30 },
    th: { type: Number, min: 0, max: 100, default: 0 },
    tkt: { type: Number, min: 0, max: 100, default: 60 },
  },
  { _id: false },
);

const scoreField = {
  type: Number,
  min: 0,
  max: 10,
  default: null,
};

const gradeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "studentId is required"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "classId is required"],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "subjectId is required"],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
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
    weights: {
      type: weightsSchema,
      default: () => ({ tx: 10, gk: 30, th: 0, tkt: 60 }),
    },
    txScores: {
      type: [scoreField],
      default: [],
    },
    gkScore: {
      ...scoreField,
      default: null,
    },
    thScores: {
      type: [scoreField],
      default: [],
    },
    tktScore: {
      ...scoreField,
      default: null,
    },
    txAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    thAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    finalScore: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },
    gpa4: {
      type: Number,
      default: null,
      enum: [0, 2, 3, 4, null],
    },
    letterGrade: {
      type: String,
      enum: ["A", "B", "C", "F", null],
      default: null,
    },
    isDuThi: {
      type: Boolean,
      default: true,
    },
    isVangThi: {
      type: Boolean,
      default: false,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

gradeSchema.index({ studentId: 1, classId: 1 }, { unique: true });

const mean = (values) => {
  const valid = (values || [])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  if (valid.length === 0) {
    return 0;
  }

  const total = valid.reduce((sum, value) => sum + value, 0);
  return Number((total / valid.length).toFixed(2));
};

gradeSchema.pre("validate", async function preValidate(next) {
  try {
    if (!this.classId) {
      return next();
    }

    const classDoc = await ClassModel.findById(this.classId).select(
      "subjectId departmentId schoolYearId semester weights",
    );

    if (!classDoc) {
      return next(new Error("classId không tồn tại"));
    }

    if (!this.subjectId) {
      this.subjectId = classDoc.subjectId;
    }

    if (!this.departmentId) {
      this.departmentId = classDoc.departmentId;
    }

    if (!this.schoolYearId) {
      this.schoolYearId = classDoc.schoolYearId;
    }

    if (!this.semester) {
      this.semester = classDoc.semester;
    }

    if (!this.weights) {
      this.weights = {
        tx: Number(classDoc.weights?.tx ?? 10),
        gk: Number(classDoc.weights?.gk ?? 30),
        th: Number(classDoc.weights?.th ?? 0),
        tkt: Number(classDoc.weights?.tkt ?? 60),
      };
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

gradeSchema.pre("save", async function preSave(next) {
  try {
    this.txAvg = mean(this.txScores);
    this.thAvg = mean(this.thScores);

    if (
      this.tktScore === null ||
      this.tktScore === undefined ||
      this.tktScore === ""
    ) {
      this.finalScore = null;
      this.gpa4 = null;
      this.letterGrade = null;
      return next();
    }

    const weights = this.weights || {};
    const gkScore = Number(this.gkScore ?? 0);
    const tktScore = Number(this.tktScore ?? 0);
    const finalScore =
      this.txAvg * (Number(weights.tx || 0) / 100) +
      gkScore * (Number(weights.gk || 0) / 100) +
      this.thAvg * (Number(weights.th || 0) / 100) +
      tktScore * (Number(weights.tkt || 0) / 100);

    this.finalScore = Number(finalScore.toFixed(2));

    if (this.isVangThi) {
      this.letterGrade = "F";
      this.gpa4 = 0;
      return next();
    }

    if (tktScore < 4) {
      this.letterGrade = "F";
      this.gpa4 = 0;
      return next();
    }

    if (tktScore === 4) {
      this.letterGrade = "C";
      this.gpa4 = 2;
      return next();
    }

    if (this.finalScore >= 8.5) {
      this.letterGrade = "A";
      this.gpa4 = 4;
    } else if (this.finalScore >= 7.0) {
      this.letterGrade = "B";
      this.gpa4 = 3;
    } else if (this.finalScore >= 5.0) {
      this.letterGrade = "C";
      this.gpa4 = 2;
    } else {
      this.letterGrade = "F";
      this.gpa4 = 0;
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model("Grade", gradeSchema);
