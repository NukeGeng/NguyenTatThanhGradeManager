/**
 * ragService.js — RAG (Retrieval Augmented Generation)
 * Phân tích câu hỏi → query MongoDB → trả về context string cho Llama.
 * Không cần vector DB hay embedding.
 */

const mongoose = require("mongoose");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Prediction = require("../models/Prediction");
const Class = require("../models/Class");
const Department = require("../models/Department");

// ════════════════════════════════════════════
// PHẦN 1 — Intent Detector
// ════════════════════════════════════════════

const INTENT_KEYWORDS = {
  student_info: [
    "sinh viên",
    "học sinh",
    "\\bsv\\b",
    "\\bem\\b",
    "mã sv",
    "mssv",
    "tra cứu",
    "tìm sinh viên",
  ],
  grade_query: [
    "điểm",
    "gpa",
    "kết quả",
    "xếp loại",
    "học lực",
    "bảng điểm",
    "điểm số",
    "tổng kết",
    "tích lũy",
  ],
  risk_alert: [
    "rủi ro",
    "nguy cơ",
    "cảnh báo",
    "\\bF\\b",
    "môn f",
    "trượt",
    "rớt",
    "nguy hiểm",
    "cảnh báo học vụ",
  ],
  class_info: ["lớp học phần", "\\bhp\\b", "sĩ số"],
  department_stats: [
    "khoa",
    "thống kê",
    "toàn khoa",
    "toàn trường",
    "bao nhiêu sinh viên",
    "số lượng sinh viên",
  ],
  roadmap: [
    "lộ trình",
    "cải thiện",
    "tăng gpa",
    "mục tiêu gpa",
    "kế hoạch học",
    "nên học môn",
    "học lại môn",
    "đạt \\d",
    "lên \\d",
    "gpa \\d",
  ],
  subject_weak: [
    "môn yếu",
    "môn kém",
    "cần học lại",
    "môn nào yếu",
    "cải thiện môn",
    "học lại",
    "học lại môn gì",
  ],
  curriculum: [
    "chương trình",
    "ctđt",
    "tín chỉ còn",
    "ngành học",
    "tiến độ",
    "học chưa xong",
    "còn bao nhiêu",
  ],
};

function detectIntent(message) {
  const msg = message.toLowerCase();
  const intents = new Set();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => new RegExp(kw, "i").test(msg))) {
      intents.add(intent);
    }
  }

  const entities = {};

  // Mã sinh viên: 6–10 chữ số
  const codeMatch = msg.match(/\b(\d{6,10})\b/);
  if (codeMatch) entities.studentCode = codeMatch[1];

  // Tên SV — họ Việt phổ biến
  const nameMatch = message.match(
    /(?:sinh\s*viên|sv|em)?\s*((?:Nguyễn|Trần|Lê|Phạm|Hoàng|Huỳnh|Phan|Vũ|Võ|Đặng|Bùi|Đỗ|Hồ|Ngô|Dương|Lý)\s+\S+(?:\s+\S+)?)/i,
  );
  if (nameMatch) entities.studentName = nameMatch[1].trim();

  // Tên lớp
  const classMatch = msg.match(/lớp\s+(\S+)/i);
  if (classMatch) entities.className = classMatch[1];

  // Học kỳ
  const semMatch = msg.match(/học\s*kỳ\s*(\d)/i);
  if (semMatch) entities.semester = Number(semMatch[1]);

  // GPA mục tiêu: "3.2", "3,6", "đạt 3.5"
  const gpaMatch = msg.match(
    /(?:mục\s*tiêu|đạt|lên|tăng|gpa)\s*[:\s]?(\d+[.,]\d+)/i,
  );
  if (gpaMatch) entities.targetGpa = parseFloat(gpaMatch[1].replace(",", "."));

  // Limit
  const topMatch =
    msg.match(/top\s*(\d+)/i) || msg.match(/(\d+)\s*sinh\s*viên/i);
  if (topMatch) entities.limit = Math.min(Number(topMatch[1]), 20);

  // Nếu có mã SV hoặc tên SV mà chưa có intent cụ thể → mặc định thêm student_info + grade_query
  if (entities.studentCode || entities.studentName) {
    intents.add("student_info");
    intents.add("grade_query");
  }

  // roadmap → cần cả grade để tính GPA
  if (intents.has("roadmap") || intents.has("subject_weak")) {
    intents.add("grade_query");
    if (!entities.studentCode && !entities.studentName) {
      // Không có SV cụ thể → cần student_info để lấy SV từ context
      intents.add("student_info");
    }
  }

  return { intents: [...intents], entities };
}

