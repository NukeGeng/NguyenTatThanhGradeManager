import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { AuthService } from './auth.service';
import { Message, MessageRoomType } from '../../shared/models/interfaces';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  constructor(private readonly authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      auth: { token },
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('join_room', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('leave_room', { roomId });
  }

  sendMessage(roomId: string, roomType: MessageRoomType, content: string): void {
    this.socket?.emit('send_message', { roomId, roomType, content });
  }

  markRead(roomId: string): void {
    this.socket?.emit('mark_read', { roomId });
  }

  typing(roomId: string): void {
    this.socket?.emit('typing', { roomId });
  }

  onNewMessage(): Observable<Message> {
    return new Observable<Message>((subscriber) => {
      const handler = (payload: Message) => subscriber.next(payload);
      this.socket?.on('new_message', handler);

      return () => {
        this.socket?.off('new_message', handler);
      };
    });
  }

  onUserTyping(): Observable<{ roomId: string; userName: string; userId: string }> {
    return new Observable<{ roomId: string; userName: string; userId: string }>((subscriber) => {
      const handler = (payload: { roomId: string; userName: string; userId: string }) =>
        subscriber.next(payload);
      this.socket?.on('user_typing', handler);

      return () => {
        this.socket?.off('user_typing', handler);
      };
    });
  }
}
