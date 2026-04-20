import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, finalize, map, Observable, Subject } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatbotService, ChatMessage } from '../../core/services/chatbot.service';
import { SocketService } from '../../core/services/socket.service';
import {
  ApiResponse,
  Message,
  MessageRoomSummary,
  MessageRoomType,
} from '../../shared/models/interfaces';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    LucideAngularModule,
  ],
  template: `
    <section class="chat-page">
      <aside class="rooms-panel">
        <header class="rooms-head">
          <h1>Đoạn chat</h1>
          @if (totalUnread > 0) {
            <span class="unread-pill">{{ totalUnread }}</span>
          }
        </header>

        <label class="search-wrap">
          <lucide-icon name="search" [size]="14"></lucide-icon>
          <input
            [(ngModel)]="searchText"
            (ngModelChange)="applyRoomFilter()"
            placeholder="Tìm kiếm đoạn chat"
          />
        </label>

        <div class="rooms-tabs">
          <button
            type="button"
            class="tab"
            [class.tab--active]="activeTab === 'all'"
            (click)="setTab('all')"
          >
            Tất cả
          </button>
          <button
            type="button"
            class="tab"
            [class.tab--active]="activeTab === 'unread'"
            (click)="setTab('unread')"
          >
            Chưa đọc
            @if (totalUnread > 0) {
              <span class="tab-badge">{{ totalUnread }}</span>
            }
          </button>
          <button
            type="button"
            class="tab"
            [class.tab--active]="activeTab === 'group'"
            (click)="setTab('group')"
          >
            Nhóm
          </button>
        </div>

        @if (loadingRooms) {
          <div class="state-box">
            <mat-spinner [diameter]="28"></mat-spinner>
            <p>Đang tải room...</p>
          </div>
        } @else {
          <div class="room-list">
            <!-- ── Trợ lý AI (room đặc biệt, luôn đầu danh sách) ── -->
            <button
              type="button"
              class="room-item room-item--ai"
              [class.active]="isAiRoom"
              (click)="selectAiRoom()"
            >
              <span class="room-avatar room-avatar--ai">
                <lucide-icon name="bot" [size]="16"></lucide-icon>
              </span>
              <div class="room-main">
                <p class="room-name">Trợ lý AI</p>
                <p class="preview">
                  @if (aiOnline) {
                    <span class="ai-status ai-status--online">● Đang hoạt động</span>
                  } @else {
                    <span class="ai-status ai-status--offline">● Ngoại tuyến</span>
                  }
                </p>
              </div>
              <div class="room-right"></div>
            </button>

            <hr class="room-divider" />

            @for (room of filteredRooms; track room.roomId) {
              <button
                type="button"
                class="room-item"
                [class.active]="room.roomId === selectedRoomId"
                (click)="selectRoom(room)"
              >
                <span class="room-avatar">{{ roomAvatarText(room) }}</span>

                <div class="room-main">
                  <p class="room-name">{{ roomLabel(room) }}</p>
                  <p class="preview">{{ roomPreview(room) }}</p>
                </div>

                <div class="room-right">
                  <p class="room-time">{{ formatRoomTime(room.lastMessage?.createdAt) }}</p>
                  @if (room.unreadCount > 0) {
                    <span class="badge">{{ room.unreadCount }}</span>
                  }
                </div>
              </button>
            }
          </div>
        }
      </aside>

      <section class="chat-panel">
        @if (isAiRoom) {
          <!-- ══════════════════════════════════════════
               AI CHATBOT WINDOW
          ══════════════════════════════════════════ -->
          <header class="chat-head">
            <div class="chat-head-left">
              <span class="room-avatar room-avatar--head room-avatar--ai">
                <lucide-icon name="bot" [size]="18"></lucide-icon>
              </span>
              <div>
                <h2>Trợ lý NTTU</h2>
                <p>
                  @if (aiOnline) {
                    <span class="status-dot status-dot--online"></span>
                    Llama AI · Đang hoạt động
                  } @else {
                    <span class="status-dot status-dot--offline"></span>
                    Ngoại tuyến
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              class="btn-icon btn-query-db"
              matTooltip="Tra cứu dữ liệu"
              [class.btn-query-db--active]="showAiQuery"
              (click)="showAiQuery = !showAiQuery"
            >
              <lucide-icon name="database" [size]="15"></lucide-icon>
            </button>
            <button
              type="button"
              class="btn-icon btn-clear-chat"
              matTooltip="Xóa lịch sử chat"
              (click)="clearAiHistory()"
            >
              <lucide-icon name="trash-2" [size]="15"></lucide-icon>
            </button>
          </header>

          <div class="messages ai-messages" #aiScrollAnchor>
            @for (msg of aiMessages; track $index) {
              <div class="message-row" [class.message-row--mine]="msg.role === 'user'">
                @if (msg.role === 'assistant') {
                  <span class="msg-avatar msg-avatar--ai">
                    <lucide-icon name="bot" [size]="13"></lucide-icon>
                  </span>
                }
                <article
                  class="bubble"
                  [class.mine]="msg.role === 'user'"
                  [class.bubble--ai]="msg.role === 'assistant'"
                >
                  <p class="content" [innerHTML]="formatAiMessage(msg.content)"></p>
                  @if (msg.isStreaming) {
                    <span class="typing-cursor">▋</span>
                  }
                  <p class="time">{{ msg.timestamp | date: 'HH:mm' }}</p>
                </article>
              </div>
            }

            @if (
              aiIsTyping &&
              aiMessages.length > 0 &&
              aiMessages[aiMessages.length - 1].content === ''
            ) {
              <div class="message-row">
                <span class="msg-avatar msg-avatar--ai">
                  <lucide-icon name="bot" [size]="13"></lucide-icon>
                </span>
                <div class="bubble bubble--ai typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            }
          </div>

          <footer class="composer">
            @if (showAiQuery) {
              <!-- ── Tra cứu DB form ── -->
              <div class="ai-query-panel">
                <div class="ai-query-head">
                  <span>
                    <lucide-icon
                      name="database"
                      [size]="13"
                      style="vertical-align:-2px;margin-right:4px"
                    ></lucide-icon>
                    Tra cứu dữ liệu
                  </span>
                  <button type="button" class="btn-icon" (click)="showAiQuery = false">
                    <lucide-icon name="x" [size]="14"></lucide-icon>
                  </button>
                </div>
                <div class="query-type-chips">
                  @for (t of queryTypes; track t.value) {
                    <button
                      type="button"
                      class="query-type-chip"
                      [class.active]="aiQueryType === t.value"
                      (click)="aiQueryType = t.value"
                    >
                      {{ t.label }}
                    </button>
                  }
                </div>
                <div class="query-inputs-row">
                  <input
                    [(ngModel)]="aiQueryStudentCode"
                    placeholder="Mã SV (tuỳ chọn)"
                    class="form-input query-input-sm"
                    maxlength="20"
                  />
                  <input
                    [(ngModel)]="aiQueryClassName"
                    placeholder="Lớp (tuỳ chọn)"
                    class="form-input query-input-sm"
                    maxlength="40"
                  />
                </div>
                <textarea
                  [(ngModel)]="aiQueryQuestion"
                  placeholder="Câu hỏi cho AI (bắt buộc)..."
                  rows="2"
                  class="form-textarea"
                  (keydown.enter)="$event.preventDefault(); sendAiQuery()"
                ></textarea>
                <div style="display:flex;justify-content:flex-end">
                  <button
                    mat-flat-button
                    class="btn-send"
                    type="button"
                    [disabled]="!aiQueryType || !aiQueryQuestion.trim() || aiIsTyping"
                    (click)="sendAiQuery()"
                  >
                    <lucide-icon name="search" [size]="14"></lucide-icon>
                    Tra cứu + Hỏi AI
                  </button>
                </div>
              </div>
            }
            <div class="quick-prompts">
              <button
                type="button"
                class="quick-btn"
                (click)="setQuickPrompt('Lộ trình cải thiện GPA lên 3.2')"
              >
                Lộ trình GPA 3.2
              </button>
              <button
                type="button"
                class="quick-btn"
                (click)="setQuickPrompt('Môn nào nên học lại trước?')"
              >
                Môn nên học lại
              </button>
              <button
                type="button"
                class="quick-btn"
                (click)="setQuickPrompt('Gợi ý tài liệu học lập trình')"
              >
                Tài liệu học tập
              </button>
            </div>
            <div class="composer-row">
              <textarea
                [(ngModel)]="aiInputText"
                (keydown)="onAiKeydown($event)"
                placeholder="Hỏi Trợ lý AI... (Enter gửi, Shift+Enter xuống dòng)"
                [disabled]="aiIsTyping"
                rows="1"
              ></textarea>
              <button
                mat-flat-button
                class="btn-send"
                type="button"
                [disabled]="!aiInputText.trim() || aiIsTyping"
                (click)="sendAiMessage()"
              >
                @if (aiIsTyping) {
                  <lucide-icon name="loader-circle" [size]="14" class="spin"></lucide-icon>
                } @else {
                  <lucide-icon name="send" [size]="14"></lucide-icon>
                }
              </button>
            </div>
            <p class="input-hint">Powered by Llama · Chạy local trên VPS NTTU</p>
          </footer>
        } @else if (!selectedRoomId) {
          <div class="empty-chat">
            <lucide-icon name="message-circle" [size]="20"></lucide-icon>
            <p>Chọn một room để bắt đầu trò chuyện.</p>
          </div>
        } @else {
          <header class="chat-head">
            <div class="chat-head-left">
              <span class="room-avatar room-avatar--head">{{
                roomAvatarTextByLabel(selectedRoomLabel)
              }}</span>
              <div>
                <h2>{{ selectedRoomLabel }}</h2>
                <p>{{ messages.length }} tin nhắn</p>
              </div>
            </div>
          </header>

          <div class="messages">
            @for (message of messages; track message._id) {
              <div class="message-row" [class.message-row--mine]="isMine(message)">
                <article
                  class="bubble"
                  [class.mine]="isMine(message)"
                  [class.bubble--form]="message.messageType === 'form'"
                >
                  @if (!isMine(message)) {
                    <p class="sender">{{ message.senderName }}</p>
                  }
                  @if (message.messageType === 'image') {
                    <img [src]="resolveImageUrl(message.imageUrl)" alt="ảnh" class="bubble-image" />
                    @if (message.content) {
                      <p class="content">{{ message.content }}</p>
                    }
                  } @else if (message.messageType === 'form') {
                    @if (message.formTitle) {
                      <p class="form-msg-title">{{ message.formTitle }}</p>
                    }
                    @if (message.content) {
                      <p class="content">{{ message.content }}</p>
                    }
                    @if (message.imageUrl) {
                      <img
                        [src]="resolveImageUrl(message.imageUrl)"
                        alt="ảnh đính kèm"
                        class="bubble-image"
                      />
                    }
                  } @else {
                    <p class="content">{{ message.content }}</p>
                  }
                  <p class="time">{{ formatTime(message.createdAt) }}</p>
                </article>
              </div>
            }

            @if (typingUserName) {
              <p class="typing">
                {{ typingUserName }} đang nhập
                <span class="typing-dots"><span></span><span></span><span></span></span>
              </p>
            }
          </div>

          <footer class="composer">
            @if (showFormPanel) {
              <div class="form-panel">
                <div class="form-panel-head">
                  <span>Tin nhắn có tiêu đề</span>
                  <button type="button" class="btn-icon" (click)="toggleFormPanel()">
                    <lucide-icon name="x" [size]="14"></lucide-icon>
                  </button>
                </div>
                <input
                  [(ngModel)]="formTitle"
                  placeholder="Tiêu đề (bắt buộc)..."
                  maxlength="200"
                  class="form-input"
                />
                <textarea
                  [(ngModel)]="draft"
                  (input)="onTyping()"
                  placeholder="Nội dung..."
                  maxlength="2000"
                  class="form-textarea"
                ></textarea>
                <div class="form-panel-foot">
                  <label class="image-upload-label">
                    <lucide-icon name="image-plus" [size]="13"></lucide-icon>
                    {{ formImageFile ? formImageFile.name : 'Đính kèm ảnh' }}
                    <input
                      #formImageInput
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style="display:none"
                      (change)="onFormImageSelected($event)"
                    />
                  </label>
                  @if (formImagePreview) {
                    <div class="image-preview-wrap">
                      <img [src]="formImagePreview" alt="preview" class="image-preview" />
                      <button
                        type="button"
                        class="btn-icon btn-remove-img"
                        (click)="clearFormImage()"
                      >
                        <lucide-icon name="x" [size]="11"></lucide-icon>
                      </button>
                    </div>
                  }
                  <span class="char-count" [class.warn]="draft.length > 1800">{{
                    2000 - draft.length
                  }}</span>
                  <button
                    mat-flat-button
                    class="btn-send"
                    type="button"
                    (click)="sendForm()"
                    [disabled]="!formTitle.trim()"
                  >
                    <lucide-icon name="send" [size]="14"></lucide-icon>
                    Gửi
                  </button>
                </div>
              </div>
            } @else {
              <div class="composer-row">
                <div class="composer-tools">
                  <button
                    type="button"
                    class="btn-icon"
                    title="Gửi ảnh"
                    (click)="imageInput.click()"
                  >
                    <lucide-icon name="image-plus" [size]="16"></lucide-icon>
                  </button>
                  <input
                    #imageInput
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style="display:none"
                    (change)="onImageSelected($event)"
                  />
                  <button
                    type="button"
                    class="btn-icon"
                    title="Tin nhắn có tiêu đề"
                    (click)="toggleFormPanel()"
                  >
                    <lucide-icon name="file-text" [size]="16"></lucide-icon>
                  </button>
                </div>

                @if (pendingImage) {
                  <div class="pending-image-row">
                    <div class="image-preview-wrap">
                      <img [src]="pendingImagePreview" alt="preview" class="image-preview" />
                      <button
                        type="button"
                        class="btn-icon btn-remove-img"
                        (click)="clearPendingImage()"
                      >
                        <lucide-icon name="x" [size]="11"></lucide-icon>
                      </button>
                    </div>
                  </div>
                } @else {
                  <textarea
                    [(ngModel)]="draft"
                    (keydown)="handleKeydown($event)"
                    (input)="onTyping(); autoResize($event)"
                    placeholder="Nhập tin nhắn..."
                    maxlength="2000"
                    rows="1"
                    class="chat-textarea"
                  ></textarea>
                }

                <button mat-flat-button class="btn-send" type="button" (click)="send()">
                  <lucide-icon name="send" [size]="14"></lucide-icon>
                </button>
              </div>
              @if (!pendingImage && draft.length > 1800) {
                <p class="char-count warn" style="text-align:right;margin:0.2rem 0 0">
                  {{ 2000 - draft.length }}
                </p>
              }
            }
          </footer>
        }
      </section>
    </section>
  `,
  styles: [
    `
      .chat-page {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 1rem;
        height: calc(100vh - 92px);
        min-height: calc(100vh - 92px);
        max-height: calc(100vh - 92px);
        overflow: hidden;
        /* Tránh đè lên nút theme-switcher cố định ở góc dưới phải */
        padding-right: 3.5rem;
      }

      .rooms-panel,
      .chat-panel {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius);
        background: #fff;
      }

      .rooms-panel {
        display: grid;
        grid-template-rows: auto auto auto 1fr;
        min-height: 0;
        overflow: hidden;
      }

      .rooms-head {
        padding: 0.85rem 0.9rem 0.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .rooms-head h1 {
        margin: 0;
        color: var(--navy);
        font-size: 1rem;
      }

      .unread-pill {
        border-radius: 999px;
        padding: 0.15rem 0.45rem;
        background: #dc2626;
        color: #fff;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .search-wrap {
        margin: 0 0.9rem 0.6rem;
        border: 1px solid var(--gray-200);
        border-radius: 999px;
        padding: 0.35rem 0.65rem;
        display: inline-flex;
        gap: 0.4rem;
        align-items: center;
        color: var(--text-sub);
      }

      .search-wrap input {
        border: none;
        outline: none;
        width: 100%;
      }

      .rooms-tabs {
        margin: 0 0.9rem 0.6rem;
        display: flex;
        gap: 0.35rem;
      }

      .tab {
        border: 1px solid var(--gray-200);
        border-radius: 999px;
        background: #fff;
        color: var(--text-sub);
        font-size: 0.73rem;
        font-weight: 600;
        padding: 0.18rem 0.5rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        transition:
          border-color 0.12s,
          color 0.12s;
      }

      .tab:hover {
        border-color: var(--navy);
        color: var(--navy);
      }

      .tab--active {
        border-color: var(--navy);
        background: var(--navy);
        color: #fff;
      }

      .tab--active:hover {
        color: #fff;
      }

      .tab-badge {
        background: #dc2626;
        color: #fff;
        border-radius: 999px;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0 0.3rem;
        line-height: 1.4;
      }

      .room-list {
        overflow: auto;
        padding: 0 0.45rem 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        align-items: stretch;
      }

      .room-item {
        border: 1px solid transparent;
        border-radius: var(--radius-sm);
        padding: 0.4rem 0.5rem;
        background: #fff;
        display: grid;
        grid-template-columns: 34px 1fr auto;
        align-items: center;
        gap: 0.45rem;
        cursor: pointer;
        text-align: left;
        width: 100%;
        min-height: 58px;
      }

      .room-item.active {
        border-color: var(--blue);
        background: var(--blue-pale);
      }

      .room-main {
        min-width: 0;
      }

      .room-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        background: #e5e7eb;
        color: #334155;
      }

      .room-avatar--head {
        width: 40px;
        height: 40px;
      }

      .room-name {
        margin: 0;
        color: var(--text);
        font-weight: 700;
        font-size: 0.8rem;
        line-height: 1.2;
      }

      .preview {
        margin: 0.08rem 0 0;
        color: var(--text-sub);
        font-size: 0.74rem;
        line-height: 1.22;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .room-right {
        display: grid;
        justify-items: end;
        gap: 0.2rem;
      }

      .room-time {
        margin: 0;
        font-size: 0.72rem;
        color: var(--text-sub);
      }

      .badge {
        min-width: 1.1rem;
        height: 1.1rem;
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.68rem;
        font-weight: 700;
      }

      .chat-panel {
        display: grid;
        grid-template-rows: auto 1fr auto;
        min-height: 0;
        overflow: hidden;
      }

      .chat-head {
        padding: 0.75rem 0.9rem;
        border-bottom: 1px solid var(--gray-200);
      }

      .chat-head-left {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
      }

      .chat-head h2 {
        margin: 0;
        color: var(--navy);
        font-size: 0.95rem;
      }

      .chat-head p {
        margin: 0.1rem 0 0;
        color: var(--text-sub);
        font-size: 0.75rem;
      }

      .messages {
        overflow: auto;
        min-height: 0;
        padding: 1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .message-row {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
        justify-content: flex-start;
      }

      .message-row--mine {
        justify-content: flex-end;
      }

      .bubble {
        max-width: min(72%, 540px);
        background: #f1f5f9;
        border-radius: 16px 16px 16px 4px;
        padding: 0.55rem 0.8rem;
        font-size: 0.875rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      }

      .bubble.mine {
        background: var(--navy, #1e3a5f);
        color: #fff;
        border-radius: 16px 16px 4px 16px;
      }

      .bubble.mine .time {
        color: rgba(255, 255, 255, 0.6);
      }

      .sender {
        margin: 0 0 0.12rem;
        color: var(--navy);
        font-size: 0.72rem;
        font-weight: 700;
      }

      .content {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.5;
      }

      .time {
        margin: 0.25rem 0 0;
        color: var(--text-sub);
        font-size: 0.68rem;
        text-align: right;
      }

      .typing {
        margin: 0;
        color: var(--text-sub);
        font-style: italic;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }

      .typing-dots {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }

      .typing-dots span {
        width: 4px;
        height: 4px;
        border-radius: 999px;
        background: currentColor;
        animation: dotPulse 1s infinite ease-in-out;
      }

      .typing-dots span:nth-child(2) {
        animation-delay: 0.15s;
      }

      .typing-dots span:nth-child(3) {
        animation-delay: 0.3s;
      }

      .composer {
        border-top: 1px solid var(--gray-200);
        padding: 0.6rem 0.85rem 0.5rem;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .composer-row {
        display: flex;
        align-items: flex-end;
        gap: 0.4rem;
      }

      .composer-row textarea {
        flex: 1;
        min-width: 0;
        min-height: 38px;
        max-height: 140px;
        resize: none;
        overflow-y: auto;
        border: 1px solid var(--gray-200);
        border-radius: 20px;
        padding: 0.5rem 0.85rem;
        font: inherit;
        font-size: 0.875rem;
        line-height: 1.45;
        outline: none;
        transition: border-color 0.15s;
        background: #f8fafc;
      }

      .composer-row textarea:focus {
        border-color: var(--blue, #3b82f6);
        background: #fff;
      }

      .composer-row textarea:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .composer-tools {
        display: flex;
        gap: 0.15rem;
        flex-shrink: 0;
        padding-bottom: 0.15rem;
      }

      .btn-icon {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0.28rem;
        border-radius: var(--radius-sm);
        display: inline-flex;
        align-items: center;
        color: var(--text-sub);
        flex-shrink: 0;
      }

      .btn-icon:hover {
        background: var(--gray-100);
        color: var(--navy);
      }

      .image-preview-wrap {
        position: relative;
        display: inline-block;
      }

      .image-preview {
        max-height: 120px;
        max-width: 100%;
        border-radius: var(--radius-sm);
        border: 1px solid var(--gray-200);
        display: block;
      }

      .btn-remove-img {
        position: absolute;
        top: 2px;
        right: 2px;
        background: rgba(0, 0, 0, 0.55) !important;
        color: #fff !important;
        border-radius: 999px;
        padding: 0.15rem;
        line-height: 1;
      }

      .form-panel {
        display: grid;
        gap: 0.35rem;
        border: 1px solid var(--blue, #3b82f6);
        border-radius: var(--radius-sm);
        padding: 0.5rem 0.6rem;
        background: var(--blue-pale, #eff6ff);
      }

      .form-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--navy);
      }

      .form-panel-foot {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .form-input {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.35rem 0.5rem;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        outline: none;
      }

      .form-input:focus {
        border-color: var(--blue, #3b82f6);
      }

      .form-textarea {
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.35rem 0.5rem;
        font: inherit;
        font-size: 0.875rem;
        min-height: 52px;
        max-height: 120px;
        resize: vertical;
        outline: none;
      }

      .form-textarea:focus {
        border-color: var(--blue, #3b82f6);
      }

      .image-upload-label {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        color: var(--text-sub);
        cursor: pointer;
        border: 1px dashed var(--gray-300, #cbd5e1);
        border-radius: var(--radius-sm);
        padding: 0.22rem 0.5rem;
        white-space: nowrap;
      }

      .image-upload-label:hover {
        border-color: var(--blue, #3b82f6);
        color: var(--blue, #3b82f6);
      }

      .bubble-image {
        max-width: 260px;
        max-height: 200px;
        border-radius: var(--radius-sm);
        display: block;
        margin-bottom: 0.25rem;
        cursor: pointer;
      }

      .bubble--form {
        border-left: 3px solid var(--blue);
      }

      .form-msg-title {
        margin: 0 0 0.2rem;
        font-weight: 700;
        color: var(--navy);
        font-size: 0.85rem;
      }

      textarea {
        font: inherit;
        outline: none;
        resize: none;
      }

      textarea:focus {
        border-color: var(--blue, #3b82f6);
      }

      .chat-textarea {
        flex: 1;
        min-width: 0;
        min-height: 38px;
        max-height: 140px;
        overflow-y: auto;
        border: 1px solid var(--gray-200);
        border-radius: 20px;
        padding: 0.5rem 0.85rem;
        font-size: 0.875rem;
        line-height: 1.45;
        transition: border-color 0.15s;
        background: #f8fafc;
      }

      .chat-textarea:focus {
        border-color: var(--blue, #3b82f6);
        background: #fff;
      }

      .pending-image-row {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 36px;
      }

      .char-count {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.72rem;
      }

      .char-count.warn {
        color: #b45309;
      }

      .btn-send {
        background: var(--navy) !important;
        color: #fff !important;
        padding: 0.42rem 0.75rem !important;
        min-width: 0 !important;
        border-radius: 20px !important;
        flex-shrink: 0;
        align-self: flex-end;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.83rem !important;
        font-weight: 600 !important;
        transition: opacity 0.15s !important;
      }

      .btn-send:disabled {
        opacity: 0.45 !important;
      }

      .btn-send:not(:disabled):hover {
        opacity: 0.88 !important;
      }

      .empty-chat,
      .state-box {
        min-height: 220px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.65rem;
        color: var(--text-sub);
      }

      @keyframes dotPulse {
        0%,
        100% {
          opacity: 0.35;
          transform: translateY(0);
        }
        50% {
          opacity: 1;
          transform: translateY(-1px);
        }
      }

      @media (max-width: 980px) {
        .chat-page {
          grid-template-columns: 1fr;
          height: auto;
          min-height: auto;
          max-height: none;
          padding-right: 3.5rem;
        }

        .rooms-panel {
          max-height: 320px;
        }
      }

      /* ── AI Room item ── */
      .room-item--ai {
        border: 1px solid rgba(37, 99, 235, 0.18);
        background: var(--blue-pale, #eff6ff);
      }

      .room-item--ai:hover {
        border-color: var(--blue, #3b82f6);
      }

      .room-item--ai.active {
        border-color: var(--blue, #3b82f6);
        background: #dbeafe;
      }

      .room-avatar--ai {
        background: linear-gradient(135deg, var(--navy, #1e3a5f), var(--blue, #3b82f6));
        color: #fff;
      }

      .ai-status {
        font-size: 0.72rem;
        font-weight: 600;
      }
      .ai-status--online {
        color: #16a34a;
      }
      .ai-status--offline {
        color: #94a3b8;
      }

      .room-divider {
        border: none;
        border-top: 1px solid var(--gray-200, #e5e7eb);
        margin: 4px 0;
      }

      /* ── AI Chat window ── */
      .chat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 0.9rem;
        border-bottom: 1px solid var(--gray-200, #e5e7eb);
      }

      .btn-clear-chat {
        margin-left: auto;
        color: var(--text-sub);
      }

      .btn-clear-chat:hover {
        color: #dc2626;
        background: #fee2e2;
      }

      .status-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        margin-right: 3px;
        vertical-align: middle;
      }

      .status-dot--online {
        background: #16a34a;
      }
      .status-dot--offline {
        background: #94a3b8;
      }

      /* AI message bubble */
      .msg-avatar--ai {
        width: 28px;
        height: 28px;
        min-width: 28px;
        border-radius: 50%;
        flex-shrink: 0;
        background: linear-gradient(135deg, var(--navy, #1e3a5f), var(--blue, #3b82f6));
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .bubble--ai {
        background: #fff;
        border: 1px solid var(--gray-200, #e5e7eb);
        border-radius: 4px 16px 16px 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        max-width: min(80%, 600px);
      }

      .bubble--ai .content {
        color: var(--text, #1e293b);
        line-height: 1.6;
      }

      .typing-cursor {
        display: inline-block;
        animation: blink 0.7s step-end infinite;
        color: var(--blue, #3b82f6);
        font-size: 0.9rem;
        margin-left: 2px;
      }

      @keyframes blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
      }

      .typing-indicator {
        display: inline-flex;
        gap: 4px;
        padding: 0.6rem 0.75rem;
        align-items: center;
      }

      .typing-indicator span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gray-400, #94a3b8);
        animation: bounce 1.2s ease-in-out infinite;
      }

      .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
      }
      .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes bounce {
        0%,
        60%,
        100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-5px);
        }
      }

      .quick-prompts {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding: 4px 0 6px;
        border-bottom: 1px solid var(--gray-100, #f1f5f9);
        margin-bottom: 6px;
      }

      .quick-btn {
        font-size: 0.72rem;
        font-weight: 500;
        padding: 0.22rem 0.6rem;
        border-radius: 999px;
        border: 1px solid var(--gray-200, #e5e7eb);
        background: #fff;
        color: var(--text-sub);
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
        white-space: nowrap;
      }

      .quick-btn:hover {
        border-color: var(--blue, #3b82f6);
        color: var(--blue, #3b82f6);
        background: var(--blue-pale, #eff6ff);
      }

      .input-hint {
        font-size: 0.67rem;
        color: var(--text-muted, #94a3b8);
        text-align: center;
        margin: 4px 0 0;
      }

      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ── AI Query panel ── */
      .ai-query-panel {
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        padding: 0.65rem 0.75rem;
        background: #f0f7ff;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-bottom: 0.5rem;
      }

      .ai-query-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--navy);
      }

      .query-type-chips {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }

      .query-type-chip {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.22rem 0.6rem;
        border-radius: 999px;
        border: 1px solid #bfdbfe;
        background: #fff;
        color: #3b82f6;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
      }

      .query-type-chip:hover,
      .query-type-chip.active {
        background: var(--navy, #1e3a5f);
        border-color: var(--navy, #1e3a5f);
        color: #fff;
      }

      .query-inputs-row {
        display: flex;
        gap: 0.4rem;
      }

      .query-input-sm {
        flex: 1;
        min-width: 0;
        font-size: 0.82rem !important;
      }

      .btn-query-db {
        color: var(--text-sub);
      }

      .btn-query-db:hover,
      .btn-query-db--active {
        background: var(--blue-pale, #eff6ff) !important;
        color: var(--blue, #3b82f6) !important;
      }

      .ai-messages {
        scroll-behavior: smooth;
        background: #fafbfd;
      }
    `,
  ],
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
  private readonly chatbotService = inject(ChatbotService);
  private readonly destroyRef = inject(DestroyRef);

  rooms: MessageRoomSummary[] = [];
  filteredRooms: MessageRoomSummary[] = [];
  messages: Message[] = [];

  loadingRooms = true;
  selectedRoomId = '';
  selectedRoomType: MessageRoomType = 'department';
  selectedRoomLabel = '';

  searchText = '';
  draft = '';
  totalUnread = 0;
  typingUserName = '';
  activeTab: 'all' | 'unread' | 'group' = 'all';
  private currentUserId = '';

  // ── Form message ──
  showFormPanel = false;
  formTitle = '';

  // ── Pending image (quick image send) ──
  pendingImage: File | null = null;
  pendingImagePreview = '';

  // ── Form image ──
  formImageFile: File | null = null;
  formImagePreview = '';

  private readonly typingTrigger$ = new Subject<void>();
  private typingTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  // ── AI Chatbot state ──
  isAiRoom = false;
  aiMessages: ChatMessage[] = [];
  aiInputText = '';
  aiIsTyping = false;
  aiOnline = false;

  // ── AI Query form state ──
  showAiQuery = false;
  aiQueryType = '';
  aiQueryStudentCode = '';
  aiQueryClassName = '';
  aiQueryQuestion = '';

  readonly queryTypes = [
    { value: 'student_info', label: 'Thông tin SV' },
    { value: 'grade_query', label: 'Điểm học tập' },
    { value: 'risk_alert', label: 'Cảnh báo rủi ro' },
    { value: 'roadmap', label: 'Lộ trình học' },
  ];

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId() || '';
    this.loadRooms();

    // Kiểm tra Ollama health và theo dõi trạng thái online
    this.chatbotService.checkHealth();
    this.chatbotService.isOnline$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((online) => (this.aiOnline = online));

    this.socketService.connect();

    this.socketService
      .onNewMessage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.handleIncomingMessage(message);
      });

    this.socketService
      .onUserTyping()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (payload.roomId !== this.selectedRoomId) {
          return;
        }

        this.typingUserName = payload.userName;
        if (this.typingTimeoutRef) {
          clearTimeout(this.typingTimeoutRef);
        }
        this.typingTimeoutRef = setTimeout(() => {
          this.typingUserName = '';
        }, 1500);
      });

    this.typingTrigger$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.selectedRoomId) {
          this.socketService.typing(this.selectedRoomId);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.selectedRoomId) {
      this.socketService.leaveRoom(this.selectedRoomId);
    }
    this.socketService.disconnect();
  }

  // ════════════════════════════════════════════
  // AI Chatbot methods
  // ════════════════════════════════════════════

  selectAiRoom(): void {
    // Rời room chat thường nếu đang ở đó
    if (this.selectedRoomId) {
      this.socketService.leaveRoom(this.selectedRoomId);
      this.selectedRoomId = '';
    }
    this.isAiRoom = true;

    // Tải lịch sử từ localStorage
    if (this.aiMessages.length === 0) {
      const saved = this.chatbotService.loadHistory();
      if (saved.length > 0) {
        this.aiMessages = saved;
      } else {
        this.aiMessages = [
          {
            role: 'assistant',
            content:
              'Xin chào! Tôi là Trợ lý NTTU. Tôi có thể giúp bạn về lộ trình học tập, phân tích điểm số và tư vấn học vụ. Bạn cần hỗ trợ gì?',
            timestamp: new Date(),
          },
        ];
      }
    }

    setTimeout(() => this.scrollAiToBottom(), 80);
  }

  sendAiMessage(): void {
    const content = this.aiInputText.trim();
    if (!content || this.aiIsTyping) return;

    this.aiMessages.push({ role: 'user', content, timestamp: new Date() });
    this.aiInputText = '';
    this.aiIsTyping = true;
    setTimeout(() => this.scrollAiToBottom(), 50);

    // Placeholder cho phản hồi của AI (streaming vào đây)
    const aiMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    this.aiMessages.push(aiMsg);

    // Chỉ gửi 10 tin nhắn gần nhất, bỏ placeholder cuối (isStreaming)
    const history = this.aiMessages.filter((m) => !m.isStreaming).slice(-10);

    this.chatbotService.sendMessage(history).subscribe({
      next: (chunk) => {
        aiMsg.content += chunk;
        this.scrollAiToBottom();
      },
      error: (err: Error) => {
        console.error('[AI] sendMessage error:', err);
        aiMsg.content = `⚠️ Không thể kết nối AI. ${err?.message ? `(${err.message})` : 'Vui lòng thử lại sau.'}`;
        aiMsg.isStreaming = false;
        this.aiIsTyping = false;
        // Lưu lại lịch sử dù lỗi
        this.chatbotService.saveHistory(this.aiMessages);
      },
      complete: () => {
        aiMsg.isStreaming = false;
        this.aiIsTyping = false;
        this.scrollAiToBottom();
        // Lưu lịch sử sau mỗi lượt trả lời xong
        this.chatbotService.saveHistory(this.aiMessages);
      },
    });
  }

  onAiKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }

  clearAiHistory(): void {
    this.aiMessages = [];
    this.chatbotService.clearHistory();
    this.selectAiRoom(); // Reset + hiển thị lời chào lại
  }

  setQuickPrompt(text: string): void {
    this.aiInputText = text;
    const el = document.querySelector<HTMLTextAreaElement>('.ai-messages ~ footer textarea');
    el?.focus();
  }

  sendAiQuery(): void {
    if (!this.aiQueryType || !this.aiQueryQuestion.trim() || this.aiIsTyping) return;

    const typeLabels: Record<string, string> = {
      student_info: 'Tra cứu thông tin sinh viên',
      grade_query: 'Xem điểm học tập',
      risk_alert: 'Cảnh báo rủi ro',
      roadmap: 'Lộ trình học tập',
    };
    const label = typeLabels[this.aiQueryType] ?? this.aiQueryType;
    const identifier = this.aiQueryStudentCode.trim() || this.aiQueryClassName.trim();
    const displayContent = identifier
      ? `[${label}] ${identifier}: ${this.aiQueryQuestion.trim()}`
      : `[${label}] ${this.aiQueryQuestion.trim()}`;

    this.aiMessages.push({ role: 'user', content: displayContent, timestamp: new Date() });
    this.showAiQuery = false;
    this.aiIsTyping = true;
    setTimeout(() => this.scrollAiToBottom(), 50);

    const aiMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    this.aiMessages.push(aiMsg);

    const history = this.aiMessages.filter((m) => !m.isStreaming).slice(-6);

    this.chatbotService
      .sendQuery({
        queryType: this.aiQueryType,
        studentCode: this.aiQueryStudentCode.trim(),
        className: this.aiQueryClassName.trim(),
        question: this.aiQueryQuestion.trim(),
        history,
      })
      .subscribe({
        next: (chunk) => {
          aiMsg.content += chunk;
          this.scrollAiToBottom();
        },
        error: (err: Error) => {
          console.error('[AI query] error:', err);
          aiMsg.content = `⚠️ Không thể kết nối AI. ${err?.message ? `(${err.message})` : 'Vui lòng thử lại sau.'}`;
          aiMsg.isStreaming = false;
          this.aiIsTyping = false;
          this.chatbotService.saveHistory(this.aiMessages);
        },
        complete: () => {
          aiMsg.isStreaming = false;
          this.aiIsTyping = false;
          this.scrollAiToBottom();
          this.chatbotService.saveHistory(this.aiMessages);
          this.aiQueryQuestion = '';
        },
      });
  }

  formatAiMessage(content: string): string {
    if (!content) return '';
    return (
      content
        // **bold**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // ## Tiêu đề
        .replace(/^##\s+(.+)$/gm, '<strong>$1</strong>')
        // - bullet → li (bọc thô)
        .replace(/^[-*]\s+(.+)$/gm, '• $1')
        // Xuống dòng
        .replace(/\n/g, '<br>')
    );
  }

  private scrollAiToBottom(): void {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>('.ai-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }

  loadRooms(): void {
    this.loadingRooms = true;

    this.apiService
      .get<ApiResponse<MessageRoomSummary[]>>('/messages/rooms')
      .pipe(
        map((response) => response.data ?? []),
        finalize(() => {
          this.loadingRooms = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rooms) => {
          this.rooms = rooms;
          this.applyRoomFilter();
          this.totalUnread = rooms.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);

          if (!this.selectedRoomId && this.filteredRooms.length > 0) {
            this.selectRoom(this.filteredRooms[0]);
          }
        },
        error: () => {
          this.rooms = [];
          this.filteredRooms = [];
          this.totalUnread = 0;
        },
      });
  }

  selectRoom(room: MessageRoomSummary): void {
    if (this.selectedRoomId) {
      this.socketService.leaveRoom(this.selectedRoomId);
    }

    this.isAiRoom = false;
    this.selectedRoomId = room.roomId;
    this.selectedRoomType = room.roomType;
    this.selectedRoomLabel = this.roomLabel(room);
    this.messages = [];

    this.socketService.joinRoom(room.roomId);
    this.socketService.markRead(room.roomId);
    this.loadRoomMessages(room.roomId);

    room.unreadCount = 0;
    this.totalUnread = this.rooms.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
  }

  send(): void {
    if (!this.selectedRoomId) {
      return;
    }

    if (this.pendingImage) {
      this.uploadAndSend(this.pendingImage, '', '', 'image');
      return;
    }

    const content = this.draft.trim();
    if (!content) {
      return;
    }

    this.socketService.sendMessage(this.selectedRoomId, this.selectedRoomType, content);
    this.draft = '';
  }

  sendForm(): void {
    if (!this.selectedRoomId || !this.formTitle.trim()) {
      return;
    }

    const doSend = (imageUrl: string) => {
      this.socketService.sendMessage(
        this.selectedRoomId,
        this.selectedRoomType,
        this.draft.trim(),
        { messageType: 'form', formTitle: this.formTitle.trim(), imageUrl },
      );
      this.formTitle = '';
      this.draft = '';
      this.clearFormImage();
      this.showFormPanel = false;
    };

    if (this.formImageFile) {
      this.uploadFile(this.formImageFile).subscribe({
        next: (url: string) => doSend(url),
        error: () => doSend(''),
      });
    } else {
      doSend('');
    }
  }

  toggleFormPanel(): void {
    this.showFormPanel = !this.showFormPanel;
    if (!this.showFormPanel) {
      this.formTitle = '';
      this.clearFormImage();
    }
  }

  setTab(tab: 'all' | 'unread' | 'group'): void {
    this.activeTab = tab;
    this.applyRoomFilter();
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.pendingImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.pendingImagePreview = String(e.target?.result ?? '');
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  clearPendingImage(): void {
    this.pendingImage = null;
    this.pendingImagePreview = '';
  }

  onFormImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.formImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.formImagePreview = String(e.target?.result ?? '');
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  clearFormImage(): void {
    this.formImageFile = null;
    this.formImagePreview = '';
  }

  resolveImageUrl(url: string | undefined): string {
    if (!url) {
      return '';
    }
    if (url.startsWith('http')) {
      return url;
    }
    return `http://localhost:3000${url}`;
  }

  private uploadAndSend(
    file: File,
    content: string,
    formTitle: string,
    messageType: 'image' | 'form',
  ): void {
    this.uploadFile(file).subscribe({
      next: (imageUrl: string) => {
        this.socketService.sendMessage(this.selectedRoomId, this.selectedRoomType, content, {
          messageType,
          imageUrl,
          formTitle,
        });
        this.clearPendingImage();
      },
      error: () => {
        this.clearPendingImage();
      },
    });
  }

  private uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('image', file);
    return this.apiService
      .postFormData<{
        success: boolean;
        data: { imageUrl: string };
      }>('/messages/upload-image', formData)
      .pipe(
        map((res: { success: boolean; data: { imageUrl: string } }) => res.data?.imageUrl ?? ''),
      );
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onTyping(): void {
    this.typingTrigger$.next();
  }

  roomLabel(room: MessageRoomSummary): string {
    if (room.roomName && room.roomName.trim()) {
      return room.roomName;
    }

    if (room.roomType === 'department') {
      return `Nhóm khoa (${room.roomId.replace('dept_', '')})`;
    }

    return 'Trao đổi trực tiếp';
  }

  roomAvatarText(room: MessageRoomSummary): string {
    if (room.roomType === 'department') {
      const base = String(room.roomCode || room.roomName || 'KH').trim();
      return this.toAvatarText(base);
    }

    return 'AD';
  }

  roomAvatarTextByLabel(label: string): string {
    return this.toAvatarText(label || 'CH');
  }

  roomPreview(room: MessageRoomSummary): string {
    const msg = room.lastMessage;
    if (!msg) {
      return room.roomType === 'department'
        ? 'Chưa có tin nhắn trong nhóm.'
        : 'Bắt đầu trò chuyện.';
    }

    const sender = String(msg.senderName || '').trim();
    let preview = '';

    if (msg.messageType === 'image') {
      preview = '📷 Hình ảnh';
    } else if (msg.messageType === 'form') {
      preview = msg.formTitle ? `📋 ${msg.formTitle}` : '📋 Tin nhắn có tiêu đề';
    } else {
      preview = String(msg.content || '').trim();
    }

    if (!preview) {
      return room.roomType === 'department'
        ? 'Chưa có tin nhắn trong nhóm.'
        : 'Bắt đầu trò chuyện.';
    }

    return sender ? `${sender}: ${preview}` : preview;
  }

  formatRoomTime(value: string | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  formatTime(value: string): string {
    const date = new Date(value);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  }

  isMine(message: Message): boolean {
    if (!this.currentUserId) {
      return false;
    }

    if (typeof message.senderId === 'string') {
      return message.senderId === this.currentUserId;
    }

    return message.senderId._id === this.currentUserId;
  }

  applyRoomFilter(): void {
    const keyword = this.searchText.trim().toLowerCase();

    let base = [...this.rooms];

    if (this.activeTab === 'unread') {
      base = base.filter((room) => room.unreadCount > 0);
    } else if (this.activeTab === 'group') {
      base = base.filter((room) => room.roomType === 'department');
    }

    if (!keyword) {
      this.filteredRooms = base;
      return;
    }

    this.filteredRooms = base.filter((room) => {
      const label = this.roomLabel(room).toLowerCase();
      const preview = this.roomPreview(room).toLowerCase();
      const code = String(room.roomCode || '').toLowerCase();
      return label.includes(keyword) || preview.includes(keyword) || code.includes(keyword);
    });
  }

  private loadRoomMessages(roomId: string): void {
    this.apiService
      .get<ApiResponse<Message[]>>(`/messages/${roomId}`)
      .pipe(
        map((response) => response.data ?? []),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (messages) => {
          this.messages = messages;
        },
      });
  }

  private handleIncomingMessage(message: Message): void {
    const room = this.rooms.find((item) => item.roomId === message.roomId);
    if (!room) {
      this.loadRooms();
      return;
    }

    room.lastMessage = message;
    if (message.roomId === this.selectedRoomId) {
      this.messages = [...this.messages, message];
      this.socketService.markRead(this.selectedRoomId);
    } else {
      room.unreadCount += 1;
      this.totalUnread += 1;
    }

    this.rooms = [...this.rooms].sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
      return timeB - timeA;
    });
    this.applyRoomFilter();
  }

  private toAvatarText(value: string): string {
    const words = String(value)
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .slice(0, 2);

    if (words.length === 0) {
      return 'CH';
    }

    return words
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }
}
