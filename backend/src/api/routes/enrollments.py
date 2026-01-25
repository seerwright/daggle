"""Enrollment API routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.domain.models.user import User
from src.domain.services.enrollment import EnrollmentService
from src.infrastructure.repositories.competition import CompetitionRepository

router = APIRouter(tags=["enrollments"])


class EnrollmentResponse(BaseModel):
    """Response for enrollment status."""

    enrolled: bool
    enrolled_at: datetime | None = None

    model_config = {"from_attributes": True}


class EnrollmentActionResponse(BaseModel):
    """Response for enrollment actions."""

    message: str
    enrolled: bool


@router.post(
    "/competitions/{slug}/enroll",
    response_model=EnrollmentActionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def enroll_in_competition(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentActionResponse:
    """Enroll the current user in a competition."""
    # Get competition by slug
    competition_repo = CompetitionRepository(db)
    competition = await competition_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Enroll user
    enrollment_service = EnrollmentService(db)
    try:
        await enrollment_service.enroll(current_user.id, competition.id)
        return EnrollmentActionResponse(
            message="Successfully enrolled in competition",
            enrolled=True,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/competitions/{slug}/enroll",
    response_model=EnrollmentActionResponse,
)
async def unenroll_from_competition(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentActionResponse:
    """Remove the current user's enrollment from a competition."""
    # Get competition by slug
    competition_repo = CompetitionRepository(db)
    competition = await competition_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Unenroll user
    enrollment_service = EnrollmentService(db)
    try:
        await enrollment_service.unenroll(current_user.id, competition.id)
        return EnrollmentActionResponse(
            message="Successfully unenrolled from competition",
            enrolled=False,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/competitions/{slug}/enrollment",
    response_model=EnrollmentResponse,
)
async def get_enrollment_status(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentResponse:
    """Get the current user's enrollment status for a competition."""
    # Get competition by slug
    competition_repo = CompetitionRepository(db)
    competition = await competition_repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check enrollment
    enrollment_service = EnrollmentService(db)
    enrollment = await enrollment_service.get_enrollment(
        current_user.id, competition.id
    )

    if enrollment:
        return EnrollmentResponse(
            enrolled=True,
            enrolled_at=enrollment.created_at,
        )
    return EnrollmentResponse(enrolled=False)
