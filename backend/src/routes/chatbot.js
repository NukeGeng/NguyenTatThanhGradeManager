const router = require("express").Router();
const {
  chatWithLlama,
  checkOllamaHealth,
} = require("../services/llamaService");
const { chatWithGemini } = require("../services/geminiService");
const {
  detectIntent,
  fetchContextData,
  buildContextString,
} = require("../services/ragService");
const auth = require("../middleware/auth");

/**
 * Stream một chuỗi text dưới dạng SSE chunks (bypass Llama).
 * Chia theo dòng để frontend nhận được từng dòng mượt hơn.
 */
function streamDirect(res, text) {
  const lines = text.split("\n");
  for (const line of lines) {
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({ type: "chunk", content: line + "\n" })}\n\n`,
      );
    }
  }
}

// Intents có dữ liệu DB đủ để trả thẳng (bypass Llama)
const DIRECT_DATA_INTENTS = new Set([
  "student_info",
  "grade_query",
  "risk_alert",
  "department_stats",
  "curriculum",
]);

// Intents cần Gemini phân tích + đề xuất lộ trình (có sử dụng data DB)
const GEMINI_INTENTS = new Set(["roadmap", "subject_weak"]);

/**
 * GET /api/chatbot/health
 * Không cần xác thực.
 */
router.get("/health", async (_req, res) => {
  try {
    const status = await checkOllamaHealth();
    res.json(status);
  } catch {
    res.json({ online: false, models: [] });
  }
});

/**
 * POST /api/chatbot/message
 * Yêu cầu JWT.
 * Body: { messages: [{role, content}] }
 * Trả về SSE stream.
 */
router.post("/message", auth, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "messages phải là mảng không rỗng" });
  }

  for (const msg of messages) {
    if (
      !msg ||
      typeof msg.role !== "string" ||
      typeof msg.content !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Mỗi message phải có role và content kiểu string",
      });
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      return res.status(400).json({
        success: false,
        message: "role phải là 'user' hoặc 'assistant'",
      });
    }
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const abortController = new AbortController();
  req.on("close", () => abortController.abort());

  try {
    // Giới hạn 10 tin nhắn gần nhất
    const recentMessages = messages.slice(-10);

    // ── RAG: Phân tích intent + query DB ──────────────────────
    const lastUserMsg = [...recentMessages]
      .reverse()
      .find((m) => m.role === "user");
    let ragContext = "";
    let detectedIntents = [];

    if (lastUserMsg) {
      const { intents, entities } = detectIntent(lastUserMsg.content);
      detectedIntents = intents;

      if (intents.some((i) => DIRECT_DATA_INTENTS.has(i))) {
        try {
          const userCtx = {
            userId: String(req.user._id || req.user.id || ""),
            role: req.user.role,
            departmentIds: (req.user.departmentIds || []).map(String),
            advisingStudentIds: (req.user.advisingStudentIds || []).map(String),
          };
          const contextData = await fetchContextData(
            intents,
            entities,
            userCtx,
          );
          ragContext = buildContextString(contextData);
        } catch (ragErr) {
          console.error("[RAG] Query lỗi:", ragErr.message);
        }
      }
    }

    // ── Quyết định: Gemini / direct stream / Llama ─────────
    const needGemini = detectedIntents.some((i) => GEMINI_INTENTS.has(i));
    const hasDataIntent = detectedIntents.some((i) =>
      DIRECT_DATA_INTENTS.has(i),
    );

    if (ragContext && needGemini) {
      // Lộ trình / môn yếu → Gemini phân tích thông minh
      await chatWithGemini(
        ragContext,
        lastUserMsg.content,
        (chunk) => {
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
            );
          }
        },
        abortController.signal,
      );
    } else if (ragContext && hasDataIntent) {
      // Tra cứu thông tin SV / điểm số → stream thẳng DB data
      streamDirect(res, ragContext);
    } else {
      // Không có data → dùng Llama cho câu hỏi tổng quát
      let messagesWithContext = recentMessages;
      if (ragContext && lastUserMsg) {
        messagesWithContext = [
          ...recentMessages.slice(0, -1),
          {
            role: "user",
            content: `${ragContext}\n\nCâu hỏi: ${lastUserMsg.content}`,
          },
        ];
      }
      await chatWithLlama(
        messagesWithContext,
        (chunk) => {
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
            );
          }
        },
        abortController.signal,
      );
    }

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lỗi không xác định từ AI service";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chatbot/query
 * Form-based query: nhận tham số tường minh, bỏ qua auto intent detection.
 * Body: { queryType, studentCode?, className?, question, history? }
 */
router.post("/query", auth, async (req, res) => {
  const { queryType, studentCode, className, question, history } = req.body;

  if (!queryType || !question?.trim()) {
    return res.status(400).json({
      success: false,
      message: "queryType và question là bắt buộc",
    });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const abortController = new AbortController();
  req.on("close", () => abortController.abort());

  try {
    // Map queryType → intents (không cần regex detection)
    const INTENT_MAP = {
      student_info: ["student_info", "grade_query"],
      grade_query: ["student_info", "grade_query"],
      risk_alert: ["student_info", "risk_alert"],
      roadmap: [
        "student_info",
        "grade_query",
        "curriculum",
        "roadmap",
        "subject_weak",
      ],
    };
    const intents = INTENT_MAP[queryType] || ["student_info", queryType];

    const entities = { limit: 10 };
    if (studentCode?.trim()) entities.studentCode = studentCode.trim();
    if (className?.trim()) entities.className = className.trim();
    // Trích targetGpa từ câu hỏi nếu có
    const gpaMatch = question.match(
      /(?:mục\s*tiêu|đạt|lên|tăng|gpa)\s*[:\s]?(\d+[.,]\d+)/i,
    );
    if (gpaMatch)
      entities.targetGpa = parseFloat(gpaMatch[1].replace(",", "."));

    const userCtx = {
      userId: String(req.user._id || req.user.id || ""),
      role: req.user.role,
      departmentIds: (req.user.departmentIds || []).map(String),
      advisingStudentIds: (req.user.advisingStudentIds || []).map(String),
    };

    let ragContext = "";
    try {
      const contextData = await fetchContextData(intents, entities, userCtx);
      ragContext = buildContextString(contextData);
    } catch (ragErr) {
      console.error("[RAG/query] lỗi:", ragErr.message);
    }

    if (
      ragContext &&
      (queryType === "roadmap" || queryType === "subject_weak")
    ) {
      // Lộ trình / môn yếu → Gemini phân tích thông minh
      await chatWithGemini(
        ragContext,
        question.trim(),
        (chunk) => {
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
            );
          }
        },
        abortController.signal,
      );
    } else if (ragContext) {
      // Tra cứu thông tin → stream thẳng DB data
      streamDirect(res, ragContext);
    } else {
      // Không tìm thấy data → Llama trả lời chung
      const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
      const messages = [
        ...recentHistory,
        { role: "user", content: question.trim() },
      ];
      await chatWithLlama(
        messages,
        (chunk) => {
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
            );
          }
        },
        abortController.signal,
      );
    }

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    }
  } catch (err) {
    if (!res.writableEnded) {
      const message =
        err instanceof Error ? err.message : "Lỗi không xác định từ AI service";
      if (err?.name !== "AbortError") {
        res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      }
      res.end();
    }
  }
});

module.exports = router;
