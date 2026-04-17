const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
      maxlength: 300,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
      maxlength: 600,
    },
    content: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "dao-tao",
        "hoc-vu",
        "hoc-phi",
        "tan-sinh-vien",
        "su-kien",
        "khac",
      ],
      default: "khac",
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    authorName: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ isActive: 1, publishedAt: -1 });

module.exports = mongoose.model("News", newsSchema);
