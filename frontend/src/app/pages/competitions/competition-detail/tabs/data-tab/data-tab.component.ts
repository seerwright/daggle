import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { CompetitionFileService } from '../../../../../core/services/competition-file.service';
import {
  CompetitionFile,
  ColumnInfo,
  DataDictionaryEntry,
  FilePreview,
} from '../../../../../core/models/competition-file.model';
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
    MatTabsModule,
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

          <div class="content-layout">
            <!-- File List (Left Panel) -->
            <div class="files-list-panel">
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
            </div>

            <!-- Details Panel (Right) -->
            <div class="details-panel" [class.visible]="selectedFile">
              @if (selectedFile) {
                <div class="details-header">
                  <h3 class="details-title">{{ selectedFile.display_name || selectedFile.filename }}</h3>
                  <button
                    mat-flat-button
                    color="primary"
                    class="download-btn"
                    (click)="downloadFile(selectedFile)"
                  >
                    <mat-icon>download</mat-icon>
                    Download
                  </button>
                </div>

                <div class="file-metadata">
                  <div class="meta-item">
                    <span class="meta-label">Filename</span>
                    <span class="meta-value">{{ selectedFile.filename }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Size</span>
                    <span class="meta-value">{{ formatFileSize(selectedFile.file_size) }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Type</span>
                    <span class="meta-value">{{ selectedFile.file_type || 'Unknown' }}</span>
                  </div>
                  @if (selectedFile.purpose) {
                    <div class="meta-item">
                      <span class="meta-label">Description</span>
                      <span class="meta-value">{{ selectedFile.purpose }}</span>
                    </div>
                  }
                </div>

                @if (isCsvFile(selectedFile)) {
                  <mat-tab-group class="preview-tabs" animationDuration="200ms">
                    <mat-tab label="Preview">
                      <div class="tab-content">
                        @if (previewLoading) {
                          <div class="tab-loading">
                            <mat-spinner diameter="24"></mat-spinner>
                            <span>Loading preview...</span>
                          </div>
                        } @else if (preview) {
                          <div class="preview-table-container">
                            <table class="preview-table">
                              <thead>
                                <tr>
                                  @for (col of preview.columns; track col) {
                                    <th>{{ col }}</th>
                                  }
                                </tr>
                              </thead>
                              <tbody>
                                @for (row of preview.rows; track $index) {
                                  <tr>
                                    @for (col of preview.columns; track col) {
                                      <td>{{ row[col] }}</td>
                                    }
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
                          <div class="preview-footer">
                            <span class="row-count">
                              Showing {{ preview.rows.length }} of {{ preview.total_rows | number }} rows
                              @if (preview.truncated) {
                                <span class="truncated-badge">Truncated</span>
                              }
                            </span>
                          </div>
                        } @else {
                          <div class="tab-empty">
                            <mat-icon>visibility_off</mat-icon>
                            <span>Preview not available</span>
                          </div>
                        }
                      </div>
                    </mat-tab>

                    <mat-tab label="Data Dictionary">
                      <div class="tab-content">
                        @if (dictionaryLoading) {
                          <div class="tab-loading">
                            <mat-spinner diameter="24"></mat-spinner>
                            <span>Loading dictionary...</span>
                          </div>
                        } @else if (dictionary.length > 0) {
                          <div class="dictionary-table-container">
                            <table class="dictionary-table">
                              <thead>
                                <tr>
                                  <th>Column</th>
                                  <th>Definition</th>
                                  <th>Encoding</th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (entry of dictionary; track entry.id) {
                                  <tr>
                                    <td class="column-name">{{ entry.column_name }}</td>
                                    <td>{{ entry.definition || '—' }}</td>
                                    <td class="encoding-cell">{{ entry.encoding || '—' }}</td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
                        } @else if (columnInfo.length > 0) {
                          <div class="dictionary-table-container">
                            <p class="auto-detected-notice">
                              <mat-icon>info</mat-icon>
                              Auto-detected columns (no dictionary defined)
                            </p>
                            <table class="dictionary-table">
                              <thead>
                                <tr>
                                  <th>Column</th>
                                  <th>Type</th>
                                  <th>Nulls</th>
                                  <th>Unique</th>
                                  <th>Sample Values</th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (col of columnInfo; track col.name) {
                                  <tr>
                                    <td class="column-name">{{ col.name }}</td>
                                    <td class="dtype-cell">{{ col.dtype }}</td>
                                    <td class="count-cell">{{ col.null_count | number }}</td>
                                    <td class="count-cell">{{ col.unique_count | number }}</td>
                                    <td class="samples-cell">{{ col.sample_values.join(', ') }}</td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
                        } @else {
                          <div class="tab-empty">
                            <mat-icon>table_chart</mat-icon>
                            <span>No column information available</span>
                          </div>
                        }
                      </div>
                    </mat-tab>

                    @if (selectedFile.variable_notes) {
                      <mat-tab label="Notes">
                        <div class="tab-content">
                          <div class="variable-notes">
                            {{ selectedFile.variable_notes }}
                          </div>
                        </div>
                      </mat-tab>
                    }
                  </mat-tab-group>
                } @else {
                  <div class="non-csv-notice">
                    <mat-icon>{{ getFileIcon(selectedFile) }}</mat-icon>
                    <p>Preview not available for {{ selectedFile.file_type || 'this file type' }}.</p>
                    <p class="hint">Download the file to view its contents.</p>
                  </div>
                }
              } @else {
                <div class="no-selection">
                  <mat-icon>touch_app</mat-icon>
                  <p>Select a file to view details</p>
                </div>
              }
            </div>
          </div>
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

    /* Two-column Layout */
    .content-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: var(--space-5);
      margin-top: var(--space-2);
      min-height: 400px;
    }

    /* Files List Panel */
    .files-list-panel {
      display: flex;
      flex-direction: column;
    }

    .files-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
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

    /* Details Panel */
    .details-panel {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-surface-muted);
    }

    .details-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .download-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .file-metadata {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .meta-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-value {
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      word-break: break-word;
    }

    /* Tabs */
    .preview-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;

      ::ng-deep {
        .mat-mdc-tab-header {
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }

        .mat-mdc-tab-body-wrapper {
          flex: 1;
        }

        .mat-mdc-tab-body-content {
          height: 100%;
          overflow: auto;
        }
      }
    }

    .tab-content {
      padding: var(--space-4);
      min-height: 200px;
    }

    .tab-loading,
    .tab-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      min-height: 200px;
      color: var(--color-text-muted);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        opacity: 0.5;
      }

      span {
        font-size: var(--text-sm);
      }
    }

    /* Preview Table */
    .preview-table-container {
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);

      th, td {
        padding: var(--space-2) var(--space-3);
        text-align: left;
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      th {
        background-color: var(--color-surface-muted);
        font-weight: 600;
        color: var(--color-text-primary);
        position: sticky;
        top: 0;
      }

      td {
        color: var(--color-text-secondary);
      }

      tr:last-child td {
        border-bottom: none;
      }

      tr:hover td {
        background-color: var(--color-surface-hover);
      }
    }

    .preview-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
    }

    .row-count {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .truncated-badge {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      background-color: var(--color-warning-light);
      color: var(--color-warning);
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-sm);
    }

    /* Dictionary Table */
    .auto-detected-notice {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      background-color: var(--color-info-light);
      color: var(--color-info);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .dictionary-table-container {
      overflow-x: auto;
    }

    .dictionary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);

      th, td {
        padding: var(--space-3);
        text-align: left;
        border-bottom: 1px solid var(--color-border);
      }

      th {
        background-color: var(--color-surface-muted);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      td {
        color: var(--color-text-secondary);
      }

      tr:last-child td {
        border-bottom: none;
      }

      .column-name {
        font-family: var(--font-mono);
        font-weight: 500;
        color: var(--color-text-primary);
      }

      .dtype-cell {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-accent);
      }

      .count-cell {
        font-family: var(--font-mono);
        text-align: right;
      }

      .samples-cell {
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--text-xs);
        color: var(--color-text-muted);
      }

      .encoding-cell {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
      }
    }

    /* Variable Notes */
    .variable-notes {
      white-space: pre-wrap;
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      line-height: 1.6;
    }

    /* Non-CSV Notice */
    .non-csv-notice {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding: var(--space-8);
      text-align: center;
      color: var(--color-text-muted);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.3;
      }

      p {
        margin: 0;
        font-size: var(--text-sm);
      }

      .hint {
        font-size: var(--text-xs);
        opacity: 0.7;
      }
    }

    /* No Selection */
    .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 300px;
      gap: var(--space-3);
      color: var(--color-text-muted);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.3;
      }

      p {
        margin: 0;
        font-size: var(--text-sm);
      }
    }

    @media (max-width: 900px) {
      .content-layout {
        grid-template-columns: 1fr;
      }

      .details-panel {
        min-height: 400px;
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

      .file-metadata {
        grid-template-columns: 1fr 1fr;
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

  preview: FilePreview | null = null;
  previewLoading = false;

  dictionary: DataDictionaryEntry[] = [];
  columnInfo: ColumnInfo[] = [];
  dictionaryLoading = false;

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
    if (this.selectedFile?.id === file.id) {
      this.selectedFile = null;
      this.preview = null;
      this.dictionary = [];
      this.columnInfo = [];
      return;
    }

    this.selectedFile = file;
    this.preview = null;
    this.dictionary = [];
    this.columnInfo = [];

    if (this.isCsvFile(file)) {
      this.loadPreview(file);
      this.loadDictionary(file);
    }
  }

  private loadPreview(file: CompetitionFile): void {
    this.previewLoading = true;
    this.fileService.getPreview(this.slug, file.id).subscribe({
      next: (preview) => {
        this.preview = preview;
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
      },
    });
  }

  private loadDictionary(file: CompetitionFile): void {
    this.dictionaryLoading = true;
    this.fileService.getDictionary(this.slug, file.id).subscribe({
      next: (dictionary) => {
        this.dictionary = dictionary;
        this.dictionaryLoading = false;

        // If no dictionary, try to get auto-detected columns
        if (dictionary.length === 0) {
          this.loadColumnInfo(file);
        }
      },
      error: () => {
        this.dictionaryLoading = false;
        this.loadColumnInfo(file);
      },
    });
  }

  private loadColumnInfo(file: CompetitionFile): void {
    this.fileService.detectColumns(this.slug, file.id).subscribe({
      next: (columns) => {
        this.columnInfo = columns;
      },
      error: () => {
        // Silently fail - column info is optional
      },
    });
  }

  isCsvFile(file: CompetitionFile): boolean {
    const ext = file.filename.split('.').pop()?.toLowerCase();
    return ext === 'csv';
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
