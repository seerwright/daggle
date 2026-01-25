"""Discussion service."""

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.discussion import DiscussionThread, DiscussionReply
from src.infrastructure.repositories.discussion import (
    DiscussionThreadRepository,
    DiscussionReplyRepository,
)
from src.infrastructure.repositories.enrollment import EnrollmentRepository


class DiscussionService:
    """Service for discussion operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.thread_repo = DiscussionThreadRepository(session)
        self.reply_repo = DiscussionReplyRepository(session)
        self.enrollment_repo = EnrollmentRepository(session)

    async def create_thread(
        self,
        competition_id: int,
        author_id: int,
        title: str,
        content: str,
    ) -> DiscussionThread:
        """Create a new discussion thread."""
        # Verify user is enrolled (or is the sponsor - handled by route)
        thread = DiscussionThread(
            competition_id=competition_id,
            author_id=author_id,
            title=title,
            content=content,
        )
        return await self.thread_repo.create(thread)

    async def get_threads(
        self,
        competition_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[DiscussionThread]:
        """Get threads for a competition."""
        return await self.thread_repo.get_by_competition(
            competition_id, skip=skip, limit=limit
        )

    async def get_thread(self, thread_id: int) -> DiscussionThread | None:
        """Get a thread by ID with its replies."""
        return await self.thread_repo.get_with_replies(thread_id)

    async def get_thread_count(self, competition_id: int) -> int:
        """Get the number of threads in a competition."""
        return await self.thread_repo.count_by_competition(competition_id)

    async def create_reply(
        self,
        thread_id: int,
        author_id: int,
        content: str,
    ) -> DiscussionReply:
        """Create a reply to a thread."""
        # Get thread to verify it exists and is not locked
        thread = await self.thread_repo.get_by_id(thread_id)
        if not thread:
            raise ValueError("Thread not found")
        if thread.is_locked:
            raise ValueError("Thread is locked")

        reply = DiscussionReply(
            thread_id=thread_id,
            author_id=author_id,
            content=content,
        )
        return await self.reply_repo.create(reply)

    async def get_reply_count(self, thread_id: int) -> int:
        """Get the number of replies in a thread."""
        return await self.reply_repo.count_by_thread(thread_id)

    async def pin_thread(self, thread_id: int) -> DiscussionThread | None:
        """Pin a thread."""
        thread = await self.thread_repo.get_by_id(thread_id)
        if thread:
            thread.is_pinned = True
            return await self.thread_repo.update(thread)
        return None

    async def unpin_thread(self, thread_id: int) -> DiscussionThread | None:
        """Unpin a thread."""
        thread = await self.thread_repo.get_by_id(thread_id)
        if thread:
            thread.is_pinned = False
            return await self.thread_repo.update(thread)
        return None

    async def lock_thread(self, thread_id: int) -> DiscussionThread | None:
        """Lock a thread (prevent new replies)."""
        thread = await self.thread_repo.get_by_id(thread_id)
        if thread:
            thread.is_locked = True
            return await self.thread_repo.update(thread)
        return None

    async def unlock_thread(self, thread_id: int) -> DiscussionThread | None:
        """Unlock a thread."""
        thread = await self.thread_repo.get_by_id(thread_id)
        if thread:
            thread.is_locked = False
            return await self.thread_repo.update(thread)
        return None
