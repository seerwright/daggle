import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CompetitionService } from '../../../core/services/competition.service';
import { AuthService } from '../../../core/services/auth.service';
import { Competition, CompetitionStatus, Difficulty } from '../../../core/models/competition.model';

@Component({
  selector: 'app-competition-edit',
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
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <div class="edit-page">
      @if (loadingCompetition) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span class="loading-text">Loading competition...</span>
        </div>
      } @else if (loadError) {
        <div class="error-state">
          <mat-icon class="error-icon">error_outline</mat-icon>
          <h2 class="error-title">Unable to load competition</h2>
          <p class="error-message">{{ loadError }}</p>
          <a routerLink="/competitions" class="btn btn-primary">Back to Competitions</a>
        </div>
      } @else {
        <div class="edit-card">
          <div class="edit-header">
            <h1 class="edit-title">Edit Competition</h1>
            <p class="edit-subtitle">{{ competition?.title }}</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="edit-form">
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
                <label class="form-label" for="status">Status</label>
                <mat-select
                  id="status"
                  formControlName="status"
                  class="form-select"
                >
                  <mat-option value="draft">Draft</mat-option>
                  <mat-option value="active">Active</mat-option>
                  <mat-option value="evaluation">Evaluation</mat-option>
                  <mat-option value="completed">Completed</mat-option>
                  <mat-option value="archived">Archived</mat-option>
                </mat-select>
              </div>

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
              <a [routerLink]="['/competitions', slug]" class="btn btn-secondary">Cancel</a>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="saving || form.invalid"
              >
                @if (saving) {
                  <span class="btn-loading-text">Saving...</span>
                } @else {
                  Save Changes
                }
              </button>
            </div>
          </form>

          <!-- Truth Set Upload Section -->
          <div class="truth-set-section">
            <div class="section-header">
              <h2 class="section-title">Truth Set</h2>
              <p class="section-description">
                Upload a CSV file with ground truth values for scoring submissions.
                The file must have 'id' and 'target' columns.
              </p>
            </div>

            <div class="truth-set-status">
              @if (competition?.has_truth_set) {
                <div class="truth-badge uploaded">
                  <mat-icon>check_circle</mat-icon>
                  <span>Truth set uploaded</span>
                </div>
              } @else {
                <div class="truth-badge not-uploaded">
                  <mat-icon>warning</mat-icon>
                  <span>No truth set uploaded</span>
                </div>
              }
            </div>

            <div class="upload-area">
              <input
                type="file"
                #fileInput
                accept=".csv"
                (change)="onFileSelected($event)"
                hidden
              />
              @if (selectedFile) {
                <div class="selected-file">
                  <mat-icon class="file-icon">description</mat-icon>
                  <span class="file-name">{{ selectedFile.name }}</span>
                  <button type="button" class="file-remove" (click)="clearFile()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
              <div class="upload-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="fileInput.click()"
                  [disabled]="uploading"
                >
                  <mat-icon>upload_file</mat-icon>
                  {{ selectedFile ? 'Change File' : 'Select CSV File' }}
                </button>
                @if (selectedFile) {
                  <button
                    type="button"
                    class="btn btn-primary"
                    (click)="uploadTruthSet()"
                    [disabled]="uploading"
                  >
                    @if (uploading) {
                      <span class="btn-loading-text">Uploading...</span>
                    } @else {
                      Upload Truth Set
                    }
                  </button>
                }
              </div>
            </div>

            @if (uploadError) {
              <div class="alert alert-error">
                {{ uploadError }}
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .edit-page {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: var(--space-8) var(--space-6);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-12);
      color: var(--color-text-muted);
    }

    .loading-text {
      margin-top: var(--space-4);
      font-size: var(--text-sm);
    }

    .error-state {
      text-align: center;
      padding: var(--space-12);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-error);
      margin-bottom: var(--space-4);
    }

    .error-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .error-message {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-6);
    }

    .edit-card {
      width: 100%;
      max-width: 720px;
      padding: var(--space-8);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }

    .edit-header {
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
      gap: var(--space-2);
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

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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

    /* Truth Set Section */
    .truth-set-section {
      margin-top: var(--space-8);
      padding-top: var(--space-8);
      border-top: 1px solid var(--color-border);
    }

    .section-header {
      margin-bottom: var(--space-5);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .section-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .truth-set-status {
      margin-bottom: var(--space-5);
    }

    .truth-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 500;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .truth-badge.uploaded {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .truth-badge.not-uploaded {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .upload-area {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-surface-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .file-icon {
      color: var(--color-accent);
    }

    .file-name {
      flex: 1;
      font-size: var(--text-sm);
      font-family: var(--font-mono);
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-1);
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-error);
        background-color: var(--color-error-light);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .upload-actions {
      display: flex;
      gap: var(--space-3);
    }

    @media (max-width: 600px) {
      .edit-page {
        padding: var(--space-4);
      }

      .edit-card {
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

      .upload-actions {
        flex-direction: column;
      }
    }
  `],
})
export class CompetitionEditComponent implements OnInit {
  form!: FormGroup;
  competition: Competition | null = null;
  loadingCompetition = true;
  loadError = '';
  saving = false;
  error = '';
  slug = '';

  // Truth set upload
  selectedFile: File | null = null;
  uploading = false;
  uploadError = '';

  constructor(
    private fb: FormBuilder,
    private competitionService: CompetitionService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    if (this.slug) {
      this.loadCompetition();
    } else {
      this.loadError = 'No competition slug provided';
      this.loadingCompetition = false;
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      short_description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      status: ['draft'],
      difficulty: ['intermediate', Validators.required],
      evaluation_metric: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      start_date: [null, Validators.required],
      end_date: [null, Validators.required],
      max_team_size: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      daily_submission_limit: [5, [Validators.required, Validators.min(1), Validators.max(100)]],
      is_public: [true],
    }, { validators: this.dateValidator });
  }

  private loadCompetition(): void {
    this.competitionService.getBySlug(this.slug).subscribe({
      next: (competition) => {
        this.competition = competition;

        // Check permissions
        const user = this.authService.currentUser();
        if (!user || (user.id !== competition.sponsor_id && user.role !== 'admin')) {
          this.loadError = 'You do not have permission to edit this competition';
          this.loadingCompetition = false;
          return;
        }

        // Populate form with existing values
        this.form.patchValue({
          title: competition.title,
          short_description: competition.short_description,
          description: competition.description,
          status: competition.status,
          difficulty: competition.difficulty,
          evaluation_metric: competition.evaluation_metric,
          start_date: new Date(competition.start_date),
          end_date: new Date(competition.end_date),
          max_team_size: competition.max_team_size,
          daily_submission_limit: competition.daily_submission_limit,
          is_public: competition.is_public,
        });

        this.loadingCompetition = false;
      },
      error: (err) => {
        this.loadError = err.error?.detail || 'Failed to load competition';
        this.loadingCompetition = false;
      },
    });
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

    this.saving = true;
    this.error = '';

    const formValue = this.form.value;
    const data = {
      ...formValue,
      start_date: new Date(formValue.start_date).toISOString(),
      end_date: new Date(formValue.end_date).toISOString(),
    };

    this.competitionService.update(this.slug, data).subscribe({
      next: (competition) => {
        this.competition = competition;
        this.snackBar.open('Competition updated successfully!', 'Close', {
          duration: 3000,
        });
        // Navigate to the new slug in case title changed
        this.router.navigate(['/competitions', competition.slug]);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.detail || 'Failed to update competition';
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadError = '';
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.uploadError = '';
  }

  uploadTruthSet(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.uploadError = '';

    this.competitionService.uploadTruthSet(this.slug, this.selectedFile).subscribe({
      next: (competition) => {
        this.competition = competition;
        this.uploading = false;
        this.selectedFile = null;
        this.snackBar.open('Truth set uploaded successfully!', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err.error?.detail || 'Failed to upload truth set';
      },
    });
  }
}
