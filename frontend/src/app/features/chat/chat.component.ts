import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, finalize, map, Observable, Subject } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
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
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
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
        @if (!selectedRoomId) {
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
        padding: 0.8rem 0.9rem;
        display: grid;
        gap: 0.6rem;
        align-content: start;
      }

      .message-row {
        display: flex;
        justify-content: flex-start;
      }

      .message-row--mine {
        justify-content: flex-end;
      }

      .bubble {
        max-width: min(75%, 560px);
        background: #f1f5f9;
        border-radius: 12px 12px 12px 3px;
        padding: 0.45rem 0.65rem;
        font-size: 0.875rem;
      }

      .bubble.mine {
        background: var(--blue-pale, #dbeafe);
        border-radius: 12px 12px 3px 12px;
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
        padding: 0.5rem 0.75rem;
        background: #fff;
      }

      .composer-row {
        display: flex;
        align-items: flex-end;
        gap: 0.35rem;
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
        flex: 1;
        min-width: 0;
        min-height: 36px;
        max-height: 140px;
        resize: none;
        overflow-y: auto;
        border: 1px solid var(--gray-200);
        border-radius: 18px;
        padding: 0.45rem 0.75rem;
        font: inherit;
        font-size: 0.875rem;
        line-height: 1.45;
        outline: none;
        transition: border-color 0.15s;
      }

      textarea:focus {
        border-color: var(--blue, #3b82f6);
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
        padding: 0.35rem 0.6rem !important;
        min-width: 0 !important;
        border-radius: 8px !important;
        flex-shrink: 0;
        align-self: flex-end;
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
    `,
  ],
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
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

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId() || '';
    this.loadRooms();

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
