"""Branding API schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# Palette IDs
PaletteId = Literal["amber", "blue", "emerald", "violet", "rose", "slate"]


class ColorPalette(BaseModel):
    """Color palette definition."""

    id: PaletteId
    name: str
    description: str
    accent_color: str = Field(description="Primary accent color hex")
    colors: dict[str, str] = Field(description="CSS variable name to hex color mapping")


class BrandingResponse(BaseModel):
    """Public branding response for rendering UI."""

    model_config = ConfigDict(from_attributes=True)

    company_name: str
    product_name: str
    tagline: str | None
    logo_full_url: str | None = None
    logo_icon_url: str | None = None
    logo_full_light_url: str | None = None
    logo_icon_light_url: str | None = None
    favicon_url: str | None = None
    palette_id: PaletteId
    palette: ColorPalette


class BrandingUpdate(BaseModel):
    """Request schema for updating branding settings."""

    company_name: str | None = Field(None, min_length=1, max_length=100)
    product_name: str | None = Field(None, min_length=1, max_length=100)
    tagline: str | None = Field(None, max_length=255)
    palette_id: PaletteId | None = None


class AdminBrandingResponse(BaseModel):
    """Full branding response for admin view."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    product_name: str
    tagline: str | None
    logo_full_path: str | None
    logo_icon_path: str | None
    logo_full_light_path: str | None
    logo_icon_light_path: str | None
    favicon_path: str | None
    logo_full_url: str | None = None
    logo_icon_url: str | None = None
    logo_full_light_url: str | None = None
    logo_icon_light_url: str | None = None
    favicon_url: str | None = None
    palette_id: PaletteId
    palette: ColorPalette
    created_at: datetime
    updated_at: datetime


class LogoUploadResponse(BaseModel):
    """Response after logo upload."""

    message: str
    logo_type: str
    url: str


class LogoDeleteResponse(BaseModel):
    """Response after logo deletion."""

    message: str
    logo_type: str


class PaletteListResponse(BaseModel):
    """Response containing all available palettes."""

    palettes: list[ColorPalette]
