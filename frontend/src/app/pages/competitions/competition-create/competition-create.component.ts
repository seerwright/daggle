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
    <div class="create-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Create Competition</mat-card-title>
          <mat-card-subtitle>Set up a new data science competition</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" />
              @if (form.get('title')?.hasError('required')) {
                <mat-error>Title is required</mat-error>
              }
              @if (form.get('title')?.hasError('minlength')) {
                <mat-error>Title must be at least 3 characters</mat-error>
              }
              @if (form.get('title')?.hasError('maxlength')) {
                <mat-error>Title cannot exceed 255 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Short Description</mat-label>
              <textarea matInput formControlName="short_description" rows="2"></textarea>
              @if (form.get('short_description')?.hasError('required')) {
                <mat-error>Short description is required</mat-error>
              }
              @if (form.get('short_description')?.hasError('minlength')) {
                <mat-error>Short description must be at least 10 characters</mat-error>
              }
              @if (form.get('short_description')?.hasError('maxlength')) {
                <mat-error>Short description cannot exceed 500 characters</mat-error>
              }
              <mat-hint align="end">{{ form.get('short_description')?.value?.length || 0 }}/500</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Full Description</mat-label>
              <textarea matInput formControlName="description" rows="6"></textarea>
              @if (form.get('description')?.hasError('required')) {
                <mat-error>Description is required</mat-error>
              }
              @if (form.get('description')?.hasError('minlength')) {
                <mat-error>Description must be at least 10 characters</mat-error>
              }
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Difficulty</mat-label>
                <mat-select formControlName="difficulty">
                  <mat-option value="beginner">Beginner</mat-option>
                  <mat-option value="intermediate">Intermediate</mat-option>
                  <mat-option value="advanced">Advanced</mat-option>
                </mat-select>
                @if (form.get('difficulty')?.hasError('required')) {
                  <mat-error>Difficulty is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Evaluation Metric</mat-label>
                <input matInput formControlName="evaluation_metric" placeholder="e.g., rmse, accuracy, f1" />
                @if (form.get('evaluation_metric')?.hasError('required')) {
                  <mat-error>Evaluation metric is required</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="start_date" />
                <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
                @if (form.get('start_date')?.hasError('required')) {
                  <mat-error>Start date is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>End Date</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="end_date" />
                <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
                @if (form.get('end_date')?.hasError('required')) {
                  <mat-error>End date is required</mat-error>
                }
              </mat-form-field>
            </div>

            @if (form.hasError('endDateBeforeStart')) {
              <p class="error">End date must be after start date</p>
            }

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Max Team Size</mat-label>
                <input matInput type="number" formControlName="max_team_size" min="1" max="10" />
                @if (form.get('max_team_size')?.hasError('min')) {
                  <mat-error>Must be at least 1</mat-error>
                }
                @if (form.get('max_team_size')?.hasError('max')) {
                  <mat-error>Cannot exceed 10</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Daily Submission Limit</mat-label>
                <input matInput type="number" formControlName="daily_submission_limit" min="1" max="100" />
                @if (form.get('daily_submission_limit')?.hasError('min')) {
                  <mat-error>Must be at least 1</mat-error>
                }
                @if (form.get('daily_submission_limit')?.hasError('max')) {
                  <mat-error>Cannot exceed 100</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="toggle-row">
              <mat-slide-toggle formControlName="is_public">
                Public Competition
              </mat-slide-toggle>
              <span class="toggle-hint">Public competitions are visible to all users</span>
            </div>

            @if (error) {
              <p class="error">{{ error }}</p>
            }

            <div class="actions">
              <a mat-button routerLink="/competitions">Cancel</a>
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="loading || form.invalid"
              >
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Create Competition
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .create-container {
      max-width: 700px;
      margin: 32px auto;
      padding: 0 1rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }
    mat-form-field {
      width: 100%;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .toggle-hint {
      color: #666;
      font-size: 0.875rem;
    }
    .error {
      color: #f44336;
      margin: 0;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    button[type="submit"] {
      height: 48px;
      min-width: 160px;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      .toggle-row {
        flex-direction: column;
        align-items: flex-start;
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
