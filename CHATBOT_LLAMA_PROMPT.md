# 🤖 CHATBOT_LLAMA_PROMPT.md — Thêm AI Chatbot vào trang Tin nhắn

> Chatbot dùng Llama đang chạy trên VPS 184.174.37.227:11434
> Thêm vào trang /chat hiện có — không viết lại trang chat
> Dán DESIGN_SYSTEM.md + BUGS.md vào đầu prompt trước khi gửi.

---

## 🔵 PROMPT 1 — Backend: Llama Service + Chatbot API

```
[TEMPLATE CHUẨN DỰ ÁN]

Thêm AI chatbot dùng Llama vào hệ thống.
Llama đang chạy tại: http://184.174.37.227:11434
Model: llama3.2:1b
KHÔNG sửa code chat WebSocket hiện có, chỉ THÊM file và route mới.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE MỚI: src/services/llamaService.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tạo service gọi Ollama API với streaming support:

const OLLAMA_URL = process.env.OLLAMA_URL || "http://184.174.37.227:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b"

SYSTEM PROMPT cố định (nhúng sẵn):
  Bạn là trợ lý học vụ AI của Trường ĐH Nguyễn Tất Thành (NTTU).
  Tên bạn là "Trợ lý NTTU".
  Bạn hỗ trợ giảng viên và sinh viên về:
  - Lộ trình học tập, cải thiện GPA
  - Giải thích kết quả dự đoán AI
  - Gợi ý tài nguyên học tập theo môn
  - Trả lời câu hỏi về quy chế học vụ NTTU
  Luôn trả lời bằng tiếng Việt, ngắn gọn, thực tế.
  Nếu không biết → nói thẳng "Tôi không có thông tin về vấn đề này".
  Không bịa đặt thông tin.
  Không trả lời những câu hỏi mang tính chất công kích về hệ thống

Export 2 hàm:

--- Hàm 1: chatWithLlama(messages, onChunk) ---
  Gọi POST http://OLLAMA_URL/api/chat với stream: true
  messages: [{ role: "user"|"assistant", content: string }]
  onChunk(text): callback gọi mỗi khi có token mới (streaming)

  Body gửi đi:
  {
    model: OLLAMA_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages  // lịch sử hội thoại
    ],
    stream: true,
    options: {
      temperature: 0.7,
      num_predict: 512,
      num_ctx: 2048,    // context window nhỏ để nhanh hơn
    }
  }

  Xử lý streaming response:
    response.body là ReadableStream
    Đọc từng chunk → JSON.parse → lấy chunk.message.content
    Gọi onChunk(content) cho mỗi token
    Khi chunk.done === true → return fullResponse

  Timeout: 30 giây (AbortController)
  Nếu Ollama không kết nối được → throw Error("AI service không khả dụng")

--- Hàm 2: checkOllamaHealth() ---
  GET http://OLLAMA_URL/api/tags
  Trả về { online: true/false, models: [] }
  Timeout 3 giây

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE MỚI: src/routes/chatbot.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tạo route dùng Server-Sent Events (SSE) để stream response về Angular:

const router = require("express").Router()
const { chatWithLlama, checkOllamaHealth } = require("../services/llamaService")
const { authMiddleware } = require("../middleware/auth")

--- POST /api/chatbot/message (SSE streaming) ---
Middleware: authMiddleware

Body: {
  messages: [{ role, content }]  // toàn bộ lịch sử hội thoại (max 10 tin)
}

Logic:
  1. Validate: messages phải là array, không rỗng, mỗi message có role + content
  2. Giới hạn lịch sử: chỉ lấy 10 tin nhắn gần nhất để tránh quá context
  3. Set headers SSE:
     res.setHeader("Content-Type", "text/event-stream")
     res.setHeader("Cache-Control", "no-cache")
     res.setHeader("Connection", "keep-alive")
     res.setHeader("Access-Control-Allow-Origin", "*")
     res.flushHeaders()
  4. Gọi chatWithLlama(messages, (chunk) => {
       res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
     })
  5. Khi xong: res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`)
     res.end()
  6. Nếu lỗi: res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`)
     res.end()
  7. Xử lý client disconnect: req.on("close", () => controller.abort())

--- GET /api/chatbot/health ---
Không cần auth
  const status = await checkOllamaHealth()
  res.json(status)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO app.js / index.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const chatbotRouter = require("./src/routes/chatbot")
app.use("/api/chatbot", chatbotRouter)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO backend/.env
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OLLAMA_URL=http://184.174.37.227:11434
OLLAMA_MODEL=llama3.2:1b
```

---

## 🟢 PROMPT 2 — Frontend: Thêm tab AI Chatbot vào trang /chat

