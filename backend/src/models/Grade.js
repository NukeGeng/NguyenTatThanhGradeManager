const mongoose = require("mongoose");

const subjectField = {
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
    semester: {
      type: Number,
      enum: [1, 2],
      required: [true, "semester is required"],
    },
    schoolYear: {
      type: String,
      required: [true, "schoolYear is required"],
      trim: true,
    },
    subjects: {
      toan: subjectField,
      van: subjectField,
      anh: subjectField,
      ly: subjectField,
      hoa: subjectField,
      sinh: subjectField,
      su: subjectField,
      dia: subjectField,
    },
    attendanceAbsent: {
      type: Number,
      default: 0,
      min: 0,
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
  },
  {
    timestamps: true,
  },
);

gradeSchema.index(
  { studentId: 1, semester: 1, schoolYear: 1 },
  { unique: true },
);

gradeSchema.pre("save", function preSave(next) {
  const subjectValues = Object.values(this.subjects || {})
    .filter((score) => score !== null && score !== undefined)
    .map((score) => Number(score));

  if (subjectValues.length === 0) {
    this.averageScore = 0;
    return next();
  }

  const total = subjectValues.reduce((sum, score) => sum + score, 0);
  this.averageScore = Number((total / subjectValues.length).toFixed(2));
  return next();
});

module.exports = mongoose.model("Grade", gradeSchema);
