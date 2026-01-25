"""Notification repository."""

from datetime import datetime, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.notification import Notification
from src.infrastructure.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    """Repository for notification operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, Notification)

    async def get_by_user(
        self,
        user_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Notification]:
        """Get notifications for a user.

        Args:
            user_id: User ID
            unread_only: If True, only return unread notifications
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of notifications, newest first
        """
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        if unread_only:
            stmt = stmt.where(Notification.is_read == False)  # noqa: E712

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_unread(self, user_id: int) -> int:
        """Count unread notifications for a user.

        Args:
            user_id: User ID

        Returns:
            Number of unread notifications
        """
        stmt = (
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.is_read == False)  # noqa: E712
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read.

        Args:
            notification_id: Notification ID
            user_id: User ID (for ownership verification)

        Returns:
            True if notification was marked as read, False if not found
        """
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read == False)  # noqa: E712
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user.

        Args:
            user_id: User ID

        Returns:
            Number of notifications marked as read
        """
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read == False)  # noqa: E712
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        return result.rowcount
