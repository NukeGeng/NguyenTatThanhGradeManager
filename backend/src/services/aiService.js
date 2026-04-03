const axios = require("axios");

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:5000";

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

const buildPredictRequest = (gradeData) => {
  const subjectCode = gradeData?.subjectId?.code;
  const subjectScore =
    gradeData?.finalScore ?? gradeData?.tktScore ?? gradeData?.gkScore ?? 0;

  const scores = {};
  if (subjectCode) {
    scores[subjectCode] = clampScore(subjectScore, 0);
  }

  const previousSemesterScore =
    gradeData?.diem_hk_truoc ??
    gradeData?.previousSemesterScore ??
    subjectScore;

  return {
    scores,
    diem_hk_truoc: clampScore(previousSemesterScore, 5),
    so_buoi_vang: clampAttendance(
      gradeData?.so_buoi_vang ?? gradeData?.attendanceAbsent,
    ),
    hanh_kiem: mapConductScore(gradeData?.conductScore ?? gradeData?.hanhKiem),
  };
};

const predictStudent = async (gradeData) => {
  if (!gradeData) {
    throw new Error("Thiếu dữ liệu grade để dự đoán");
  }

  if (!gradeData.subjectId?.code) {
    throw new Error("Thiếu subject code trong dữ liệu grade");
  }

  const payload = buildPredictRequest(gradeData);

  try {
    const response = await axios.post(`${AI_ENGINE_URL}/predict`, payload, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response?.data) {
      throw new Error("AI Engine trả về dữ liệu rỗng");
    }

    return response.data;
  } catch (error) {
    const serverMessage = error?.response?.data?.detail;
    const fallbackMessage = error?.message || "Lỗi không xác định từ AI Engine";
    throw new Error(
      `Không thể gọi AI Engine: ${serverMessage || fallbackMessage}`,
    );
  }
};

module.exports = {
  predictStudent,
};
