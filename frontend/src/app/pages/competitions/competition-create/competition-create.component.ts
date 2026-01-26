import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompetitionService } from '../../../core/services/competition.service';
import { CompetitionCreate, Difficulty } from '../../../core/models/competition.model';

@Component({
  selector: 'app-competition-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="create-page">
      <div class="create-card">
        <div class="create-header">
          <h1 class="create-title">Create Competition</h1>
          <p class="create-subtitle">Set up a new data science competition</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="create-form">
          <div class="form-group">
            <label class="form-label" for="title">Title</label>
            <input
              id="title"
              type="text"
              class="form-input"
              formControlName="title"
              placeholder="Competition title"
              [class.error]="form.get('title')?.invalid && form.get('title')?.touched"
            />
            @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
              <span class="form-error">Title is required</span>
            }
            @if (form.get('title')?.hasError('minlength') && form.get('title')?.touched) {
              <span class="form-error">Title must be at least 3 characters</span>
            }
            @if (form.get('title')?.hasError('maxlength') && form.get('title')?.touched) {
              <span class="form-error">Title cannot exceed 255 characters</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="short_description">Short Description</label>
            <textarea
              id="short_description"
              class="form-input form-textarea"
              formControlName="short_description"
              placeholder="Brief summary of the competition"
              rows="2"
              [class.error]="form.get('short_description')?.invalid && form.get('short_description')?.touched"
            ></textarea>
            <div class="form-hint-row">
              @if (form.get('short_description')?.hasError('required') && form.get('short_description')?.touched) {
                <span class="form-error">Short description is required</span>
              } @else if (form.get('short_description')?.hasError('minlength') && form.get('short_description')?.touched) {
                <span class="form-error">Short description must be at least 10 characters</span>
              } @else if (form.get('short_description')?.hasError('maxlength') && form.get('short_description')?.touched) {
                <span class="form-error">Short description cannot exceed 500 characters</span>
              } @else {
                <span class="form-hint"></span>
              }
              <span class="form-counter">{{ form.get('short_description')?.value?.length || 0 }}/500</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Full Description</label>
            <textarea
              id="description"
              class="form-input form-textarea"
              formControlName="description"
              placeholder="Detailed description, rules, evaluation criteria..."
              rows="6"
              [class.error]="form.get('description')?.invalid && form.get('description')?.touched"
            ></textarea>
            @if (form.get('description')?.hasError('required') && form.get('description')?.touched) {
              <span class="form-error">Description is required</span>
            }
            @if (form.get('description')?.hasError('minlength') && form.get('description')?.touched) {
              <span class="form-error">Description must be at least 10 characters</span>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="difficulty">Difficulty</label>
              <mat-select
                id="difficulty"
                formControlName="difficulty"
                class="form-select"
              >
                <mat-option value="beginner">Beginner</mat-option>
                <mat-option value="intermediate">Intermediate</mat-option>
                <mat-option value="advanced">Advanced</mat-option>
              </mat-select>
            </div>

            <div class="form-group">
              <label class="form-label" for="evaluation_metric">Evaluation Metric</label>
              <input
                id="evaluation_metric"
                type="text"
                class="form-input"
                formControlName="evaluation_metric"
                placeholder="e.g., rmse, accuracy, f1"
                [class.error]="form.get('evaluation_metric')?.invalid && form.get('evaluation_metric')?.touched"
              />
              @if (form.get('evaluation_metric')?.hasError('required') && form.get('evaluation_metric')?.touched) {
                <span class="form-error">Evaluation metric is required</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="start_date">Start Date</label>
              <mat-form-field appearance="outline" class="date-field">
                <input matInput [matDatepicker]="startPicker" formControlName="start_date" />
                <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>
              @if (form.get('start_date')?.hasError('required') && form.get('start_date')?.touched) {
                <span class="form-error">Start date is required</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="end_date">End Date</label>
              <mat-form-field appearance="outline" class="date-field">
                <input matInput [matDatepicker]="endPicker" formControlName="end_date" />
                <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
              </mat-form-field>
              @if (form.get('end_date')?.hasError('required') && form.get('end_date')?.touched) {
                <span class="form-error">End date is required</span>
              }
            </div>
          </div>

          @if (form.hasError('endDateBeforeStart')) {
            <div class="alert alert-error">
              End date must be after start date
            </div>
          }

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="max_team_size">Max Team Size</label>
              <input
                id="max_team_size"
                type="number"
                class="form-input"
                formControlName="max_team_size"
                min="1"
                max="10"
                [class.error]="form.get('max_team_size')?.invalid && form.get('max_team_size')?.touched"
              />
              @if (form.get('max_team_size')?.hasError('min') && form.get('max_team_size')?.touched) {
                <span class="form-error">Must be at least 1</span>
              }
              @if (form.get('max_team_size')?.hasError('max') && form.get('max_team_size')?.touched) {
                <span class="form-error">Cannot exceed 10</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="daily_submission_limit">Daily Submission Limit</label>
              <input
                id="daily_submission_limit"
                type="number"
                class="form-input"
                formControlName="daily_submission_limit"
                min="1"
                max="100"
                [class.error]="form.get('daily_submission_limit')?.invalid && form.get('daily_submission_limit')?.touched"
              />
              @if (form.get('daily_submission_limit')?.hasError('min') && form.get('daily_submission_limit')?.touched) {
                <span class="form-error">Must be at least 1</span>
              }
              @if (form.get('daily_submission_limit')?.hasError('max') && form.get('daily_submission_limit')?.touched) {
                <span class="form-error">Cannot exceed 100</span>
              }
            </div>
          </div>

          <div class="toggle-row">
            <mat-slide-toggle formControlName="is_public">
              Public Competition
            </mat-slide-toggle>
            <span class="toggle-hint">Public competitions are visible to all users</span>
          </div>

          @if (error) {
            <div class="alert alert-error">
              {{ error }}
            </div>
          }

          <div class="form-actions">
            <a routerLink="/competitions" class="btn btn-secondary">Cancel</a>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="loading || form.invalid"
            >
              @if (loading) {
                <span class="btn-loading-text">Creating...</span>
              } @else {
                Create Competition
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-page {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: var(--space-8) var(--space-6);
    }

    .create-card {
      width: 100%;
      max-width: 720px;
      padding: var(--space-8);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }

    .create-header {
      margin-bottom: var(--space-8);
    }

    .create-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .create-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
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

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-hint-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .form-hint {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .form-counter {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      font-family: var(--font-mono);
    }

    .form-error {
      font-size: var(--text-xs);
      color: var(--color-error);
    }

    .form-select {
      width: 100%;
    }

    .date-field {
      width: 100%;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) 0;
    }

    .toggle-hint {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
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
      min-width: 160px;

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

    @media (max-width: 600px) {
      .create-page {
        padding: var(--space-4);
      }

      .create-card {
        padding: var(--space-5);
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .toggle-row {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
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
export class CompetitionCreateComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private competitionService: CompetitionService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      short_description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      difficulty: ['intermediate', Validators.required],
      evaluation_metric: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      start_date: [null, Validators.required],
      end_date: [null, Validators.required],
      max_team_size: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      daily_submission_limit: [5, [Validators.required, Validators.min(1), Validators.max(100)]],
      is_public: [true],
    }, { validators: this.dateValidator });
  }

  dateValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('start_date')?.value;
    const endDate = control.get('end_date')?.value;

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return { endDateBeforeStart: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';

    const formValue = this.form.value;
    const data: CompetitionCreate = {
      ...formValue,
      start_date: new Date(formValue.start_date).toISOString(),
      end_date: new Date(formValue.end_date).toISOString(),
    };

    this.competitionService.create(data).subscribe({
      next: (competition) => {
        this.snackBar.open('Competition created successfully!', 'Close', {
          duration: 3000,
        });
        this.router.navigate(['/competitions', competition.slug]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Failed to create competition';
      },
    });
  }
}
