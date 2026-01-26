import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-profile-edit',
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
    MatSnackBarModule,
  ],
  template: `
    <div class="edit-page">
      <div class="edit-card">
        <div class="edit-header">
          <h1 class="edit-title">Edit Profile</h1>
          <p class="edit-subtitle">Update your profile information</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="edit-form">
          <div class="form-group">
            <label class="form-label" for="display_name">Display Name</label>
            <input
              id="display_name"
              type="text"
              class="form-input"
              formControlName="display_name"
              placeholder="Your display name"
              [class.error]="form.get('display_name')?.invalid && form.get('display_name')?.touched"
            />
            @if (form.get('display_name')?.hasError('required') && form.get('display_name')?.touched) {
              <span class="form-error">Display name is required</span>
            }
            @if (form.get('display_name')?.hasError('minlength') && form.get('display_name')?.touched) {
              <span class="form-error">Display name must be at least 1 character</span>
            }
            @if (form.get('display_name')?.hasError('maxlength') && form.get('display_name')?.touched) {
              <span class="form-error">Display name cannot exceed 255 characters</span>
            }
          </div>

          @if (error) {
            <div class="alert alert-error">
              {{ error }}
            </div>
          }

          <div class="form-actions">
            <a [routerLink]="['/users', auth.currentUser()?.username]" class="btn btn-secondary">
              Cancel
            </a>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="loading || form.invalid"
            >
              @if (loading) {
                <span class="btn-loading-text">Saving...</span>
              } @else {
                Save Changes
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .edit-page {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6);
    }

    .edit-card {
      width: 100%;
      max-width: 480px;
      padding: var(--space-8);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }

    .edit-header {
      text-align: center;
      margin-bottom: var(--space-8);
    }

    .edit-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .edit-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .edit-form {
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

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-4);
      padding-top: var(--space-5);
      border-top: 1px solid var(--color-border);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-3) var(--space-5);
      font-family: var(--font-body);
      font-size: var(--text-base);
      font-weight: 500;
      text-decoration: none;
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
      min-width: 120px;

      &:hover:not(:disabled) {
        background-color: var(--color-accent-hover);
      }
    }

    .btn-secondary {
      background-color: transparent;
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-strong);

      &:hover:not(:disabled) {
        background-color: var(--color-surface-muted);
      }
    }

    .btn-loading-text {
      opacity: 0.8;
    }

    @media (max-width: 480px) {
      .edit-page {
        padding: var(--space-4);
        align-items: flex-start;
        padding-top: var(--space-8);
      }

      .edit-card {
        padding: var(--space-5);
      }

      .form-actions {
        flex-direction: column-reverse;

        .btn {
          width: 100%;
        }
      }
    }
  `],
})
export class ProfileEditComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      display_name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    });
  }

  ngOnInit(): void {
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.form.patchValue({
        display_name: currentUser.display_name,
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';

    this.profileService.updateMyProfile(this.form.value).subscribe({
      next: () => {
        this.auth.loadCurrentUser();
        this.snackBar.open('Profile updated successfully', 'Close', {
          duration: 3000,
        });
        const username = this.auth.currentUser()?.username;
        this.router.navigate(['/users', username]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Failed to update profile';
      },
    });
  }
}
