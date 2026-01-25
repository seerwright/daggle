"""Competition routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user, require_sponsor
from src.api.schemas.competition import (
    CompetitionCreate,
    CompetitionListResponse,
    CompetitionResponse,
    CompetitionUpdate,
)
from src.domain.models.user import User, UserRole
from src.domain.services.competition import CompetitionService
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
    return competition


@router.get("/", response_model=list[CompetitionListResponse])
async def list_competitions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List active public competitions."""
    service = CompetitionService(db)
    competitions = await service.list_active(skip=skip, limit=limit)
    return competitions


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
    return competitions


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

    return competition


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
    return competition


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
