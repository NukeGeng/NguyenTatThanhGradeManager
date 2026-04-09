const mongoose = require("mongoose");

const curriculumItemSchema = new mongoose.Schema(
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
    subjectName: {
      type: String,
      trim: true,
      default: "",
    },
    credits: {
      type: Number,
      min: 0,
      default: 0,
    },
    year: {
      type: Number,
      min: 1,
      max: 4,
      required: [true, "year is required"],
    },
    semester: {
      type: Number,
      enum: [1, 2, 3],
      required: [true, "semester is required"],
    },
    subjectType: {
      type: String,
      enum: ["required", "elective", "prerequisite"],
      default: "required",
    },
    prerequisiteIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const curriculumSchema = new mongoose.Schema(
  {
    majorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      required: [true, "majorId is required"],
    },
    schoolYear: {
      type: String,
      required: [true, "schoolYear is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    items: {
      type: [curriculumItemSchema],
      default: [],
    },
    totalCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

curriculumSchema.pre("validate", function preValidate(next) {
  const items = Array.isArray(this.items) ? this.items : [];
  this.totalCredits = items.reduce(
    (sum, item) => sum + Number(item?.credits || 0),
    0,
  );
  next();
});

curriculumSchema.index({ majorId: 1, schoolYear: 1 });

module.exports = mongoose.model("Curriculum", curriculumSchema);
