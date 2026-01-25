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
      <mat-card class="upload-card">
        <mat-card-header>
          <mat-card-title>Submit Predictions</mat-card-title>
          <mat-card-subtitle>
            Upload a CSV file with your predictions
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div
            class="drop-zone"
            [class.drag-over]="isDragOver"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <mat-icon>cloud_upload</mat-icon>
            <p>Drag & drop your CSV file here</p>
            <p class="or">or</p>
            <button mat-stroked-button (click)="fileInput.click()">
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
              <mat-icon>description</mat-icon>
              <span>{{ selectedFile.name }}</span>
              <button mat-icon-button (click)="clearFile()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }

          @if (uploading) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }
        </mat-card-content>
        <mat-card-actions>
          <button
            mat-flat-button
            color="primary"
            [disabled]="!selectedFile || uploading"
            (click)="submit()"
          >
            Submit
          </button>
          <span class="limit-info">
            Daily limit: {{ competition?.daily_submission_limit }} submissions
          </span>
        </mat-card-actions>
      </mat-card>

      <mat-card class="history-card">
        <mat-card-header>
          <mat-card-title>Your Submissions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (submissions.length === 0) {
            <p class="empty">No submissions yet.</p>
          } @else {
            <table mat-table [dataSource]="submissions">
              <ng-container matColumnDef="file">
                <th mat-header-cell *matHeaderCellDef>File</th>
                <td mat-cell *matCellDef="let sub">{{ sub.file_name }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let sub">
                  <mat-chip [class]="'status-' + sub.status">
                    {{ sub.status }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="score">
                <th mat-header-cell *matHeaderCellDef>Score</th>
                <td mat-cell *matCellDef="let sub">
                  {{ sub.public_score !== null ? (sub.public_score | number:'1.4-4') : '-' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Submitted</th>
                <td mat-cell *matCellDef="let sub">
                  {{ sub.created_at | date:'short' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="submissionColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: submissionColumns;"></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .submit-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 900px) {
      .submit-container {
        grid-template-columns: 1fr;
      }
    }
    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 48px;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: #1976d2;
      background: #e3f2fd;
    }
    .drop-zone mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
    }
    .drop-zone .or {
      color: #999;
      margin: 8px 0;
    }
    .selected-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-top: 16px;
    }
    .selected-file span {
      flex: 1;
    }
    mat-card-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .limit-info {
      color: #666;
      font-size: 0.875rem;
    }
    .empty {
      text-align: center;
      color: #666;
      padding: 24px;
    }
    table {
      width: 100%;
    }
    .status-scored {
      background-color: #4caf50 !important;
      color: white !important;
    }
    .status-pending, .status-processing {
      background-color: #ff9800 !important;
    }
    .status-failed {
      background-color: #f44336 !important;
      color: white !important;
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
