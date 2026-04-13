const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "teacher", "advisor"],
      default: "teacher",
    },
    departmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    advisingStudentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    advisingClassCodes: [
      {
        type: String,
        trim: true,
      },
    ],
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.virtual("isAdmin").get(function isAdminGetter() {
  return this.role === "admin";
});

userSchema.virtual("isAdvisor").get(function isAdvisorGetter() {
  return this.role === "advisor";
});

userSchema.methods.comparePassword = async function comparePassword(
  plainPassword,
) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
