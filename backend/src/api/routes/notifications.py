"""Notification API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user
from src.api.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkReadResponse,
)
from src.domain.models.user import User
from src.domain.services.notification import NotificationService
from src.infrastructure.database import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's notifications."""
    service = NotificationService(db)

    notifications = await service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        skip=skip,
        limit=min(limit, 100),  # Cap at 100
    )
    unread_count = await service.get_unread_count(current_user.id)

    return NotificationListResponse(
        notifications=[
            NotificationResponse.model_validate(n) for n in notifications
        ],
        unread_count=unread_count,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread notifications."""
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read."""
    service = NotificationService(db)
    success = await service.mark_as_read(notification_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or already read",
        )

    return MarkReadResponse(success=True, marked_count=1)


@router.post("/read-all", response_model=MarkReadResponse)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    service = NotificationService(db)
    count = await service.mark_all_as_read(current_user.id)
    return MarkReadResponse(success=True, marked_count=count)
