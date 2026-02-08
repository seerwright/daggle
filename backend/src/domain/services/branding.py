"""Branding service for company customization."""

import os
import uuid
from pathlib import Path
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.branding import ColorPalette, PaletteId
from src.config import settings
from src.domain.models.branding import SiteBranding


# Logo type literals (includes favicon)
LogoType = Literal["full", "icon", "full_light", "icon_light", "favicon"]


# =============================================================================
# Color Palette Definitions
# =============================================================================

PALETTES: dict[PaletteId, ColorPalette] = {
    "amber": ColorPalette(
        id="amber",
        name="Amber",
        description="Warm amber with warm gray neutrals - the default Daggle look",
        accent_color="#b45309",
        colors={
            # Warm neutrals
            "--color-gray-50": "#faf9f7",
            "--color-gray-100": "#f3f2ee",
            "--color-gray-200": "#e6e4de",
            "--color-gray-300": "#d4d1c7",
            "--color-gray-400": "#a8a396",
            "--color-gray-500": "#7c7768",
            "--color-gray-600": "#5c5850",
            "--color-gray-700": "#433f39",
            "--color-gray-800": "#2a2824",
            "--color-gray-900": "#1a1917",
            # Accent
            "--color-accent": "#b45309",
            "--color-accent-hover": "#92400e",
            "--color-accent-light": "#fef3c7",
            "--color-accent-muted": "#fde68a",
            # Background & Surface
            "--color-background": "#faf9f7",
            "--color-surface": "#ffffff",
            "--color-surface-elevated": "#ffffff",
            "--color-surface-muted": "#f3f2ee",
            "--color-hero-background": "#fef3c7",
            # Text
            "--color-text-primary": "#1a1917",
            "--color-text-secondary": "#5c5850",
            "--color-text-muted": "#7c7768",
            "--color-text-inverse": "#ffffff",
            # Borders
            "--color-border": "#e6e4de",
            "--color-border-strong": "#d4d1c7",
            "--color-border-muted": "#f3f2ee",
        },
    ),
    "blue": ColorPalette(
        id="blue",
        name="Corporate Blue",
        description="Professional blue with cool gray neutrals",
        accent_color="#2563eb",
        colors={
            # Cool neutrals (slate-gray)
            "--color-gray-50": "#f8fafc",
            "--color-gray-100": "#f1f5f9",
            "--color-gray-200": "#e2e8f0",
            "--color-gray-300": "#cbd5e1",
            "--color-gray-400": "#94a3b8",
            "--color-gray-500": "#64748b",
            "--color-gray-600": "#475569",
            "--color-gray-700": "#334155",
            "--color-gray-800": "#1e293b",
            "--color-gray-900": "#0f172a",
            # Accent
            "--color-accent": "#2563eb",
            "--color-accent-hover": "#1d4ed8",
            "--color-accent-light": "#dbeafe",
            "--color-accent-muted": "#93c5fd",
            # Background & Surface
            "--color-background": "#f8fafc",
            "--color-surface": "#ffffff",
            "--color-surface-elevated": "#ffffff",
            "--color-surface-muted": "#f1f5f9",
            "--color-hero-background": "#dbeafe",
            # Text
            "--color-text-primary": "#0f172a",
            "--color-text-secondary": "#475569",
            "--color-text-muted": "#64748b",
            "--color-text-inverse": "#ffffff",
            # Borders
            "--color-border": "#e2e8f0",
            "--color-border-strong": "#cbd5e1",
            "--color-border-muted": "#f1f5f9",
        },
    ),
    "emerald": ColorPalette(
        id="emerald",
        name="Emerald Green",
        description="Fresh green with balanced neutral grays",
        accent_color="#059669",
        colors={
            # Neutral grays
            "--color-gray-50": "#fafafa",
            "--color-gray-100": "#f4f4f5",
            "--color-gray-200": "#e4e4e7",
            "--color-gray-300": "#d4d4d8",
            "--color-gray-400": "#a1a1aa",
            "--color-gray-500": "#71717a",
            "--color-gray-600": "#52525b",
            "--color-gray-700": "#3f3f46",
            "--color-gray-800": "#27272a",
            "--color-gray-900": "#18181b",
            # Accent
            "--color-accent": "#059669",
            "--color-accent-hover": "#047857",
            "--color-accent-light": "#d1fae5",
            "--color-accent-muted": "#6ee7b7",
            # Background & Surface
            "--color-background": "#fafafa",
            "--color-surface": "#ffffff",
            "--color-surface-elevated": "#ffffff",
            "--color-surface-muted": "#f4f4f5",
            "--color-hero-background": "#d1fae5",
            # Text
            "--color-text-primary": "#18181b",
            "--color-text-secondary": "#52525b",
            "--color-text-muted": "#71717a",
            "--color-text-inverse": "#ffffff",
            # Borders
            "--color-border": "#e4e4e7",
            "--color-border-strong": "#d4d4d8",
            "--color-border-muted": "#f4f4f5",
        },
    ),
    "violet": ColorPalette(
        id="violet",
        name="Royal Violet",
        description="Elegant purple with cool slate neutrals",
        accent_color="#7c3aed",
        colors={
            # Cool slate neutrals
            "--color-gray-50": "#f8fafc",
            "--color-gray-100": "#f1f5f9",
            "--color-gray-200": "#e2e8f0",
            "--color-gray-300": "#cbd5e1",
            "--color-gray-400": "#94a3b8",
            "--color-gray-500": "#64748b",
            "--color-gray-600": "#475569",
            "--color-gray-700": "#334155",
            "--color-gray-800": "#1e293b",
            "--color-gray-900": "#0f172a",
            # Accent
            "--color-accent": "#7c3aed",
            "--color-accent-hover": "#6d28d9",
            "--color-accent-light": "#ede9fe",
            "--color-accent-muted": "#c4b5fd",
            # Background & Surface
            "--color-background": "#f8fafc",
            "--color-surface": "#ffffff",
            "--color-surface-elevated": "#ffffff",
            "--color-surface-muted": "#f1f5f9",
            "--color-hero-background": "#ede9fe",
            # Text
            "--color-text-primary": "#0f172a",
            "--color-text-secondary": "#475569",
            "--color-text-muted": "#64748b",
            "--color-text-inverse": "#ffffff",
            # Borders
            "--color-border": "#e2e8f0",
            "--color-border-strong": "#cbd5e1",
            "--color-border-muted": "#f1f5f9",
        },
    ),
    "rose": ColorPalette(
        id="rose",
        name="Modern Rose",
        description="Vibrant rose with warm gray neutrals",
        accent_color="#e11d48",
        colors={
            # Warm neutrals (stone)
            "--color-gray-50": "#fafaf9",
            "--color-gray-100": "#f5f5f4",
            "--color-gray-200": "#e7e5e4",
            "--color-gray-300": "#d6d3d1",
            "--color-gray-400": "#a8a29e",
            "--color-gray-500": "#78716c",
            "--color-gray-600": "#57534e",
            "--color-gray-700": "#44403c",
            "--color-gray-800": "#292524",
            "--color-gray-900": "#1c1917",
            # Accent
            "--color-accent": "#e11d48",
            "--color-accent-hover": "#be123c",
            "--color-accent-light": "#ffe4e6",
            "--color-accent-muted": "#fda4af",
            # Background & Surface
            "--color-background": "#fafaf9",
            "--color-surface": "#ffffff",
            "--color-surface-elevated": "#ffffff",
            "--color-surface-muted": "#f5f5f4",
            "--color-hero-background": "#ffe4e6",
            # Text
            "--color-text-primary": "#1c1917",
            "--color-text-secondary": "#57534e",
            "--color-text-muted": "#78716c",
            "--color-text-inverse": "#ffffff",
            # Borders
            "--color-border": "#e7e5e4",
            "--color-border-strong": "#d6d3d1",
            "--color-border-muted": "#f5f5f4",
        },
    ),
    "slate": ColorPalette(
        id="slate",
        name="Minimal Slate",
        description="Understated slate for a professional, minimal look",
        accent_color="#475569",
        colors={
            # Slate neutrals
            "--color-gray-50": "#f8fafc",
            "--color-gray-100": "#f1f5f9",
            "--color-gray-200": "#e2e8f0",
            "--color-gray-300": "#cbd5e1",
            "--color-gray-400": "#94a3b8",
            "--color-gray-500": "#64748b",
            "--color-gray-600": "#475569",
            "--color-gray-700": "#334155",
            "--color-gray-800": "#1e293b",
            "--color-gray-900": "#0f172a",
            # Accent (using slate-600)
            "--color-accent": "#475569",
            "--color-accent-hover": "#334155",
            "--color-accent-light": "#f1f5f9",
            "--color-accent-muted": "#cbd5e1",
            # Background & Surface
            "--color-background": "#f8fafc",
            "--color-surface": "#ffffff",
            "--color-surface-elevated": "#ffffff",
            "--color-surface-muted": "#f1f5f9",
            "--color-hero-background": "#e2e8f0",
            # Text
            "--color-text-primary": "#0f172a",
            "--color-text-secondary": "#475569",
            "--color-text-muted": "#64748b",
            "--color-text-inverse": "#ffffff",
            # Borders
            "--color-border": "#e2e8f0",
            "--color-border-strong": "#cbd5e1",
            "--color-border-muted": "#f1f5f9",
        },
    ),
}


