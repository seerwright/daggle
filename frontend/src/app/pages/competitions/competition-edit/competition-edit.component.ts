import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompetitionService } from '../../../core/services/competition.service';
import { CompetitionFileService } from '../../../core/services/competition-file.service';
import { RuleService } from '../../../core/services/rule.service';
import { AuthService } from '../../../core/services/auth.service';
import { Competition } from '../../../core/models/competition.model';
import { CompetitionFile } from '../../../core/models/competition-file.model';
import { RuleTemplate, CompetitionRule, CompetitionRuleCreate } from '../../../core/models/rule.model';

interface Section {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-competition-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
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
    MatCheckboxModule,
    MatTooltipModule,
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
        <div class="edit-layout">
          <!-- Sidebar Navigation -->
          <aside class="edit-sidebar">
            <div class="sidebar-header">
              <h2 class="sidebar-title">Edit Competition</h2>
              <p class="sidebar-subtitle">{{ competition?.title }}</p>
            </div>
            <nav class="section-nav">
              @for (section of sections; track section.id) {
                <button
                  type="button"
                  class="nav-item"
                  [class.active]="activeSection === section.id"
                  (click)="setActiveSection(section.id)"
                >
                  <mat-icon>{{ section.icon }}</mat-icon>
                  <span>{{ section.label }}</span>
                  @if (getSectionStatus(section.id) === 'complete') {
                    <mat-icon class="status-icon complete">check_circle</mat-icon>
                  } @else if (getSectionStatus(section.id) === 'incomplete') {
                    <mat-icon class="status-icon incomplete">radio_button_unchecked</mat-icon>
                  }
                </button>
              }
            </nav>
            <div class="sidebar-footer">
              <a [routerLink]="['/competitions', slug]" class="btn btn-secondary btn-full">
                <mat-icon>arrow_back</mat-icon>
                Back to Competition
              </a>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="edit-content">
            <!-- Basics Section -->
            @if (activeSection === 'basics') {
              <section class="content-section">
                <div class="section-header">
                  <h2 class="section-title">Basic Information</h2>
                  <p class="section-description">Core details about your competition.</p>
                </div>

                <form [formGroup]="form" class="section-form">
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
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="short_description">Short Description</label>
                    <textarea
                      id="short_description"
                      class="form-input form-textarea"
                      formControlName="short_description"
                      placeholder="Brief summary of the competition"
                      rows="2"
                    ></textarea>
                    <div class="form-hint-row">
                      <span class="form-hint">Displayed in competition cards</span>
                      <span class="form-counter">{{ form.get('short_description')?.value?.length || 0 }}/500</span>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label" for="status">Status</label>
                      <mat-select id="status" formControlName="status" class="form-select">
                        <mat-option value="draft">Draft</mat-option>
                        <mat-option value="active">Active</mat-option>
                        <mat-option value="evaluation">Evaluation</mat-option>
                        <mat-option value="completed">Completed</mat-option>
                        <mat-option value="archived">Archived</mat-option>
                      </mat-select>
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="difficulty">Difficulty</label>
                      <mat-select id="difficulty" formControlName="difficulty" class="form-select">
                        <mat-option value="beginner">Beginner</mat-option>
                        <mat-option value="intermediate">Intermediate</mat-option>
                        <mat-option value="advanced">Advanced</mat-option>
                      </mat-select>
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
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="end_date">End Date</label>
                      <mat-form-field appearance="outline" class="date-field">
                        <input matInput [matDatepicker]="endPicker" formControlName="end_date" />
                        <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                        <mat-datepicker #endPicker></mat-datepicker>
                      </mat-form-field>
                    </div>
                  </div>

                  @if (form.hasError('endDateBeforeStart')) {
                    <div class="alert alert-error">End date must be after start date</div>
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
                      />
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
                      />
                    </div>
                  </div>

                  <div class="toggle-row">
                    <mat-slide-toggle formControlName="is_public">Public Competition</mat-slide-toggle>
                    <span class="toggle-hint">Public competitions are visible to all users</span>
                  </div>
                </form>

                <div class="section-actions">
                  <button class="btn btn-primary" (click)="saveBasics()" [disabled]="savingBasics">
                    @if (savingBasics) {
                      Saving...
                    } @else {
                      Save Changes
                    }
                  </button>
                  <button class="btn btn-secondary" (click)="nextSection()">
                    Next: Description
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </section>
            }

            <!-- Description Section -->
            @if (activeSection === 'description') {
              <section class="content-section">
                <div class="section-header">
                  <h2 class="section-title">Description & Evaluation</h2>
                  <p class="section-description">Detailed information about the competition and evaluation criteria.</p>
                </div>

                <form [formGroup]="form" class="section-form">
                  <div class="form-group">
                    <label class="form-label" for="description">Full Description</label>
                    <textarea
                      id="description"
                      class="form-input form-textarea form-textarea-lg"
                      formControlName="description"
                      placeholder="Detailed description, background, goals..."
                      rows="10"
                    ></textarea>
                    <span class="form-hint">Markdown is supported</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="evaluation_metric">Evaluation Metric</label>
                    <input
                      id="evaluation_metric"
                      type="text"
                      class="form-input"
                      formControlName="evaluation_metric"
                      placeholder="e.g., rmse, accuracy, f1"
                    />
                    <span class="form-hint">The metric used to score submissions</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="evaluation_description">Evaluation Description</label>
                    <textarea
                      id="evaluation_description"
                      class="form-input form-textarea"
                      formControlName="evaluation_description"
                      placeholder="Explain how submissions are evaluated..."
                      rows="4"
                    ></textarea>
                    <span class="form-hint">Detailed explanation of the evaluation process</span>
                  </div>
                </form>

                <div class="section-actions">
                  <button class="btn btn-secondary" (click)="prevSection()">
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button class="btn btn-primary" (click)="saveDescription()" [disabled]="savingDescription">
                    @if (savingDescription) {
                      Saving...
                    } @else {
                      Save Changes
                    }
                  </button>
                  <button class="btn btn-secondary" (click)="nextSection()">
                    Next: Data
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </section>
            }

            <!-- Data Section -->
            @if (activeSection === 'data') {
              <section class="content-section">
                <div class="section-header">
                  <h2 class="section-title">Data Files</h2>
                  <p class="section-description">Upload and manage competition data files.</p>
                </div>

                <!-- Files List -->
                <div class="files-manager">
                  <div class="files-header">
                    <h3 class="subsection-title">Competition Files</h3>
                    <span class="file-count">{{ files.length }} files</span>
                  </div>

                  @if (files.length === 0) {
                    <div class="empty-files">
                      <mat-icon>folder_open</mat-icon>
                      <p>No files uploaded yet</p>
                    </div>
                  } @else {
                    <div class="files-list">
                      @for (file of files; track file.id) {
                        <div class="file-row">
                          <mat-icon class="file-type-icon">{{ getFileIcon(file.filename) }}</mat-icon>
                          <div class="file-info">
                            <span class="file-name">{{ file.display_name || file.filename }}</span>
                            <span class="file-meta">{{ formatFileSize(file.file_size) }}</span>
                          </div>
                          <button
                            class="btn-icon"
                            matTooltip="Delete file"
                            (click)="deleteFile(file)"
                            [disabled]="deletingFileId === file.id"
                          >
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                  }

                  <!-- File Upload -->
                  <div class="upload-section">
                    <input
                      type="file"
                      #dataFileInput
                      (change)="onDataFileSelected($event)"
                      hidden
                    />
                    <button class="btn btn-secondary" (click)="dataFileInput.click()" [disabled]="uploadingDataFile">
                      <mat-icon>upload_file</mat-icon>
                      Upload File
                    </button>
                    @if (uploadingDataFile) {
                      <span class="upload-status">Uploading...</span>
                    }
                  </div>
                </div>

                <!-- Truth Set -->
                <div class="truth-set-manager">
                  <div class="files-header">
                    <h3 class="subsection-title">Truth Set</h3>
                    @if (competition?.has_truth_set) {
                      <span class="badge badge-success">Uploaded</span>
                    } @else {
                      <span class="badge badge-warning">Not uploaded</span>
                    }
                  </div>
                  <p class="subsection-hint">CSV file with 'id' and 'target' columns for scoring submissions.</p>

                  <div class="upload-section">
                    <input
                      type="file"
                      #truthSetInput
                      accept=".csv"
                      (change)="onTruthSetSelected($event)"
                      hidden
                    />
                    <button class="btn btn-secondary" (click)="truthSetInput.click()" [disabled]="uploadingTruthSet">
                      <mat-icon>upload_file</mat-icon>
                      {{ competition?.has_truth_set ? 'Replace Truth Set' : 'Upload Truth Set' }}
                    </button>
                    @if (uploadingTruthSet) {
                      <span class="upload-status">Uploading...</span>
                    }
                  </div>
                </div>

                <!-- Thumbnail -->
                <div class="thumbnail-manager">
                  <div class="files-header">
                    <h3 class="subsection-title">Thumbnail</h3>
                  </div>

                  <div class="thumbnail-preview-small">
                    @if (thumbnailPreview) {
                      <img [src]="thumbnailPreview" alt="New thumbnail" />
                    } @else if (competition?.thumbnail_url) {
                      <img [src]="competition!.thumbnail_url" alt="Current thumbnail" />
                    } @else {
                      <div class="no-thumbnail-small">
                        <mat-icon>image</mat-icon>
                      </div>
                    }
                  </div>

                  <div class="upload-section">
                    <input
                      type="file"
                      #thumbnailInput
                      accept=".png,.jpg,.jpeg,.webp"
                      (change)="onThumbnailSelected($event)"
                      hidden
                    />
                    <button class="btn btn-secondary" (click)="thumbnailInput.click()" [disabled]="uploadingThumbnail">
                      <mat-icon>image</mat-icon>
                      {{ competition?.thumbnail_url ? 'Change Thumbnail' : 'Upload Thumbnail' }}
                    </button>
                    @if (selectedThumbnail) {
                      <button class="btn btn-primary" (click)="uploadThumbnail()" [disabled]="uploadingThumbnail">
                        @if (uploadingThumbnail) { Uploading... } @else { Save Thumbnail }
                      </button>
                    }
                  </div>
                </div>

                <div class="section-actions">
                  <button class="btn btn-secondary" (click)="prevSection()">
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button class="btn btn-secondary" (click)="nextSection()">
                    Next: Rules
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </section>
            }

            <!-- Rules Section -->
            @if (activeSection === 'rules') {
              <section class="content-section">
                <div class="section-header">
                  <h2 class="section-title">Competition Rules</h2>
                  <p class="section-description">Select rules that apply to your competition.</p>
                </div>

                <div class="rules-editor">
                  @if (loadingTemplates) {
                    <div class="loading-inline">
                      <mat-spinner diameter="24"></mat-spinner>
                      <span>Loading rule templates...</span>
                    </div>
                  } @else {
                    @for (category of ruleCategories; track category) {
                      <div class="rule-category">
                        <h3 class="category-title">{{ category }}</h3>
                        <div class="rule-list">
                          @for (template of getTemplatesByCategory(category); track template.id) {
                            <div class="rule-item">
                              <mat-checkbox
                                [checked]="isRuleEnabled(template.id)"
                                (change)="toggleRule(template, $event.checked)"
                              >
                                <span class="rule-text">
                                  @if (template.has_parameter) {
                                    {{ formatTemplateText(template) }}
                                  } @else {
                                    {{ template.template_text }}
                                  }
                                </span>
                              </mat-checkbox>
                              @if (template.has_parameter && isRuleEnabled(template.id)) {
                                <div class="rule-parameter">
                                  <label class="param-label">{{ template.parameter_label }}:</label>
                                  <input
                                    type="{{ template.parameter_type === 'number' ? 'number' : 'text' }}"
                                    class="param-input"
                                    [value]="getRuleParameterValue(template.id)"
                                    (change)="updateRuleParameter(template.id, $event)"
                                  />
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Custom Rules -->
                    <div class="rule-category">
                      <h3 class="category-title">Custom Rules</h3>
                      <div class="custom-rules">
                        @for (rule of customRules; track rule.id || $index) {
                          <div class="custom-rule-item">
                            <input
                              type="text"
                              class="form-input"
                              [value]="rule.custom_text"
                              (change)="updateCustomRule($index, $event)"
                              placeholder="Enter custom rule..."
                            />
                            <button class="btn-icon" (click)="removeCustomRule($index)">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                        }
                        <button class="btn btn-secondary btn-sm" (click)="addCustomRule()">
                          <mat-icon>add</mat-icon>
                          Add Custom Rule
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <div class="section-actions">
                  <button class="btn btn-secondary" (click)="prevSection()">
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button class="btn btn-primary" (click)="saveRules()" [disabled]="savingRules">
                    @if (savingRules) { Saving... } @else { Save Rules }
                  </button>
                  <button class="btn btn-secondary" (click)="nextSection()">
                    Next: Review
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </section>
            }

            <!-- Review Section -->
            @if (activeSection === 'review') {
              <section class="content-section">
                <div class="section-header">
                  <h2 class="section-title">Review & Publish</h2>
                  <p class="section-description">Review your competition settings before publishing.</p>
                </div>

                <div class="review-grid">
                  <div class="review-card">
                    <div class="review-card-header">
                      <mat-icon>info</mat-icon>
                      <h3>Basic Information</h3>
                      <button class="btn-link" (click)="setActiveSection('basics')">Edit</button>
                    </div>
                    <div class="review-card-content">
                      <div class="review-item">
                        <span class="review-label">Title</span>
                        <span class="review-value">{{ form.get('title')?.value }}</span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">Status</span>
                        <span class="review-value badge" [class]="'badge-' + form.get('status')?.value">
                          {{ form.get('status')?.value }}
                        </span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">Dates</span>
                        <span class="review-value">
                          {{ form.get('start_date')?.value | date:'mediumDate' }} -
                          {{ form.get('end_date')?.value | date:'mediumDate' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="review-card">
                    <div class="review-card-header">
                      <mat-icon>description</mat-icon>
                      <h3>Description</h3>
                      <button class="btn-link" (click)="setActiveSection('description')">Edit</button>
                    </div>
                    <div class="review-card-content">
                      <div class="review-item">
                        <span class="review-label">Evaluation Metric</span>
                        <span class="review-value">{{ form.get('evaluation_metric')?.value }}</span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">Description Length</span>
                        <span class="review-value">{{ form.get('description')?.value?.length || 0 }} characters</span>
                      </div>
                    </div>
                  </div>

                  <div class="review-card">
                    <div class="review-card-header">
                      <mat-icon>folder</mat-icon>
                      <h3>Data Files</h3>
                      <button class="btn-link" (click)="setActiveSection('data')">Edit</button>
                    </div>
                    <div class="review-card-content">
                      <div class="review-item">
                        <span class="review-label">Files</span>
                        <span class="review-value">{{ files.length }} uploaded</span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">Truth Set</span>
                        <span class="review-value">
                          @if (competition?.has_truth_set) {
                            <mat-icon class="check-icon">check_circle</mat-icon> Uploaded
                          } @else {
                            <mat-icon class="warning-icon">warning</mat-icon> Not uploaded
                          }
                        </span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">Thumbnail</span>
                        <span class="review-value">
                          @if (competition?.thumbnail_url) {
                            <mat-icon class="check-icon">check_circle</mat-icon> Uploaded
                          } @else {
                            <mat-icon class="muted-icon">remove_circle_outline</mat-icon> None
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="review-card">
                    <div class="review-card-header">
                      <mat-icon>gavel</mat-icon>
                      <h3>Rules</h3>
                      <button class="btn-link" (click)="setActiveSection('rules')">Edit</button>
                    </div>
                    <div class="review-card-content">
                      <div class="review-item">
                        <span class="review-label">Active Rules</span>
                        <span class="review-value">{{ getEnabledRulesCount() }} rules configured</span>
                      </div>
                    </div>
                  </div>
                </div>

                @if (form.get('status')?.value === 'draft') {
                  <div class="publish-section">
                    <div class="publish-info">
                      <mat-icon>info</mat-icon>
                      <p>Your competition is currently in <strong>draft</strong> mode and is not visible to participants.</p>
                    </div>
                    <button class="btn btn-primary btn-lg" (click)="publishCompetition()" [disabled]="publishing">
                      @if (publishing) {
                        Publishing...
                      } @else {
                        <mat-icon>rocket_launch</mat-icon>
                        Publish Competition
                      }
                    </button>
                  </div>
                }

                <div class="section-actions">
                  <button class="btn btn-secondary" (click)="prevSection()">
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <a [routerLink]="['/competitions', slug]" class="btn btn-primary">
                    <mat-icon>visibility</mat-icon>
                    View Competition
                  </a>
                </div>
              </section>
            }

            @if (error) {
              <div class="alert alert-error floating-alert">{{ error }}</div>
            }
          </main>
        </div>
      }
    </div>
  `,
  styles: [`
    .edit-page {
      min-height: calc(100vh - 64px);
      background-color: var(--color-background);
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: var(--space-12);
    }

    .loading-text { margin-top: var(--space-4); color: var(--color-text-muted); }

    .error-icon {
      font-size: 48px; width: 48px; height: 48px;
      color: var(--color-error); margin-bottom: var(--space-4);
    }

    .error-title {
      font-family: var(--font-display);
      font-size: var(--text-xl); font-weight: 600;
      margin: 0 0 var(--space-2);
    }

    .error-message { color: var(--color-text-muted); margin: 0 0 var(--space-6); }

    /* Layout */
    .edit-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: calc(100vh - 64px);
    }

    /* Sidebar */
    .edit-sidebar {
      background-color: var(--color-surface);
      border-right: 1px solid var(--color-border);
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 64px;
      height: calc(100vh - 64px);
    }

    .sidebar-header { margin-bottom: var(--space-6); }

    .sidebar-title {
      font-family: var(--font-display);
      font-size: var(--text-lg); font-weight: 600;
      margin: 0 0 var(--space-1);
    }

    .sidebar-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .section-nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      color: var(--color-text-secondary);
      transition: all 150ms ease;

      &:hover { background-color: var(--color-surface-hover); }

      &.active {
        background-color: var(--color-accent-light);
        color: var(--color-accent);

        mat-icon:first-child { color: var(--color-accent); }
      }

      mat-icon:first-child { font-size: 20px; width: 20px; height: 20px; }

      span { flex: 1; font-weight: 500; }

      .status-icon {
        font-size: 16px; width: 16px; height: 16px;
        &.complete { color: var(--color-success); }
        &.incomplete { color: var(--color-text-muted); }
      }
    }

    .sidebar-footer { margin-top: auto; padding-top: var(--space-4); }

    /* Content */
    .edit-content {
      padding: var(--space-8);
      max-width: 900px;
    }

    .content-section {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
    }

    .section-header { margin-bottom: var(--space-6); }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-2xl); font-weight: 600;
      margin: 0 0 var(--space-2);
    }

    .section-description {
      font-size: var(--text-base);
      color: var(--color-text-muted);
      margin: 0;
    }

    .section-form { display: flex; flex-direction: column; gap: var(--space-5); }

    .section-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-8);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-border);
    }

    /* Form Elements */
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .form-group { display: flex; flex-direction: column; gap: var(--space-2); }
    .form-label { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-primary); }

