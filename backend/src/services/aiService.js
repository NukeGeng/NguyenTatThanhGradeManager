const axios = require("axios");
const StudentCurriculum = require("../models/StudentCurriculum");
const Class = require("../models/Class");
const Student = require("../models/Student");

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:5000";
const ROADMAP_CACHE_TTL_MS = 60 * 60 * 1000;
const roadmapCache = new Map();

const CONDUCT_TO_SCORE = {
  Tốt: 3,
  Khá: 2,
  "Trung Bình": 1,
  Yếu: 0,
};

const clampScore = (value, fallback = 0) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  if (numeric < 0) return 0;
  if (numeric > 10) return 10;
  return Number(numeric.toFixed(2));
};

const clampAttendance = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    return 0;
  }

  return Math.round(numeric);
};

const mapConductScore = (value) => {
  if (value === null || value === undefined || value === "") {
    return 2;
  }

  if (typeof value === "number") {
    if (value < 0) return 0;
    if (value > 3) return 3;
    return Math.round(value);
  }

  const normalized = String(value).trim();
  if (CONDUCT_TO_SCORE[normalized] !== undefined) {
    return CONDUCT_TO_SCORE[normalized];
  }

  return 2;
};

const normalizeScoresMap = (scores) => {
  if (!scores || typeof scores !== "object") {
    return {};
  }

  return Object.entries(scores).reduce((accumulator, [key, value]) => {
    const subjectCode = String(key || "").trim();
    if (!subjectCode) {
      return accumulator;
    }

    accumulator[subjectCode] = clampScore(value, 0);
    return accumulator;
  }, {});
};

const meanScoreFromMap = (scores) => {
  const values = Object.values(scores)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));

  if (!values.length) {
    return 0;
  }

  const total = values.reduce((sum, item) => sum + item, 0);
  return Number((total / values.length).toFixed(2));
};

const buildPredictRequest = (gradeData) => {
  const providedScores = normalizeScoresMap(gradeData?.scores);

  const subjectCode = gradeData?.subjectId?.code;
  const subjectScore =
    gradeData?.finalScore ?? gradeData?.tktScore ?? gradeData?.gkScore ?? 0;

  const scores = { ...providedScores };
  if (!Object.keys(scores).length && subjectCode) {
    scores[subjectCode] = clampScore(subjectScore, 0);
  }

  const representativeCurrentScore = meanScoreFromMap(scores);

  const previousSemesterScore =
    gradeData?.diem_hk_truoc ??
    gradeData?.previousSemesterScore ??
    representativeCurrentScore;

  // finalScore: diem tong ket da tinh he so (neu co), fallback ve trung binh scores
  const finalScoreRaw = gradeData?.finalScore ?? meanScoreFromMap(scores);
  const finalScore = clampScore(finalScoreRaw, representativeCurrentScore);

  // gpa4 tu grade doc (neu co), fallback quy doi tu finalScore
  const gpa4Raw = gradeData?.gpa4 ?? null;
  const gpa4 =
    gpa4Raw !== null
      ? Math.min(Number(Number(gpa4Raw).toFixed(2)), 4)
      : Number(Math.min((finalScore / 10) * 4, 4).toFixed(2));

  return {
    scores,
    diem_hk_truoc: clampScore(previousSemesterScore, 5),
    so_buoi_vang: clampAttendance(
      gradeData?.so_buoi_vang ?? gradeData?.attendanceAbsent,
    ),
    hanh_kiem: mapConductScore(gradeData?.conductScore ?? gradeData?.hanhKiem),
    finalScore,
    gpa4,
  };
};

const getCurrentSemesterYear = () => {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  if (month >= 9 && month <= 12) {
    return { currentSemester: 1, currentYear: year };
  }

  if (month >= 1 && month <= 4) {
    return { currentSemester: 2, currentYear: year };
  }

  return { currentSemester: 3, currentYear: year };
};

