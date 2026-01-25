"""Submission routes."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.schemas.submission import (
    LeaderboardResponse,
    SubmissionListResponse,
    SubmissionResponse,
)
from src.domain.models.user import User
from src.domain.services.competition import CompetitionService
from src.domain.services.submission import SubmissionService
from src.infrastructure.database import get_db

router = APIRouter(prefix="/competitions/{slug}/submissions", tags=["Submissions"])


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    slug: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a submission for a competition."""
    # Get competition
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Validate file type
    if file.filename and not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted",
        )

    # Create submission
    sub_service = SubmissionService(db)
    try:
        submission = await sub_service.submit(competition, current_user, file)
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/", response_model=list[SubmissionListResponse])
async def list_my_submissions(
    slug: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List current user's submissions for a competition."""
    # Get competition
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    sub_service = SubmissionService(db)
    submissions = await sub_service.list_user_submissions(
        current_user.id, competition.id, skip=skip, limit=limit
    )
    return submissions


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    slug: str,
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific submission."""
    sub_service = SubmissionService(db)
    submission = await sub_service.get_by_id(submission_id)

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Only allow users to see their own submissions
    if submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own submissions",
        )

    return submission


# Leaderboard route (separate router to avoid nested path issues)
leaderboard_router = APIRouter(tags=["Leaderboard"])


@leaderboard_router.get(
    "/competitions/{slug}/leaderboard", response_model=LeaderboardResponse
)
async def get_leaderboard(
    slug: str,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get competition leaderboard."""
    comp_service = CompetitionService(db)
    competition = await comp_service.get_by_slug(slug)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    sub_service = SubmissionService(db)
    entries = await sub_service.get_leaderboard(competition, limit=limit)

    return LeaderboardResponse(
        competition_id=competition.id,
        competition_title=competition.title,
        entries=entries,
        total_participants=len(entries),
    )
