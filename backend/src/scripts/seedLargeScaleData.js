const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDatabase = require("../config/database");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const User = require("../models/User");
const SchoolYear = require("../models/SchoolYear");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Major = require("../models/Major");
const Curriculum = require("../models/Curriculum");
const StudentCurriculum = require("../models/StudentCurriculum");

dotenv.config();

const toPositiveInt = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
};

const SCHOOL_YEAR_NAME = "2025-2026";
const CURRICULUM_SCHOOL_YEAR = "2025-2029";
const ENROLLED_YEAR = "2025";
const MAX_STUDENTS_PER_CLASS = 60;
const TARGET_STUDENTS_CNTT = toPositiveInt(process.env.SEED_TARGET_CNTT, 500);
const TARGET_STUDENTS_OTHER = toPositiveInt(
  process.env.SEED_TARGET_OTHERS,
  200,
);
const ACTIVE_CURRICULUM_YEAR = toPositiveInt(
  process.env.SEED_ACTIVE_CURRICULUM_YEAR,
  1,
);
const ACTIVE_SEMESTER = [1, 2, 3].includes(
  toPositiveInt(process.env.SEED_ACTIVE_SEMESTER, 3),
)
  ? toPositiveInt(process.env.SEED_ACTIVE_SEMESTER, 3)
  : 1;
const OFFERED_YEAR = 1;
const OFFERED_SEMESTERS = [1, 2, 3];

const BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE || 240);
const INSERT_CHUNK_SIZE = 1200;
const CREATE_GRADE_RATIO = Number(process.env.SEED_GRADE_RATIO || 0.65);
const RESET_EXISTING_COHORT =
  String(process.env.SEED_RESET_COHORT || "true").toLowerCase() !== "false";

const PROFILE_BUCKETS = [
  { name: "gioi", weight: 0.2 },
  { name: "kha", weight: 0.35 },
  { name: "trungbinh", weight: 0.3 },
  { name: "yeu", weight: 0.15 },
];

const LETTER_TO_GPA4 = {
  A: 4,
  B: 3,
  C: 2,
  F: 0,
};

const LETTER_SCORE_RANGE = {
  A: [8.6, 9.7],
  B: [7.1, 8.4],
  C: [5.1, 6.9],
  F: [2.8, 4.8],
};