// ════════════════════════════════════════════
// PHẦN 2 — Data Fetcher
// ════════════════════════════════════════════

async function fetchContextData(intents, entities, userCtx) {
  const context = {};

  // ── BƯỚC 1: Lấy thông tin sinh viên ─────────────────────────
  const needStudent =
    intents.includes("student_info") ||
    intents.includes("grade_query") ||
    intents.includes("curriculum") ||
    intents.includes("roadmap") ||
    intents.includes("subject_weak");

  if (needStudent) {
    const query = {};

    if (entities.studentCode) {
      // Chuẩn hóa: DB có thể lưu dạng "230141", user gõ "0000230141" → thử cả hai
      const raw = entities.studentCode;
      const stripped = raw.replace(/^0+/, "") || raw; // bỏ số 0 đứng đầu
      if (raw === stripped) {
        query.studentCode = raw;
      } else {
        query.$or = [
          { studentCode: raw },
          { studentCode: stripped },
          { studentCode: { $regex: stripped + "$" } },
        ];
      }
    } else if (entities.studentName) {
      query.fullName = { $regex: entities.studentName, $options: "i" };
    }

    // Advisor: chỉ SV được giao
    if (userCtx.role === "advisor" && userCtx.advisingStudentIds?.length) {
      const ids = userCtx.advisingStudentIds
        .map((id) =>
          mongoose.Types.ObjectId.isValid(id)
            ? new mongoose.Types.ObjectId(id)
            : null,
        )
        .filter(Boolean);
      if (ids.length) query._id = { $in: ids };
    } else if (userCtx.role === "teacher" && userCtx.departmentIds?.length) {
      const deptClasses = await Class.distinct("_id", {
        departmentId: { $in: userCtx.departmentIds },
      });
      if (deptClasses.length) query.classId = { $in: deptClasses };
    }

    const students = await Student.find(query)
      .limit(entities.limit || 3)
      .populate("classId", "name code")
      .populate("majorId", "name code")
      .lean();

    context.students = students.map((s) => ({
      _id: s._id,
      maSV: s.studentCode,
      hoTen: s.fullName,
      lopHP: s.classId?.name || s.classId?.code || "—",
      lopSH: s.homeClassCode || "—",
      nganh: s.majorId?.name || "—",
      namNhapHoc: s.enrolledYear || "—",
      trangThai: s.status,
    }));
  }

  // ── BƯỚC 2: Lấy điểm + tính GPA ─────────────────────────────
  const needGrades =
    intents.includes("grade_query") ||
    intents.includes("roadmap") ||
    intents.includes("subject_weak");

  if (needGrades && context.students?.length) {
    const studentIds = context.students.map((s) => s._id);
    const gradeQuery = { studentId: { $in: studentIds } };
    if (entities.semester) gradeQuery.semester = entities.semester;

    const grades = await Grade.find(gradeQuery)
      .populate("studentId", "fullName studentCode")
      .populate("subjectId", "name code credits")
      .sort({ semester: 1, createdAt: -1 })
      .limit(50)
      .lean();

    context.gradeRecords = grades; // giữ nguyên để tính roadmap

    context.grades = grades.map((g) => ({
      maSV: g.studentId?.studentCode || "?",
      hoTen: g.studentId?.fullName || "?",
      monHoc: g.subjectId?.name || "Không rõ",
      tinChi: g.subjectId?.credits || 0,
      diemTK: g.finalScore != null ? g.finalScore : "—",
      gpa4: g.gpa4 != null ? g.gpa4 : "—",
      xepLoai: g.letterGrade || "—",
      hocKy: g.semester,
    }));

    // Tính GPA tích lũy và phân loại môn
    _computeGpaSummary(context, grades, entities.targetGpa);
  }

  // ── BƯỚC 3: Prediction của SV ────────────────────────────────
  if (
    context.students?.length &&
    (intents.includes("risk_alert") ||
      intents.includes("grade_query") ||
      intents.includes("roadmap") ||
      intents.includes("student_info"))
  ) {
    const studentIds = context.students.map((s) => s._id);
    const predictions = await Prediction.find({
      studentId: { $in: studentIds },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Lấy prediction mới nhất cho mỗi SV
    const predMap = {};
    for (const p of predictions) {
      const sid = p.studentId.toString();
      if (!predMap[sid]) predMap[sid] = p;
    }

    context.predictions = Object.values(predMap).map((p) => {
      const sv = context.students.find(
        (s) => s._id.toString() === p.studentId.toString(),
      );
      return {
        maSV: sv?.maSV || "?",
        hoTen: sv?.hoTen || "?",
        duDoanXepLoai: p.predictedRank,
        mucDoRuiRo: p.riskLevel,
        tinCay: p.confidence != null ? `${p.confidence}%` : "—",
        monYeu: p.weakSubjects?.length ? p.weakSubjects.join(", ") : "Không có",
        monNenCaiThien: p.improveSubjects?.length
          ? p.improveSubjects.join(", ")
          : "Không có",
        goiY: p.suggestions?.slice(0, 3).join("; ") || "",
        phanTich: p.analysis || "",
      };
    });
  }

  // ── BƯỚC 4: Risk alert (danh sách nhiều SV) ──────────────────
  if (intents.includes("risk_alert") && !context.students?.length) {
    const alertQuery = { riskLevel: "high" };
    if (userCtx.role === "advisor" && userCtx.advisingStudentIds?.length) {
      const ids = userCtx.advisingStudentIds
        .map((id) =>
          mongoose.Types.ObjectId.isValid(id)
            ? new mongoose.Types.ObjectId(id)
            : null,
        )
        .filter(Boolean);
      if (ids.length) alertQuery.studentId = { $in: ids };
    }
    const alerts = await Prediction.find(alertQuery)
      .populate("studentId", "fullName studentCode")
      .sort({ createdAt: -1 })
      .limit(entities.limit || 10)
      .lean();

    context.riskAlerts = alerts.map((a) => ({
      maSV: a.studentId?.studentCode || "?",
      hoTen: a.studentId?.fullName || "?",
      duDoan: a.predictedRank,
      ruiRo: a.riskLevel,
      monYeu: a.weakSubjects?.join(", ") || "—",
      goiY: a.suggestions?.slice(0, 2).join("; ") || "",
    }));
  }

  // ── BƯỚC 5: Thống kê khoa (admin) ────────────────────────────
  if (intents.includes("department_stats") && userCtx.role === "admin") {
    const depts = await Department.find({ isActive: true })
      .select("name code")
      .lean();
    context.departmentStats = await Promise.all(
      depts.map(async (d) => {
        const [svCount, riskCount] = await Promise.all([
          Student.countDocuments({ status: "active" }),
          Prediction.countDocuments({ riskLevel: "high" }),
        ]);
        return { khoa: d.name, sinhVien: svCount, nguyCoCao: riskCount };
      }),
    );
  }

  // ── BƯỚC 6: Curriculum ────────────────────────────────────────
  if (intents.includes("curriculum") && context.students?.length) {
    try {
      const StudentCurriculum = require("../models/StudentCurriculum");
      const sc = await StudentCurriculum.findOne({
        studentId: context.students[0]._id,
      })
        .populate("curriculumId")
        .lean();
      if (sc) {
        const completed =
          sc.registrations?.filter((r) => r.status === "completed").length || 0;
        const total = sc.curriculumId?.items?.length || 0;
        context.curriculum = {
          tenCTDT: sc.curriculumId?.name || "—",
          tinChiYeuCau: sc.curriculumId?.totalCredits || "—",
          monDaHoan: completed,
          tongMon: total,
          tienDo:
            total > 0 ? `${Math.round((completed / total) * 100)}%` : "N/A",
        };
      }
    } catch {
      // model không tồn tại → bỏ qua
    }
  }

  return context;
}

/**
 * Tính GPA tích lũy và phân loại môn yếu/cần cải thiện.
 * Gán kết quả vào context.gpaSummary và context.roadmapData.
 */
function _computeGpaSummary(context, grades, targetGpa) {
  const validGrades = grades.filter(
    (g) => g.gpa4 != null && g.finalScore != null,
  );
  if (!validGrades.length) return;

  // GPA tích lũy = trung bình gpa4 (mỗi lần thi)
  const totalGpa = validGrades.reduce((sum, g) => sum + g.gpa4, 0);
  const avgGpa = totalGpa / validGrades.length;

  // Phân loại
  const monF = validGrades.filter((g) => g.letterGrade === "F" || g.gpa4 === 0);
  const monC = validGrades.filter((g) => g.letterGrade === "C" || g.gpa4 === 2);
  const monB = validGrades.filter((g) => g.letterGrade === "B" || g.gpa4 === 3);
  const monA = validGrades.filter((g) => g.letterGrade === "A" || g.gpa4 === 4);

  context.gpaSummary = {
    gpaHienTai: avgGpa.toFixed(2),
    tongMonDaThi: validGrades.length,
    soMonA: monA.length,
    soMonB: monB.length,
    soMonC: monC.length,
    soMonF: monF.length,
    xepLoai:
      avgGpa >= 3.6
        ? "Xuất sắc"
        : avgGpa >= 3.2
          ? "Giỏi"
          : avgGpa >= 2.5
            ? "Khá"
            : avgGpa >= 2.0
              ? "Trung bình"
              : "Yếu",
  };

  // Roadmap: nếu có targetGpa thì tính
  if (targetGpa) {
    const needed = targetGpa;
    const current = avgGpa;
    const n = validGrades.length;

    // Số môn cần đạt A để kéo GPA lên: giải x từ (n*current + 4*x)/(n+x) >= needed
    // → x >= n*(needed - current) / (4 - needed) nếu needed < 4
    let monCanDatA = 0;
    if (needed < 4 && needed > current) {
      monCanDatA = Math.ceil((n * (needed - current)) / (4 - needed));
    }

    // Nếu học lại tất cả môn F và đạt A → GPA mới
    const totalAfterRetake =
      totalGpa - monF.reduce((s, g) => s + g.gpa4, 0) + monF.length * 4;
    const gpaAfterRetake = monF.length
      ? (totalAfterRetake / n).toFixed(2)
      : null;

    context.roadmapData = {
      gpaHienTai: current.toFixed(2),
      gpaMucTieu: needed,
      khoangCach: (needed - current).toFixed(2),
      monFCanHocLai: monF.map((g) => ({
        monHoc: g.subjectId?.name || "Không rõ",
        diemCu: g.finalScore,
      })),
      monCCoTheNangDiem: monC.map((g) => ({
        monHoc: g.subjectId?.name || "Không rõ",
        diemHienTai: g.finalScore,
      })),
      uocTinhSauHocLaiMonF: gpaAfterRetake
        ? `Nếu học lại ${monF.length} môn F và đạt điểm A → GPA ước tính: ${gpaAfterRetake}`
        : null,
      soMonNuaCocCan:
        monCanDatA > 0
          ? `Cần đạt điểm A thêm ~${monCanDatA} môn mới để đạt GPA ${needed}`
          : current >= needed
            ? `Đã đạt mục tiêu GPA ${needed}`
            : null,
    };
  }
}

// ════════════════════════════════════════════
// PHẦN 3 — Context Builder
// ════════════════════════════════════════════

function buildContextString(contextData) {
  const parts = [];

  if (contextData.students?.length) {
    parts.push("THÔNG TIN SINH VIÊN:");
    for (const s of contextData.students) {
      parts.push(
        `  - ${s.hoTen} | MSSV: ${s.maSV} | Lớp SH: ${s.lopSH} | Ngành: ${s.nganh} | Năm nhập học: ${s.namNhapHoc} | Trạng thái: ${s.trangThai}`,
      );
    }
  }

  if (contextData.gpaSummary) {
    const g = contextData.gpaSummary;
    parts.push(
      `GPA TÍCH LŨY: ${g.gpaHienTai} (${g.xepLoai}) | Tổng môn đã thi: ${g.tongMonDaThi} | A: ${g.soMonA} | B: ${g.soMonB} | C: ${g.soMonC} | F: ${g.soMonF}`,
    );
  }

  if (contextData.grades?.length) {
    parts.push("BẢNG ĐIỂM CHI TIẾT:");
    for (const g of contextData.grades) {
      parts.push(
        `  - HK${g.hocKy} | ${g.monHoc}: điểm ${g.diemTK} | ${g.xepLoai} (GPA4: ${g.gpa4})`,
      );
    }
  }

  if (contextData.roadmapData) {
    const r = contextData.roadmapData;
    parts.push(`LỘ TRÌNH CẢI THIỆN GPA lên ${r.gpaMucTieu}:`);
    parts.push(
      `  GPA hiện tại: ${r.gpaHienTai} → Cần tăng thêm: ${r.khoangCach}`,
    );

    if (r.monFCanHocLai?.length) {
      parts.push(`  Môn F cần học lại (${r.monFCanHocLai.length} môn):`);
      for (const m of r.monFCanHocLai) {
        parts.push(`    • ${m.monHoc} (điểm cũ: ${m.diemCu})`);
      }
    }
    if (r.monCCoTheNangDiem?.length) {
      parts.push(
        `  Môn C có thể nâng điểm (${r.monCCoTheNangDiem.length} môn):`,
      );
      for (const m of r.monCCoTheNangDiem.slice(0, 5)) {
        parts.push(`    • ${m.monHoc} (điểm hiện tại: ${m.diemHienTai})`);
      }
    }
    if (r.uocTinhSauHocLaiMonF) parts.push(`  ${r.uocTinhSauHocLaiMonF}`);
    if (r.soMonNuaCocCan) parts.push(`  ${r.soMonNuaCocCan}`);
  }

  if (contextData.predictions?.length) {
    parts.push("DỰ ĐOÁN AI:");
    for (const p of contextData.predictions) {
      parts.push(
        `  - ${p.hoTen} (${p.maSV}): Dự đoán xếp loại "${p.duDoanXepLoai}" | Rủi ro: ${p.mucDoRuiRo} | Độ tin cậy: ${p.tinCay}`,
      );
      if (p.monYeu && p.monYeu !== "Không có")
        parts.push(`    Môn yếu: ${p.monYeu}`);
      if (p.monNenCaiThien && p.monNenCaiThien !== "Không có")
        parts.push(`    Cần cải thiện: ${p.monNenCaiThien}`);
      if (p.goiY) parts.push(`    Gợi ý: ${p.goiY}`);
      if (p.phanTich) parts.push(`    Phân tích: ${p.phanTich}`);
    }
  }

  if (contextData.riskAlerts?.length) {
    parts.push(
      `CẢNH BÁO HỌC VỤ (${contextData.riskAlerts.length} SV nguy cơ cao):`,
    );
    for (const a of contextData.riskAlerts) {
      parts.push(
        `  - ${a.hoTen} (${a.maSV}): ${a.duDoan} | Môn yếu: ${a.monYeu} | ${a.goiY}`,
      );
    }
  }

  if (contextData.curriculum) {
    const c = contextData.curriculum;
    parts.push(
      `TIẾN ĐỘ CTĐT: ${c.tenCTDT} | Đã hoàn thành ${c.monDaHoan}/${c.tongMon} môn (${c.tienDo}) | Yêu cầu ${c.tinChiYeuCau} TC`,
    );
  }

  if (contextData.departmentStats?.length) {
    parts.push("THỐNG KÊ THEO KHOA:");
    for (const d of contextData.departmentStats) {
      parts.push(
        `  - ${d.khoa}: ${d.sinhVien} SV | Nguy cơ cao: ${d.nguyCoCao}`,
      );
    }
  }

  if (parts.length === 0) return "";

  const full =
    "=== DỮ LIỆU TỪ HỆ THỐNG ===\n" +
    parts.join("\n") +
    "\n===========================";

  // Giới hạn 5000 ký tự (num_ctx đã tăng lên 4096)
  return full.length > 5000 ? full.slice(0, 5000) + "\n..." : full;
}

module.exports = { detectIntent, fetchContextData, buildContextString };
