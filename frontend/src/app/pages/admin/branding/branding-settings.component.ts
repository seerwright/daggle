import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import {
  AdminBrandingConfig,
  ColorPalette,
  PaletteId,
} from '../../../core/models/branding.model';

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="branding-page">
      <div class="page-header">
        <h1>Site Branding</h1>
        <p class="page-subtitle">Customize the look and feel of your platform</p>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
          <button mat-button color="primary" (click)="loadBranding()">Try Again</button>
        </div>
      } @else if (branding()) {
        <div class="settings-grid">
          <!-- Identity Section -->
          <mat-card class="settings-card">
            <mat-card-header>
              <mat-card-title>Identity</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-group">
                <label class="form-label">Company Name</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="companyName"
                  placeholder="Your Company"
                />
                <span class="form-hint">Your organization's name</span>
              </div>

              <div class="form-group">
                <label class="form-label">Product Name</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="productName"
                  placeholder="Daggle"
                />
                <span class="form-hint">Displayed in header, footer, and throughout the UI</span>
              </div>

              <div class="form-group">
                <label class="form-label">Tagline</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="tagline"
                  placeholder="Internal Data Science Platform"
                />
                <span class="form-hint">Brief description shown in footer</span>
              </div>

              <button
                mat-flat-button
                color="primary"
                class="save-btn"
                [disabled]="saving()"
                (click)="saveIdentity()"
              >
                @if (saving()) {
                  Saving...
                } @else {
                  Save Changes
                }
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Color Palette Section -->
          <mat-card class="settings-card">
            <mat-card-header>
              <mat-card-title>Color Palette</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="section-description">Choose a color scheme for your platform</p>

              <div class="palette-grid">
                @for (palette of palettes(); track palette.id) {
                  <button
                    class="palette-option"
                    [class.selected]="selectedPaletteId === palette.id"
                    (click)="selectPalette(palette.id)"
                  >
                    <div class="palette-preview">
                      <div
                        class="palette-swatch accent"
                        [style.background-color]="palette.accent_color"
                      ></div>
                      <div
                        class="palette-swatch gray"
                        [style.background-color]="palette.colors['--color-gray-600']"
                      ></div>
                      <div
                        class="palette-swatch light"
                        [style.background-color]="palette.colors['--color-gray-100']"
                      ></div>
                    </div>
                    <span class="palette-name">{{ palette.name }}</span>
                    <span class="palette-description">{{ palette.description }}</span>
                  </button>
                }
              </div>

              <button
                mat-flat-button
                color="primary"
                class="save-btn"
                [disabled]="saving() || selectedPaletteId === branding()?.palette_id"
                (click)="savePalette()"
              >
                @if (saving()) {
                  Applying...
                } @else {
                  Apply Palette
                }
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Logo Section -->
          <mat-card class="settings-card logo-card">
            <mat-card-header>
              <mat-card-title>Logos</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="section-description">Upload your organization's logo</p>

              <div class="logo-grid">
                <!-- Icon Logo -->
                <div class="logo-upload-section">
                  <h4>Icon Logo</h4>
                  <p class="logo-hint">Square logo for header (recommended: 64x64px)</p>
                  <div class="logo-preview-area">
                    @if (branding()?.logo_icon_url) {
                      <img
                        [src]="branding()?.logo_icon_url"
                        alt="Icon logo"
                        class="logo-preview"
                      />
                      <button
                        mat-icon-button
                        class="delete-logo-btn"
                        (click)="deleteLogo('icon')"
                        [disabled]="uploading()"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    } @else {
                      <div class="logo-placeholder">
                        <mat-icon>image</mat-icon>
                        <span>No logo</span>
                      </div>
                    }
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    class="file-input"
                    #iconInput
                    (change)="uploadLogo('icon', $event)"
                  />
                  <button
                    mat-stroked-button
                    (click)="iconInput.click()"
                    [disabled]="uploading()"
                  >
                    <mat-icon>upload</mat-icon>
                    Upload Icon
                  </button>
                </div>

                <!-- Full Logo -->
                <div class="logo-upload-section">
                  <h4>Full Logo</h4>
                  <p class="logo-hint">Horizontal logo with text (recommended: 200x64px)</p>
                  <div class="logo-preview-area wide">
                    @if (branding()?.logo_full_url) {
                      <img
                        [src]="branding()?.logo_full_url"
                        alt="Full logo"
                        class="logo-preview"
                      />
                      <button
                        mat-icon-button
                        class="delete-logo-btn"
                        (click)="deleteLogo('full')"
                        [disabled]="uploading()"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    } @else {
                      <div class="logo-placeholder">
                        <mat-icon>image</mat-icon>
                        <span>No logo</span>
                      </div>
                    }
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    class="file-input"
                    #fullInput
                    (change)="uploadLogo('full', $event)"
                  />
                  <button
                    mat-stroked-button
                    (click)="fullInput.click()"
                    [disabled]="uploading()"
                  >
                    <mat-icon>upload</mat-icon>
                    Upload Logo
                  </button>
                </div>
              </div>

              <!-- Favicon Section -->
              <div class="favicon-section">
                <h4>Favicon</h4>
                <p class="logo-hint">Browser icon shown in tabs (recommended: 32x32px ICO, PNG, or SVG)</p>
                <div class="favicon-upload-row">
                  <div class="logo-preview-area favicon">
                    @if (branding()?.favicon_url) {
                      <img
                        [src]="branding()?.favicon_url"
                        alt="Favicon"
                        class="logo-preview"
                      />
                      <button
                        mat-icon-button
                        class="delete-logo-btn"
                        (click)="deleteLogo('favicon')"
                        [disabled]="uploading()"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    } @else {
                      <div class="logo-placeholder">
                        <mat-icon>tab</mat-icon>
                        <span>No favicon</span>
                      </div>
                    }
                  </div>
                  <input
                    type="file"
                    accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                    class="file-input"
                    #faviconInput
                    (change)="uploadLogo('favicon', $event)"
                  />
                  <button
                    mat-stroked-button
                    (click)="faviconInput.click()"
                    [disabled]="uploading()"
                  >
                    <mat-icon>upload</mat-icon>
                    Upload Favicon
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .branding-page {
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: var(--space-8);
    }

    .page-header h1 {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .page-subtitle {
      font-size: var(--text-base);
      color: var(--color-text-muted);
      margin: 0;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: var(--space-4);
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-error);
    }

    .settings-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .settings-card {
      background-color: var(--color-hero-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .settings-card mat-card-header {
      padding: var(--space-5) var(--space-6) 0;
    }

    .settings-card mat-card-title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .settings-card mat-card-content {
      padding: var(--space-5) var(--space-6) var(--space-6);
    }

    .section-description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-5);
    }

    .form-group {
      margin-bottom: var(--space-5);
    }

    .form-label {
      display: block;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: var(--space-2);
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

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-light);
      }
    }

    .form-hint {
      display: block;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: var(--space-1);
    }

    .save-btn {
      margin-top: var(--space-4);
    }

    /* Palette Grid */
    .palette-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }

    .palette-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-4);
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all 150ms ease;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-md);
      }

      &.selected {
        border-color: var(--color-accent);
        background-color: var(--color-accent-light);
      }
    }

    .palette-preview {
      display: flex;
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }

    .palette-swatch {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);

      &.accent {
        width: 48px;
      }
    }

    .palette-name {
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: var(--text-sm);
      margin-bottom: var(--space-1);
    }

    .palette-description {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-align: center;
      line-height: 1.4;
    }

    /* Logo Section */
    .logo-card mat-card-content {
      padding-bottom: var(--space-8);
    }

    .logo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--space-6);
    }

    .logo-upload-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .logo-upload-section h4 {
      margin: 0;
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .logo-hint {
      margin: 0;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .logo-preview-area {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background-color: var(--color-surface-muted);
      border: 1px dashed var(--color-border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;

      &.wide {
        width: 200px;
      }
    }

    .logo-preview {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .logo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-text-muted);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      span {
        font-size: var(--text-xs);
      }
    }

    .delete-logo-btn {
      position: absolute;
      top: var(--space-1);
      right: var(--space-1);
      background: rgba(255, 255, 255, 0.9);
      color: var(--color-error);

      &:hover {
        background: var(--color-error-light);
      }
    }

    .file-input {
      display: none;
    }

    /* Favicon Section */
    .favicon-section {
      margin-top: var(--space-8);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-border);
    }

    .favicon-section h4 {
      margin: 0 0 var(--space-2);
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .favicon-upload-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-top: var(--space-3);
    }

    .logo-preview-area.favicon {
      width: 48px;
      height: 48px;
    }

    @media (max-width: 600px) {
      .palette-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .logo-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class BrandingSettingsComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);
  branding = signal<AdminBrandingConfig | null>(null);
  palettes = signal<ColorPalette[]>([]);

  companyName = '';
  productName = '';
  tagline = '';
  selectedPaletteId: PaletteId = 'amber';

  constructor(
    private brandingService: BrandingService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Check if user is admin
    const user = this.authService.currentUser();
    if (!user || user.role !== 'admin') {
      this.router.navigate(['/']);
      return;
    }

    this.loadBranding();
  }

  loadBranding() {
    this.loading.set(true);
    this.error.set(null);

    // Load branding and palettes in parallel
    this.brandingService.getAdminBranding().subscribe({
      next: (branding) => {
        this.branding.set(branding);
        this.companyName = branding.company_name;
        this.productName = branding.product_name;
        this.tagline = branding.tagline || '';
        this.selectedPaletteId = branding.palette_id;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Failed to load branding settings');
        this.loading.set(false);
      },
    });

    this.brandingService.getPalettes().subscribe({
      next: (palettes) => {
        this.palettes.set(palettes);
      },
    });
  }

  selectPalette(paletteId: PaletteId) {
    this.selectedPaletteId = paletteId;
  }

  saveIdentity() {
    this.saving.set(true);

    this.brandingService
      .updateBranding({
        company_name: this.companyName,
        product_name: this.productName,
        tagline: this.tagline,
      })
      .subscribe({
        next: (branding) => {
          this.branding.set(branding);
          this.saving.set(false);
          this.snackBar.open('Branding updated successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err.error?.detail || 'Failed to update branding',
            'Close',
            { duration: 5000 }
          );
        },
      });
  }

  savePalette() {
    this.saving.set(true);

    this.brandingService
      .updateBranding({
        palette_id: this.selectedPaletteId,
      })
      .subscribe({
        next: (branding) => {
          this.branding.set(branding);
          this.saving.set(false);
          this.snackBar.open('Color palette applied', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err.error?.detail || 'Failed to apply palette',
            'Close',
            { duration: 5000 }
          );
        },
      });
  }

  uploadLogo(logoType: 'full' | 'icon' | 'full_light' | 'icon_light' | 'favicon', event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.snackBar.open('File too large. Maximum size is 2MB', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.uploading.set(true);

    this.brandingService.uploadLogo(logoType, file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.snackBar.open('Logo uploaded successfully', 'Close', {
          duration: 3000,
        });
        // Reload branding to get new URL
        this.loadBranding();
      },
      error: (err) => {
        this.uploading.set(false);
        this.snackBar.open(
          err.error?.detail || 'Failed to upload logo',
          'Close',
          { duration: 5000 }
        );
      },
    });

    // Clear input so same file can be selected again
    input.value = '';
  }

  deleteLogo(logoType: 'full' | 'icon' | 'full_light' | 'icon_light' | 'favicon') {
    this.uploading.set(true);

    this.brandingService.deleteLogo(logoType).subscribe({
      next: () => {
        this.uploading.set(false);
        this.snackBar.open('Logo deleted', 'Close', {
          duration: 3000,
        });
        // Reload branding
        this.loadBranding();
      },
      error: (err) => {
        this.uploading.set(false);
        this.snackBar.open(
          err.error?.detail || 'Failed to delete logo',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }
}
