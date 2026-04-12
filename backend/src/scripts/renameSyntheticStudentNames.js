const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Student = require("../models/Student");

dotenv.config();

const SYNTHETIC_NAME_REGEX = /^\s*sinh\s*vien\s*\d+\s*$/i;

const REAL_LAST_NAMES = [
  "Nguyen",
  "Tran",
  "Le",
  "Pham",
  "Hoang",
  "Phan",
  "Vu",
  "Vo",
  "Dang",
  "Bui",
  "Do",
  "Ho",
  "Ngo",
  "Duong",
  "Ly",
  "Dinh",
  "Truong",
  "Mai",
  "Lam",
  "Ta",
];

const REAL_MIDDLE_NAMES = [
  "Van",
  "Thi",
  "Minh",
  "Gia",
  "Quoc",
  "Thanh",
  "Duc",
  "Ngoc",
  "Bao",
  "Anh",
  "Hai",
  "Khanh",
  "Thuy",
  "Bich",
  "Hoang",
  "Quynh",
  "Tu",
  "Huu",
  "Phuong",
  "Tien",
];

const REAL_FIRST_NAMES = [
  "An",
  "Binh",
  "Cuong",
  "Dung",
  "Duc",
  "Ha",
  "Huy",
  "Khanh",
  "Long",
  "Mai",
  "Nam",
  "Oanh",
  "Phuc",
  "Quyen",
  "Son",
  "Tam",
  "Tung",
  "Uyen",
  "Viet",
  "Yen",
  "Bao",
  "Chi",
  "Duy",
  "Giang",
  "Hung",
  "Linh",
  "Phat",
  "Quynh",
  "Sang",
  "Tram",
  "Trang",
  "Hanh",
  "Nhi",
  "Kiet",
  "Hieu",
  "Thao",
  "My",
  "Ngan",
  "Phuong",
  "Thien",
];

const buildRealFullName = (seed) => {
  const normalized = Math.max(1, Number(seed || 1));
  const last = REAL_LAST_NAMES[(normalized * 17 + 3) % REAL_LAST_NAMES.length];
  const middle =
    REAL_MIDDLE_NAMES[(normalized * 19 + 5) % REAL_MIDDLE_NAMES.length];
  const first =
    REAL_FIRST_NAMES[(normalized * 23 + 7) % REAL_FIRST_NAMES.length];

  return `${last} ${middle} ${first}`;
};

const buildParentName = (seed) => {
  const normalized = Math.max(1, Number(seed || 1));
  const last = REAL_LAST_NAMES[(normalized * 29 + 11) % REAL_LAST_NAMES.length];
  const middle =
    REAL_MIDDLE_NAMES[(normalized * 31 + 13) % REAL_MIDDLE_NAMES.length];
  const first =
    REAL_FIRST_NAMES[(normalized * 37 + 17) % REAL_FIRST_NAMES.length];

  return `${last} ${middle} ${first}`;
};

const extractSeed = (studentCode, fallback) => {
  const digits = String(studentCode || "").replace(/\D/g, "");
  if (!digits) {
    return fallback;
  }

  const numeric = Number(digits);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const run = async () => {
  await connectDatabase();

  const syntheticStudents = await Student.find({
    fullName: { $regex: SYNTHETIC_NAME_REGEX },
  })
    .select("_id studentCode fullName parentName")
    .lean();

  if (!syntheticStudents.length) {
    console.log("Khong tim thay sinh vien ten dang synthetic de doi ten.");
    await mongoose.disconnect();
    return;
  }

  const bulkOps = syntheticStudents.map((student, index) => {
    const seed = extractSeed(student.studentCode, index + 1);
    return {
      updateOne: {
        filter: { _id: student._id },
        update: {
          $set: {
            fullName: buildRealFullName(seed),
            parentName: buildParentName(seed),
          },
        },
      },
    };
  });

  const result = await Student.bulkWrite(bulkOps, { ordered: false });

  const remainingSyntheticCount = await Student.countDocuments({
    fullName: { $regex: SYNTHETIC_NAME_REGEX },
  });

  console.log(
    `Da doi ten ${Number(result.modifiedCount || 0)} sinh vien sang ten that.`,
  );
  console.log(`So sinh vien ten synthetic con lai: ${remainingSyntheticCount}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Doi ten sinh vien that bai:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
