import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

type QueryValue = string | number | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  get<T>(endpoint: string, query?: Record<string, QueryValue>): Observable<T> {
    return this.http.get<T>(this.toUrl(endpoint), {
      params: this.toHttpParams(query),
    });
  }

  post<T, B>(endpoint: string, body: B): Observable<T> {
    return this.http.post<T>(this.toUrl(endpoint), body);
  }

  put<T, B>(endpoint: string, body: B): Observable<T> {
    return this.http.put<T>(this.toUrl(endpoint), body);
  }

  patch<T, B>(endpoint: string, body: B): Observable<T> {
    return this.http.patch<T>(this.toUrl(endpoint), body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.toUrl(endpoint));
  }

  postFormData<T>(endpoint: string, body: FormData): Observable<T> {
    return this.http.post<T>(this.toUrl(endpoint), body);
  }

  putFormData<T>(endpoint: string, body: FormData): Observable<T> {
    return this.http.put<T>(this.toUrl(endpoint), body);
  }

  private toUrl(endpoint: string): string {
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalized}`;
  }

  // Chuyen query object thanh HttpParams de tai su dung cho moi API.
  private toHttpParams(query?: Record<string, QueryValue>): HttpParams {
    if (!query) {
      return new HttpParams();
    }

    return Object.entries(query).reduce((params, [key, value]) => {
      if (value === undefined || value === null) {
        return params;
      }

      return params.set(key, String(value));
    }, new HttpParams());
  }
}
