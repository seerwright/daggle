import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-subtitle">Sign in to your Daggle account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              type="email"
              class="form-input"
              formControlName="email"
              placeholder="you@company.com"
              [class.error]="form.get('email')?.invalid && form.get('email')?.touched"
            />
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <span class="form-error">Email is required</span>
            }
            @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
              <span class="form-error">Please enter a valid email</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              type="password"
              class="form-input"
              formControlName="password"
              placeholder="Enter your password"
              [class.error]="form.get('password')?.invalid && form.get('password')?.touched"
            />
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <span class="form-error">Password is required</span>
            }
          </div>

          @if (error) {
            <div class="alert alert-error">
              {{ error }}
            </div>
          }

          <button
            type="submit"
            class="btn btn-primary btn-block"
            [disabled]="loading || form.invalid"
          >
            @if (loading) {
              <span class="btn-loading-text">Signing in...</span>
            } @else {
              Sign in
            }
          </button>
        </form>

        <p class="auth-footer">
          Don't have an account? <a routerLink="/register">Create one</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6);
    }

    .auth-card {
      width: 100%;
      max-width: 400px;
      padding: var(--space-8);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }

    .auth-header {
      text-align: center;
      margin-bottom: var(--space-8);
    }

    .auth-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .auth-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-label {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .form-input {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-base);
      color: var(--color-text-primary);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: border-color 150ms ease, box-shadow 150ms ease;

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:hover:not(:disabled):not(:focus) {
        border-color: var(--color-border-strong);
      }

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-light);
      }

      &.error {
        border-color: var(--color-error);

        &:focus {
          box-shadow: 0 0 0 3px var(--color-error-light);
        }
      }
    }

    .form-error {
      font-size: var(--text-xs);
      color: var(--color-error);
    }

    .alert {
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
    }

    .alert-error {
      background-color: var(--color-error-light);
      color: var(--color-error);
      border: 1px solid var(--color-error);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-body);
      font-size: var(--text-base);
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--color-accent-hover);
      }
    }

    .btn-block {
      width: 100%;
    }

    .btn-loading-text {
      opacity: 0.8;
    }

    .auth-footer {
      text-align: center;
      margin-top: var(--space-6);
      font-size: var(--text-sm);
      color: var(--color-text-secondary);

      a {
        color: var(--color-accent);
        text-decoration: none;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';

    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.router.navigate(['/competitions']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Login failed';
      },
    });
  }
}
