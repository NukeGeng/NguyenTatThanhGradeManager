const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "studentId is required"],
      index: true,
    },
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: [true, "gradeId is required"],
      index: true,
    },
    predictedRank: {
      type: String,
      enum: ["Giỏi", "Khá", "Trung Bình", "Yếu"],
      required: [true, "predictedRank is required"],
    },
    confidence: {
      type: Number,
      required: [true, "confidence is required"],
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      required: [true, "riskLevel is required"],
      index: true,
    },
    weakSubjects: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    analysis: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

predictionSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model("Prediction", predictionSchema);