def get_palette(palette_id: PaletteId) -> ColorPalette:
    """Get a palette by ID."""
    return PALETTES.get(palette_id, PALETTES["amber"])


def get_all_palettes() -> list[ColorPalette]:
    """Get all available palettes."""
    return list(PALETTES.values())


class BrandingService:
    """Service for managing site branding configuration."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_branding(self) -> SiteBranding:
        """Get current branding configuration.

        Returns the existing branding row or creates the default if missing.
        """
        stmt = select(SiteBranding).where(SiteBranding.id == 1)
        result = await self.session.execute(stmt)
        branding = result.scalar_one_or_none()

        if not branding:
            # Create default branding row
            branding = SiteBranding(id=1)
            self.session.add(branding)
            await self.session.commit()
            await self.session.refresh(branding)

        return branding

    async def update_branding(
        self,
        company_name: str | None = None,
        product_name: str | None = None,
        tagline: str | None = None,
        palette_id: PaletteId | None = None,
    ) -> SiteBranding:
        """Update branding configuration.

        Only provided fields are updated; None values are ignored.
        """
        branding = await self.get_branding()

        if company_name is not None:
            branding.company_name = company_name
        if product_name is not None:
            branding.product_name = product_name
        if tagline is not None:
            branding.tagline = tagline
        if palette_id is not None:
            if palette_id not in PALETTES:
                raise ValueError(f"Invalid palette_id: {palette_id}")
            branding.palette_id = palette_id

        await self.session.commit()
        await self.session.refresh(branding)
        return branding

    async def upload_logo(
        self,
        logo_type: LogoType,
        content: bytes,
        filename: str,
    ) -> str:
        """Upload a logo file.

        Args:
            logo_type: Type of logo (full, icon, full_light, icon_light)
            content: File content as bytes
            filename: Original filename for extension

        Returns:
            Storage path/key for the uploaded logo
        """
        branding = await self.get_branding()

        # Get file extension
        ext = Path(filename).suffix.lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
            raise ValueError("Invalid file type. Allowed: png, jpg, jpeg, webp, svg")

        # Generate unique filename
        unique_name = f"branding/logo_{logo_type}_{uuid.uuid4().hex[:8]}{ext}"

        # Ensure branding directory exists
        branding_dir = Path(settings.upload_dir) / "branding"
        branding_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = Path(settings.upload_dir) / unique_name
        file_path.write_bytes(content)

        # Delete old logo if exists
        old_path = getattr(branding, f"logo_{logo_type}_path")
        if old_path:
            old_file = Path(settings.upload_dir) / old_path
            if old_file.exists():
                old_file.unlink()

        # Update branding record
        setattr(branding, f"logo_{logo_type}_path", unique_name)
        await self.session.commit()
        await self.session.refresh(branding)

        return unique_name

    async def delete_logo(self, logo_type: LogoType) -> bool:
        """Delete a logo file.

        Args:
            logo_type: Type of logo to delete

        Returns:
            True if deleted, False if no logo existed
        """
        branding = await self.get_branding()

        path_attr = f"logo_{logo_type}_path"
        current_path = getattr(branding, path_attr)

        if not current_path:
            return False

        # Delete file if exists
        file_path = Path(settings.upload_dir) / current_path
        if file_path.exists():
            file_path.unlink()

        # Clear path in database
        setattr(branding, path_attr, None)
        await self.session.commit()
        await self.session.refresh(branding)

        return True

    def get_logo_url(self, path: str | None) -> str | None:
        """Convert storage path to public URL."""
        if not path:
            return None
        return f"/uploads/{path}"
