"""Branding API routes."""

from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.routes.admin import require_admin
from src.api.schemas.branding import (
    AdminBrandingResponse,
    BrandingResponse,
    BrandingUpdate,
    LogoDeleteResponse,
    LogoUploadResponse,
    PaletteListResponse,
)
from src.domain.models.user import User
from src.domain.services.branding import (
    BrandingService,
    LogoType,
    get_all_palettes,
    get_palette,
)
from src.infrastructure.database import get_db


router = APIRouter(prefix="/branding", tags=["Branding"])
admin_router = APIRouter(prefix="/admin/branding", tags=["Admin Branding"])


# =============================================================================
# Public Endpoints
# =============================================================================


@router.get("", response_model=BrandingResponse)
async def get_branding(
    db: AsyncSession = Depends(get_db),
):
    """Get current branding configuration for rendering.

    This endpoint is public and used by the frontend to load branding on app start.
    """
    service = BrandingService(db)
    branding = await service.get_branding()
    palette = get_palette(branding.palette_id)

    return BrandingResponse(
        company_name=branding.company_name,
        product_name=branding.product_name,
        tagline=branding.tagline,
        logo_full_url=service.get_logo_url(branding.logo_full_path),
        logo_icon_url=service.get_logo_url(branding.logo_icon_path),
        logo_full_light_url=service.get_logo_url(branding.logo_full_light_path),
        logo_icon_light_url=service.get_logo_url(branding.logo_icon_light_path),
        palette_id=branding.palette_id,
        palette=palette,
    )


# =============================================================================
# Admin Endpoints
# =============================================================================


@admin_router.get("", response_model=AdminBrandingResponse)
async def get_admin_branding(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get full branding configuration (admin view)."""
    service = BrandingService(db)
    branding = await service.get_branding()
    palette = get_palette(branding.palette_id)

    return AdminBrandingResponse(
        id=branding.id,
        company_name=branding.company_name,
        product_name=branding.product_name,
        tagline=branding.tagline,
        logo_full_path=branding.logo_full_path,
        logo_icon_path=branding.logo_icon_path,
        logo_full_light_path=branding.logo_full_light_path,
        logo_icon_light_path=branding.logo_icon_light_path,
        logo_full_url=service.get_logo_url(branding.logo_full_path),
        logo_icon_url=service.get_logo_url(branding.logo_icon_path),
        logo_full_light_url=service.get_logo_url(branding.logo_full_light_path),
        logo_icon_light_url=service.get_logo_url(branding.logo_icon_light_path),
        palette_id=branding.palette_id,
        palette=palette,
        created_at=branding.created_at,
        updated_at=branding.updated_at,
    )


@admin_router.put("", response_model=AdminBrandingResponse)
async def update_branding(
    data: BrandingUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update branding settings."""
    service = BrandingService(db)

    try:
        branding = await service.update_branding(
            company_name=data.company_name,
            product_name=data.product_name,
            tagline=data.tagline,
            palette_id=data.palette_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    palette = get_palette(branding.palette_id)

    return AdminBrandingResponse(
        id=branding.id,
        company_name=branding.company_name,
        product_name=branding.product_name,
        tagline=branding.tagline,
        logo_full_path=branding.logo_full_path,
        logo_icon_path=branding.logo_icon_path,
        logo_full_light_path=branding.logo_full_light_path,
        logo_icon_light_path=branding.logo_icon_light_path,
        logo_full_url=service.get_logo_url(branding.logo_full_path),
        logo_icon_url=service.get_logo_url(branding.logo_icon_path),
        logo_full_light_url=service.get_logo_url(branding.logo_full_light_path),
        logo_icon_light_url=service.get_logo_url(branding.logo_icon_light_path),
        palette_id=branding.palette_id,
        palette=palette,
        created_at=branding.created_at,
        updated_at=branding.updated_at,
    )


@admin_router.post("/logo", response_model=LogoUploadResponse)
async def upload_logo(
    logo_type: Literal["full", "icon", "full_light", "icon_light"],
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload a logo file.

    Args:
        logo_type: Type of logo to upload:
            - full: Main horizontal logo
            - icon: Square icon/favicon
            - full_light: Light variant for dark backgrounds
            - icon_light: Light icon variant
    """
    service = BrandingService(db)

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    # Read file content
    content = await file.read()

    # Check file size (max 2MB)
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 2MB",
        )

    try:
        path = await service.upload_logo(
            logo_type=logo_type,
            content=content,
            filename=file.filename or "logo.png",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return LogoUploadResponse(
        message=f"Logo uploaded successfully",
        logo_type=logo_type,
        url=service.get_logo_url(path) or "",
    )


@admin_router.delete("/logo/{logo_type}", response_model=LogoDeleteResponse)
async def delete_logo(
    logo_type: Literal["full", "icon", "full_light", "icon_light"],
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a logo file."""
    service = BrandingService(db)
    deleted = await service.delete_logo(logo_type)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {logo_type} logo found",
        )

    return LogoDeleteResponse(
        message=f"Logo deleted successfully",
        logo_type=logo_type,
    )


@admin_router.get("/palettes", response_model=PaletteListResponse)
async def list_palettes(
    admin: User = Depends(require_admin),
):
    """Get list of available color palettes."""
    return PaletteListResponse(palettes=get_all_palettes())
