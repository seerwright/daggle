"""User profile API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.profile import (
    UserProfileResponse,
    CompetitionParticipationResponse,
    ProfileStatsResponse,
)
from src.domain.models.competition import CompetitionStatus
from src.domain.services.profile import ProfileService
from src.infrastructure.database import get_db

router = APIRouter(prefix="/users", tags=["profiles"])


@router.get("/{username}", response_model=UserProfileResponse)
async def get_user_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Get public profile for a user.

    This endpoint is public - no authentication required.
    Returns the user's profile with competition participations and stats.
    """
    service = ProfileService(db)
    profile = await service.get_profile(username)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserProfileResponse(
        id=profile.id,
        username=profile.username,
        display_name=profile.display_name,
        joined_at=profile.joined_at,
        competitions_entered=profile.competitions_entered,
        total_submissions=profile.total_submissions,
        best_rank=profile.best_rank,
        participations=[
            CompetitionParticipationResponse(
                competition_id=p.competition_id,
                competition_title=p.competition_title,
                competition_slug=p.competition_slug,
                status=p.status,
                enrolled_at=p.enrolled_at,
                submission_count=p.submission_count,
                best_score=p.best_score,
                rank=p.rank,
                total_participants=p.total_participants,
            )
            for p in profile.participations
        ],
    )


@router.get("/{username}/stats", response_model=ProfileStatsResponse)
async def get_user_stats(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Get stats summary for a user.

    A lighter endpoint that returns just the stats without full participation details.
    """
    service = ProfileService(db)
    profile = await service.get_profile(username)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    active_competitions = sum(
        1 for p in profile.participations
        if p.status == CompetitionStatus.ACTIVE
    )

    return ProfileStatsResponse(
        competitions_entered=profile.competitions_entered,
        total_submissions=profile.total_submissions,
        best_rank=profile.best_rank,
        active_competitions=active_competitions,
    )