    .form-input {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-base);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-surface);

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-light);
      }

      &.error { border-color: var(--color-error); }
    }

    .form-textarea { resize: vertical; min-height: 80px; }
    .form-textarea-lg { min-height: 200px; }

    .form-hint-row { display: flex; justify-content: space-between; }
    .form-hint { font-size: var(--text-xs); color: var(--color-text-muted); }
    .form-counter { font-size: var(--text-xs); color: var(--color-text-muted); font-family: var(--font-mono); }
    .form-error { font-size: var(--text-xs); color: var(--color-error); }
    .form-select { width: 100%; }
    .date-field { width: 100%; }

    .toggle-row {
      display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-3) 0;
    }

    .toggle-hint { font-size: var(--text-sm); color: var(--color-text-muted); }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-decoration: none;
      transition: all 150ms ease;

      &:disabled { opacity: 0.6; cursor: not-allowed; }

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: white;

      &:hover:not(:disabled) { background-color: var(--color-accent-hover); }
    }

    .btn-secondary {
      background-color: transparent;
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-strong);

      &:hover:not(:disabled) { background-color: var(--color-surface-muted); }
    }

    .btn-full { width: 100%; }
    .btn-sm { padding: var(--space-2) var(--space-3); font-size: var(--text-sm); }
    .btn-lg { padding: var(--space-4) var(--space-6); font-size: var(--text-lg); }

    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      cursor: pointer;

      &:hover { color: var(--color-error); background-color: var(--color-error-light); }
    }

    .btn-link {
      background: none;
      border: none;
      color: var(--color-accent);
      cursor: pointer;
      font-size: var(--text-sm);

      &:hover { text-decoration: underline; }
    }

    /* Files Manager */
    .files-manager, .truth-set-manager, .thumbnail-manager {
      margin-bottom: var(--space-6);
      padding-bottom: var(--space-6);
      border-bottom: 1px solid var(--color-border);
    }

    .files-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .subsection-title {
      font-size: var(--text-base);
      font-weight: 600;
      margin: 0;
    }

    .subsection-hint {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-4);
    }

    .file-count { font-size: var(--text-sm); color: var(--color-text-muted); }

    .empty-files {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-6);
      background-color: var(--color-surface-muted);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);

      mat-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: var(--space-2); }
    }

    .files-list { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }

    .file-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      background-color: var(--color-surface-muted);
      border-radius: var(--radius-md);
    }

    .file-type-icon { color: var(--color-accent); }
    .file-info { flex: 1; }
    .file-name { font-weight: 500; display: block; }
    .file-meta { font-size: var(--text-xs); color: var(--color-text-muted); }

    .upload-section { display: flex; align-items: center; gap: var(--space-3); }
    .upload-status { font-size: var(--text-sm); color: var(--color-text-muted); }

    .thumbnail-preview-small {
      width: 200px;
      aspect-ratio: 2 / 1;
      margin-bottom: var(--space-4);
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--color-border);

      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .no-thumbnail-small {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background-color: var(--color-surface-muted);
      color: var(--color-text-muted);

      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }

    /* Rules Editor */
    .rules-editor { display: flex; flex-direction: column; gap: var(--space-6); }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--color-text-muted);
    }

    .rule-category {
      background-color: var(--color-surface-muted);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
    }

    .category-title {
      font-size: var(--text-base);
      font-weight: 600;
      margin: 0 0 var(--space-4);
      color: var(--color-text-primary);
    }

    .rule-list { display: flex; flex-direction: column; gap: var(--space-3); }

    .rule-item { display: flex; flex-direction: column; gap: var(--space-2); }
    .rule-text { font-size: var(--text-sm); }

    .rule-parameter {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-left: var(--space-8);
    }

    .param-label { font-size: var(--text-sm); color: var(--color-text-muted); }

    .param-input {
      width: 100px;
      padding: var(--space-2);
      font-size: var(--text-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .custom-rules { display: flex; flex-direction: column; gap: var(--space-3); }

    .custom-rule-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      .form-input { flex: 1; }
    }

    /* Review */
    .review-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);
    }

    .review-card {
      background-color: var(--color-surface-muted);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .review-card-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4);
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);

      mat-icon { color: var(--color-accent); }
      h3 { flex: 1; font-size: var(--text-base); font-weight: 600; margin: 0; }
    }

    .review-card-content { padding: var(--space-4); }

    .review-item {
      display: flex;
      justify-content: space-between;
      padding: var(--space-2) 0;

      &:not(:last-child) { border-bottom: 1px solid var(--color-border); }
    }

    .review-label { font-size: var(--text-sm); color: var(--color-text-muted); }
    .review-value { font-size: var(--text-sm); font-weight: 500; display: flex; align-items: center; gap: var(--space-1); }

    .check-icon { color: var(--color-success); font-size: 16px; width: 16px; height: 16px; }
    .warning-icon { color: var(--color-warning); font-size: 16px; width: 16px; height: 16px; }
    .muted-icon { color: var(--color-text-muted); font-size: 16px; width: 16px; height: 16px; }

    .publish-section {
      margin-top: var(--space-6);
      padding: var(--space-6);
      background-color: var(--color-accent-light);
      border-radius: var(--radius-lg);
      text-align: center;
    }

    .publish-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
      color: var(--color-accent);

      mat-icon { flex-shrink: 0; }
      p { margin: 0; }
    }

    .badge {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-sm);
      text-transform: capitalize;
    }

    .badge-success { background-color: var(--color-success-light); color: var(--color-success); }
    .badge-warning { background-color: var(--color-warning-light); color: var(--color-warning); }
    .badge-draft { background-color: var(--color-surface-muted); color: var(--color-text-muted); }
    .badge-active { background-color: var(--color-success-light); color: var(--color-success); }
    .badge-evaluation { background-color: var(--color-info-light); color: var(--color-info); }
    .badge-completed { background-color: var(--color-accent-light); color: var(--color-accent); }

    .alert { padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); }
    .alert-error { background-color: var(--color-error-light); color: var(--color-error); }

    .floating-alert {
      position: fixed;
      bottom: var(--space-6);
      right: var(--space-6);
      z-index: 100;
    }

    @media (max-width: 900px) {
      .edit-layout { grid-template-columns: 1fr; }

      .edit-sidebar {
        position: relative;
        top: 0;
        height: auto;
        border-right: none;
        border-bottom: 1px solid var(--color-border);
      }

      .section-nav { flex-direction: row; flex-wrap: wrap; }

      .nav-item span { display: none; }

      .review-grid { grid-template-columns: 1fr; }

      .form-row { grid-template-columns: 1fr; }
    }
  `],
})
export class CompetitionEditComponent implements OnInit {
  sections: Section[] = [
    { id: 'basics', label: 'Basics', icon: 'info' },
    { id: 'description', label: 'Description', icon: 'description' },
    { id: 'data', label: 'Data', icon: 'folder' },
    { id: 'rules', label: 'Rules', icon: 'gavel' },
    { id: 'review', label: 'Review', icon: 'visibility' },
  ];

  activeSection = 'basics';
  form!: FormGroup;
  competition: Competition | null = null;
  loadingCompetition = true;
  loadError = '';
  error = '';
  slug = '';

  // Saving states
  savingBasics = false;
  savingDescription = false;
  savingRules = false;
  publishing = false;

  // Files
  files: CompetitionFile[] = [];
  uploadingDataFile = false;
  deletingFileId: number | null = null;

  // Truth set
  uploadingTruthSet = false;

  // Thumbnail
  selectedThumbnail: File | null = null;
  thumbnailPreview: string | null = null;
  uploadingThumbnail = false;

  // Rules
  ruleTemplates: RuleTemplate[] = [];
  competitionRules: CompetitionRule[] = [];
  customRules: { id?: number; custom_text: string }[] = [];
  loadingTemplates = true;
  ruleCategories: string[] = [];
  enabledRules: Map<number, { enabled: boolean; parameterValue: string }> = new Map();

  constructor(
    private fb: FormBuilder,
    private competitionService: CompetitionService,
    private fileService: CompetitionFileService,
    private ruleService: RuleService,
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
      this.loadFiles();
      this.loadRuleTemplates();
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
      evaluation_metric: ['', [Validators.required]],
      evaluation_description: [''],
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
        this.checkPermissionsAndLoadForm(competition);
        this.loadCompetitionRules();
      },
      error: (err) => {
        this.loadError = err.error?.detail || 'Failed to load competition';
        this.loadingCompetition = false;
      },
    });
  }

  private loadFiles(): void {
    this.fileService.list(this.slug).subscribe({
      next: (files) => this.files = files,
      error: () => {},
    });
  }

  private loadRuleTemplates(): void {
    this.ruleService.listTemplates().subscribe({
      next: (templates) => {
        this.ruleTemplates = templates;
        this.ruleCategories = [...new Set(templates.map(t => t.category))];
        this.loadingTemplates = false;
      },
      error: () => this.loadingTemplates = false,
    });
  }

  private loadCompetitionRules(): void {
    this.ruleService.listRules(this.slug, false).subscribe({
      next: (rules) => {
        this.competitionRules = rules;
        this.customRules = rules
          .filter(r => r.custom_text)
          .map(r => ({ id: r.id, custom_text: r.custom_text! }));

        // Initialize enabled rules map
        rules.filter(r => r.rule_template_id).forEach(r => {
          this.enabledRules.set(r.rule_template_id!, {
            enabled: r.is_enabled,
            parameterValue: r.parameter_value || '',
          });
        });
      },
      error: () => {},
    });
  }

  private checkPermissionsAndLoadForm(competition: Competition): void {
    const user = this.authService.currentUser();

    if (!user) {
      const checkUser = setInterval(() => {
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          clearInterval(checkUser);
          this.validateAndPopulateForm(competition, currentUser);
        }
      }, 100);

      setTimeout(() => {
        if (!this.authService.currentUser()) {
          this.loadError = 'You must be logged in to edit this competition';
          this.loadingCompetition = false;
        }
      }, 1000);
    } else {
      this.validateAndPopulateForm(competition, user);
    }
  }

  private validateAndPopulateForm(competition: Competition, user: { id: number; role: string }): void {
    if (user.id !== competition.sponsor_id && user.role !== 'admin') {
      this.loadError = 'You do not have permission to edit this competition';
      this.loadingCompetition = false;
      return;
    }

    this.form.patchValue({
      title: competition.title,
      short_description: competition.short_description,
      description: competition.description,
      status: competition.status,
      difficulty: competition.difficulty,
      evaluation_metric: competition.evaluation_metric,
      evaluation_description: competition.evaluation_description || '',
      start_date: new Date(competition.start_date),
      end_date: new Date(competition.end_date),
      max_team_size: competition.max_team_size,
      daily_submission_limit: competition.daily_submission_limit,
      is_public: competition.is_public,
    });

    this.loadingCompetition = false;
  }

  dateValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('start_date')?.value;
    const endDate = control.get('end_date')?.value;
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return { endDateBeforeStart: true };
    }
    return null;
  }

  // Section Navigation
  setActiveSection(sectionId: string): void {
    this.activeSection = sectionId;
  }

  nextSection(): void {
    const currentIndex = this.sections.findIndex(s => s.id === this.activeSection);
    if (currentIndex < this.sections.length - 1) {
      this.activeSection = this.sections[currentIndex + 1].id;
    }
  }

  prevSection(): void {
    const currentIndex = this.sections.findIndex(s => s.id === this.activeSection);
    if (currentIndex > 0) {
      this.activeSection = this.sections[currentIndex - 1].id;
    }
  }

  getSectionStatus(sectionId: string): 'complete' | 'incomplete' | 'none' {
    switch (sectionId) {
      case 'basics':
        return this.form.get('title')?.valid ? 'complete' : 'incomplete';
      case 'description':
        return this.form.get('description')?.valid ? 'complete' : 'incomplete';
      case 'data':
        return this.files.length > 0 ? 'complete' : 'incomplete';
      case 'rules':
        return this.getEnabledRulesCount() > 0 ? 'complete' : 'incomplete';
      default:
        return 'none';
    }
  }

  // Save Methods
  saveBasics(): void {
    this.savingBasics = true;
    this.saveForm(() => this.savingBasics = false);
  }

  saveDescription(): void {
    this.savingDescription = true;
    this.saveForm(() => this.savingDescription = false);
  }

  private saveForm(callback: () => void): void {
    const formValue = this.form.value;
    const data = {
      ...formValue,
      start_date: new Date(formValue.start_date).toISOString(),
      end_date: new Date(formValue.end_date).toISOString(),
    };

    this.competitionService.update(this.slug, data).subscribe({
      next: (competition) => {
        this.competition = competition;
        this.slug = competition.slug;
        this.snackBar.open('Changes saved!', 'Close', { duration: 2000 });
        callback();
      },
      error: (err) => {
        this.error = err.error?.detail || 'Failed to save changes';
        callback();
        setTimeout(() => this.error = '', 5000);
      },
    });
  }

  // File Management
  onDataFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadingDataFile = true;
      this.fileService.upload(this.slug, input.files[0]).subscribe({
        next: (file) => {
          this.files.push(file);
          this.uploadingDataFile = false;
          this.snackBar.open('File uploaded!', 'Close', { duration: 2000 });
        },
        error: (err) => {
          this.uploadingDataFile = false;
          this.error = err.error?.detail || 'Failed to upload file';
          setTimeout(() => this.error = '', 5000);
        },
      });
    }
  }

  deleteFile(file: CompetitionFile): void {
    this.deletingFileId = file.id;
    this.fileService.delete(this.slug, file.id).subscribe({
      next: () => {
        this.files = this.files.filter(f => f.id !== file.id);
        this.deletingFileId = null;
        this.snackBar.open('File deleted', 'Close', { duration: 2000 });
      },
      error: () => {
        this.deletingFileId = null;
        this.error = 'Failed to delete file';
        setTimeout(() => this.error = '', 5000);
      },
    });
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      csv: 'table_chart', json: 'data_object', txt: 'description',
      pdf: 'picture_as_pdf', zip: 'folder_zip', gz: 'folder_zip',
    };
    return iconMap[ext] || 'insert_drive_file';
  }

  formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  // Truth Set
  onTruthSetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadingTruthSet = true;
      this.competitionService.uploadTruthSet(this.slug, input.files[0]).subscribe({
        next: (competition) => {
          this.competition = competition;
          this.uploadingTruthSet = false;
          this.snackBar.open('Truth set uploaded!', 'Close', { duration: 2000 });
        },
        error: (err) => {
          this.uploadingTruthSet = false;
          this.error = err.error?.detail || 'Failed to upload truth set';
          setTimeout(() => this.error = '', 5000);
        },
      });
    }
  }

  // Thumbnail
  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedThumbnail = input.files[0];
      this.thumbnailPreview = URL.createObjectURL(this.selectedThumbnail);
    }
  }

  uploadThumbnail(): void {
    if (!this.selectedThumbnail) return;

    this.uploadingThumbnail = true;
    this.competitionService.uploadThumbnail(this.slug, this.selectedThumbnail).subscribe({
      next: (competition) => {
        this.competition = competition;
        this.uploadingThumbnail = false;
        if (this.thumbnailPreview) URL.revokeObjectURL(this.thumbnailPreview);
        this.thumbnailPreview = null;
        this.selectedThumbnail = null;
        this.snackBar.open('Thumbnail uploaded!', 'Close', { duration: 2000 });
      },
      error: (err) => {
        this.uploadingThumbnail = false;
        this.error = err.error?.detail || 'Failed to upload thumbnail';
        setTimeout(() => this.error = '', 5000);
      },
    });
  }

  // Rules
  getTemplatesByCategory(category: string): RuleTemplate[] {
    return this.ruleTemplates.filter(t => t.category === category);
  }

  isRuleEnabled(templateId: number): boolean {
    return this.enabledRules.get(templateId)?.enabled ?? false;
  }

  getRuleParameterValue(templateId: number): string {
    return this.enabledRules.get(templateId)?.parameterValue ?? '';
  }

  toggleRule(template: RuleTemplate, enabled: boolean): void {
    this.enabledRules.set(template.id, {
      enabled,
      parameterValue: this.enabledRules.get(template.id)?.parameterValue ?? '',
    });
  }

  updateRuleParameter(templateId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.enabledRules.get(templateId);
    if (current) {
      this.enabledRules.set(templateId, { ...current, parameterValue: value });
    }
  }

  formatTemplateText(template: RuleTemplate): string {
    const value = this.getRuleParameterValue(template.id) || `[${template.parameter_label}]`;
    return template.template_text
      .replace('{n}', value)
      .replace('{date}', value)
      .replace('{text}', value);
  }

  addCustomRule(): void {
    this.customRules.push({ custom_text: '' });
  }

  removeCustomRule(index: number): void {
    this.customRules.splice(index, 1);
  }

  updateCustomRule(index: number, event: Event): void {
    this.customRules[index].custom_text = (event.target as HTMLInputElement).value;
  }

  getEnabledRulesCount(): number {
    const templateRules = Array.from(this.enabledRules.values()).filter(r => r.enabled).length;
    const customRulesCount = this.customRules.filter(r => r.custom_text.trim()).length;
    return templateRules + customRulesCount;
  }

  saveRules(): void {
    this.savingRules = true;

    const rules: CompetitionRuleCreate[] = [];

    // Template rules
    let order = 0;
    this.enabledRules.forEach((value, templateId) => {
      if (value.enabled) {
        rules.push({
          rule_template_id: templateId,
          parameter_value: value.parameterValue || null,
          display_order: order++,
        });
      }
    });

    // Custom rules
    this.customRules.forEach(rule => {
      if (rule.custom_text.trim()) {
        rules.push({
          custom_text: rule.custom_text.trim(),
          display_order: order++,
        });
      }
    });

    this.ruleService.bulkUpdateRules(this.slug, rules).subscribe({
      next: (savedRules) => {
        this.competitionRules = savedRules;
        this.savingRules = false;
        this.snackBar.open('Rules saved!', 'Close', { duration: 2000 });
      },
      error: (err) => {
        this.savingRules = false;
        this.error = err.error?.detail || 'Failed to save rules';
        setTimeout(() => this.error = '', 5000);
      },
    });
  }

  // Publish
  publishCompetition(): void {
    this.publishing = true;
    const data = { status: 'active' as const };

    this.competitionService.update(this.slug, data).subscribe({
      next: (competition) => {
        this.competition = competition;
        this.form.patchValue({ status: 'active' });
        this.publishing = false;
        this.snackBar.open('Competition published!', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.publishing = false;
        this.error = err.error?.detail || 'Failed to publish competition';
        setTimeout(() => this.error = '', 5000);
      },
    });
  }
}
