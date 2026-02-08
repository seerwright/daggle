/**
 * Branding configuration models
 */

export type PaletteId = 'amber' | 'blue' | 'emerald' | 'violet' | 'rose' | 'slate';

export interface ColorPalette {
  id: PaletteId;
  name: string;
  description: string;
  accent_color: string;
  colors: Record<string, string>;
}

export interface BrandingConfig {
  company_name: string;
  product_name: string;
  tagline: string | null;
  logo_full_url: string | null;
  logo_icon_url: string | null;
  logo_full_light_url: string | null;
  logo_icon_light_url: string | null;
  favicon_url: string | null;
  palette_id: PaletteId;
  palette: ColorPalette;
}

export interface AdminBrandingConfig extends BrandingConfig {
  id: number;
  logo_full_path: string | null;
  logo_icon_path: string | null;
  logo_full_light_path: string | null;
  logo_icon_light_path: string | null;
  favicon_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandingUpdate {
  company_name?: string;
  product_name?: string;
  tagline?: string;
  palette_id?: PaletteId;
}

export interface LogoUploadResponse {
  message: string;
  logo_type: string;
  url: string;
}

export interface LogoDeleteResponse {
  message: string;
  logo_type: string;
}

export interface PaletteListResponse {
  palettes: ColorPalette[];
}
