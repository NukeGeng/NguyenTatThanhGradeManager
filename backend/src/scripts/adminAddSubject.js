const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Department = require("../models/Department");
const Subject = require("../models/Subject");

dotenv.config({ path: ".env" });

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  await Department.updateOne(
    { code: "CNTT" },
    {
      $setOnInsert: {
        code: "CNTT",
        name: "Công nghệ Thông tin",
        isActive: true,
      },
    },
    { upsert: true },
  );

  const department = await Department.findOne({ code: "CNTT" });
  if (!department) {
    throw new Error("Department CNTT not found after upsert");
  }

  const payload = {
    code: "aiiot",
    name: "AI IoT",
    departmentId: department._id,
    credits: 3,
    coefficient: 3,
    semester: 2,
    category: "theory",
    defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
    txCount: 3,
    isActive: true,
  };

  const result = await Subject.updateOne(
    { code: payload.code },
    { $setOnInsert: payload },
    { upsert: true },
  );

  const status = result.upsertedCount > 0 ? "inserted" : "already_exists";
  console.log(
    JSON.stringify({
      status,
      code: payload.code,
      departmentId: String(department._id),
    }),
  );
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
