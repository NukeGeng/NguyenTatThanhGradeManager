const mongoose = require("mongoose");

const majorSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Major code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Major name is required"],
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "departmentId is required"],
    },
    totalCredits: {
      type: Number,
      required: [true, "totalCredits is required"],
      min: 1,
    },
    durationYears: {
      type: Number,
      default: 4,
      min: 1,
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

majorSchema.index({ code: 1 }, { unique: true });
majorSchema.index({ departmentId: 1 });

module.exports = mongoose.model("Major", majorSchema);
