const OLLAMA_URL = process.env.OLLAMA_URL || "http://184.174.37.227:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

const SYSTEM_PROMPT = `Bạn là trợ lý học vụ AI của Trường ĐH Nguyễn Tất Thành (NTTU). Tên bạn là "Trợ lý NTTU".

NHIỆM VỤ QUAN TRỌNG:
- Khi được cung cấp phần "=== DỮ LIỆU TỪ HỆ THỐNG ===" trong câu hỏi, bạn PHẢI sử dụng dữ liệu đó để trả lời. Đây là dữ liệu thật từ cơ sở dữ liệu.
- Phân tích điểm số, tính GPA, xác định môn yếu/cần cải thiện dựa trên dữ liệu được cung cấp.
- Đề xuất lộ trình cụ thể dựa trên dữ liệu thật (môn nào cần học lại, cần điểm bao nhiêu).
- KHÔNG nói "tôi không có thông tin" khi đã có dữ liệu trong phần hệ thống cung cấp.
- Chỉ nói "không có thông tin" khi phần dữ liệu hệ thống thực sự trống.

Cách tính GPA theo thang 4:
- Điểm A (8.5–10): GPA4 = 4.0
- Điểm B (7.0–8.4): GPA4 = 3.0
- Điểm C (5.5–6.9): GPA4 = 2.0
- Điểm F (< 5.5): GPA4 = 0

Luôn trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc rõ ràng. Không bịa đặt thông tin ngoài dữ liệu được cung cấp.`;

/**
 * Gọi Ollama API với streaming.
 * @param {Array<{role: string, content: string}>} messages - Lịch sử hội thoại
 * @param {(text: string) => void} onChunk - Callback mỗi khi có token mới
 * @param {AbortSignal} [signal] - AbortSignal để hủy request khi client ngắt kết nối
 * @param {string} [contextData] - Dữ liệu hệ thống bổ sung (điểm SV, lộ trình...) để inject vào system prompt
 * @returns {Promise<string>} - Toàn bộ response text
 */
async function chatWithLlama(messages, onChunk, signal, contextData) {
  const controller = new AbortController();

  // Chỉ abort khi client ngắt kết nối — không timeout nội bộ
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let fullResponse = "";

  try {
    const fullSystemPrompt = contextData
      ? `${SYSTEM_PROMPT}\n\n--- DỮ LIỆU HỆ THỐNG (dùng để trả lời chính xác) ---\n${contextData}`
      : SYSTEM_PROMPT;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: fullSystemPrompt }, ...messages],
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 800,
          num_ctx: 4096,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Ollama trả về lỗi ${response.status}: ${response.statusText}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });

      // Mỗi chunk có thể chứa nhiều dòng JSON
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          const content = parsed?.message?.content ?? "";
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
          if (parsed.done) {
            return fullResponse;
          }
        } catch {
          // Bỏ qua dòng không parse được (partial JSON cuối chunk)
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      // Client ngắt kết nối — trả về im lặng, không throw
      return fullResponse;
    } else if (
      err.code === "ECONNREFUSED" ||
      err.code === "ENOTFOUND" ||
      err.code === "ECONNRESET"
    ) {
      throw new Error(
        `Không thể kết nối Ollama (${err.code}). Kiểm tra VPS ${OLLAMA_URL}.`,
      );
    } else {
      throw err;
    }
  }

  return fullResponse;
}

/**
 * Kiểm tra Ollama có đang hoạt động không.
 * @returns {Promise<{online: boolean, models: string[]}>}
 */
async function checkOllamaHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return { online: false, models: [] };
    }

    const data = await response.json();
    const models = (data.models ?? []).map((m) => m.name ?? m.model ?? "");
    return { online: true, models };
  } catch {
    return { online: false, models: [] };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { chatWithLlama, checkOllamaHealth };