const DEPARTMENT_CATALOG = [
  {
    code: "DUOC",
    name: "Khoa Duoc",
    targetStudents: 600,
    majors: [
      { code: "DUOCHOC", name: "Duoc hoc", durationLabel: "5" },
      { code: "HOADUOC", name: "Hoa duoc", durationLabel: "3.5" },
    ],
  },
  {
    code: "Y",
    name: "Khoa Y",
    targetStudents: 700,
    majors: [
      { code: "YKHOA", name: "Y khoa (Bac si Da khoa)", durationLabel: "6" },
      {
        code: "YHDP",
        name: "Y hoc du phong (Bac si Y hoc Du phong)",
        durationLabel: "6",
      },
      { code: "YHCT", name: "Y hoc co truyen", durationLabel: "6" },
    ],
  },
  {
    code: "DDUONG",
    name: "Khoa Dieu duong",
    targetStudents: 500,
    majors: [
      { code: "DIEUDUONG", name: "Dieu duong", durationLabel: "4" },
      {
        code: "PHCN",
        name: "Ky thuat phuc hoi chuc nang",
        durationLabel: "4",
      },
    ],
  },
  {
    code: "XNYH",
    name: "Khoa Ky thuat Xet nghiem Y hoc",
    targetStudents: 400,
    majors: [
      {
        code: "KTXNYH",
        name: "Ky thuat xet nghiem y hoc",
        durationLabel: "4",
      },
    ],
  },
  {
    code: "TLGD",
    name: "Khoa Tam ly - Giao duc",
    targetStudents: 300,
    majors: [
      { code: "TAMLYHOC", name: "Tam ly hoc", durationLabel: "3" },
      {
        code: "CNGD",
        name: "Cong nghe Giao duc",
        durationLabel: "3",
      },
    ],
  },
  {
    code: "ANDA",
    name: "Khoa Am nhac - Dien anh",
    targetStudents: 200,
    majors: [
      {
        code: "DIENVIEN",
        name: "Dien vien Kich - Dien anh - Truyen hinh",
        durationLabel: "3.5",
      },
      { code: "THANHNHAC", name: "Thanh nhac", durationLabel: "3" },
      { code: "PIANO", name: "Piano", durationLabel: "3" },
      { code: "BIENDAOMUA", name: "Bien dao mua", durationLabel: "new" },
    ],
  },
  {
    code: "CNTT",
    name: "Khoa Cong nghe Thong tin",
    targetStudents: 1300,
    majors: [
      {
        code: "MMTTDL",
        name: "Mang may tinh va truyen thong du lieu",
        durationLabel: "3.5",
      },
      { code: "KTPM", name: "Ky thuat phan mem", durationLabel: "3.5" },
      { code: "CNTT", name: "Cong nghe thong tin", durationLabel: "3.5" },
      { code: "AI", name: "Tri tue nhan tao", durationLabel: "3.5" },
      { code: "KHDL", name: "Khoa hoc Du lieu", durationLabel: "3-3.5" },
      {
        code: "CNTTDMST",
        name: "Cong nghe thong tin va doi moi sang tao",
        durationLabel: "3.5",
      },
    ],
  },
  {
    code: "KTXD",
    name: "Khoa Ky thuat Xay dung",
    targetStudents: 300,
    majors: [{ code: "KTXD", name: "Ky thuat xay dung", durationLabel: "4" }],
  },
  {
    code: "KTNTMTUD",
    name: "Khoa Kien truc - Noi that - My thuat Ung dung",
    targetStudents: 400,
    majors: [
      { code: "KIENTRUC", name: "Kien truc", durationLabel: "4.5" },
      {
        code: "TKNOITHAT",
        name: "Thiet ke noi that",
        durationLabel: "4",
      },
      { code: "TKDOHOA", name: "Thiet ke Do hoa", durationLabel: "4" },
      {
        code: "TKTHOITRANG",
        name: "Thiet ke thoi trang",
        durationLabel: "3.5",
      },
    ],
  },
  {
    code: "KHUDCN",
    name: "Khoa Khoa hoc Ung dung va Cong nghe",
    targetStudents: 500,
    majors: [
      { code: "CNSH", name: "Cong nghe sinh hoc", durationLabel: "4" },
      { code: "KHYSHOC", name: "Khoa hoc y sinh", durationLabel: "new" },
      { code: "VLYYKHOA", name: "Vat ly y khoa", durationLabel: "4" },
      { code: "CNTP", name: "Cong nghe thuc pham", durationLabel: "4" },
      {
        code: "QLTNMT",
        name: "Quan ly tai nguyen va moi truong",
        durationLabel: "3",
      },
      { code: "THUY", name: "Thu y", durationLabel: "5" },
      { code: "KHVL", name: "Khoa hoc vat lieu", durationLabel: "3.5" },
      {
        code: "CNKTHH",
        name: "Cong nghe Ky thuat Hoa hoc",
        durationLabel: "3.5",
      },
      { code: "KTYSINH", name: "Ky thuat y sinh", durationLabel: "4" },
    ],
  },
  {
    code: "LUAT",
    name: "Khoa Luat",
    targetStudents: 400,
    majors: [
      { code: "LUATKTE", name: "Luat kinh te", durationLabel: "3.5" },
      { code: "LUAT", name: "Luat", durationLabel: "3.5" },
    ],
  },
  {
    code: "QTKD",
    name: "Khoa Quan tri Kinh doanh",
    targetStudents: 900,
    majors: [
      {
        code: "QTKD",
        name: "Quan tri kinh doanh",
        durationLabel: "3.5",
      },
      { code: "MARKETING", name: "Marketing", durationLabel: "3" },
      {
        code: "KDQT",
        name: "Kinh doanh quoc te",
        durationLabel: "3",
      },
      {
        code: "TMDT",
        name: "Thuong mai dien tu",
        durationLabel: "3.5",
      },
      {
        code: "QTNL",
        name: "Quan tri nhan luc",
        durationLabel: "3",
      },
      { code: "KTESO", name: "Kinh te so", durationLabel: "new" },
      {
        code: "KDSANGTAO",
        name: "Kinh doanh sang tao",
        durationLabel: "3.5",
      },
      {
        code: "QTDNCN",
        name: "Quan tri doanh nghiep va cong nghe",
        durationLabel: "3.5",
      },
    ],
  },
  {
    code: "NGOAINGU",
    name: "Khoa Ngoai ngu",
    targetStudents: 500,
    majors: [
      { code: "NNA", name: "Ngon ngu Anh", durationLabel: "3.5" },
      {
        code: "NNTQ",
        name: "Ngon ngu Trung Quoc",
        durationLabel: "3.5",
      },
      { code: "DPHOC", name: "Dong Phuong hoc", durationLabel: "3.5" },
    ],
  },
  {
    code: "KTCN",
    name: "Khoa Ky thuat - Cong nghe",
    targetStudents: 800,
    majors: [
      {
        code: "CNKTCODIENTU",
        name: "Cong nghe ky thuat co dien tu",
        durationLabel: "3.5-4",
      },
      {
        code: "CNKTOTO",
        name: "Cong nghe ky thuat o to",
        durationLabel: "3.5-4",
      },
      {
        code: "CNKTDIENTU",
        name: "Cong nghe ky thuat dien - dien tu",
        durationLabel: "3.5-4",
      },
      {
        code: "LOGISTICS",
        name: "Logistics va quan ly chuoi cung ung",
        durationLabel: "3.5-4",
      },
      {
        code: "KTCOKHI",
        name: "Ky thuat co khi",
        durationLabel: "3.5-4",
      },
    ],
  },
  {
    code: "DULICH",
    name: "Khoa Du lich",
    targetStudents: 400,
    majors: [
      { code: "DULICH", name: "Du lich", durationLabel: "3" },
      { code: "QTKS", name: "Quan tri khach san", durationLabel: "3" },
      {
        code: "QTNHVAU",
        name: "Quan tri nha hang va dich vu an uong",
        durationLabel: "3",
      },
    ],
  },
  {
    code: "TTST",
    name: "Khoa Truyen thong Sang tao",
    targetStudents: 400,
    majors: [
      {
        code: "TTDPT",
        name: "Truyen thong da phuong tien",
        durationLabel: "3.5",
      },
      {
        code: "QHCC",
        name: "Quan he cong chung",
        durationLabel: "3",
      },
      {
        code: "MKTSDMXH",
        name: "Marketing so va truyen thong xa hoi",
        durationLabel: "3.5",
      },
    ],
  },
  {
    code: "QLYT",
    name: "Khoa Quan ly Y te",
    targetStudents: 200,
    majors: [
      {
        code: "QLBENHVIEN",
        name: "Quan ly benh vien",
        durationLabel: "4",
      },
    ],
  },
  {
    code: "RHM",
    name: "Khoa Rang - Ham - Mat",
    targetStudents: 400,
    majors: [{ code: "RHM", name: "Rang Ham Mat", durationLabel: "6" }],
  },
  {
    code: "TCKT",
    name: "Khoa Tai chinh - Ke toan",
    targetStudents: 800,
    majors: [
      {
        code: "TCNH",
        name: "Tai chinh - ngan hang",
        durationLabel: "3",
      },
      { code: "KETOAN", name: "Ke toan", durationLabel: "3" },
    ],
  },
];

const DEPARTMENT_SPECS = DEPARTMENT_CATALOG.map((item) => ({
  ...item,
  targetStudents:
    item.code === "CNTT" ? TARGET_STUDENTS_CNTT : TARGET_STUDENTS_OTHER,
}));

const TARGET_TOTAL_STUDENTS = DEPARTMENT_SPECS.reduce(
  (sum, item) => sum + Number(item.targetStudents || 0),
  0,
);

const clampScore = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  if (numeric < 0) return 0;
  if (numeric > 10) return 10;
  return Number(numeric.toFixed(2));
};

const parseDurationYears = (durationLabel) => {
  const fallback = 4;

  if (!durationLabel || durationLabel === "new") {
    return fallback;
  }

  const normalized = String(durationLabel)
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/\u2013/g, "-");

  const rangeMatch = normalized.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return Number(rangeMatch[2]);
  }

  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  return fallback;
};

const estimateTotalCredits = (durationYears) => {
  if (durationYears >= 6) return 210;
  if (durationYears >= 5) return 180;
  if (durationYears >= 4.5) return 165;
  if (durationYears >= 4) return 150;
  if (durationYears >= 3.75) return 140;
  if (durationYears >= 3.5) return 135;
  if (durationYears >= 3) return 120;
  return 130;
};

const buildTermPlan = (durationYears) => {
  const years = Math.max(3, Math.ceil(durationYears));
  const plan = [];

  for (let year = 1; year <= years; year += 1) {
    for (let semester = 1; semester <= 3; semester += 1) {
      plan.push({ year, semester });
    }
  }

  return plan;
};

const buildCreditSequence = (totalCredits) => {
  const credits = [];
  let remaining = Number(totalCredits || 0);

  while (remaining > 0) {
    if (remaining === 1) {
      credits.push(1);
      remaining -= 1;
      continue;
    }

    if (remaining % 3 === 1 && remaining > 4) {
      credits.push(2);
      remaining -= 2;
      continue;
    }

    if (remaining >= 3) {
      credits.push(3);
      remaining -= 3;
      continue;
    }

    credits.push(Math.min(2, remaining));
    remaining -= Math.min(2, remaining);
  }

  return credits;
};

