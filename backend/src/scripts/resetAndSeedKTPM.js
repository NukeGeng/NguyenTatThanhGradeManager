/**
 * resetAndSeedKTPM.js
 * ─────────────────────────────────────────────────────────────
 * Bước 1: Xóa Student / Grade / Prediction / StudentCurriculum
 * Bước 2: Xóa TẤT CẢ Class hiện tại (homeroom + subject)
 * Bước 3: Tạo SchoolYear 2023-2024 (nếu chưa có)
 * Bước 4: Tạo 9 lớp sinh hoạt 23DKP01–23DKP09
 * Bước 5: Tạo lớp học phần Year 1 HK1+HK2+HK3 theo curriculum KTPM
 * Bước 6: Tạo 500 sinh viên MSSV 230001–230500, tên Việt duy nhất
 * Bước 7: Tạo StudentCurriculum + Grade (HK1+HK2 có điểm, HK3 đăng ký)
 * Bước 8: Cập nhật studentCount trên các lớp học phần
 * ─────────────────────────────────────────────────────────────
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Department = require("../models/Department");
const Major = require("../models/Major");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Prediction = require("../models/Prediction");
const StudentCurriculum = require("../models/StudentCurriculum");
const Curriculum = require("../models/Curriculum");
const SchoolYear = require("../models/SchoolYear");
const Subject = require("../models/Subject");

dotenv.config();

// ── Hằng số ──────────────────────────────────────────────────────────────────
const CNTT_DEPT_ID = "69cf35dd4d2438f53ab0cccc";
const KTPM_MAJOR_ID = "69d72210b8afbcad710fdd8a";
const KTPM_CURR_ID = "69d757f958fb428c5c7e7859";
const HOMEROOM_SUBJ = "69dcb606fe52c7cac3c0c90e"; // sinhhoatcntt

const TOTAL = 500;

// ── Subject IDs Year 1 ────────────────────────────────────────────────────────
const HK1_REQUIRED = [
  { code: "ktpm_toan_a1", id: "69d7dbe158fb428c5c7ebd9f", short: "TOANA1" },
  { code: "ktpm_kien_truc_mt", id: "69d7dbe158fb428c5c7ebda0", short: "KTMT" },
  { code: "ktpm_nhap_mon", id: "69d7dbe158fb428c5c7ebdab", short: "NMKTPM" },
  {
    code: "ktpm_co_so_lap_trinh",
    id: "69d7dbe158fb428c5c7ebdc1",
    short: "CSLP",
  },
  { code: "ktpm_toan_may_tinh", id: "69d7dbe158fb428c5c7ebdcc", short: "TMT" },
];
const HK1_PREREQ = [
  { code: "ktpm_gdqp_an", id: "69d7dbe158fb428c5c7ebdb6", short: "GDQP" },
];
const HK1_LANG = [
  { code: "ktpm_anh_van_1", id: "69d7dbe158fb428c5c7ebdd7", short: "AV1" },
  { code: "ktpm_tieng_nhat_1", id: "69d7dbe158fb428c5c7ebddf", short: "TN1" },
  { code: "ktpm_tieng_duc_1", id: "69d7dbe158fb428c5c7ebde0", short: "TD1" },
];

const HK2_REQUIRED = [
  { code: "ktpm_toan_a2", id: "69d7dbe158fb428c5c7ebde1", short: "TOANA2" },
  {
    code: "ktpm_ky_nang_giao_tiep_1",
    id: "69d7dbe158fb428c5c7ebda1",
    short: "KNGT1",
  },
  { code: "ktpm_triet_hoc_ml", id: "69d7dbe158fb428c5c7ebda2", short: "THML" },
  {
    code: "ktpm_kinh_te_chinh_tri_ml",
    id: "69d7dbe158fb428c5c7ebda3",
    short: "KTCT",
  },
  {
    code: "ktpm_ky_thuat_lap_trinh",
    id: "69d7dbe158fb428c5c7ebda4",
    short: "KTLT",
  },
  { code: "ktpm_co_so_du_lieu", id: "69d7dbe158fb428c5c7ebda5", short: "CSDL" },
];
const HK2_LANG = [
  { code: "ktpm_anh_van_2", id: "69d7dbe158fb428c5c7ebda6", short: "AV2" },
  { code: "ktpm_tieng_nhat_2", id: "69d7dbe158fb428c5c7ebda7", short: "TN2" },
  { code: "ktpm_tieng_duc_2", id: "69d7dbe158fb428c5c7ebda8", short: "TD2" },
];

const HK3_REQUIRED = [
  { code: "ktpm_thiet_ke_web", id: "69d7dbe158fb428c5c7ebda9", short: "TKW" },
  {
    code: "ktpm_ky_nang_giao_tiep_2",
    id: "69d7dbe158fb428c5c7ebdaa",
    short: "KNGT2",
  },
  { code: "ktpm_he_dieu_hanh", id: "69d7dbe158fb428c5c7ebdad", short: "HDH" },
  { code: "ktpm_he_qt_csdl", id: "69d7dbe158fb428c5c7ebdae", short: "HQTCSDL" },
  { code: "ktpm_cnxh_kh", id: "69d7dbe158fb428c5c7ebdaf", short: "CNXHKH" },
];
const HK3_PREREQ = [
  { code: "ktpm_gd_the_chat", id: "69d7dbe158fb428c5c7ebdac", short: "GDTC" },
];
const HK3_LANG = [
  { code: "ktpm_anh_van_3", id: "69d7dbe158fb428c5c7ebdb0", short: "AV3" },
  { code: "ktpm_tieng_nhat_3", id: "69d7dbe158fb428c5c7ebdb1", short: "TN3" },
  { code: "ktpm_tieng_duc_3", id: "69d7dbe158fb428c5c7ebdb2", short: "TD3" },
];

// ── Danh sách tên Việt Nam ─────────────────────────────────────────────────────
const LAST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Đặng",
  "Phạm",
  "Võ",
  "Phan",
  "Hoàng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Đinh",
];
const MIDDLE_NAMES = [
  "Văn",
  "Thị",
  "Anh",
  "Minh",
  "Bảo",
  "Quốc",
  "Hữu",
  "Ngọc",
  "Thu",
  "Phương",
  "Gia",
  "Thanh",
  "Hồng",
  "Trung",
  "Kim",
];
const FIRST_NAMES = [
  "Hào",
  "Nam",
  "Khánh",
  "Vy",
  "Linh",
  "Tuấn",
  "Lan",
  "Hùng",
  "Mai",
  "Hoa",
  "Dũng",
  "Tùng",
  "Sơn",
  "Thảo",
  "Trang",
  "Huy",
  "Đức",
  "Bình",
  "Long",
  "Nhân",
  "Khoa",
  "Phúc",
  "Quân",
  "Cường",
  "Thắng",
  "Lộc",
  "Kiên",
  "Khang",
  "Phong",
  "Duy",
  "Tài",
  "Hiếu",
  "Giang",
  "Thủy",
  "Nga",
  "Hằng",
  "Yến",
  "Diệu",
  "Loan",
  "Hạnh",
  "Trinh",
  "Phụng",
  "Châu",
  "Xuân",
  "An",
  "Bích",
  "Diễm",
  "Thi",
  "Thùy",
  "Nhung",
];

// Sinh 500 tên duy nhất bằng Fisher-Yates shuffle với PRNG cố định
function generateUniqueNames(count) {
  const combos = [];
  for (const l of LAST_NAMES) {
    for (const m of MIDDLE_NAMES) {
      for (const f of FIRST_NAMES) {
        combos.push(`${l} ${m} ${f}`);
      }
    }
  }
  // LCG deterministic shuffle
  let seed = 12345;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  return combos.slice(0, count);
}

// ── Helpers điểm số ───────────────────────────────────────────────────────────
const clamp = (v) => Number(Math.min(10, Math.max(0, Number(v))).toFixed(2));
const randBetween = (lo, hi) =>
  Number((lo + Math.random() * (hi - lo)).toFixed(1));

const GRADE_MAP = {
  A: { range: [8.6, 9.7], gpa4: 4 },
  B: { range: [7.1, 8.4], gpa4: 3 },
  C: { range: [5.1, 6.9], gpa4: 2 },
  F: { range: [2.8, 4.8], gpa4: 0 },
};

const pickLetter = () => {
  const r = Math.random();
  if (r < 0.3) return "A";
  if (r < 0.8) return "B";
  if (r < 0.95) return "C";
  return "F";
};

function buildCompletedGrade(studentId, cls, schoolYearId) {
  const letter = pickLetter();
  const { range, gpa4 } = GRADE_MAP[letter];
  const base = randBetween(range[0], range[1]);
  const w = cls.weights || { tx: 10, gk: 30, th: 0, tkt: 60 };
  const txCount = cls.txCount || 2;
  const txScores = Array.from({ length: txCount }, () =>
    clamp(base + (Math.random() * 1.4 - 0.7)),
  );
  const txAvg = Number(
    (txScores.reduce((s, v) => s + v, 0) / txScores.length).toFixed(2),
  );
  const gkScore = clamp(base + (Math.random() * 1.6 - 0.8));
  const tktScore = clamp(base + (Math.random() * 1.4 - 0.7));
  const finalScore = clamp(
    txAvg * (w.tx / 100) + gkScore * (w.gk / 100) + tktScore * (w.tkt / 100),
  );
  return {
    studentId,
    classId: cls._id,
    subjectId: cls.subjectId,
    departmentId: new mongoose.Types.ObjectId(CNTT_DEPT_ID),
    schoolYearId,
    semester: cls.semester,
    weights: w,
    txScores,
    txAvg,
    gkScore,
    thScores: [],
    thAvg: 0,
    tktScore,
    finalScore,
    gpa4,
    letterGrade: letter,
    isDuThi: true,
    isVangThi: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildRegisteredGrade(studentId, cls, schoolYearId) {
  return {
    studentId,
    classId: cls._id,
    subjectId: cls.subjectId,
    departmentId: new mongoose.Types.ObjectId(CNTT_DEPT_ID),
    schoolYearId,
    semester: cls.semester,
    weights: cls.weights || { tx: 10, gk: 30, th: 0, tkt: 60 },
    txScores: [],
    txAvg: 0,
    gkScore: null,
    thScores: [],
    thAvg: 0,
    tktScore: null,
    finalScore: null,
    gpa4: null,
    letterGrade: null,
    isDuThi: false,
    isVangThi: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Phân bổ sinh viên vào lớp học phần ──────────────────────────────────────
// classSizes: ví dụ [56,56,56,56,56,56,56,56,52]
// trả về: mảng studentIdx -> classIndex
function buildDistribution(classSizes) {
  const assignment = [];
  classSizes.forEach((size, ci) => {
    for (let i = 0; i < size; i++) assignment.push(ci);
  });
  return assignment;
}

// Với 500 SV, 9 lớp: 8 lớp 56 SV + 1 lớp 52 SV
const REQUIRED_SIZES = [56, 56, 56, 56, 56, 56, 56, 56, 52];
const REQUIRED_ASSIGN = buildDistribution(REQUIRED_SIZES); // len=500

// Ngoại ngữ: AV=200 (4x50), TN=170 (57+57+56), TD=130 (44+43+43)
// SV 0-199 → AV, 200-369 → TN, 370-499 → TD
const LANG_CONFIG = [
  { idx: 0, name: "AV", count: 200, classSizes: [50, 50, 50, 50] },
  { idx: 1, name: "TN", count: 170, classSizes: [57, 57, 56] },
  { idx: 2, name: "TD", count: 130, classSizes: [44, 43, 43] },
];

function getLangOption(studentIndex) {
  if (studentIndex < 200) return 0; // AV
  if (studentIndex < 370) return 1; // TN
  return 2; // TD
}

function getLangClassIndex(studentIndex) {
  const opt = getLangOption(studentIndex);
  const cfg = LANG_CONFIG[opt];
  const localIdx =
    studentIndex < 200
      ? studentIndex
      : studentIndex < 370
        ? studentIndex - 200
        : studentIndex - 370;
  const assign = buildDistribution(cfg.classSizes);
  return assign[localIdx] ?? 0;
}

// ── Script chính ─────────────────────────────────────────────────────────────
const run = async () => {
  await connectDatabase();
  console.log("=== RESET & SEED KTPM YEAR 1 ===\n");

  // ── Bước 1: Xóa toàn bộ dữ liệu sinh viên ────────────────────────────────
  console.log(
    "Bước 1: Xóa Student / Grade / Prediction / StudentCurriculum...",
  );
  const [rSt, rGr, rPr, rSc] = await Promise.all([
    Student.deleteMany({}),
    Grade.deleteMany({}),
    Prediction.deleteMany({}),
    StudentCurriculum.deleteMany({}),
  ]);
  console.log(
    `  ✓ ${rSt.deletedCount} SV, ${rGr.deletedCount} điểm, ${rPr.deletedCount} dự đoán, ${rSc.deletedCount} lộ trình\n`,
  );

  // ── Bước 2: Xóa TẤT CẢ Class ─────────────────────────────────────────────
  console.log("Bước 2: Xóa toàn bộ lớp học...");
  const { deletedCount: rCls } = await ClassModel.deleteMany({});
  console.log(`  ✓ Đã xóa ${rCls} lớp\n`);

  // ── Bước 3: Tạo/lấy SchoolYear 2023-2024 ─────────────────────────────────
  console.log("Bước 3: Tạo/lấy năm học 2023-2024...");
  let schoolYear = await SchoolYear.findOne({ name: "2023-2024" });
  if (!schoolYear) {
    schoolYear = await SchoolYear.create({
      name: "2023-2024",
      startDate: new Date("2023-09-01"),
      endDate: new Date("2024-08-31"),
      isCurrent: false,
      semesters: [
        { semesterNumber: 1, isCurrent: false },
        { semesterNumber: 2, isCurrent: false },
        { semesterNumber: 3, isCurrent: false },
      ],
    });
    console.log(
      `  ✓ Đã tạo SchoolYear: ${schoolYear.name} (_id: ${schoolYear._id})\n`,
    );
  } else {
    console.log(
      `  ✓ Dùng SchoolYear có sẵn: ${schoolYear.name} (_id: ${schoolYear._id})\n`,
    );
  }
  const syId = schoolYear._id;

  const cnttDeptId = new mongoose.Types.ObjectId(CNTT_DEPT_ID);
  const ktpmMajorId = new mongoose.Types.ObjectId(KTPM_MAJOR_ID);
  const homeroomSubjId = new mongoose.Types.ObjectId(HOMEROOM_SUBJ);

  // ── Bước 4: Tạo 9 lớp sinh hoạt 23DKP01–09 ───────────────────────────────
  console.log("Bước 4: Tạo 9 lớp sinh hoạt 23DKP01–23DKP09...");
  const HOMEROOM_SIZES = [56, 56, 56, 56, 56, 56, 56, 56, 52]; // 8×56 + 1×52 = 500
  const homeroomDocs = [];
  for (let i = 0; i < 9; i++) {
    const code = `23DKP${String(i + 1).padStart(2, "0")}`;
    homeroomDocs.push({
      code,
      name: `Lớp sinh hoạt KTPM ${code}`,
      subjectId: homeroomSubjId,
      departmentId: cnttDeptId,
      schoolYearId: syId,
      semester: 1,
      weights: { tx: 0, gk: 0, th: 0, tkt: 100 },
      txCount: 1,
      studentCount: HOMEROOM_SIZES[i],
      isActive: true,
    });
  }
  const homeroomClasses = await ClassModel.insertMany(homeroomDocs);
  console.log(`  ✓ Tạo ${homeroomClasses.length} lớp sinh hoạt\n`);

  // ── Bước 5: Tạo lớp học phần Year 1 ─────────────────────────────────────
  console.log("Bước 5: Tạo lớp học phần HK1 + HK2 + HK3...");

  const DEFAULT_WEIGHTS = { tx: 10, gk: 30, th: 0, tkt: 60 };
  const PREREQ_WEIGHTS = { tx: 0, gk: 0, th: 0, tkt: 100 };

  // Helper: tạo N lớp học phần cho 1 môn
  const makeSubjectClasses = async (subjects, semester, classSizes) => {
    const result = {};
    for (const subj of subjects) {
      const ids = subj._id ? [subj] : []; // already ObjectId? skip
      const oids = [];
      for (let n = 0; n < classSizes.length; n++) {
        const code = `KTPM-${subj.short}-${String(n + 1).padStart(2, "0")}`;
        const doc = await ClassModel.create({
          code,
          name: `${subj.code} - Nhóm ${n + 1}`,
          subjectId: new mongoose.Types.ObjectId(subj.id),
          departmentId: cnttDeptId,
          schoolYearId: syId,
          semester,
          weights: subj.prereq ? PREREQ_WEIGHTS : DEFAULT_WEIGHTS,
          txCount: 2,
          studentCount: 0,
          isActive: true,
        });
        oids.push(doc);
      }
      result[subj.code] = oids;
    }
    return result;
  };

  // HK1
  const hk1Req = await makeSubjectClasses(HK1_REQUIRED, 1, REQUIRED_SIZES);
  const hk1Pre = await makeSubjectClasses(
    HK1_PREREQ.map((s) => ({ ...s, prereq: true })),
    1,
    REQUIRED_SIZES,
  );
  const hk1Av = await makeSubjectClasses(
    [HK1_LANG[0]],
    1,
    LANG_CONFIG[0].classSizes,
  );
  const hk1Tn = await makeSubjectClasses(
    [HK1_LANG[1]],
    1,
    LANG_CONFIG[1].classSizes,
  );
  const hk1Td = await makeSubjectClasses(
    [HK1_LANG[2]],
    1,
    LANG_CONFIG[2].classSizes,
  );
  // HK2
  const hk2Req = await makeSubjectClasses(HK2_REQUIRED, 2, REQUIRED_SIZES);
  const hk2Av = await makeSubjectClasses(
    [HK2_LANG[0]],
    2,
    LANG_CONFIG[0].classSizes,
  );
  const hk2Tn = await makeSubjectClasses(
    [HK2_LANG[1]],
    2,
    LANG_CONFIG[1].classSizes,
  );
  const hk2Td = await makeSubjectClasses(
    [HK2_LANG[2]],
    2,
    LANG_CONFIG[2].classSizes,
  );
  // HK3
  const hk3Req = await makeSubjectClasses(HK3_REQUIRED, 3, REQUIRED_SIZES);
  const hk3Pre = await makeSubjectClasses(
    HK3_PREREQ.map((s) => ({ ...s, prereq: true })),
    3,
    REQUIRED_SIZES,
  );
  const hk3Av = await makeSubjectClasses(
    [HK3_LANG[0]],
    3,
    LANG_CONFIG[0].classSizes,
  );
  const hk3Tn = await makeSubjectClasses(
    [HK3_LANG[1]],
    3,
    LANG_CONFIG[1].classSizes,
  );
  const hk3Td = await makeSubjectClasses(
    [HK3_LANG[2]],
    3,
    LANG_CONFIG[2].classSizes,
  );

  // Tính tổng lớp học phần
  const countClasses = (maps) =>
    maps.reduce((acc, m) => acc + Object.values(m).flat().length, 0);
  const totalSubjCls = countClasses([
    hk1Req,
    hk1Pre,
    hk1Av,
    hk1Tn,
    hk1Td,
    hk2Req,
    hk2Av,
    hk2Tn,
    hk2Td,
    hk3Req,
    hk3Pre,
    hk3Av,
    hk3Tn,
    hk3Td,
  ]);
  console.log(`  ✓ Tổng lớp học phần: ${totalSubjCls}\n`);

  // ── Bước 6: Sinh 500 tên duy nhất ────────────────────────────────────────
  console.log("Bước 6: Tạo 500 sinh viên KTPM (MSSV 230001–230500)...");
  const names = generateUniqueNames(TOTAL);

  const students = [];
  const grades = [];
  const curricula = [];

  const langClassMap = [hk1Av, hk1Tn, hk1Td]; // by langOption 0/1/2, HK1 lang
  const langHK2Map = [hk2Av, hk2Tn, hk2Td];
  const langHK3Map = [hk3Av, hk3Tn, hk3Td];

  // Helper lấy lớp học phần cho SV index
  const getCls = (map, subjectCode, classIdx) => {
    const arr = map[subjectCode];
    if (!arr) throw new Error(`Missing class map for ${subjectCode}`);
    return arr[Math.min(classIdx, arr.length - 1)];
  };

  for (let i = 0; i < TOTAL; i++) {
    const num = i + 1;
    const mssv = `23${String(num).padStart(4, "0")}`;
    const homeroomClass = homeroomClasses[i < 448 ? Math.floor(i / 56) : 8];
    const studentId = new mongoose.Types.ObjectId();

    // Năm sinh ngẫu nhiên 2000-2005
    const birthYear = 2000 + (i % 6);
    const birthMonth = 1 + (i % 12);
    const birthDay = 1 + (i % 28);

    students.push({
      _id: studentId,
      studentCode: mssv,
      fullName: names[i],
      dateOfBirth: new Date(
        `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`,
      ),
      gender: i % 3 === 0 ? "female" : "male",
      classId: homeroomClass._id,
      majorId: ktpmMajorId,
      enrolledYear: "2023",
      homeClassCode: homeroomClass.code,
      parentName: `Phụ huynh ${names[i]}`,
      status: "active",
    });

    // StudentCurriculum
    curricula.push({
      studentId: studentId,
      curriculumId: new mongoose.Types.ObjectId(KTPM_CURR_ID),
      majorId: ktpmMajorId,
      enrolledYear: "2023",
      registrations: [],
    });

    // ── Phân bổ lớp học phần ────────────────────────────────────────────────
    const reqClassIdx = REQUIRED_ASSIGN[i];
    const langOpt = getLangOption(i);
    const langClsIdx = getLangClassIndex(i);
    const langSubHK1 = HK1_LANG[langOpt];
    const langSubHK2 = HK2_LANG[langOpt];
    const langSubHK3 = HK3_LANG[langOpt];

    // HK1 — completed
    for (const s of HK1_REQUIRED) {
      grades.push(
        buildCompletedGrade(
          studentId,
          getCls(hk1Req, s.code, reqClassIdx),
          syId,
        ),
      );
    }
    for (const s of HK1_PREREQ) {
      grades.push(
        buildCompletedGrade(
          studentId,
          getCls(hk1Pre, s.code, reqClassIdx),
          syId,
        ),
      );
    }
    {
      const langMap = [hk1Av, hk1Tn, hk1Td][langOpt];
      grades.push(
        buildCompletedGrade(
          studentId,
          getCls(langMap, langSubHK1.code, langClsIdx),
          syId,
        ),
      );
    }

    // HK2 — completed
    for (const s of HK2_REQUIRED) {
      grades.push(
        buildCompletedGrade(
          studentId,
          getCls(hk2Req, s.code, reqClassIdx),
          syId,
        ),
      );
    }
    {
      const langMap = [hk2Av, hk2Tn, hk2Td][langOpt];
      grades.push(
        buildCompletedGrade(
          studentId,
          getCls(langMap, langSubHK2.code, langClsIdx),
          syId,
        ),
      );
    }

    // HK3 — registered only (no scores)
    for (const s of HK3_REQUIRED) {
      grades.push(
        buildRegisteredGrade(
          studentId,
          getCls(hk3Req, s.code, reqClassIdx),
          syId,
        ),
      );
    }
    for (const s of HK3_PREREQ) {
      grades.push(
        buildRegisteredGrade(
          studentId,
          getCls(hk3Pre, s.code, reqClassIdx),
          syId,
        ),
      );
    }
    {
      const langMap = [hk3Av, hk3Tn, hk3Td][langOpt];
      grades.push(
        buildRegisteredGrade(
          studentId,
          getCls(langMap, langSubHK3.code, langClsIdx),
          syId,
        ),
      );
    }
  }

  // ── Bước 7: Insert hàng loạt ─────────────────────────────────────────────
  console.log(`  Inserting ${students.length} students...`);
  await Student.insertMany(students, { ordered: false });

  console.log(`  Inserting ${curricula.length} curricula...`);
  await StudentCurriculum.insertMany(curricula, { ordered: false });

  console.log(`  Inserting ${grades.length} grades...`);
  const BATCH = 1000;
  for (let i = 0; i < grades.length; i += BATCH) {
    await Grade.insertMany(grades.slice(i, i + BATCH), { ordered: false });
    process.stdout.write(
      `\r    Grades: ${Math.min(i + BATCH, grades.length)}/${grades.length}`,
    );
  }
  console.log("");

  // ── Bước 8: Cập nhật studentCount trên lớp học phần ─────────────────────
  console.log("Bước 8: Cập nhật studentCount trên lớp học phần...");
  const gradeCounts = await Grade.aggregate([
    { $group: { _id: "$classId", count: { $sum: 1 } } },
  ]);
  let updateOps = gradeCounts.map(({ _id, count }) => ({
    updateOne: { filter: { _id }, update: { $set: { studentCount: count } } },
  }));
  if (updateOps.length) await ClassModel.bulkWrite(updateOps);
  console.log(`  ✓ Cập nhật ${updateOps.length} lớp\n`);

  // ── Tổng kết ──────────────────────────────────────────────────────────────
  const [svCount, grCount, clsCount, scCount] = await Promise.all([
    Student.countDocuments(),
    Grade.countDocuments(),
    ClassModel.countDocuments(),
    StudentCurriculum.countDocuments(),
  ]);
  const hk1Grade = await Grade.countDocuments({ semester: 1 });
  const hk2Grade = await Grade.countDocuments({ semester: 2 });
  const hk3Grade = await Grade.countDocuments({ semester: 3 });
  const completedGrades = await Grade.countDocuments({
    finalScore: { $ne: null },
  });

  console.log("=== HOÀN THÀNH ===");
  console.log(`  SchoolYear : 2023-2024`);
  console.log(`  Students   : ${svCount} (MSSV 230001–230500)`);
  console.log(
    `  Classes    : ${clsCount} (9 sinh hoạt + ${clsCount - 9} học phần)`,
  );
  console.log(`  Curricula  : ${scCount}`);
  console.log(`  Grades     : ${grCount} total`);
  console.log(
    `    HK1: ${hk1Grade} (có điểm) | HK2: ${hk2Grade} (có điểm) | HK3: ${hk3Grade} (đăng ký)`,
  );
  console.log(
    `    Đã có điểm: ${completedGrades} | Chờ nhập: ${grCount - completedGrades}`,
  );
  console.log("\n  Ngoại ngữ phân bổ:");
  console.log("    Anh văn  : 200 SV (SV 0-199)  → 4 lớp × 50");
  console.log("    Tiếng Nhật: 170 SV (SV 200-369) → 3 lớp (57/57/56)");
  console.log("    Tiếng Đức : 130 SV (SV 370-499) → 3 lớp (44/43/43)");

  process.exit(0);
};

run().catch((err) => {
  console.error("LỖI:", err.message || err);
  process.exit(1);
});