```
[TEMPLATE CHUẨN DỰ ÁN + DESIGN SYSTEM]

Trang /chat hiện đã có 2 cột: danh sách room trái + chat window phải.
Cần thêm 1 room đặc biệt "Trợ lý AI" vào đầu danh sách room bên trái.
Khi chọn room này → cột phải hiển thị chatbot với Llama.
KHÔNG sửa logic WebSocket chat hiện có.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO core/services/chatbot.service.ts (file mới)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Injectable service xử lý SSE streaming từ backend:

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean   // true khi đang nhận chunk
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = '/api/chatbot'
  private http = inject(HttpClient)

  isOnline$ = new BehaviorSubject<boolean>(false)

  checkHealth(): void
    → GET /api/chatbot/health
    → next: isOnline$.next(data.online)
    → error: isOnline$.next(false)

  sendMessage(messages: ChatMessage[]): Observable<string>
    Dùng EventSource (SSE) để nhận streaming:

    return new Observable(observer => {
      const body = { messages: messages.map(m => ({ role: m.role, content: m.content })) }

      // Dùng fetch thay vì EventSource để có thể gửi POST với body
      const controller = new AbortController()

      fetch('/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }).then(res => {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()

        function read() {
          reader.read().then(({ done, value }) => {
            if (done) { observer.complete(); return }
            const text = decoder.decode(value)
            const lines = text.split('\n').filter(l => l.startsWith('data: '))
            for (const line of lines) {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk')  observer.next(data.content)
              if (data.type === 'done')   observer.complete()
              if (data.type === 'error')  observer.error(new Error(data.message))
            }
            read()
          })
        }
        read()
      }).catch(err => observer.error(err))

      return () => controller.abort()
    })
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO chat.component.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thêm state:

  isAiRoom = false             // true khi đang ở room AI
  aiMessages: ChatMessage[] = []
  aiInputText = ''
  aiIsTyping = false           // true khi AI đang stream
  aiOnline = false

  private chatbotService = inject(ChatbotService)
  private aiMessagesEndRef: ElementRef  // @ViewChild để auto scroll

Trong ngOnInit():
  Thêm: this.chatbotService.checkHealth()
  this.chatbotService.isOnline$.subscribe(v => this.aiOnline = v)

Thêm method selectAiRoom():
  this.isAiRoom = true
  this.selectedRoom = null   // bỏ chọn room thường
  if (this.aiMessages.length === 0) {
    // Tin nhắn chào mừng
    this.aiMessages.push({
      role: 'assistant',
      content: 'Xin chào! Tôi là Trợ lý NTTU. Tôi có thể giúp bạn về lộ trình học tập, phân tích điểm số và tư vấn học vụ. Bạn cần hỗ trợ gì?',
      timestamp: new Date()
    })
  }
  setTimeout(() => this.scrollToBottom(), 100)

Thêm method sendAiMessage():
  if (!this.aiInputText.trim() || this.aiIsTyping) return

  const userMsg: ChatMessage = {
    role: 'user',
    content: this.aiInputText.trim(),
    timestamp: new Date()
  }
  this.aiMessages.push(userMsg)
  const input = this.aiInputText
  this.aiInputText = ''
  this.aiIsTyping = true
  this.scrollToBottom()

  // Thêm placeholder message AI đang gõ
  const aiMsg: ChatMessage = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true
  }
  this.aiMessages.push(aiMsg)

  // Giới hạn 10 tin nhắn gần nhất gửi lên
  const history = this.aiMessages
    .filter(m => !m.isStreaming)
    .slice(-10)

  this.chatbotService.sendMessage(history).subscribe({
    next: (chunk: string) => {
      aiMsg.content += chunk
      aiMsg.isStreaming = true
      this.scrollToBottom()
    },
    error: (err) => {
      aiMsg.content = '⚠️ Không thể kết nối AI. Vui lòng thử lại sau.'
      aiMsg.isStreaming = false
      this.aiIsTyping = false
    },
    complete: () => {
      aiMsg.isStreaming = false
      this.aiIsTyping = false
      this.scrollToBottom()
    }
  })

Thêm method onAiKeydown(event: KeyboardEvent):
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    this.sendAiMessage()
  }

Thêm method clearAiHistory():
  this.aiMessages = []
  this.selectAiRoom()  // reset lại tin nhắn chào

private scrollToBottom():
  setTimeout(() => {
    const el = document.querySelector('.chat-messages-area')
    if (el) el.scrollTop = el.scrollHeight
  }, 50)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO chat.component.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

--- THÊM VÀO ĐẦU danh sách room (cột trái) ---
Thêm item đặc biệt trước vòng lặp room thường:

<div class="room-item room-item--ai"
     [class.active]="isAiRoom"
     (click)="selectAiRoom()">
  <div class="room-avatar room-avatar--ai">
    <lucide-icon name="bot" [size]="18"></lucide-icon>
  </div>
  <div class="room-info">
    <div class="room-name">Trợ lý AI</div>
    <div class="room-last-msg">
      @if (aiOnline) {
        <span class="ai-status online">● Đang hoạt động</span>
      } @else {
        <span class="ai-status offline">● Ngoại tuyến</span>
      }
    </div>
  </div>
</div>

<hr class="room-divider" />
<!-- Danh sách room chat thường hiện tại -->

--- THÊM PHẦN AI CHAT WINDOW (cột phải) ---
Thêm block này bên cạnh (hoặc thay thế) chat window thường:

@if (isAiRoom) {
  <div class="chat-window ai-chat-window">

    <!-- Header -->
    <div class="chat-header">
      <div class="chat-header-info">
        <div class="chat-avatar chat-avatar--ai">
          <lucide-icon name="bot" [size]="20"></lucide-icon>
        </div>
        <div>
          <div class="chat-name">Trợ lý NTTU</div>
          <div class="chat-status">
            @if (aiOnline) {
              <span class="status-dot online"></span> Llama AI · Đang hoạt động
            } @else {
              <span class="status-dot offline"></span> Ngoại tuyến
            }
          </div>
        </div>
      </div>
      <button class="btn-clear-chat" (click)="clearAiHistory()"
              matTooltip="Xóa lịch sử chat">
        <lucide-icon name="trash-2" [size]="15"></lucide-icon>
      </button>
    </div>

    <!-- Messages area -->
    <div class="chat-messages-area">
      @for (msg of aiMessages; track $index) {
        <div class="message-row" [class.message-row--user]="msg.role === 'user'">

          @if (msg.role === 'assistant') {
            <div class="msg-avatar msg-avatar--ai">
              <lucide-icon name="bot" [size]="14"></lucide-icon>
            </div>
          }

          <div class="message-bubble"
               [class.bubble--user]="msg.role === 'user'"
               [class.bubble--ai]="msg.role === 'assistant'">
            <!-- Render markdown đơn giản: xuống dòng kép = đoạn văn -->
            <div class="msg-content" [innerHTML]="formatAiMessage(msg.content)"></div>

            @if (msg.isStreaming) {
              <span class="typing-cursor">▋</span>
            }
            <div class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</div>
          </div>

        </div>
      }

      <!-- Typing indicator khi AI đang xử lý nhưng chưa có chunk nào -->
      @if (aiIsTyping && aiMessages[aiMessages.length-1]?.content === '') {
        <div class="message-row">
          <div class="msg-avatar msg-avatar--ai">
            <lucide-icon name="bot" [size]="14"></lucide-icon>
          </div>
          <div class="bubble--ai typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      }
    </div>

    <!-- Input area -->
    <div class="chat-input-area">
      <!-- Quick prompts -->
      <div class="quick-prompts">
        <button class="quick-btn" (click)="setQuickPrompt('Lộ trình cải thiện GPA lên 3.2')">
          Lộ trình GPA 3.2
        </button>
        <button class="quick-btn" (click)="setQuickPrompt('Môn nào nên học lại trước?')">
          Môn nên học lại
        </button>
        <button class="quick-btn" (click)="setQuickPrompt('Gợi ý tài liệu học lập trình')">
          Tài liệu học tập
        </button>
      </div>

      <div class="input-row">
        <textarea
          class="chat-textarea"
          placeholder="Hỏi Trợ lý AI... (Enter để gửi, Shift+Enter xuống dòng)"
          [(ngModel)]="aiInputText"
          (keydown)="onAiKeydown($event)"
          [disabled]="aiIsTyping"
          rows="1"
          cdkTextareaAutosize
          cdkAutosizeMinRows="1"
          cdkAutosizeMaxRows="4"
        ></textarea>
        <button class="btn-send-ai"
                [disabled]="!aiInputText.trim() || aiIsTyping"
                (click)="sendAiMessage()">
          @if (aiIsTyping) {
            <lucide-icon name="loader-circle" [size]="16" class="spin"></lucide-icon>
          } @else {
            <lucide-icon name="send" [size]="16"></lucide-icon>
          }
        </button>
      </div>
      <div class="input-hint">Powered by Llama · Chạy local trên VPS NTTU</div>
    </div>

  </div>
}

Thêm method formatAiMessage(content: string): string trong component:
  Chuyển markdown đơn giản thành HTML an toàn:
  - **text** → <strong>text</strong>
  - ## Tiêu đề → <h4>Tiêu đề</h4>
  - - item → <li>item</li> (bọc trong <ul>)
  - \n\n → </p><p>
  Dùng DomSanitizer.bypassSecurityTrustHtml() nếu cần
  Hoặc đơn giản: content.replace(/\n/g, '<br>')

Thêm method setQuickPrompt(text: string):
  this.aiInputText = text
  // focus textarea
  document.querySelector('.chat-textarea')?.focus()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÊM VÀO chat.component.scss
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.room-item--ai {
  border: 1px solid rgba(37,99,235,.15);
  background: var(--blue-pale);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
}

.room-avatar--ai {
  background: linear-gradient(135deg, var(--navy), var(--blue));
  color: #fff;
  border-radius: 50%;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
}

.ai-status { font-size: .72rem; font-weight: 600; }
.ai-status.online  { color: #16a34a; }
.ai-status.offline { color: #94a3b8; }

.room-divider {
  border: none; border-top: 1px solid var(--gray-100);
  margin: 8px 0;
}

.ai-chat-window { display: flex; flex-direction: column; height: 100%; }

.chat-avatar--ai {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, var(--navy), var(--blue));
  color: #fff; display: flex; align-items: center; justify-content: center;
}

.msg-avatar--ai {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--navy), var(--blue));
  color: #fff; display: flex; align-items: center; justify-content: center;
  margin-top: 4px;
}

.bubble--ai {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 0 12px 12px 12px;
  padding: .75rem 1rem;
  max-width: 75%;
  font-size: .875rem;
  line-height: 1.65;
  color: var(--text);
}

.bubble--user {
  background: var(--navy);
  color: #fff;
  border-radius: 12px 0 12px 12px;
  padding: .75rem 1rem;
  max-width: 75%;
  font-size: .875rem;
  line-height: 1.65;
}

.message-row {
  display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start;
  &--user { flex-direction: row-reverse; }
}

.typing-cursor {
  display: inline-block;
  animation: blink .7s step-end infinite;
  color: var(--blue);
}

@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

.typing-indicator {
  display: flex; gap: 4px; padding: .75rem 1rem; width: 60px;
  span {
    width: 6px; height: 6px; background: var(--gray-400);
    border-radius: 50%;
    animation: bounce 1.2s ease-in-out infinite;
    &:nth-child(2) { animation-delay: .2s; }
    &:nth-child(3) { animation-delay: .4s; }
  }
}

@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

.quick-prompts {
  display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 0 4px;
}

.quick-btn {
  font-size: .75rem; font-weight: 500;
  padding: .3rem .75rem; border-radius: 999px;
  border: 1px solid var(--gray-200); background: var(--white);
  color: var(--text-sub); cursor: pointer; transition: all .15s;
  font-family: 'Be Vietnam Pro', sans-serif;
  &:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-pale); }
}

.btn-clear-chat {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  border: 1px solid var(--gray-200); background: var(--white);
  color: var(--gray-400); cursor: pointer; transition: all .15s;
  margin-left: auto;
  &:hover { border-color: var(--red); color: var(--red); background: var(--red-pale); }
}

.btn-send-ai {
  width: 40px; height: 40px; border-radius: var(--radius-sm);
  background: var(--navy); color: #fff; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s; flex-shrink: 0;
  &:hover:not(:disabled) { background: var(--navy-mid); }
  &:disabled { opacity: .45; cursor: not-allowed; }
}

.input-hint {
  font-size: .7rem; color: var(--text-muted); text-align: center;
  margin-top: 4px;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

.msg-time {
  font-size: .68rem; color: var(--text-muted); margin-top: 4px; text-align: right;
}

.status-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 3px;
  &.online  { background: #16a34a; }
  &.offline { background: #94a3b8; }
}
```

---

## ✅ CHECKLIST

```
Backend:
□ npm install (không cần package mới, dùng fetch built-in Node 18+)
□ OLLAMA_URL + OLLAMA_MODEL trong .env
□ src/services/llamaService.js tạo mới
□ src/routes/chatbot.js tạo mới (SSE streaming)
□ GET /api/chatbot/health hoạt động
□ POST /api/chatbot/message trả về SSE stream

Frontend:
□ chatbot.service.ts tạo mới
□ "Trợ lý AI" room hiện ở đầu danh sách, có badge online/offline
□ Quick prompts 3 nút gợi ý
□ Streaming hiển thị từng token (không phải đợi xong mới hiện)
□ Typing cursor ▋ nhấp nháy khi đang stream
□ Typing indicator (3 chấm) khi chờ chunk đầu tiên
□ Nút xóa lịch sử chat
□ Auto scroll xuống cuối khi có tin mới
□ Shift+Enter xuống dòng, Enter gửi

Test:
□ GET http://184.174.37.227:11434/api/tags → thấy model
□ GET /api/chatbot/health → { online: true }
□ Gửi tin nhắn → thấy text stream từng chữ
□ Quick prompt "Lộ trình GPA 3.2" → AI trả lời tiếng Việt
```
