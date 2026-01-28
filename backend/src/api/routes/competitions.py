"""Competition routes."""

import io
import zipfile

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user, require_sponsor
from src.api.schemas.competition import (
    CompetitionCreate,
    CompetitionListResponse,
    CompetitionResponse,
    CompetitionUpdate,
)
from src.api.schemas.competition_file import (
    CompetitionFileResponse,
    CompetitionFileUpdate,
)
from src.api.schemas.faq import FAQCreate, FAQResponse, FAQUpdate, FAQReorderRequest
from src.domain.models.user import User, UserRole
from src.domain.services.competition import CompetitionService
from src.domain.services.competition_file import CompetitionFileService
from src.domain.services.faq import FAQService
from src.infrastructure.database import get_db

router = APIRouter(prefix="/competitions", tags=["Competitions"])


@router.post("/", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
    data: CompetitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_sponsor),
):
    """Create a new competition. Requires sponsor or admin role."""
    if data.end_date <= data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    service = CompetitionService(db)
    competition = await service.create(data, current_user)
    return CompetitionResponse.from_orm_with_extras(competition)


@router.get("/", response_model=list[CompetitionListResponse])
async def list_competitions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List active public competitions."""
    service = CompetitionService(db)
    competitions = await service.list_active(skip=skip, limit=limit)
    return [CompetitionListResponse.from_orm_with_thumbnail(c) for c in competitions]


@router.get("/mine", response_model=list[CompetitionListResponse])
async def list_my_competitions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List competitions created by the current user."""
    service = CompetitionService(db)
    competitions = await service.list_by_sponsor(current_user.id, skip=skip, limit=limit)
    return [CompetitionListResponse.from_orm_with_thumbnail(c) for c in competitions]


@router.get("/{slug}", response_model=CompetitionResponse)
async def get_competition(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a competition by slug."""
    service = CompetitionService(db)
    competition = await service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    return CompetitionResponse.from_orm_with_extras(competition)


@router.patch("/{slug}", response_model=CompetitionResponse)
async def update_competition(
    slug: str,
    data: CompetitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a competition. Only the sponsor or admin can update."""
    service = CompetitionService(db)
    competition = await service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this competition",
        )

    # Validate dates if both are being updated
    if data.start_date and data.end_date and data.end_date <= data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    competition = await service.update(competition, data)
    return CompetitionResponse.from_orm_with_extras(competition)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competition(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a competition. Only the sponsor or admin can delete."""
    service = CompetitionService(db)
    competition = await service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this competition",
        )

    await service.delete(competition)


@router.post("/{slug}/truth-set", response_model=CompetitionResponse)
async def upload_truth_set(
    slug: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a truth set CSV for scoring submissions.

    Only the sponsor or admin can upload a truth set.
    The CSV must have 'id' and 'target' columns.
    """
    service = CompetitionService(db)
    competition = await service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload a truth set for this competition",
        )

    # Validate file type
    if file.filename and not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file",
        )

    try:
        competition = await service.upload_truth_set(competition, file)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return CompetitionResponse.from_orm_with_extras(competition)


