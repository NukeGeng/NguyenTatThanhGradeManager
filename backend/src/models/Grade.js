const mongoose = require("mongoose");
const Subject = require("./Subject");

const scoreSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
  },
  { _id: false },
);

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
      enum: [1, 2],
      required: [true, "semester is required"],
    },
    scores: {
      type: [scoreSchema],
      default: [],
    },
    attendanceTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendanceAbsent: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    conductScore: {
      type: String,
      enum: ["Tốt", "Khá", "Trung Bình", "Yếu"],
      default: null,
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    ranking: {
      type: String,
      enum: ["Giỏi", "Khá", "Trung Bình", "Yếu"],
      default: "Yếu",
    },
    classRank: {
      type: Number,
      default: null,
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

gradeSchema.index(
  { studentId: 1, semester: 1, schoolYearId: 1 },
  { unique: true },
);

gradeSchema.pre("save", async function preSave(next) {
  try {
    const activeSubjects = await Subject.find({ isActive: true }).select(
      "code coefficient",
    );

    const subjectCoefficientMap = new Map(
      activeSubjects.map((subject) => [subject.code, subject.coefficient || 1]),
    );

    let weightedSum = 0;
    let totalCoefficient = 0;

    (this.scores || []).forEach((scoreItem) => {
      if (scoreItem.score === null || scoreItem.score === undefined) {
        return;
      }

      const scoreValue = Number(scoreItem.score);
      if (Number.isNaN(scoreValue)) {
        return;
      }

      const coefficient = subjectCoefficientMap.get(scoreItem.subjectCode) || 1;
      weightedSum += scoreValue * coefficient;
      totalCoefficient += coefficient;
    });

    if (totalCoefficient === 0) {
      this.averageScore = 0;
      this.ranking = "Yếu";
      return next();
    }

    this.averageScore = Number((weightedSum / totalCoefficient).toFixed(2));

    if (this.averageScore >= 8) {
      this.ranking = "Giỏi";
    } else if (this.averageScore >= 6.5) {
      this.ranking = "Khá";
    } else if (this.averageScore >= 5) {
      this.ranking = "Trung Bình";
    } else {
      this.ranking = "Yếu";
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model("Grade", gradeSchema);
