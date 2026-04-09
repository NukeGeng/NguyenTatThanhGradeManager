import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, finalize, map, Subject } from 'rxjs';

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
          <h1>Doan chat</h1>
          @if (totalUnread > 0) {
            <span class="unread-pill">{{ totalUnread }}</span>
          }
        </header>

        <label class="search-wrap">
          <lucide-icon name="search" [size]="14"></lucide-icon>
          <input
            [(ngModel)]="searchText"
            (ngModelChange)="applyRoomFilter()"
            placeholder="Tim kiem doan chat"
          />
        </label>

        <div class="rooms-tabs">
          <button type="button" class="tab tab--active">Tat ca</button>
          <button type="button" class="tab">Chua doc</button>
          <button type="button" class="tab">Nhom</button>
        </div>

        @if (loadingRooms) {
          <div class="state-box">
            <mat-spinner [diameter]="28"></mat-spinner>
            <p>Dang tai room...</p>
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
            <p>Chon mot room de bat dau tro chuyen.</p>
          </div>
        } @else {
          <header class="chat-head">
            <div class="chat-head-left">
              <span class="room-avatar room-avatar--head">{{
                roomAvatarTextByLabel(selectedRoomLabel)
              }}</span>
              <div>
                <h2>{{ selectedRoomLabel }}</h2>
                <p>{{ messages.length }} tin nhan</p>
              </div>
            </div>
          </header>

          <div class="messages">
            @for (message of messages; track message._id) {
              <div class="message-row" [class.message-row--mine]="isMine(message)">
                <article class="bubble" [class.mine]="isMine(message)">
                  @if (!isMine(message)) {
                    <p class="sender">{{ message.senderName }}</p>
                  }
                  <p class="content">{{ message.content }}</p>
                  <p class="time">{{ formatTime(message.createdAt) }}</p>
                </article>
              </div>
            }

            @if (typingUserName) {
              <p class="typing">
                {{ typingUserName }} dang nhap
                <span class="typing-dots"><span></span><span></span><span></span></span>
              </p>
            }
          </div>

          <footer class="composer">
            <textarea
              [(ngModel)]="draft"
              (keydown)="handleKeydown($event)"
              (input)="onTyping()"
              placeholder="Nhap tin nhan..."
              maxlength="2000"
            ></textarea>

            <div class="composer-actions">
              <p class="char-count" [class.warn]="draft.length > 1800">{{ 2000 - draft.length }}</p>
              <button mat-flat-button class="btn-send" type="button" (click)="send()">
                <lucide-icon name="send" [size]="16"></lucide-icon>
                Gui
              </button>
            </div>
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
        min-height: calc(100vh - 92px);
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
        font-size: 0.74rem;
        font-weight: 700;
        padding: 0.2rem 0.55rem;
      }

      .tab--active {
        border-color: var(--blue);
        color: var(--blue);
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
      }

      .chat-head p {
        margin: 0.15rem 0 0;
        color: var(--text-sub);
        font-size: 0.8rem;
      }

      .messages {
        overflow: auto;
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
        max-width: min(78%, 620px);
        background: #f3f4f6;
        border-radius: 14px;
        padding: 0.5rem 0.65rem;
      }

      .bubble.mine {
        background: #dbeafe;
      }

      .sender {
        margin: 0;
        color: var(--navy);
        font-size: 0.73rem;
        font-weight: 700;
      }

      .content {
        margin: 0.15rem 0;
        white-space: pre-wrap;
      }

      .time {
        margin: 0;
        color: var(--text-sub);
        font-size: 0.7rem;
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
        padding: 0.7rem 0.9rem;
        display: grid;
        gap: 0.55rem;
      }

      textarea {
        width: 100%;
        min-height: 80px;
        resize: vertical;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        padding: 0.55rem 0.6rem;
        font: inherit;
      }

      .composer-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .char-count {
        margin: 0;
        color: var(--text-sub);
      }

      .char-count.warn {
        color: #b45309;
      }

      .btn-send {
        background: var(--navy) !important;
        color: #fff !important;
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
          min-height: auto;
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
  private currentUserId = '';

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
    const content = this.draft.trim();
    if (!content || !this.selectedRoomId) {
      return;
    }

    this.socketService.sendMessage(this.selectedRoomId, this.selectedRoomType, content);
    this.draft = '';
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
      return `Nhom khoa (${room.roomId.replace('dept_', '')})`;
    }

    return 'Trao doi truc tiep';
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
    const content = String(room.lastMessage?.content || '').trim();
    if (!content) {
      return room.roomType === 'department'
        ? 'Chua co tin nhan trong nhom.'
        : 'Bat dau tro chuyen.';
    }

    const sender = String(room.lastMessage?.senderName || '').trim();
    return sender ? `${sender}: ${content}` : content;
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
    if (!keyword) {
      this.filteredRooms = [...this.rooms];
      return;
    }

    this.filteredRooms = this.rooms.filter((room) => {
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
