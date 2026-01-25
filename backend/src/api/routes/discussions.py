"""Discussion API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.schemas.discussion import (
    ThreadCreate,
    ThreadDetailResponse,
    ThreadListResponse,
    ThreadsListResponse,
    ReplyCreate,
    ReplyResponse,
    AuthorInfo,
)
from src.domain.models.user import User, UserRole
from src.domain.services.discussion import DiscussionService
from src.domain.services.enrollment import EnrollmentService
from src.infrastructure.database import get_db
from src.infrastructure.repositories.competition import CompetitionRepository

router = APIRouter(tags=["discussions"])


async def _get_competition_or_404(slug: str, db: AsyncSession):
    """Helper to get competition by slug or raise 404."""
    repo = CompetitionRepository(db)
    competition = await repo.get_by_slug(slug)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )
    return competition


async def _check_can_post(
    competition_id: int,
    sponsor_id: int,
    user: User,
    db: AsyncSession,
) -> None:
    """Check if user can post (enrolled or sponsor)."""
    if user.id == sponsor_id or user.role == UserRole.ADMIN:
        return  # Sponsor and admins can always post

    enrollment_service = EnrollmentService(db)
    is_enrolled = await enrollment_service.is_enrolled(user.id, competition_id)
    if not is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this competition to post",
        )


@router.get(
    "/competitions/{slug}/discussions",
    response_model=ThreadsListResponse,
)
async def list_threads(
    slug: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> ThreadsListResponse:
    """List discussion threads for a competition."""
    competition = await _get_competition_or_404(slug, db)

    service = DiscussionService(db)
    threads = await service.get_threads(competition.id, skip=skip, limit=limit)
    total = await service.get_thread_count(competition.id)

    # Build response with reply counts
    thread_responses = []
    for thread in threads:
        reply_count = await service.get_reply_count(thread.id)
        thread_responses.append(
            ThreadListResponse(
                id=thread.id,
                title=thread.title,
                content=thread.content,
                author=AuthorInfo(
                    id=thread.author.id,
                    username=thread.author.username,
                    display_name=thread.author.display_name,
                ),
                is_pinned=thread.is_pinned,
                is_locked=thread.is_locked,
                reply_count=reply_count,
                created_at=thread.created_at,
                updated_at=thread.updated_at,
            )
        )

    return ThreadsListResponse(
        threads=thread_responses,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/competitions/{slug}/discussions",
    response_model=ThreadDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_thread(
    slug: str,
    data: ThreadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ThreadDetailResponse:
    """Create a new discussion thread."""
    competition = await _get_competition_or_404(slug, db)
    await _check_can_post(competition.id, competition.sponsor_id, current_user, db)

    service = DiscussionService(db)
    thread = await service.create_thread(
        competition_id=competition.id,
        author_id=current_user.id,
        title=data.title,
        content=data.content,
    )

    return ThreadDetailResponse(
        id=thread.id,
        competition_id=thread.competition_id,
        title=thread.title,
        content=thread.content,
        author=AuthorInfo(
            id=current_user.id,
            username=current_user.username,
            display_name=current_user.display_name,
        ),
        is_pinned=thread.is_pinned,
        is_locked=thread.is_locked,
        replies=[],
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


@router.get(
    "/competitions/{slug}/discussions/{thread_id}",
    response_model=ThreadDetailResponse,
)
async def get_thread(
    slug: str,
    thread_id: int,
    db: AsyncSession = Depends(get_db),
) -> ThreadDetailResponse:
    """Get a discussion thread with its replies."""
    competition = await _get_competition_or_404(slug, db)

    service = DiscussionService(db)
    thread = await service.get_thread(thread_id)

    if not thread or thread.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )

    return ThreadDetailResponse(
        id=thread.id,
        competition_id=thread.competition_id,
        title=thread.title,
        content=thread.content,
        author=AuthorInfo(
            id=thread.author.id,
            username=thread.author.username,
            display_name=thread.author.display_name,
        ),
        is_pinned=thread.is_pinned,
        is_locked=thread.is_locked,
        replies=[
            ReplyResponse(
                id=reply.id,
                thread_id=reply.thread_id,
                content=reply.content,
                author=AuthorInfo(
                    id=reply.author.id,
                    username=reply.author.username,
                    display_name=reply.author.display_name,
                ),
                created_at=reply.created_at,
            )
            for reply in thread.replies
        ],
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


@router.post(
    "/competitions/{slug}/discussions/{thread_id}/replies",
    response_model=ReplyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reply(
    slug: str,
    thread_id: int,
    data: ReplyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReplyResponse:
    """Add a reply to a discussion thread."""
    competition = await _get_competition_or_404(slug, db)
    await _check_can_post(competition.id, competition.sponsor_id, current_user, db)

    service = DiscussionService(db)

    # Verify thread exists and belongs to this competition
    thread = await service.get_thread(thread_id)
    if not thread or thread.competition_id != competition.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )

    try:
        reply = await service.create_reply(
            thread_id=thread_id,
            author_id=current_user.id,
            content=data.content,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return ReplyResponse(
        id=reply.id,
        thread_id=reply.thread_id,
        content=reply.content,
        author=AuthorInfo(
            id=current_user.id,
            username=current_user.username,
            display_name=current_user.display_name,
        ),
        created_at=reply.created_at,
    )
