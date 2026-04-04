import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiResponse,
  AuthPayload,
  LoginRequest,
  RegisterRequest,
  User,
  UserRole,
} from '../../shared/models/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly localTokenKey = 'ntt_auth_token';
  private readonly sessionTokenKey = 'ntt_auth_token_session';

  constructor(private readonly apiService: ApiService) {}

  login(payload: LoginRequest, rememberMe = true): Observable<ApiResponse<AuthPayload>> {
    return this.apiService
      .post<ApiResponse<AuthPayload>, LoginRequest>('/auth/login', payload)
      .pipe(tap((response) => this.storeToken(response.data.token, rememberMe)));
  }

  register(payload: RegisterRequest): Observable<ApiResponse<AuthPayload>> {
    return this.apiService
      .post<ApiResponse<AuthPayload>, RegisterRequest>('/auth/register', payload)
      .pipe(tap((response) => this.storeToken(response.data.token, true)));
  }

  logout(): void {
    localStorage.removeItem(this.localTokenKey);
    sessionStorage.removeItem(this.sessionTokenKey);
  }

  getCurrentUser(): Observable<ApiResponse<User>> {
    return this.apiService.get<ApiResponse<User>>('/auth/me');
  }

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  }

  getCurrentRole(): UserRole | null {
    const payload = this.decodeTokenPayload();

    if (!payload || (payload.role !== 'admin' && payload.role !== 'teacher')) {
      return null;
    }

    return payload.role;
  }

  getToken(): string | null {
    return localStorage.getItem(this.localTokenKey) ?? sessionStorage.getItem(this.sessionTokenKey);
  }

  private storeToken(token: string, rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem(this.localTokenKey, token);
      sessionStorage.removeItem(this.sessionTokenKey);
      return;
    }

    sessionStorage.setItem(this.sessionTokenKey, token);
    localStorage.removeItem(this.localTokenKey);
  }

  private decodeTokenPayload(): { role?: unknown } | null {
    const token = this.getToken();

    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = atob(padded);
      const parsed: unknown = JSON.parse(decoded);

      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as { role?: unknown };
      }
    } catch {
      return null;
    }

    return null;
  }
}
