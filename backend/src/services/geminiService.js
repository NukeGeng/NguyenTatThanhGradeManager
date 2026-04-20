const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Danh sách model ưu tiên, phân cách bởi dấu phẩy trong .env
// Nếu model đầu bị 429/lỗi, tự động thử model tiếp theo
const GEMINI_MODELS = (
  process.env.GEMINI_MODELS ||
  process.env.GEMINI_MODEL ||
  "gemini-2.0-flash,gemini-2.0-flash-lite,gemini-1.5-flash,gemini-3.1-flash-lite-preview"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const GEMINI_SYSTEM_PROMPT = `Bạn là trợ lý học vụ của Trường ĐH Nguyễn Tất Thành (NTTU).

QUY TẮc TRẢ LỜI:
- Chỉ dùng dữ liệu được cung cấp. Không bỏa đặt.
- Trả lời tiếng Việt, súc tích, có cấu trúc.
- Chỉ nêu ý chính. Không viết dài dòng, không giải thích thừa.
- Không hiển thị quá trình suy nghĩ hay kiểm tra nội bộ.
- Dùng gạch đầu dòng hoặc bảng khi cần. Tối đa 300 từ.

GPA thang 4: A (8.5–10) = 4.0 | B (7.0–8.4) = 3.0 | C (5.5–6.9) = 2.0 | F (< 5.5) = 0`;

/**
 * Gọi Gemini API với streaming (SSE).
 * @param {string} ragContext - Dữ liệu DB đã format từ buildContextString()
 * @param {string} userQuestion - Câu hỏi của người dùng
 * @param {(chunk: string) => void} onChunk - Callback mỗi khi có text mới
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
async function chatWithGemini(ragContext, userQuestion, onChunk, signal) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");
  }

  const userContent = ragContext
    ? `${ragContext}\n\nCâu hỏi: ${userQuestion}`
    : userQuestion;

  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      const result = await _callGeminiModel(
        model,
        userContent,
        onChunk,
        signal,
      );
      return result;
    } catch (err) {
      lastError = err;
      // Nếu bị quota hoặc lỗi model, thử model tiếp theo
      if (
        err.status === 429 ||
        err.status === 503 ||
        /429|503|quota|unavailable/i.test(err.message)
      ) {
        console.warn(
          `[Gemini] Model ${model} lỗi (${err.message}), thử model tiếp...`,
        );
        continue;
      }
      // Lỗi khác (400, 401...) → không retry
      throw err;
    }
  }
  throw lastError;
}

async function _callGeminiModel(model, userContent, onChunk, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  // Gemma models không hỗ trợ system_instruction → nhúng vào đầu user message
  const isGemma = model.startsWith("gemma-");
  const requestBody = isGemma
    ? {
        contents: [
          {
            role: "user",
            parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\n---\n${userContent}` }],
          },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      }
    : {
        system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    const err = new Error(`Gemini API lỗi ${response.status}: ${errText}`);
    err.status = response.status;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // giữ dòng dang dở lại

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) {
          fullResponse += text;
          onChunk(text);
        }
      } catch {
        // dòng JSON chưa hoàn chỉnh, bỏ qua
      }
    }
  }

  return fullResponse;
}

module.exports = { chatWithGemini };
