import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompetitionFileService } from '../../../../../core/services/competition-file.service';
import { CompetitionFile } from '../../../../../core/models/competition-file.model';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-data-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="data-tab">
      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="32"></mat-spinner>
          <span class="loading-text">Loading files...</span>
        </div>
      } @else if (files.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">folder_open</mat-icon>
          <h3 class="empty-title">No Data Files</h3>
          <p class="empty-description">
            No data files have been uploaded for this competition yet.
          </p>
        </div>
      } @else {
        <div class="files-section">
          <div class="files-header">
            <h2 class="section-title">Competition Data</h2>
            <button
              mat-stroked-button
              class="download-all-btn"
              (click)="downloadAll()"
              [disabled]="downloading"
            >
              @if (downloading) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <mat-icon>archive</mat-icon>
              }
              <span>Download All</span>
            </button>
          </div>

          <p class="files-description">
            Download the datasets and documentation needed for this competition.
          </p>

          <div class="files-list">
            @for (file of files; track file.id) {
              <div
                class="file-item"
                [class.selected]="selectedFile?.id === file.id"
                (click)="selectFile(file)"
              >
                <div class="file-icon">
                  <mat-icon>{{ getFileIcon(file) }}</mat-icon>
                </div>
                <div class="file-info">
                  <span class="file-name">{{ file.display_name || file.filename }}</span>
                  <span class="file-meta">
                    {{ formatFileSize(file.file_size) }}
                    @if (file.purpose) {
                      <span class="file-purpose">{{ file.purpose }}</span>
                    }
                  </span>
                </div>
                <div class="file-actions">
                  <button
                    mat-icon-button
                    [matTooltip]="'Download ' + file.filename"
                    (click)="downloadFile(file); $event.stopPropagation()"
                  >
                    <mat-icon>download</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>

          @if (selectedFile) {
            <div class="file-preview">
              <h3 class="preview-title">{{ selectedFile.display_name || selectedFile.filename }}</h3>
              <div class="preview-details">
                <div class="detail-row">
                  <span class="detail-label">Filename</span>
                  <span class="detail-value">{{ selectedFile.filename }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Size</span>
                  <span class="detail-value">{{ formatFileSize(selectedFile.file_size) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">{{ selectedFile.file_type || 'Unknown' }}</span>
                </div>
                @if (selectedFile.purpose) {
                  <div class="detail-row">
                    <span class="detail-label">Description</span>
                    <span class="detail-value">{{ selectedFile.purpose }}</span>
                  </div>
                }
                <div class="detail-row">
                  <span class="detail-label">Uploaded</span>
                  <span class="detail-value">{{ selectedFile.created_at | date:'medium' }}</span>
                </div>
              </div>
              <button
                mat-flat-button
                color="primary"
                class="preview-download-btn"
                (click)="downloadFile(selectedFile)"
              >
                <mat-icon>download</mat-icon>
                Download File
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .data-tab {
      padding: var(--space-6) 0;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      padding: var(--space-12);
      text-align: center;
      background-color: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
    }

    .loading-text {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-4);
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .empty-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
      max-width: 320px;
    }

    /* Files Section */
    .files-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .files-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .section-title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .download-all-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      mat-spinner {
        margin-right: var(--space-1);
      }
    }

    .files-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    /* Files List */
    .files-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;

      &:hover {
        border-color: var(--color-border-hover);
        background-color: var(--color-surface-hover);
      }

      &.selected {
        border-color: var(--color-accent);
        background-color: var(--color-accent-light);
      }
    }

    .file-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background-color: var(--color-surface-muted);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .file-name {
      font-weight: 500;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-meta {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .file-purpose {
      &::before {
        content: '\\2022';
        margin-right: var(--space-2);
      }
    }

    .file-actions {
      display: flex;
      align-items: center;

      button {
        color: var(--color-text-muted);

        &:hover {
          color: var(--color-accent);
        }
      }
    }

    /* File Preview */
    .file-preview {
      margin-top: var(--space-4);
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .preview-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-4);
    }

    .preview-details {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
    }

    .detail-row {
      display: flex;
      gap: var(--space-4);
    }

    .detail-label {
      width: 100px;
      flex-shrink: 0;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .detail-value {
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      word-break: break-word;
    }

    .preview-download-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    @media (max-width: 480px) {
      .data-tab {
        padding: var(--space-4) 0;
      }

      .files-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .file-item {
        padding: var(--space-3);
      }

      .file-icon {
        width: 36px;
        height: 36px;
      }

      .detail-row {
        flex-direction: column;
        gap: var(--space-1);
      }

      .detail-label {
        width: auto;
      }
    }
  `],
})
export class DataTabComponent implements OnInit {
  @Input({ required: true }) slug!: string;

  files: CompetitionFile[] = [];
  selectedFile: CompetitionFile | null = null;
  loading = true;
  downloading = false;

  constructor(
    private fileService: CompetitionFileService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  private loadFiles(): void {
    this.fileService.list(this.slug).subscribe({
      next: (files) => {
        this.files = files;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  selectFile(file: CompetitionFile): void {
    this.selectedFile = this.selectedFile?.id === file.id ? null : file;
  }

  downloadFile(file: CompetitionFile): void {
    const url = this.fileService.getDownloadUrl(this.slug, file.id);
    this.triggerDownload(url, file.filename);
  }

  downloadAll(): void {
    this.downloading = true;
    const url = this.fileService.getDownloadAllUrl(this.slug);
    this.triggerDownload(url, `${this.slug}-data.zip`);

    // Reset downloading state after a delay
    setTimeout(() => {
      this.downloading = false;
    }, 2000);
  }

  private triggerDownload(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileIcon(file: CompetitionFile): string {
    const ext = file.filename.split('.').pop()?.toLowerCase() || '';

    const iconMap: Record<string, string> = {
      csv: 'table_chart',
      json: 'data_object',
      txt: 'description',
      md: 'article',
      pdf: 'picture_as_pdf',
      zip: 'folder_zip',
      gz: 'folder_zip',
      tar: 'folder_zip',
      parquet: 'storage',
      pkl: 'memory',
      npy: 'grid_on',
      npz: 'grid_on',
    };

    return iconMap[ext] || 'insert_drive_file';
  }

  formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === undefined) {
      return 'Unknown size';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}