@router.post("/{slug}/thumbnail", response_model=CompetitionResponse)
async def upload_thumbnail(
    slug: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a thumbnail image for the competition.

    Only the sponsor or admin can upload a thumbnail.
    Accepts PNG, JPG, JPEG, and WebP images (max 5MB).
    """
    service = CompetitionService(db)
    competition = await service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload a thumbnail for this competition",
        )

    # Validate file type
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp"}
    if file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File must be an image ({', '.join(allowed_extensions)})",
            )

    try:
        competition = await service.upload_thumbnail(competition, file)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return CompetitionResponse.from_orm_with_extras(competition)


# ============================================================================
# FAQ Endpoints
# ============================================================================


@router.get("/{slug}/faqs", response_model=list[FAQResponse])
async def list_faqs(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """List all FAQs for a competition."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    faq_service = FAQService(db)
    return await faq_service.list_by_competition(competition.id)


@router.post("/{slug}/faqs", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(
    slug: str,
    data: FAQCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new FAQ entry. Only the sponsor or admin can create FAQs."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage FAQs for this competition",
        )

    faq_service = FAQService(db)
    return await faq_service.create(competition.id, data)


@router.patch("/{slug}/faqs/{faq_id}", response_model=FAQResponse)
async def update_faq(
    slug: str,
    faq_id: int,
    data: FAQUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a FAQ entry. Only the sponsor or admin can update FAQs."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage FAQs for this competition",
        )

    faq_service = FAQService(db)
    faq = await faq_service.get_by_id(faq_id)

    if faq is None or faq.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found",
        )

    return await faq_service.update(faq, data)


@router.delete("/{slug}/faqs/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faq(
    slug: str,
    faq_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a FAQ entry. Only the sponsor or admin can delete FAQs."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage FAQs for this competition",
        )

    faq_service = FAQService(db)
    faq = await faq_service.get_by_id(faq_id)

    if faq is None or faq.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found",
        )

    await faq_service.delete(faq)


@router.post("/{slug}/faqs/reorder", response_model=list[FAQResponse])
async def reorder_faqs(
    slug: str,
    data: FAQReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder FAQ entries. Only the sponsor or admin can reorder FAQs."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage FAQs for this competition",
        )

    faq_service = FAQService(db)
    return await faq_service.reorder(competition.id, data.faq_ids)


# ============================================================================
# File Endpoints
# ============================================================================


@router.get("/{slug}/files", response_model=list[CompetitionFileResponse])
async def list_files(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """List all files for a competition."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    file_service = CompetitionFileService(db)
    return await file_service.list_by_competition(competition.id)


@router.post(
    "/{slug}/files",
    response_model=CompetitionFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    slug: str,
    file: UploadFile = File(...),
    display_name: str | None = None,
    purpose: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file for a competition.

    Only the sponsor or admin can upload files.
    Allowed file types: csv, json, txt, md, pdf, zip, gz, tar, parquet, pkl, npy, npz
    Maximum file size: 100MB
    """
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload files for this competition",
        )

    file_service = CompetitionFileService(db)

    try:
        return await file_service.upload(
            competition=competition,
            file=file,
            display_name=display_name,
            purpose=purpose,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{slug}/files/{file_id}")
async def download_file(
    slug: str,
    file_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Download a competition file."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    file_service = CompetitionFileService(db)
    competition_file = await file_service.get_by_id(file_id)

    if competition_file is None or competition_file.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    try:
        content = await file_service.get_download_content(competition_file)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )

    return StreamingResponse(
        io.BytesIO(content),
        media_type=competition_file.file_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{competition_file.filename}"',
            "Content-Length": str(len(content)),
        },
    )


@router.patch("/{slug}/files/{file_id}", response_model=CompetitionFileResponse)
async def update_file(
    slug: str,
    file_id: int,
    data: CompetitionFileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a file's metadata. Only the sponsor or admin can update files."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage files for this competition",
        )

    file_service = CompetitionFileService(db)
    competition_file = await file_service.get_by_id(file_id)

    if competition_file is None or competition_file.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    return await file_service.update(competition_file, data)


@router.delete("/{slug}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    slug: str,
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a competition file. Only the sponsor or admin can delete files."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check permissions
    if competition.sponsor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage files for this competition",
        )

    file_service = CompetitionFileService(db)
    competition_file = await file_service.get_by_id(file_id)

    if competition_file is None or competition_file.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    await file_service.delete(competition_file)


@router.get("/{slug}/files/download-all")
async def download_all_files(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Download all competition files as a zip archive."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    file_service = CompetitionFileService(db)
    files = await file_service.list_by_competition(competition.id)

    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No files available for this competition",
        )

    # Create zip archive in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for competition_file in files:
            try:
                content = await file_service.get_download_content(competition_file)
                zip_file.writestr(competition_file.filename, content)
            except FileNotFoundError:
                # Skip files that don't exist in storage
                continue

    zip_buffer.seek(0)
    zip_filename = f"{competition.slug}-data.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
        },
    )
