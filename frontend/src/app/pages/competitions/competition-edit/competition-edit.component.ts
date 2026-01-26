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
    <div class="edit-container">
      @if (loadingCompetition) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (loadError) {
        <mat-card>
          <mat-card-content>
            <p class="error">{{ loadError }}</p>
            <a mat-button routerLink="/competitions">Back to Competitions</a>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Edit Competition</mat-card-title>
            <mat-card-subtitle>{{ competition?.title }}</mat-card-subtitle>
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
                  <mat-label>Status</mat-label>
                  <mat-select formControlName="status">
                    <mat-option value="draft">Draft</mat-option>
                    <mat-option value="active">Active</mat-option>
                    <mat-option value="evaluation">Evaluation</mat-option>
                    <mat-option value="completed">Completed</mat-option>
                    <mat-option value="archived">Archived</mat-option>
                  </mat-select>
                </mat-form-field>

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
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Evaluation Metric</mat-label>
                <input matInput formControlName="evaluation_metric" placeholder="e.g., rmse, accuracy, f1" />
                @if (form.get('evaluation_metric')?.hasError('required')) {
                  <mat-error>Evaluation metric is required</mat-error>
                }
              </mat-form-field>

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
                <a mat-button [routerLink]="['/competitions', slug]">Cancel</a>
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="saving || form.invalid"
                >
                  @if (saving) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Save Changes
                  }
                </button>
              </div>
            </form>

            <mat-divider class="section-divider"></mat-divider>

            <!-- Truth Set Upload Section -->
            <div class="truth-set-section">
              <h3>Truth Set</h3>
              <p class="section-description">
                Upload a CSV file with ground truth values for scoring submissions.
                The file must have 'id' and 'target' columns.
              </p>

              <div class="truth-set-status">
                @if (competition?.has_truth_set) {
                  <div class="status-badge uploaded">
                    <mat-icon>check_circle</mat-icon>
                    <span>Truth set uploaded</span>
                  </div>
                } @else {
                  <div class="status-badge not-uploaded">
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
                    <mat-icon>description</mat-icon>
                    <span>{{ selectedFile.name }}</span>
                    <button mat-icon-button (click)="clearFile()">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
                <div class="upload-actions">
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="fileInput.click()"
                    [disabled]="uploading"
                  >
                    <mat-icon>upload_file</mat-icon>
                    {{ selectedFile ? 'Change File' : 'Select CSV File' }}
                  </button>
                  @if (selectedFile) {
                    <button
                      mat-flat-button
                      color="accent"
                      type="button"
                      (click)="uploadTruthSet()"
                      [disabled]="uploading"
                    >
                      @if (uploading) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        Upload Truth Set
                      }
                    </button>
                  }
                </div>
              </div>

              @if (uploadError) {
                <p class="error">{{ uploadError }}</p>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .edit-container {
      max-width: 700px;
      margin: 32px auto;
      padding: 0 1rem;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 64px;
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

    .section-divider {
      margin: 32px 0;
    }

    .truth-set-section {
      margin-top: 24px;
    }

    .truth-set-section h3 {
      margin: 0 0 8px 0;
    }

    .section-description {
      color: #666;
      margin: 0 0 16px 0;
      font-size: 0.875rem;
    }

    .truth-set-status {
      margin-bottom: 16px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .status-badge.uploaded {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.not-uploaded {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .status-badge mat-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
    }

    .upload-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .selected-file span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .upload-actions {
      display: flex;
      gap: 12px;
    }

    .upload-actions button {
      height: 40px;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
      .toggle-row {
        flex-direction: column;
        align-items: flex-start;
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