const computeCreditTotal = (items) =>
  items.reduce((sum, item) => sum + Number(item.credits || 0), 0);

const KTPM_SPECIAL_ITEMS = [
  {
    year: 1,
    semester: 1,
    code: "ktpm_toan_a1",
    name: "Toan cao cap A1",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_kien_truc_mt",
    name: "Kien truc may tinh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_nhap_mon",
    name: "Nhap mon ky thuat phan mem",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_gdqp_an",
    name: "Giao duc quoc phong va an ninh",
    credits: 8,
    subjectType: "prerequisite",
    note: "Mon dieu kien",
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_co_so_lap_trinh",
    name: "Co so lap trinh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_toan_may_tinh",
    name: "Toan may tinh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_anh_van_1",
    name: "Anh van cap do 1",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk1",
    electivePickCount: 1,
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_tieng_nhat_1",
    name: "Tieng Nhat cap do 1",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk1",
    electivePickCount: 1,
  },
  {
    year: 1,
    semester: 1,
    code: "ktpm_tieng_duc_1",
    name: "Tieng Duc cap do 1",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk1",
    electivePickCount: 1,
  },

  {
    year: 1,
    semester: 2,
    code: "ktpm_toan_a2",
    name: "Toan cao cap A2",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_ky_nang_giao_tiep_1",
    name: "Ky nang giao tiep",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_triet_hoc_ml",
    name: "Triet hoc Mac - Lenin",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_kinh_te_chinh_tri_ml",
    name: "Kinh te Chinh tri Mac - Lenin",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_ky_thuat_lap_trinh",
    name: "Ky thuat lap trinh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_co_so_du_lieu",
    name: "Co so du lieu",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_anh_van_2",
    name: "Anh van cap do 2",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk2",
    electivePickCount: 1,
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_tieng_nhat_2",
    name: "Tieng Nhat cap do 2",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk2",
    electivePickCount: 1,
  },
  {
    year: 1,
    semester: 2,
    code: "ktpm_tieng_duc_2",
    name: "Tieng Duc cap do 2",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk2",
    electivePickCount: 1,
  },

  {
    year: 1,
    semester: 3,
    code: "ktpm_thiet_ke_web",
    name: "Thiet ke web",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_ky_nang_giao_tiep_2",
    name: "Ky nang giao tiep (HP2)",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_gd_the_chat",
    name: "Giao duc the chat",
    credits: 5,
    subjectType: "prerequisite",
    note: "Mon dieu kien",
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_he_dieu_hanh",
    name: "He dieu hanh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_he_qt_csdl",
    name: "He quan tri co so du lieu",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_cnxh_kh",
    name: "Chu nghia Xa hoi khoa hoc",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_anh_van_3",
    name: "Anh van cap do 3",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk3",
    electivePickCount: 1,
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_tieng_nhat_3",
    name: "Tieng Nhat cap do 3",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk3",
    electivePickCount: 1,
  },
  {
    year: 1,
    semester: 3,
    code: "ktpm_tieng_duc_3",
    name: "Tieng Duc cap do 3",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk3",
    electivePickCount: 1,
  },

  {
    year: 2,
    semester: 1,
    code: "ktpm_ctdl_gt",
    name: "Cau truc du lieu va giai thuat",
    credits: 4,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_lap_trinh_web",
    name: "Lap trinh Web",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_lich_su_dang",
    name: "Lich su Dang Cong san Viet Nam",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_httt_dn",
    name: "He thong thong tin doanh nghiep",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_mang_may_tinh",
    name: "Mang may tinh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_anh_van_4",
    name: "Anh van cap do 4",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk4",
    electivePickCount: 1,
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_tieng_nhat_4",
    name: "Tieng Nhat cap do 4",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk4",
    electivePickCount: 1,
  },
  {
    year: 2,
    semester: 1,
    code: "ktpm_tieng_duc_4",
    name: "Tieng Duc cap do 4",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk4",
    electivePickCount: 1,
  },

  {
    year: 2,
    semester: 2,
    code: "ktpm_xac_suat_thong_ke",
    name: "Xac suat thong ke",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_pttk_httt",
    name: "Phan tich thiet ke he thong thong tin",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_an_toan_tt",
    name: "An toan thong tin",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_tu_tuong_hcm",
    name: "Tu tuong Ho Chi Minh",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_lap_trinh_ung_dung",
    name: "Lap trinh ung dung",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_anh_van_5",
    name: "Anh van cap do 5",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk5",
    electivePickCount: 1,
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_tieng_nhat_5",
    name: "Tieng Nhat cap do 5",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk5",
    electivePickCount: 1,
  },
  {
    year: 2,
    semester: 2,
    code: "ktpm_tieng_duc_5",
    name: "Tieng Duc cap do 5",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "lang_hk5",
    electivePickCount: 1,
  },

  {
    year: 2,
    semester: 3,
    code: "ktpm_ly_thuyet_do_thi",
    name: "Ly thuyet do thi",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_do_an_co_so",
    name: "Do an co so Ky thuat phan mem",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_ky_nang_so",
    name: "Ky nang so va doi moi sang tao",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_kien_truc_tich_hop",
    name: "Kien truc va tich hop he thong",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_anh_van_6",
    name: "Anh van cap do 6",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk6_tu_chon",
    electivePickCount: 2,
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_tieng_nhat_6",
    name: "Tieng Nhat cap do 6",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk6_tu_chon",
    electivePickCount: 2,
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_tieng_duc_6",
    name: "Tieng Duc cap do 6",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk6_tu_chon",
    electivePickCount: 2,
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_csdl_nang_cao",
    name: "Co so du lieu nang cao",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk6_tu_chon",
    electivePickCount: 2,
  },
  {
    year: 2,
    semester: 3,
    code: "ktpm_chuyen_de_java",
    name: "Chuyen de Java",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk6_tu_chon",
    electivePickCount: 2,
  },

  {
    year: 3,
    semester: 1,
    code: "ktpm_tieng_anh_chuyen_nganh",
    name: "Tieng Anh chuyen nganh",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 1,
    code: "ktpm_lap_trinh_python",
    name: "Ky thuat lap trinh Python",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 1,
    code: "ktpm_lap_trinh_mobile",
    name: "Lap trinh tren thiet bi di dong",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 1,
    code: "ktpm_chuyen_de_sau_1",
    name: "Chuyen de chuyen sau phat trien phan mem 1",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 1,
    code: "ktpm_cd_angular_node",
    name: "Chuyen de AngularJS va NodeJS",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk7_tu_chon",
    electivePickCount: 1,
  },
  {
    year: 3,
    semester: 1,
    code: "ktpm_cd_node_react",
    name: "Chuyen de NodeJS va React",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk7_tu_chon",
    electivePickCount: 1,
  },

  {
    year: 3,
    semester: 2,
    code: "ktpm_quy_hoach_tuyen_tinh",
    name: "Quy hoach tuyen tinh",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 2,
    code: "ktpm_chuyen_de_oracle",
    name: "Chuyen de Oracle",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 2,
    code: "ktpm_big_data_analytics",
    name: "Cong nghe phan tich du lieu lon",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 2,
    code: "ktpm_chuyen_de_sau_2",
    name: "Chuyen de chuyen sau phat trien phan mem 2",
    credits: 3,
    subjectType: "required",
  },
  {
    year: 3,
    semester: 2,
    code: "ktpm_khai_thac_ttxh",
    name: "Khai thac du lieu truyen thong xa hoi",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk8_tu_chon",
    electivePickCount: 1,
  },
  {
    year: 3,
    semester: 2,
    code: "ktpm_gis_3d",
    name: "He thong thong tin dia ly 3 chieu",
    credits: 3,
    subjectType: "elective",
    electiveGroup: "hk8_tu_chon",
    electivePickCount: 1,
  },

  {
    year: 4,
    semester: 1,
    code: "ktpm_phap_luat_dc",
    name: "Phap luat dai cuong",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 4,
    semester: 1,
    code: "ktpm_khoi_nghiep",
    name: "Khoi nghiep",
    credits: 2,
    subjectType: "required",
  },
  {
    year: 4,
    semester: 1,
    code: "ktpm_thuc_tap_tot_nghiep",
    name: "Thuc tap tot nghiep",
    credits: 5,
    subjectType: "required",
  },
];

