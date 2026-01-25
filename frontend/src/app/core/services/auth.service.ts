import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest, TokenResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'daggle_token';

  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(
    private api: ApiService,
    private router: Router
  ) {
    this.checkToken();
  }

  private checkToken(): void {
    const token = this.getToken();
    if (token) {
      this.isAuthenticated.set(true);
      this.loadCurrentUser();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.isAuthenticated.set(true);
  }

  private clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.api.post<TokenResponse>('/auth/login', credentials).pipe(
      tap((response) => {
        this.setToken(response.access_token);
        this.loadCurrentUser();
      })
    );
  }

  register(data: RegisterRequest): Observable<User> {
    return this.api.post<User>('/auth/register', data);
  }

  logout(): void {
    this.clearToken();
    this.router.navigate(['/login']);
  }

  loadCurrentUser(): void {
    this.api.get<User>('/auth/me').subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.clearToken(),
    });
  }
}
