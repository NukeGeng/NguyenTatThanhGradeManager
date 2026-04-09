const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "subjectId is required"],
    },
    subjectCode: {
      type: String,
      trim: true,
      default: "",
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    schoolYear: {
      type: String,
      trim: true,
      default: "",
    },
    semester: {
      type: Number,
      enum: [1, 2, 3],
      required: [true, "semester is required"],
    },
    status: {
      type: String,
      enum: ["registered", "completed", "failed", "retaking"],
      default: "registered",
    },
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      default: null,
    },
    gpa4: {
      type: Number,
      default: null,
      min: 0,
      max: 4,
    },
    letterGrade: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const studentCurriculumSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "studentId is required"],
      unique: true,
    },
    curriculumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum",
      required: [true, "curriculumId is required"],
    },
    majorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      default: null,
    },
    advisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    enrolledYear: {
      type: String,
      required: [true, "enrolledYear is required"],
      trim: true,
    },
    registrations: {
      type: [registrationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

studentCurriculumSchema.index({ studentId: 1 }, { unique: true });
studentCurriculumSchema.index({ advisorId: 1 });
studentCurriculumSchema.index({ curriculumId: 1 });

module.exports = mongoose.model("StudentCurriculum", studentCurriculumSchema);
