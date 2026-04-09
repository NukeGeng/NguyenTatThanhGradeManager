const StudentCurriculum = require("../models/StudentCurriculum");

const toId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value?._id) {
    return String(value._id);
  }

  return "";
};

const calculateProgress = async (studentId) => {
  const doc = await StudentCurriculum.findOne({ studentId })
    .populate("curriculumId")
    .populate("registrations.gradeId", "letterGrade gpa4")
    .lean();

  if (!doc || !doc.curriculumId) {
    return {
      totalRequired: 0,
      completed: 0,
      inProgress: 0,
      failed: 0,
      remaining: 0,
      creditsEarned: 0,
      creditsRequired: 0,
      progressPercent: 0,
      details: [],
    };
  }

  const items = Array.isArray(doc.curriculumId.items)
    ? doc.curriculumId.items
    : [];
  const registrations = Array.isArray(doc.registrations)
    ? doc.registrations
    : [];

  const registrationMap = new Map();
  registrations.forEach((registration) => {
    const key = toId(registration.subjectId);
    if (!key) {
      return;
    }

    registrationMap.set(key, registration);
  });

  const details = items.map((item) => {
    const key = toId(item.subjectId);
    const registration = registrationMap.get(key);

    let status = "not-started";
    if (registration?.status === "completed") {
      status = "completed";
    } else if (registration?.status === "failed") {
      status = "failed";
    } else if (
      registration?.status === "registered" ||
      registration?.status === "retaking"
    ) {
      status = "in-progress";
    }

    const letterGrade =
      registration?.gradeId?.letterGrade || registration?.letterGrade || "";
    if (letterGrade === "A" || letterGrade === "B" || letterGrade === "C") {
      status = "completed";
    }

    if (letterGrade === "F") {
      status = "failed";
    }

    return {
      subjectId: item.subjectId,
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      credits: Number(item.credits || 0),
      year: Number(item.year || 1),
      semester: Number(item.semester || 1),
      status,
      gpa4: registration?.gradeId?.gpa4 ?? registration?.gpa4 ?? null,
      letterGrade: letterGrade || null,
    };
  });

  const totalRequired = details.length;
  const completed = details.filter(
    (item) => item.status === "completed",
  ).length;
  const inProgress = details.filter(
    (item) => item.status === "in-progress",
  ).length;
  const failed = details.filter((item) => item.status === "failed").length;
  const remaining = details.filter(
    (item) => item.status === "not-started",
  ).length;

  const creditsRequired = details.reduce(
    (sum, item) => sum + Number(item.credits || 0),
    0,
  );
  const creditsEarned = details
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + Number(item.credits || 0), 0);

  const progressPercent =
    creditsRequired > 0
      ? Number(((creditsEarned / creditsRequired) * 100).toFixed(2))
      : 0;

  return {
    totalRequired,
    completed,
    inProgress,
    failed,
    remaining,
    creditsEarned,
    creditsRequired,
    progressPercent,
    details,
  };
};

module.exports = {
  calculateProgress,
};