const toTargetLabel = (targetGpa) =>
  Number(targetGpa || 0) >= 3.6 ? "Xuat sac" : "Gioi";

const normalizeRegistrationStatus = (registration) => {
  const letter = String(registration?.letterGrade || "").toUpperCase();
  const gpa4 = Number(registration?.gpa4 ?? -1);
  const status = String(registration?.status || "").toLowerCase();

  if (status === "completed" && gpa4 >= 2) {
    return "completed";
  }

  if (status === "failed" || letter === "F" || (gpa4 >= 0 && gpa4 < 2)) {
    return "failed";
  }

  if (status === "registered" || status === "retaking") {
    return "in_progress";
  }

  return "not_started";
};

const toSubjectResult = (item, registration) => {
  const status = normalizeRegistrationStatus(registration);

  return {
    subjectCode: String(
      item?.subjectCode ||
        registration?.subjectCode ||
        registration?.subjectId?.code ||
        "",
    ),
    subjectName: String(
      item?.subjectName || registration?.subjectId?.name || "Mon hoc",
    ),
    credits: Number(item?.credits || registration?.subjectId?.credits || 0),
    gpa4: Number(registration?.gpa4 || 0),
    letterGrade: String(registration?.letterGrade || ""),
    status,
    isRequired: String(item?.subjectType || "required") !== "elective",
    category: String(
      item?.category ||
        item?.subjectId?.category ||
        registration?.subjectId?.category ||
        "theory",
    ),
  };
};

const snapshotStudentCurriculum = async (studentId) => {
  const studentCurriculum = await StudentCurriculum.findOne({ studentId })
    .populate("studentId", "_id studentCode fullName")
    .populate({
      path: "curriculumId",
      select: "_id name items",
      populate: { path: "items.subjectId", select: "category" },
    })
    .populate("registrations.subjectId", "_id code name credits category");

  if (!studentCurriculum) {
    const student = await Student.findById(studentId)
      .select("_id studentCode fullName")
      .lean();

    if (!student) {
      const error = new Error("Student not found");
      error.statusCode = 404;
      throw error;
    }

    return {
      hasCurriculum: false,
      studentCode: String(student.studentCode || ""),
      completedSubjects: [],
      remainingSubjects: [],
      failedSubjects: [],
      weakSubjects: [],
      totalCreditsEarned: 0,
      currentGpaAccumulated: 0,
    };
  }

  if (!studentCurriculum.curriculumId) {
    return {
      hasCurriculum: false,
      studentCode: String(studentCurriculum.studentId?.studentCode || ""),
      completedSubjects: [],
      remainingSubjects: [],
      failedSubjects: [],
      weakSubjects: [],
      totalCreditsEarned: 0,
      currentGpaAccumulated: 0,
    };
  }

  const curriculumItems = Array.isArray(studentCurriculum.curriculumId?.items)
    ? studentCurriculum.curriculumId.items
    : [];

  const registrationBySubjectId = new Map();
  for (const registration of studentCurriculum.registrations || []) {
    const subjectId = String(
      registration?.subjectId?._id || registration?.subjectId || "",
    );
    if (subjectId) {
      registrationBySubjectId.set(subjectId, registration);
    }
  }

  const completedSubjects = [];
  const remainingSubjects = [];
  const failedSubjects = [];
  const weakSubjects = [];

  let earnedCredits = 0;
  let weightedGpa = 0;

  for (const item of curriculumItems) {
    const subjectId = String(item?.subjectId || "");
    const registration = registrationBySubjectId.get(subjectId);
    const subjectResult = toSubjectResult(item, registration);

    if (subjectResult.status === "completed") {
      completedSubjects.push(subjectResult);
      earnedCredits += subjectResult.credits;
      weightedGpa += subjectResult.gpa4 * subjectResult.credits;
      continue;
    }

    remainingSubjects.push(subjectResult);

    if (subjectResult.status === "failed") {
      failedSubjects.push(subjectResult);
      continue;
    }

    if (
      subjectResult.letterGrade.toUpperCase() === "C" ||
      subjectResult.gpa4 === 2
    ) {
      weakSubjects.push(subjectResult);
    }
  }

  const currentGpaAccumulated =
    earnedCredits > 0 ? Number((weightedGpa / earnedCredits).toFixed(2)) : 0;

  return {
    hasCurriculum: true,
    studentCode: String(studentCurriculum.studentId?.studentCode || ""),
    completedSubjects,
    remainingSubjects,
    failedSubjects,
    weakSubjects,
    totalCreditsEarned: earnedCredits,
    currentGpaAccumulated,
  };
};

