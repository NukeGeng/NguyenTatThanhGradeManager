const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema(
  {
    semesterNumber: {
      type: Number,
      enum: [1, 2],
      required: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const schoolYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "School year name is required"],
      unique: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "startDate is required"],
    },
    endDate: {
      type: Date,
      required: [true, "endDate is required"],
    },
    semesters: {
      type: [semesterSchema],
      default: [],
    },
    isCurrent: {
      type: Boolean,
      default: false,
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

schoolYearSchema.index({ isCurrent: 1 });

module.exports = mongoose.model("SchoolYear", schoolYearSchema);
