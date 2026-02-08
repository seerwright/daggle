import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, catchError, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  BrandingConfig,
  AdminBrandingConfig,
  BrandingUpdate,
  ColorPalette,
  LogoUploadResponse,
  LogoDeleteResponse,
  PaletteListResponse,
  PaletteId,
} from '../models/branding.model';

/**
 * Default branding configuration used when API is unavailable
 */
const DEFAULT_BRANDING: BrandingConfig = {
  company_name: 'Your Company',
  product_name: 'Daggle',
  tagline: 'Internal Data Science Platform',
  logo_full_url: null,
  logo_icon_url: null,
  logo_full_light_url: null,
  logo_icon_light_url: null,
  favicon_url: null,
  palette_id: 'amber',
  palette: {
    id: 'amber',
    name: 'Amber',
    description: 'Warm amber with warm gray neutrals',
    accent_color: '#b45309',
    colors: {},
  },
};

@Injectable({
  providedIn: 'root',
})
export class BrandingService {
  // Reactive state using signals
  private brandingSignal = signal<BrandingConfig>(DEFAULT_BRANDING);

  // Public computed signals for component consumption
  readonly branding = this.brandingSignal.asReadonly();
  readonly productName = computed(() => this.brandingSignal().product_name);
  readonly companyName = computed(() => this.brandingSignal().company_name);
  readonly tagline = computed(() => this.brandingSignal().tagline);
  readonly logoFullUrl = computed(() => this.brandingSignal().logo_full_url);
  readonly logoIconUrl = computed(() => this.brandingSignal().logo_icon_url);
  readonly faviconUrl = computed(() => this.brandingSignal().favicon_url);
  readonly paletteId = computed(() => this.brandingSignal().palette_id);
  readonly palette = computed(() => this.brandingSignal().palette);

  private initialized = false;

  constructor(private api: ApiService) {}

  /**
   * Load branding configuration from API.
   * Called during app initialization via APP_INITIALIZER.
   * Returns a promise that resolves when branding is loaded.
   */
  loadBranding(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.api.get<BrandingConfig>('/branding').pipe(
        catchError(() => {
          // On error, use defaults silently
          console.warn('Failed to load branding, using defaults');
          return of(DEFAULT_BRANDING);
        }),
      ).subscribe({
        next: (branding) => {
          this.brandingSignal.set(branding);
          this.applyPaletteColors(branding.palette);
          this.updateDocumentTitle(branding.product_name);
          this.updateFavicon(branding.favicon_url);
          this.initialized = true;
          resolve();
        },
        error: () => {
          this.initialized = true;
          resolve();
        },
      });
    });
  }

  /**
   * Apply palette colors as CSS custom properties on :root
   */
  private applyPaletteColors(palette: ColorPalette): void {
    const root = document.documentElement;

    if (palette.colors) {
      Object.entries(palette.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  }

  /**
   * Update document title with product name
   */
  private updateDocumentTitle(productName: string): void {
    // Only update if it's currently "Daggle" or hasn't been modified by route
    const currentTitle = document.title;
    if (currentTitle === 'Daggle' || currentTitle.includes('Daggle')) {
      document.title = currentTitle.replace('Daggle', productName);
    }
  }

  /**
   * Update the favicon link element in the document head
   */
  private updateFavicon(faviconUrl: string | null): void {
    if (!faviconUrl) {
      return; // Keep default favicon
    }

    // Find existing favicon link or create new one
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Update href to custom favicon
    link.href = faviconUrl;
  }

  /**
   * Refresh branding from API (for admin use after updates)
   */
  refreshBranding(): Observable<BrandingConfig> {
    return this.api.get<BrandingConfig>('/branding').pipe(
      tap((branding) => {
        this.brandingSignal.set(branding);
        this.applyPaletteColors(branding.palette);
        this.updateDocumentTitle(branding.product_name);
        this.updateFavicon(branding.favicon_url);
      }),
    );
  }

  // ==========================================================================
  // Admin API Methods
  // ==========================================================================

  /**
   * Get full branding config (admin view)
   */
  getAdminBranding(): Observable<AdminBrandingConfig> {
    return this.api.get<AdminBrandingConfig>('/admin/branding');
  }

  /**
   * Update branding settings
   */
  updateBranding(data: BrandingUpdate): Observable<AdminBrandingConfig> {
    return this.api.put<AdminBrandingConfig>('/admin/branding', data).pipe(
      tap((branding) => {
        // Update local state
        this.brandingSignal.update((current) => ({
          ...current,
          company_name: branding.company_name,
          product_name: branding.product_name,
          tagline: branding.tagline,
          palette_id: branding.palette_id,
          palette: branding.palette,
        }));
        this.applyPaletteColors(branding.palette);
        this.updateDocumentTitle(branding.product_name);
      }),
    );
  }

  /**
   * Upload a logo or favicon
   */
  uploadLogo(
    logoType: 'full' | 'icon' | 'full_light' | 'icon_light' | 'favicon',
    file: File,
  ): Observable<LogoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<LogoUploadResponse>(
      `/admin/branding/logo?logo_type=${logoType}`,
      formData,
    );
  }

  /**
   * Delete a logo or favicon
   */
  deleteLogo(
    logoType: 'full' | 'icon' | 'full_light' | 'icon_light' | 'favicon',
  ): Observable<LogoDeleteResponse> {
    return this.api.delete<LogoDeleteResponse>(`/admin/branding/logo/${logoType}`);
  }

  /**
   * Get list of available palettes
   */
  getPalettes(): Observable<ColorPalette[]> {
    return this.api.get<PaletteListResponse>('/admin/branding/palettes').pipe(
      map((response) => response.palettes),
    );
  }
}

/**
 * Factory function for APP_INITIALIZER
 */
export function initializeBranding(brandingService: BrandingService) {
  return () => brandingService.loadBranding();
}