const buildKTPMSpecialBlueprint = () => {
  const items = KTPM_SPECIAL_ITEMS.map((item, index) => ({
    ...item,
    sequence: index + 1,
    key: `KTPM-${index + 1}`,
  }));

  const subjects = items.map((item) => {
    const isLanguage = /anh_van|tieng_nhat|tieng_duc|tieng_anh/i.test(
      item.code,
    );
    const isFoundation =
      /gdqp|the_chat|triet_hoc|kinh_te_chinh_tri|tu_tuong|lich_su_dang|phap_luat|khoi_nghiep/i.test(
        item.code,
      );

    return {
      code: item.code,
      name: item.name,
      credits: Number(item.credits || 0),
      semester: item.semester,
      coefficient: Number(item.credits || 0) >= 3 ? 2 : 1,
      category: isLanguage
        ? "language"
        : isFoundation
          ? "social"
          : "specialized",
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    };
  });

  return {
    subjects,
    items,
    totalCredits: computeCreditTotal(items),
  };
};

const buildCurriculumBlueprint = (majorCode, durationYears, totalCredits) => {
  const termPlan = buildTermPlan(durationYears);
  const creditSeq = buildCreditSequence(totalCredits);
  const electiveStartIndex = Math.floor(creditSeq.length * 0.85);

  const subjects = [];
  const items = [];

  for (let index = 0; index < creditSeq.length; index += 1) {
    const term = termPlan[index % termPlan.length];
    const sequence = index + 1;
    const codeSuffix = String(sequence).padStart(2, "0");
    const subjectCode = `${majorCode.toLowerCase()}${term.year}${term.semester}${codeSuffix}`;
    const subjectName = `Hoc phan ${majorCode} Y${term.year}S${term.semester}-${codeSuffix}`;
    const credits = Number(creditSeq[index]);

    subjects.push({
      code: subjectCode,
      name: subjectName,
      credits,
      semester: term.semester,
      coefficient: credits >= 3 ? 2 : 1,
      category: credits >= 3 ? "specialized" : "theory",
      defaultWeights: { tx: 10, gk: 30, th: 0, tkt: 60 },
      txCount: 3,
    });

    items.push({
      key: `${majorCode}-${term.year}-${term.semester}-${codeSuffix}`,
      sequence,
      code: subjectCode,
      name: subjectName,
      credits,
      year: term.year,
      semester: term.semester,
      subjectType: index >= electiveStartIndex ? "elective" : "required",
    });
  }

  items.sort((a, b) => {
    const termDiff =
      a.year === b.year ? a.semester - b.semester : a.year - b.year;
    if (termDiff !== 0) return termDiff;
    return a.sequence - b.sequence;
  });

  return {
    subjects,
    items,
    totalCredits: computeCreditTotal(items),
  };
};

