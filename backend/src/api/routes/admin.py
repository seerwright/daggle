"""Admin API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.schemas.admin import (
    PlatformStatsResponse,
    UserSummaryResponse,
    UserRoleUpdateRequest,
    AdminActionResponse,
    AdminCompetitionResponse,
)
from src.domain.models.user import User, UserRole
from src.domain.models.competition import CompetitionStatus
from src.domain.services.admin import AdminService
from src.infrastructure.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/stats", response_model=PlatformStatsResponse)
async def get_platform_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get platform-wide statistics."""
    service = AdminService(db)
    stats = await service.get_platform_stats()

    return PlatformStatsResponse(
        total_users=stats.total_users,
        active_users_last_30_days=stats.active_users_last_30_days,
        total_competitions=stats.total_competitions,
        active_competitions=stats.active_competitions,
        total_submissions=stats.total_submissions,
        submissions_last_7_days=stats.submissions_last_7_days,
        total_enrollments=stats.total_enrollments,
    )


@router.get("/users", response_model=list[UserSummaryResponse])
async def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    search: str | None = Query(default=None),
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with optional filtering."""
    service = AdminService(db)
    users = await service.list_users(
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        is_active=is_active,
    )

    return [
        UserSummaryResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            display_name=u.display_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login=u.last_login,
            competition_count=u.competition_count,
            submission_count=u.submission_count,
        )
        for u in users
    ]


@router.get("/users/{user_id}", response_model=UserSummaryResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed user information."""
    service = AdminService(db)
    user = await service.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserSummaryResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
        competition_count=user.competition_count,
        submission_count=user.submission_count,
    )


@router.post("/users/{user_id}/suspend", response_model=AdminActionResponse)
async def suspend_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend a user account."""
    service = AdminService(db)
    try:
        await service.suspend_user(user_id, admin)
        return AdminActionResponse(message="User suspended successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/users/{user_id}/reactivate", response_model=AdminActionResponse)
async def reactivate_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reactivate a suspended user account."""
    service = AdminService(db)
    try:
        await service.reactivate_user(user_id, admin)
        return AdminActionResponse(message="User reactivated successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/users/{user_id}/role", response_model=AdminActionResponse)
async def change_user_role(
    user_id: int,
    data: UserRoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change a user's role."""
    service = AdminService(db)
    try:
        await service.change_user_role(user_id, data.role, admin)
        return AdminActionResponse(message=f"User role changed to {data.role.value}")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/competitions", response_model=list[AdminCompetitionResponse])
async def list_all_competitions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status: CompetitionStatus | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all competitions (including private/draft)."""
    service = AdminService(db)
    competitions = await service.list_all_competitions(
        skip=skip,
        limit=limit,
        status=status,
    )

    return [
        AdminCompetitionResponse(
            id=c.id,
            title=c.title,
            slug=c.slug,
            description=c.description,
            short_description=c.short_description,
            status=c.status,
            sponsor_id=c.sponsor_id,
            start_date=c.start_date,
            end_date=c.end_date,
            is_public=c.is_public,
            max_team_size=c.max_team_size,
            daily_submission_limit=c.daily_submission_limit,
            evaluation_metric=c.evaluation_metric,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in competitions
    ]


@router.post("/threads/{thread_id}/lock", response_model=AdminActionResponse)
async def lock_thread(
    thread_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lock a discussion thread."""
    service = AdminService(db)
    try:
        await service.lock_thread(thread_id, admin)
        return AdminActionResponse(message="Thread locked successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/threads/{thread_id}/unlock", response_model=AdminActionResponse)
async def unlock_thread(
    thread_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Unlock a discussion thread."""
    service = AdminService(db)
    try:
        await service.unlock_thread(thread_id, admin)
        return AdminActionResponse(message="Thread unlocked successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/threads/{thread_id}/pin", response_model=AdminActionResponse)
async def pin_thread(
    thread_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Pin a discussion thread."""
    service = AdminService(db)
    try:
        await service.pin_thread(thread_id, admin)
        return AdminActionResponse(message="Thread pinned successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/threads/{thread_id}/unpin", response_model=AdminActionResponse)
async def unpin_thread(
    thread_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Unpin a discussion thread."""
    service = AdminService(db)
    try:
        await service.unpin_thread(thread_id, admin)
        return AdminActionResponse(message="Thread unpinned successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
