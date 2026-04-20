import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthService } from './auth.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const HISTORY_KEY_PREFIX = 'nttu_ai_history_';
const MAX_HISTORY = 50; // số tin nhắn tối đa lưu trong localStorage

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly authService = inject(AuthService);

  readonly isOnline$ = new BehaviorSubject<boolean>(false);

  // ── History persistence ───────────────────────────────────────
  /** Lưu lịch sử chat vào localStorage (theo userId để tách biệt tài khoản). */
  saveHistory(messages: ChatMessage[]): void {
    const uid = this.authService.getCurrentUserId() ?? 'guest';
    const serializable = messages
      .filter((m) => !m.isStreaming)
      .slice(-MAX_HISTORY)
      .map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }));
    try {
      localStorage.setItem(HISTORY_KEY_PREFIX + uid, JSON.stringify(serializable));
    } catch {
      // localStorage full — bỏ qua
    }
  }

  /** Đọc lịch sử chat từ localStorage. Trả về [] nếu không có. */
  loadHistory(): ChatMessage[] {
    const uid = this.authService.getCurrentUserId() ?? 'guest';
    try {
      const raw = localStorage.getItem(HISTORY_KEY_PREFIX + uid);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{ role: string; content: string; timestamp: string }>;
      return parsed.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp),
      }));
    } catch {
      return [];
    }
  }

  /** Xóa lịch sử khỏi localStorage. */
  clearHistory(): void {
    const uid = this.authService.getCurrentUserId() ?? 'guest';
    localStorage.removeItem(HISTORY_KEY_PREFIX + uid);
  }

  // ── Health ────────────────────────────────────────────────────
  checkHealth(): void {
    fetch('http://localhost:3000/api/chatbot/health')
      .then((res) => res.json())
      .then((data: { online: boolean }) => this.isOnline$.next(Boolean(data?.online)))
      .catch(() => this.isOnline$.next(false));
  }

  // ── Message (SSE streaming) ───────────────────────────────────

  /** Dùng chung cho cả sendMessage và sendQuery. */
  private _sseStream(url: string, body: Record<string, unknown>): Observable<string> {
    return new Observable<string>((observer) => {
      const controller = new AbortController();
      const token = this.authService.getToken();

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok || !res.body) {
            observer.error(new Error(`HTTP ${res.status}`));
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          const read = (): void => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  observer.complete();
                  return;
                }

                const text = decoder.decode(value, { stream: true });
                for (const line of text.split('\n')) {
                  if (!line.startsWith('data: ')) continue;
                  try {
                    const data = JSON.parse(line.slice(6)) as {
                      type: string;
                      content?: string;
                      message?: string;
                    };
                    if (data.type === 'chunk' && data.content) {
                      observer.next(data.content);
                    } else if (data.type === 'done') {
                      observer.complete();
                      return;
                    } else if (data.type === 'error') {
                      observer.error(new Error(data.message ?? 'AI error'));
                      return;
                    }
                  } catch {
                    // Bỏ qua dòng không hợp lệ
                  }
                }
                read();
              })
              .catch((err: unknown) => {
                if (err instanceof Error && err.name !== 'AbortError') {
                  observer.error(err);
                }
              });
          };

          read();
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            observer.error(err);
          }
        });

      return () => controller.abort();
    });
  }

  /**
   * Gửi tin nhắn tới Llama qua SSE streaming.
   * Backend tự động RAG query MongoDB theo nội dung câu hỏi.
   */
  sendMessage(messages: ChatMessage[]): Observable<string> {
    return this._sseStream('http://localhost:3000/api/chatbot/message', {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  /**
   * Form-based query: truyền tham số tường minh, backend query DB trực tiếp.
   */
  sendQuery(params: {
    queryType: string;
    studentCode?: string;
    className?: string;
    question: string;
    history?: ChatMessage[];
  }): Observable<string> {
    return this._sseStream('http://localhost:3000/api/chatbot/query', {
      queryType: params.queryType,
      studentCode: params.studentCode ?? '',
      className: params.className ?? '',
      question: params.question,
      history: (params.history ?? []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
    });
  }
}
