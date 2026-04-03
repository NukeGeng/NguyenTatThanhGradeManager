import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiResponse,
  AuthPayload,
  LoginRequest,
  RegisterRequest,
  User,
} from '../../shared/models/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'ntt_auth_token';

  constructor(private readonly apiService: ApiService) {}

  login(payload: LoginRequest): Observable<ApiResponse<AuthPayload>> {
    return this.apiService
      .post<ApiResponse<AuthPayload>, LoginRequest>('/auth/login', payload)
      .pipe(tap((response) => this.storeToken(response.data.token)));
  }

  register(payload: RegisterRequest): Observable<ApiResponse<AuthPayload>> {
    return this.apiService
      .post<ApiResponse<AuthPayload>, RegisterRequest>('/auth/register', payload)
      .pipe(tap((response) => this.storeToken(response.data.token)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getCurrentUser(): Observable<ApiResponse<User>> {
    return this.apiService.get<ApiResponse<User>>('/auth/me');
  }

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}
