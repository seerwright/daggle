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
    <div class="edit-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Edit Profile</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline">
              <mat-label>Display Name</mat-label>
              <input matInput formControlName="display_name" />
              @if (form.get('display_name')?.hasError('required')) {
                <mat-error>Display name is required</mat-error>
              }
              @if (form.get('display_name')?.hasError('minlength')) {
                <mat-error>Display name must be at least 1 character</mat-error>
              }
              @if (form.get('display_name')?.hasError('maxlength')) {
                <mat-error>Display name cannot exceed 255 characters</mat-error>
              }
            </mat-form-field>

            @if (error) {
              <p class="error">{{ error }}</p>
            }

            <div class="actions">
              <a mat-button [routerLink]="['/users', auth.currentUser()?.username]">
                Cancel
              </a>
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="loading || form.invalid"
              >
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Save Changes
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .edit-container {
      max-width: 500px;
      margin: 64px auto;
      padding: 0 1rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    mat-form-field {
      width: 100%;
    }
    .error {
      color: #f44336;
      margin: 0;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button[type="submit"] {
      height: 48px;
      min-width: 120px;
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