const buildMajorCohortCodes = (majorCode, targetStudents) => {
  const yearSuffix = String(ENROLLED_YEAR).slice(-2);
  const normalizedMajor = String(majorCode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const sectionCount = Math.max(
    1,
    Math.ceil(Number(targetStudents || 0) / MAX_STUDENTS_PER_CLASS),
  );

  return Array.from({ length: sectionCount }, (_, index) => {
    const suffix = String.fromCharCode(65 + index);
    return `${yearSuffix}D${normalizedMajor}1${suffix}`;
  });
};

const toClassCode = (item, cohortCode) =>
  `${String(item.code || "").toUpperCase()}-${cohortCode}`;

const generateStudentCode = (value) => `HS${String(value).padStart(6, "0")}`;

const getMaxStudentCodeNumber = async () => {
  const docs = await Student.find({ studentCode: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .limit(4000)
    .select("studentCode")
    .lean();

  let maxNumber = 0;
  docs.forEach((doc) => {
    const digits = String(doc.studentCode || "").replace(/\D/g, "");
    if (!digits) return;

    const numeric = Number(digits);
    if (!Number.isNaN(numeric) && numeric > maxNumber) {
      maxNumber = numeric;
    }
  });

  return maxNumber;
};

const termOrder = (year, semester) => (year - 1) * 3 + semester;

const buildTimestampsForTerm = (termIdx) => {
  const base = new Date("2025-09-01T08:00:00.000Z");
  const monthsToAdd = Math.max(termIdx - 1, 0) * 4;
  const date = new Date(base);
  date.setUTCMonth(date.getUTCMonth() + monthsToAdd);
  date.setUTCDate(date.getUTCDate() + Math.floor(Math.random() * 20));
  return date;
};

const insertManyChunked = async (Model, docs, chunkSize) => {
  if (!docs.length) {
    return;
  }

  for (let start = 0; start < docs.length; start += chunkSize) {
    const chunk = docs.slice(start, start + chunkSize);
    await Model.insertMany(chunk, { ordered: false });
  }
};

const pickProfile = () => {
  const value = Math.random();
  let cursor = 0;

  for (const item of PROFILE_BUCKETS) {
    cursor += item.weight;
    if (value <= cursor) {
      return item.name;
    }
  }

  return "trungbinh";
};

const pickCompletedLetter = (profile) => {
  const rand = Math.random();

  if (profile === "gioi") {
    if (rand < 0.78) return "A";
    return "B";
  }

  if (profile === "kha") {
    if (rand < 0.2) return "A";
    if (rand < 0.78) return "B";
    return "C";
  }

  if (profile === "trungbinh") {
    if (rand < 0.08) return "A";
    if (rand < 0.3) return "B";
    return "C";
  }

  if (rand < 0.03) return "A";
  if (rand < 0.18) return "B";
  return "C";
};

const failProbabilityByProfile = (profile) => {
  if (profile === "gioi") return 0.02;
  if (profile === "kha") return 0.07;
  if (profile === "trungbinh") return 0.19;
  return 0.35;
};

const pickScoreInRange = (range) => {
  const [minValue, maxValue] = range;
  return Number((minValue + Math.random() * (maxValue - minValue)).toFixed(2));
};

const buildTxScores = (baseScore, txCount) =>
  Array.from({ length: txCount }, () =>
    clampScore(baseScore + (Math.random() * 1.2 - 0.6)),
  );

const scoreToAttendance = (score, profile) => {
  if (profile === "gioi") return Math.floor(Math.random() * 4);
  if (profile === "kha") return 2 + Math.floor(Math.random() * 5);
  if (profile === "trungbinh") return 5 + Math.floor(Math.random() * 7);

  if (score < 5) return 10 + Math.floor(Math.random() * 8);
  return 7 + Math.floor(Math.random() * 7);
};

const profileToConduct = (profile) => {
  if (profile === "gioi") return 3;
  if (profile === "kha") return 2;
  if (profile === "trungbinh") return Math.random() < 0.7 ? 2 : 1;
  return Math.random() < 0.5 ? 1 : 0;
};

const ensureSystemUsers = async (departmentsByCode) => {
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const teacherPassword = await bcrypt.hash("Teacher@123", 10);

  await User.updateOne(
    { email: "admin@nttu.edu.vn" },
    {
      $setOnInsert: {
        name: "System Admin",
        email: "admin@nttu.edu.vn",
        password: adminPassword,
        role: "admin",
        departmentIds: [],
        advisingStudentIds: [],
      },
    },
    { upsert: true },
  );

  const userOperations = [];
  const teacherEmailsByDepartment = new Map();
  const advisorEmailsByDepartment = new Map();

  for (const departmentSpec of DEPARTMENT_SPECS) {
    const department = departmentsByCode.get(departmentSpec.code);
    if (!department) {
      throw new Error(`Khong tim thay department: ${departmentSpec.code}`);
    }

    const teacherCount = Math.max(
      4,
      Math.ceil(departmentSpec.targetStudents / 280),
    );
    const advisorCount = Math.max(
      2,
      Math.ceil(departmentSpec.targetStudents / 360),
    );

    const teacherEmails = [];
    const advisorEmails = [];

    for (let index = 0; index < teacherCount; index += 1) {
      const email = `teacher_${departmentSpec.code.toLowerCase()}_${String(index + 1).padStart(2, "0")}@nttu.edu.vn`;
      teacherEmails.push(email);

      userOperations.push({
        updateOne: {
          filter: { email },
          update: {
            $setOnInsert: {
              name: `Teacher ${departmentSpec.code} ${index + 1}`,
              email,
              password: teacherPassword,
              role: "teacher",
              advisingStudentIds: [],
            },
            $set: {
              departmentIds: [department._id],
              isActive: true,
            },
          },
          upsert: true,
        },
      });
    }

    for (let index = 0; index < advisorCount; index += 1) {
      const email = `advisor_${departmentSpec.code.toLowerCase()}_${String(index + 1).padStart(2, "0")}@nttu.edu.vn`;
      advisorEmails.push(email);

      userOperations.push({
        updateOne: {
          filter: { email },
          update: {
            $setOnInsert: {
              name: `Advisor ${departmentSpec.code} ${index + 1}`,
              email,
              password: teacherPassword,
              role: "advisor",
              advisingStudentIds: [],
            },
            $set: {
              departmentIds: [department._id],
              isActive: true,
            },
          },
          upsert: true,
        },
      });
    }

    teacherEmailsByDepartment.set(departmentSpec.code, teacherEmails);
    advisorEmailsByDepartment.set(departmentSpec.code, advisorEmails);
  }

  if (userOperations.length > 0) {
    await User.bulkWrite(userOperations, { ordered: false });
  }

  const allTeacherEmails = Array.from(
    teacherEmailsByDepartment.values(),
  ).flat();
  const allAdvisorEmails = Array.from(
    advisorEmailsByDepartment.values(),
  ).flat();

  const [teacherDocs, advisorDocs] = await Promise.all([
    User.find({ email: { $in: allTeacherEmails } })
      .select("_id email")
      .lean(),
    User.find({ email: { $in: allAdvisorEmails } })
      .select("_id email")
      .lean(),
  ]);

  const teachersByDepartment = new Map();
  const advisorsByDepartment = new Map();

  for (const departmentSpec of DEPARTMENT_SPECS) {
    const teacherEmails =
      teacherEmailsByDepartment.get(departmentSpec.code) || [];
    const advisorEmails =
      advisorEmailsByDepartment.get(departmentSpec.code) || [];

    const teachers = teacherDocs.filter((item) =>
      teacherEmails.includes(item.email),
    );
    const advisors = advisorDocs.filter((item) =>
      advisorEmails.includes(item.email),
    );

    if (!teachers.length || !advisors.length) {
      throw new Error(
        `Khong khoi tao duoc teacher/advisor cho khoa ${departmentSpec.code}`,
      );
    }

    teachersByDepartment.set(departmentSpec.code, teachers);
    advisorsByDepartment.set(departmentSpec.code, advisors);
  }

  return {
    teachersByDepartment,
    advisorsByDepartment,
    allAdvisorEmails,
  };
};

const buildMajorDistributionRows = () => {
  const rows = [];

  for (const departmentSpec of DEPARTMENT_SPECS) {
    const majorCount = departmentSpec.majors.length;
    const baseCount = Math.floor(departmentSpec.targetStudents / majorCount);
    let remainder = departmentSpec.targetStudents % majorCount;

    for (const majorSpec of departmentSpec.majors) {
      const targetStudents = baseCount + (remainder > 0 ? 1 : 0);
      remainder -= 1;

      const durationYears = parseDurationYears(majorSpec.durationLabel);
      const totalCredits = estimateTotalCredits(durationYears);

      rows.push({
        departmentCode: departmentSpec.code,
        departmentName: departmentSpec.name,
        targetStudents,
        code: majorSpec.code,
        name: majorSpec.name,
        durationLabel: majorSpec.durationLabel || "new",
        durationYears,
        totalCredits,
      });
    }
  }

  return rows;
};

const clearExistingCohort = async (advisorEmails, schoolYearId) => {
  await StudentCurriculum.deleteMany({ enrolledYear: ENROLLED_YEAR });

  const existingStudents = await Student.find({ enrolledYear: ENROLLED_YEAR })
    .select("_id")
    .lean();

  const studentIds = existingStudents.map((item) => item._id);

  if (studentIds.length > 0) {
    await Grade.deleteMany({ studentId: { $in: studentIds } });
    await Student.deleteMany({ _id: { $in: studentIds } });
  }

  await User.updateMany(
    { email: { $in: advisorEmails } },
    { $set: { advisingStudentIds: [] } },
  );

  await Grade.deleteMany({ schoolYearId });
  await ClassModel.deleteMany({ schoolYearId });
  await ClassModel.deleteMany({ studentCount: { $lte: 0 } });

  return studentIds.length;
};

const run = async () => {
  await connectDatabase();

  const totalDepartmentTarget = DEPARTMENT_SPECS.reduce(
    (sum, item) => sum + Number(item.targetStudents || 0),
    0,
  );

  if (totalDepartmentTarget !== TARGET_TOTAL_STUDENTS) {
    throw new Error(
      `Tong target theo khoa khong khop ${TARGET_TOTAL_STUDENTS}: ${totalDepartmentTarget}`,
    );
  }

  await Department.bulkWrite(
    DEPARTMENT_SPECS.map((item) => ({
      updateOne: {
        filter: { code: item.code },
        update: {
          $setOnInsert: {
            code: item.code,
          },
          $set: {
            name: item.name,
            isActive: true,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const departmentDocs = await Department.find({
    code: { $in: DEPARTMENT_SPECS.map((item) => item.code) },
  })
    .select("_id code name")
    .lean();

  const departmentsByCode = new Map(
    departmentDocs.map((item) => [item.code, item]),
  );

  const majorRows = buildMajorDistributionRows();

  await Major.bulkWrite(
    majorRows.map((item) => {
      const department = departmentsByCode.get(item.departmentCode);
      if (!department) {
        throw new Error(`Khong tim thay department cho major ${item.code}`);
      }

      return {
        updateOne: {
          filter: { code: item.code },
          update: {
            $setOnInsert: {
              code: item.code,
            },
            $set: {
              name: item.name,
              departmentId: department._id,
              totalCredits: item.totalCredits,
              durationYears: item.durationYears,
              durationLabel: item.durationLabel,
              isActive: true,
            },
          },
          upsert: true,
        },
      };
    }),
    { ordered: false },
  );

  const majorDocs = await Major.find({
    code: { $in: majorRows.map((item) => item.code) },
  })
    .select(
      "_id code name departmentId durationYears durationLabel totalCredits",
    )
    .lean();

  const majorsByCode = new Map(majorDocs.map((item) => [item.code, item]));

  const schoolYear = await SchoolYear.findOneAndUpdate(
    { name: SCHOOL_YEAR_NAME },
    {
      $set: {
        name: SCHOOL_YEAR_NAME,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-08-31"),
        isCurrent: true,
        semesters: [
          {
            semesterNumber: 1,
            startDate: new Date("2025-09-01"),
            endDate: new Date("2025-12-31"),
            isCurrent: true,
            isOptional: false,
          },
          {
            semesterNumber: 2,
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-04-30"),
            isCurrent: false,
            isOptional: false,
          },
          {
            semesterNumber: 3,
            startDate: new Date("2026-05-01"),
            endDate: new Date("2026-08-31"),
            isCurrent: false,
            isOptional: true,
          },
        ],
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  const { teachersByDepartment, advisorsByDepartment, allAdvisorEmails } =
    await ensureSystemUsers(departmentsByCode);

  if (RESET_EXISTING_COHORT) {
    const deletedCount = await clearExistingCohort(
      allAdvisorEmails,
      schoolYear._id,
    );
    console.log(
      `Reset cohort ${ENROLLED_YEAR}: deleted ${deletedCount} students`,
    );
  }

  const majorPlans = [];

  for (const row of majorRows) {
    const major = majorsByCode.get(row.code);
    const department = departmentsByCode.get(row.departmentCode);

    if (!major || !department) {
      throw new Error(`Khong tim thay major/department cho ${row.code}`);
    }

    const blueprint =
      major.code === "KTPM"
        ? buildKTPMSpecialBlueprint()
        : buildCurriculumBlueprint(
            major.code,
            row.durationYears,
            row.totalCredits,
          );

    await Subject.bulkWrite(
      blueprint.subjects.map((subject) => ({
        updateOne: {
          filter: { code: subject.code },
          update: {
            $setOnInsert: { code: subject.code },
            $set: {
              name: subject.name,
              departmentId: department._id,
              credits: subject.credits,
              semester: subject.semester,
              coefficient: subject.coefficient,
              category: subject.category,
              defaultWeights: subject.defaultWeights,
              txCount: subject.txCount,
              isActive: true,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    const subjectDocs = await Subject.find({
      code: { $in: blueprint.subjects.map((item) => item.code) },
    })
      .select("_id code name credits semester defaultWeights txCount")
      .lean();

    const subjectByCode = new Map(subjectDocs.map((item) => [item.code, item]));

    const curriculumItems = blueprint.items.map((item) => {
      const subject = subjectByCode.get(item.code);
      if (!subject) {
        throw new Error(`Khong tim thay subject: ${item.code}`);
      }

      const noteParts = [];
      if (item.note) {
        noteParts.push(String(item.note));
      }
      if (item.electiveGroup) {
        noteParts.push(
          `Nhom tu chon: ${item.electiveGroup} (chon ${Number(item.electivePickCount || 1)})`,
        );
      }

      return {
        ...item,
        subjectId: subject._id,
        subjectCode: subject.code,
        subjectName: subject.name,
        credits: Number(subject.credits || item.credits),
        prerequisiteIds: [],
        note: noteParts.join(" | "),
      };
    });

    const curriculumDoc = await Curriculum.findOneAndUpdate(
      {
        majorId: major._id,
        schoolYear: CURRICULUM_SCHOOL_YEAR,
      },
      {
        $set: {
          majorId: major._id,
          schoolYear: CURRICULUM_SCHOOL_YEAR,
          name: `CTDT ${major.code} (${row.durationLabel} nam)`,
          items: curriculumItems.map((item) => ({
            subjectId: item.subjectId,
            subjectCode: item.subjectCode,
            subjectName: item.subjectName,
            credits: item.credits,
            year: item.year,
            semester: item.semester,
            subjectType: item.subjectType,
            prerequisiteIds: item.prerequisiteIds,
            note: item.note,
          })),
          totalCredits: blueprint.totalCredits,
          isActive: true,
        },
        $setOnInsert: {
          createdBy: null,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    const cohortCodes = buildMajorCohortCodes(major.code, row.targetStudents);

    const offeredItemsRaw = curriculumItems.filter(
      (item) =>
        Number(item.year) === OFFERED_YEAR &&
        OFFERED_SEMESTERS.includes(Number(item.semester)),
    );
    const offeredItems = offeredItemsRaw.length
      ? offeredItemsRaw
      : curriculumItems
          .filter(
            (item) =>
              Number(item.year) === OFFERED_YEAR &&
              OFFERED_SEMESTERS.includes(Number(item.semester)),
          )
          .slice(0, 12);

    if (!offeredItems.length) {
      throw new Error(
        `Khong tim thay hoc phan mo lop cho major ${major.code} (Y${ACTIVE_CURRICULUM_YEAR}-HK${ACTIVE_SEMESTER})`,
      );
    }

    const teachers = teachersByDepartment.get(row.departmentCode) || [];
    if (!teachers.length) {
      throw new Error(`Khong co teacher cho khoa ${row.departmentCode}`);
    }

    let teacherCursor = 0;
    const classOperations = [];
    const classCodes = [];

    for (const item of offeredItems) {
      for (const cohortCode of cohortCodes) {
        const classCode = toClassCode(item, cohortCode);
        classCodes.push(classCode);

        const teacher = teachers[teacherCursor % teachers.length];
        teacherCursor += 1;

        classOperations.push({
          updateOne: {
            filter: {
              code: classCode,
              schoolYearId: schoolYear._id,
              semester: item.semester,
            },
            update: {
              $set: {
                code: classCode,
                name: `${item.subjectName} - ${cohortCode}`,
                subjectId: item.subjectId,
                departmentId: department._id,
                schoolYearId: schoolYear._id,
                semester: item.semester,
                teacherId: teacher?._id || null,
                weights: subjectByCode.get(item.code)?.defaultWeights || {
                  tx: 10,
                  gk: 30,
                  th: 0,
                  tkt: 60,
                },
                txCount: Number(subjectByCode.get(item.code)?.txCount || 3),
                studentCount: 0,
                isActive: true,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (classOperations.length > 0) {
      await ClassModel.bulkWrite(classOperations, { ordered: false });
    }

    const classDocs = await ClassModel.find({
      code: { $in: classCodes },
      schoolYearId: schoolYear._id,
    })
      .select("_id code subjectId semester weights txCount teacherId")
      .lean();

    const classByCode = new Map(classDocs.map((item) => [item.code, item]));
    const classSectionsByItem = new Map();

    for (const item of offeredItems) {
      const sections = cohortCodes.map((cohortCode) => {
        const code = toClassCode(item, cohortCode);
        const classDoc = classByCode.get(code);
        if (!classDoc) {
          throw new Error(`Khong tim thay class ${code}`);
        }
        return classDoc;
      });

      sections.sort((a, b) => (a.code > b.code ? 1 : -1));
      classSectionsByItem.set(item.key, sections);
    }

    majorPlans.push({
      major,
      departmentCode: row.departmentCode,
      targetStudents: row.targetStudents,
      curriculumDoc,
      offeredItems,
      cohortCodes,
      classSectionsByItem,
      advisors: advisorsByDepartment.get(row.departmentCode) || [],
      homeItemKey: offeredItems[0]?.key || null,
    });
  }

  const safeBatchSize =
    Number.isFinite(BATCH_SIZE) && BATCH_SIZE > 0
      ? Math.floor(BATCH_SIZE)
      : 240;
  const safeGradeRatio = Number.isFinite(CREATE_GRADE_RATIO)
    ? Math.min(Math.max(CREATE_GRADE_RATIO, 0), 1)
    : 0.65;

  const nextCodeStart = await getMaxStudentCodeNumber();

  const advisorStudentMap = new Map();
  majorPlans.forEach((plan) => {
    plan.advisors.forEach((advisor) => {
      advisorStudentMap.set(String(advisor._id), []);
    });
  });

  const batchStudents = [];
  const batchStudentCurricula = [];
  const batchGrades = [];

  let createdStudents = 0;
  let globalCodeCounter = nextCodeStart;

  const flushBatch = async () => {
    await insertManyChunked(Student, batchStudents, INSERT_CHUNK_SIZE);
    await insertManyChunked(Grade, batchGrades, INSERT_CHUNK_SIZE);
    await insertManyChunked(StudentCurriculum, batchStudentCurricula, 400);

    batchStudents.length = 0;
    batchGrades.length = 0;
    batchStudentCurricula.length = 0;
  };

  for (const plan of majorPlans) {
    if (!plan.advisors.length) {
      throw new Error(`Khong co advisor cho major ${plan.major.code}`);
    }

    const homeSections = plan.classSectionsByItem.get(plan.homeItemKey) || [];
    if (!homeSections.length) {
      throw new Error(`Khong tim thay lop dau ky cho major ${plan.major.code}`);
    }

    for (let index = 0; index < plan.targetStudents; index += 1) {
      const studentObjectId = new mongoose.Types.ObjectId();
      globalCodeCounter += 1;

      const studentCode = generateStudentCode(globalCodeCounter);
      const profile = pickProfile();
      const advisor = plan.advisors[index % plan.advisors.length];
      const cohortIndex = index % plan.cohortCodes.length;
      const homeClass = homeSections[cohortIndex];
      const registrations = [];

      for (const item of plan.offeredItems) {
        const sections = plan.classSectionsByItem.get(item.key) || [];
        const classDoc = sections[cohortIndex % sections.length];

        if (!classDoc) {
          continue;
        }

        const isCurrentSemester = Number(item.semester) === 3;

        let status = isCurrentSemester ? "registered" : "completed";
        let letterGrade = "";
        let gpa4 = null;
        let gradeObjectId = null;

        if (!isCurrentSemester && Math.random() <= safeGradeRatio) {
          const failed = Math.random() < failProbabilityByProfile(profile);
          status = failed ? "failed" : "completed";
          letterGrade = failed ? "F" : pickCompletedLetter(profile);
          gpa4 = LETTER_TO_GPA4[letterGrade];

          const baseScore = pickScoreInRange(LETTER_SCORE_RANGE[letterGrade]);
          const txCount = Number(classDoc.txCount || 3);
          const txScores = buildTxScores(baseScore, txCount);
          const txAvg = Number(
            (
              txScores.reduce((sum, value) => sum + value, 0) / txScores.length
            ).toFixed(2),
          );
          const gkScore = clampScore(baseScore + (Math.random() * 1.6 - 0.8));
          const tktScore = clampScore(baseScore + (Math.random() * 1.4 - 0.7));

          const weights = classDoc.weights || {
            tx: 10,
            gk: 30,
            th: 0,
            tkt: 60,
          };
          const finalScore = clampScore(
            txAvg * (Number(weights.tx || 0) / 100) +
              gkScore * (Number(weights.gk || 0) / 100) +
              tktScore * (Number(weights.tkt || 0) / 100),
          );

          gradeObjectId = new mongoose.Types.ObjectId();
          const createdAt = buildTimestampsForTerm(
            termOrder(item.year, item.semester),
          );
          const attendanceAbsent = scoreToAttendance(finalScore, profile);
          const conductScore = profileToConduct(profile);

          batchGrades.push({
            _id: gradeObjectId,
            studentId: studentObjectId,
            classId: classDoc._id,
            subjectId: item.subjectId,
            departmentId: plan.major.departmentId,
            schoolYearId: schoolYear._id,
            semester: item.semester,
            weights,
            txScores,
            gkScore,
            thScores: [],
            tktScore,
            txAvg,
            thAvg: 0,
            finalScore,
            gpa4,
            letterGrade,
            isDuThi: true,
            isVangThi: false,
            enteredBy: classDoc.teacherId || null,
            so_buoi_vang: attendanceAbsent,
            attendanceAbsent,
            hanhKiem: conductScore,
            conductScore,
            createdAt,
            updatedAt: createdAt,
          });
        }

        registrations.push({
          subjectId: item.subjectId,
          subjectCode: item.subjectCode,
          classId: classDoc._id,
          schoolYear: SCHOOL_YEAR_NAME,
          semester: item.semester,
          status,
          gradeId: gradeObjectId,
          gpa4,
          letterGrade,
        });
      }

      batchStudents.push({
        _id: studentObjectId,
        studentCode,
        fullName: `Sinh vien ${String(globalCodeCounter).padStart(6, "0")}`,
        dateOfBirth: new Date(
          2003,
          Math.floor(Math.random() * 12),
          1 + Math.floor(Math.random() * 27),
        ),
        gender: Math.random() < 0.5 ? "male" : "female",
        classId: homeClass._id,
        majorId: plan.major._id,
        enrolledYear: ENROLLED_YEAR,
        address: "TP HCM",
        parentName: `Phu huynh ${String(globalCodeCounter).padStart(6, "0")}`,
        parentPhone: `09${String(10000000 + (globalCodeCounter % 90000000)).padStart(8, "0")}`,
        status: "active",
      });

      batchStudentCurricula.push({
        studentId: studentObjectId,
        curriculumId: plan.curriculumDoc._id,
        majorId: plan.major._id,
        advisorId: advisor._id,
        enrolledYear: ENROLLED_YEAR,
        registrations,
      });

      const advisorKey = String(advisor._id);
      const advisedStudents = advisorStudentMap.get(advisorKey) || [];
      advisedStudents.push(studentObjectId);
      advisorStudentMap.set(advisorKey, advisedStudents);

      createdStudents += 1;

      if (batchStudents.length >= safeBatchSize) {
        await flushBatch();
      }

      if (createdStudents % 600 === 0) {
        console.log(
          `Seed progress: ${createdStudents}/${TARGET_TOTAL_STUDENTS} students`,
        );
      }
    }
  }

  await flushBatch();

  const classCountAgg = await StudentCurriculum.aggregate([
    {
      $match: {
        enrolledYear: ENROLLED_YEAR,
      },
    },
    {
      $unwind: "$registrations",
    },
    {
      $match: {
        "registrations.classId": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$registrations.classId",
        count: { $sum: 1 },
      },
    },
  ]);

  const allCreatedClassIds = majorPlans
    .flatMap((plan) =>
      Array.from(plan.classSectionsByItem.values())
        .flat()
        .map((classDoc) => classDoc._id),
    )
    .map((item) => String(item));

  const classCountById = new Map(
    classCountAgg.map((item) => [String(item._id), Number(item.count || 0)]),
  );

  const classCountUpdates = allCreatedClassIds.map((classId) => ({
    updateOne: {
      filter: { _id: classId },
      update: {
        $set: {
          studentCount: classCountById.get(classId) || 0,
        },
      },
    },
  }));

  if (classCountUpdates.length > 0) {
    await ClassModel.bulkWrite(classCountUpdates, { ordered: false });
  }

  const zeroClassCleanupResult = await ClassModel.deleteMany({
    studentCount: { $lte: 0 },
  });

  const advisorUpdates = [];
  advisorStudentMap.forEach((studentIds, advisorId) => {
    if (!studentIds.length) return;

    advisorUpdates.push({
      updateOne: {
        filter: { _id: advisorId },
        update: {
          $addToSet: {
            advisingStudentIds: { $each: studentIds },
          },
        },
      },
    });
  });

  if (advisorUpdates.length > 0) {
    await User.bulkWrite(advisorUpdates, { ordered: false });
  }

  const studentsByMajor = await Student.aggregate([
    {
      $match: {
        enrolledYear: ENROLLED_YEAR,
      },
    },
    {
      $group: {
        _id: "$majorId",
        count: { $sum: 1 },
      },
    },
  ]);

  const majorCountMap = new Map(
    studentsByMajor.map((item) => [String(item._id), Number(item.count || 0)]),
  );

  const departmentSummaryMap = new Map();
  majorPlans.forEach((plan) => {
    const departmentCode = plan.departmentCode;
    const majorCount = majorCountMap.get(String(plan.major._id)) || 0;
    const existing = departmentSummaryMap.get(departmentCode) || 0;
    departmentSummaryMap.set(departmentCode, existing + majorCount);
  });

  console.log("Large scale seed completed");
  console.log(`- Target students: ${TARGET_TOTAL_STUDENTS}`);
  console.log(
    `- Policy: CNTT=${TARGET_STUDENTS_CNTT}, khoa khac=${TARGET_STUDENTS_OTHER}, mo lop Y${OFFERED_YEAR}-HK1,2,3`,
  );
  console.log(`- Students created: ${createdStudents}`);
  console.log(
    `- Current student total (all years): ${await Student.countDocuments()}`,
  );
  console.log(
    `- StudentCurriculum total: ${await StudentCurriculum.countDocuments()}`,
  );
  console.log(`- Grade total: ${await Grade.countDocuments()}`);
  console.log(
    `- Zero-member classes deleted: ${zeroClassCleanupResult.deletedCount}`,
  );
  console.log("- Department distribution (ENROLLED_YEAR cohort):");

  for (const departmentSpec of DEPARTMENT_SPECS) {
    const count = departmentSummaryMap.get(departmentSpec.code) || 0;
    console.log(`  ${departmentSpec.code}: ${count}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("Large seed failed:", error.message || error);
  try {
    await mongoose.connection.close();
  } catch (_error) {
    // ignore close error
  }
  process.exit(1);
});