const parseAiError = (error, timeoutMs = 30000) => {
  const statusCode = Number(error?.response?.status || 0);
  const errorCode = String(error?.code || "");
  const detail = error?.response?.data?.detail;

  let serverMessage = "";
  if (typeof detail === "string" && detail.trim()) {
    serverMessage = detail;
  } else if (Array.isArray(detail) && detail.length > 0) {
    serverMessage = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const message = item.msg || item.message;
          return typeof message === "string" ? message : "";
        }

        return "";
      })
      .filter(Boolean)
      .join("; ");
  } else if (detail && typeof detail === "object") {
    const detailMessage = detail.message || detail.msg;
    if (typeof detailMessage === "string" && detailMessage.trim()) {
      serverMessage = detailMessage;
    }
  }

  if (!serverMessage && errorCode === "ECONNREFUSED") {
    serverMessage = "AI Engine chưa chạy hoặc không lắng nghe cổng 5000";
  }

  if (!serverMessage && errorCode === "ECONNABORTED") {
    serverMessage = `AI Engine phản hồi quá chậm (timeout ${timeoutMs / 1000}s)`;
  }

  if (!serverMessage && statusCode === 422) {
    serverMessage = "Dữ liệu gửi sang AI Engine không hợp lệ";
  }

  if (!serverMessage && statusCode >= 500) {
    serverMessage = "AI Engine gặp lỗi nội bộ";
  }

  const fallbackMessage =
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : "Lỗi không xác định từ AI Engine";

  return serverMessage || fallbackMessage;
};

