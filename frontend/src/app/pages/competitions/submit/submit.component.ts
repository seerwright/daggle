import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SubmissionService } from '../../../core/services/submission.service';
import { Submission } from '../../../core/models/submission.model';
import { Competition } from '../../../core/models/competition.model';

@Component({
  selector: 'app-submit',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="submit-container">
      <div class="upload-section">
        <div class="section-header">
          <h2 class="section-title">Submit Predictions</h2>
          <p class="section-subtitle">Upload a CSV file with your predictions</p>
        </div>

        <div
          class="drop-zone"
          [class.drag-over]="isDragOver"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <div class="drop-zone-icon">
            <mat-icon>cloud_upload</mat-icon>
          </div>
          <p class="drop-zone-text">Drag & drop your CSV file here</p>
          <p class="drop-zone-or">or</p>
          <button type="button" class="btn btn-secondary" (click)="$event.stopPropagation(); fileInput.click()">
            Browse Files
          </button>
          <input
            #fileInput
            type="file"
            accept=".csv"
            hidden
            (change)="onFileSelected($event)"
          />
        </div>

        @if (selectedFile) {
          <div class="selected-file">
            <mat-icon class="file-icon">description</mat-icon>
            <span class="file-name">{{ selectedFile.name }}</span>
            <button type="button" class="file-remove" (click)="clearFile()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }

        @if (uploading) {
          <div class="upload-progress">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <span class="progress-text">Uploading...</span>
          </div>
        }

        <div class="submit-actions">
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!selectedFile || uploading"
            (click)="submit()"
          >
            Submit Predictions
          </button>
          <span class="limit-info">
            <mat-icon>info_outline</mat-icon>
            Daily limit: {{ competition?.daily_submission_limit }} submissions
          </span>
        </div>
      </div>

      <div class="history-section">
        <div class="section-header">
          <h2 class="section-title">Your Submissions</h2>
          <span class="submission-count">{{ submissions.length }} total</span>
        </div>

        @if (submissions.length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">upload_file</mat-icon>
            <p class="empty-text">No submissions yet</p>
            <p class="empty-description">Upload your first prediction file to get started</p>
          </div>
        } @else {
          <div class="submissions-table-container">
            <table mat-table [dataSource]="submissions" class="submissions-table">
              <ng-container matColumnDef="file">
                <th mat-header-cell *matHeaderCellDef>File</th>
                <td mat-cell *matCellDef="let sub">
                  <span class="file-cell">{{ sub.file_name }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let sub">
                  <span class="status-badge" [class]="'status-' + sub.status">
                    {{ sub.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="score">
                <th mat-header-cell *matHeaderCellDef>Score</th>
                <td mat-cell *matCellDef="let sub">
                  <span class="score-cell">
                    {{ sub.public_score !== null ? (sub.public_score | number:'1.4-4') : '—' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Submitted</th>
                <td mat-cell *matCellDef="let sub">
                  <span class="date-cell">{{ sub.created_at | date:'MMM d, h:mm a' }}</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="submissionColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: submissionColumns;"></tr>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .submit-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-6);
    }

    @media (max-width: 900px) {
      .submit-container {
        grid-template-columns: 1fr;
      }
    }

    .upload-section,
    .history-section {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }

    .section-header {
      margin-bottom: var(--space-5);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
    }

    .section-subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .submission-count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .drop-zone {
      border: 2px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      padding: var(--space-10);
      text-align: center;
      transition: all var(--transition-fast);
      cursor: pointer;
      background-color: var(--color-surface-muted);
    }

    .drop-zone:hover,
    .drop-zone.drag-over {
      border-color: var(--color-accent);
      background-color: var(--color-accent-light);
    }

    .drop-zone-icon {
      margin-bottom: var(--space-3);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--color-accent);
      }
    }

    .drop-zone-text {
      font-size: var(--text-base);
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-2);
    }

    .drop-zone-or {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: var(--space-2) 0;
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-surface-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-top: var(--space-4);
    }

    .file-icon {
      color: var(--color-accent);
    }

    .file-name {
      flex: 1;
      font-size: var(--text-sm);
      font-family: var(--font-mono);
      color: var(--color-text-primary);
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

    .upload-progress {
      margin-top: var(--space-4);

      .progress-text {
        display: block;
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        margin-top: var(--space-2);
        text-align: center;
      }
    }

    .submit-actions {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-top: var(--space-5);
      padding-top: var(--space-5);
      border-top: 1px solid var(--color-border);
    }

    .limit-info {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:disabled {
        opacity: 0.5;
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

    .btn-secondary {
      background-color: transparent;
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-strong);

      &:hover:not(:disabled) {
        background-color: var(--color-surface-muted);
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--space-10);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-3);
    }

    .empty-text {
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-1);
    }

    .empty-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .submissions-table-container {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .submissions-table {
      width: 100%;
    }

    .file-cell {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
    }

    .score-cell {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-accent);
    }

    .date-cell {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .status-badge {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-full);
      text-transform: capitalize;
    }

    .status-scored {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .status-pending,
    .status-processing {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .status-failed {
      background-color: var(--color-error-light);
      color: var(--color-error);
    }
  `],
})
export class SubmitComponent implements OnInit {
  @Input() slug!: string;
  @Input() competition!: Competition;

  selectedFile: File | null = null;
  isDragOver = false;
  uploading = false;
  submissions: Submission[] = [];
  submissionColumns = ['file', 'status', 'score', 'date'];

  constructor(
    private submissionService: SubmissionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.submissionService.listMySubmissions(this.slug).subscribe({
      next: (data) => {
        this.submissions = data;
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectFile(input.files[0]);
    }
  }

  selectFile(file: File): void {
    if (!file.name.endsWith('.csv')) {
      this.snackBar.open('Only CSV files are accepted', 'Close', {
        duration: 3000,
      });
      return;
    }
    this.selectedFile = file;
  }

  clearFile(): void {
    this.selectedFile = null;
  }

  submit(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.submissionService.submit(this.slug, this.selectedFile).subscribe({
      next: (submission) => {
        this.uploading = false;
        this.selectedFile = null;
        this.submissions.unshift(submission);
        this.snackBar.open('Submission uploaded successfully!', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.uploading = false;
        this.snackBar.open(
          err.error?.detail || 'Upload failed',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }
}
