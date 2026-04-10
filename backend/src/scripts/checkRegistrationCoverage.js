require("dotenv").config();

const mongoose = require("mongoose");
const StudentCurriculum = require("../models/StudentCurriculum");

const ENROLLED_YEAR = "2025";

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const stats = await StudentCurriculum.aggregate([
    {
      $match: {
        enrolledYear: ENROLLED_YEAR,
      },
    },
    {
      $project: {
        regCount: {
          $size: {
            $ifNull: ["$registrations", []],
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        min: { $min: "$regCount" },
        max: { $max: "$regCount" },
        avg: { $avg: "$regCount" },
        total: { $sum: 1 },
      },
    },
  ]);

  const row = stats[0] || { min: 0, max: 0, avg: 0, total: 0 };

  console.log(
    JSON.stringify(
      {
        enrolledYear: ENROLLED_YEAR,
        studentsChecked: Number(row.total || 0),
        registrationCount: {
          min: Number(row.min || 0),
          max: Number(row.max || 0),
          avg: Number((row.avg || 0).toFixed(2)),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_error) {
      // ignore disconnect error
    }
  });