const postToAiEngine = async (path, payload, timeoutMs = 30000) => {
  try {
    const response = await axios.post(`${AI_ENGINE_URL}${path}`, payload, {
      timeout: timeoutMs,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response?.data) {
      throw new Error("AI Engine trả về dữ liệu rỗng");
    }

    return response.data;
  } catch (error) {
    throw new Error(
      `Không thể gọi AI Engine: ${parseAiError(error, timeoutMs)}`,
    );
  }
};

const getCacheEntry = (key) => {
  const existing = roadmapCache.get(key);
  if (!existing) {
    return null;
  }

  if (Date.now() - existing.cachedAt > ROADMAP_CACHE_TTL_MS) {
    roadmapCache.delete(key);
    return null;
  }

  return existing.data;
};

const setCacheEntry = (key, data) => {
  roadmapCache.set(key, {
    cachedAt: Date.now(),
    data,
  });
};

const predictStudent = async (gradeData) => {
  if (!gradeData) {
    throw new Error("Thiếu dữ liệu grade để dự đoán");
  }

  const hasScores =
    gradeData.scores && Object.keys(gradeData.scores).length > 0;
  if (!gradeData.subjectId?.code && !hasScores) {
    throw new Error("Thiếu subject code trong dữ liệu grade");
  }

  const payload = buildPredictRequest(gradeData);

  return postToAiEngine("/predict", payload);
};

const getGpaRoadmap = async (studentId, targetGpa = 3.2) => {
  const target = Number(targetGpa || 3.2);
  const cacheKey = `gpa:${studentId}:${target.toFixed(2)}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) {
    return cached;
  }

  const snapshot = await snapshotStudentCurriculum(studentId);

  if (!snapshot.hasCurriculum) {
    const data = {
      studentCode: snapshot.studentCode,
      currentGpa: 0,
      targetGpa: Number(target.toFixed(2)),
      targetLabel: toTargetLabel(target),
      isAchievable: false,
      requiredGpaRemaining: 0,
      subjectPlans: [],
      summary:
        "Sinh viên chưa được gắn chương trình khung. Vui lòng gắn CTĐT để tạo lộ trình GPA.",
      semesterBreakdown: [],
    };

    setCacheEntry(cacheKey, data);
    return data;
  }

  const payload = {
    studentCode: snapshot.studentCode,
    currentGpaAccumulated: snapshot.currentGpaAccumulated,
    totalCreditsEarned: snapshot.totalCreditsEarned,
    completedSubjects: snapshot.completedSubjects,
    remainingSubjects: snapshot.remainingSubjects,
    targetGpa: target,
  };

  const data = await postToAiEngine("/gpa-roadmap", payload, 45000);
  setCacheEntry(cacheKey, data);
  return data;
};

const getRetakeRoadmap = async (studentId) => {
  const snapshot = await snapshotStudentCurriculum(studentId);

  if (!snapshot.hasCurriculum) {
    return {
      studentCode: snapshot.studentCode,
      urgentRetakes: [],
      recommendedRetakes: [],
      retakePlan: [],
      note: "Sinh viên chưa được gắn chương trình khung nên chưa thể tạo lộ trình học lại.",
    };
  }

  const { currentSemester, currentYear } = getCurrentSemesterYear();

  const payload = {
    studentCode: snapshot.studentCode,
    failedSubjects: snapshot.failedSubjects,
    weakSubjects: snapshot.weakSubjects,
    remainingSubjects: snapshot.remainingSubjects,
    currentSemester,
    currentYear,
  };

  return postToAiEngine("/retake-roadmap", payload, 60000);
};

const getSemesterPlan = async (
  studentId,
  registeredClassIds = [],
  targetGpa = 3.2,
) => {
  const snapshot = await snapshotStudentCurriculum(studentId);

  if (!snapshot.hasCurriculum) {
    return {
      studentCode: snapshot.studentCode,
      currentGpa: 0,
      targetGpa: Number(targetGpa || 3.2),
      predictedSemesterGpa: 0,
      requiredAverage: Number(targetGpa || 3.2),
      subjectTargets: [],
      warnings: ["Sinh viên chưa được gắn chương trình khung."],
      summary: "Cần gắn CTĐT trước khi lập kế hoạch học kỳ.",
    };
  }

  const classDocs = await Class.find({
    _id: { $in: Array.isArray(registeredClassIds) ? registeredClassIds : [] },
  }).populate("subjectId", "code name credits");

  const registeredSubjects = classDocs.map((classDoc) => {
    const subjectCode = String(classDoc?.subjectId?.code || "");
    const fromCurriculum = snapshot.remainingSubjects.find(
      (item) => item.subjectCode === subjectCode,
    );

    return {
      subjectCode,
      subjectName: String(
        classDoc?.subjectId?.name || classDoc?.name || "Mon hoc",
      ),
      credits: Number(classDoc?.subjectId?.credits || 0),
      gpa4: 0,
      letterGrade: "",
      status: "not_started",
      isRequired: fromCurriculum ? Boolean(fromCurriculum.isRequired) : true,
    };
  });

  const payload = {
    studentCode: snapshot.studentCode,
    currentGpaAccumulated: snapshot.currentGpaAccumulated,
    targetGpa: Number(targetGpa || 3.2),
    registeredSubjects,
    weakSubjects: snapshot.weakSubjects,
  };

  return postToAiEngine("/semester-plan", payload);
};

module.exports = {
  predictStudent,
  getGpaRoadmap,
  getRetakeRoadmap,
  getSemesterPlan,
};
