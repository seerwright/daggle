"""Admin service for platform administration."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.competition import Competition, CompetitionStatus
from src.domain.models.discussion import DiscussionThread
from src.domain.models.enrollment import Enrollment
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User, UserRole
from src.infrastructure.repositories.user import UserRepository
from src.infrastructure.repositories.competition import CompetitionRepository


@dataclass
class PlatformStats:
    """Platform-wide statistics."""

    total_users: int
    active_users_last_30_days: int
    total_competitions: int
    active_competitions: int
    total_submissions: int
    submissions_last_7_days: int
    total_enrollments: int


@dataclass
class UserSummary:
    """Summary of a user for admin view."""

    id: int
    email: str
    username: str
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: datetime | None
    competition_count: int
    submission_count: int


class AdminService:
    """Service for admin operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserRepository(session)
        self.competition_repo = CompetitionRepository(session)

    async def get_platform_stats(self) -> PlatformStats:
        """Get platform-wide statistics."""
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)

        # Total users
        total_users_stmt = select(func.count(User.id))
        total_users = (await self.session.execute(total_users_stmt)).scalar() or 0

        # Active users (logged in within 30 days)
        active_users_stmt = (
            select(func.count(User.id))
            .where(User.last_login >= thirty_days_ago)
        )
        active_users = (await self.session.execute(active_users_stmt)).scalar() or 0

        # Total competitions
        total_comps_stmt = select(func.count(Competition.id))
        total_competitions = (await self.session.execute(total_comps_stmt)).scalar() or 0

        # Active competitions
        active_comps_stmt = (
            select(func.count(Competition.id))
            .where(Competition.status == CompetitionStatus.ACTIVE)
        )
        active_competitions = (await self.session.execute(active_comps_stmt)).scalar() or 0

        # Total submissions
        total_subs_stmt = select(func.count(Submission.id))
        total_submissions = (await self.session.execute(total_subs_stmt)).scalar() or 0

        # Submissions last 7 days
        recent_subs_stmt = (
            select(func.count(Submission.id))
            .where(Submission.created_at >= seven_days_ago)
        )
        recent_submissions = (await self.session.execute(recent_subs_stmt)).scalar() or 0

        # Total enrollments
        total_enrollments_stmt = select(func.count(Enrollment.id))
        total_enrollments = (await self.session.execute(total_enrollments_stmt)).scalar() or 0

        return PlatformStats(
            total_users=total_users,
            active_users_last_30_days=active_users,
            total_competitions=total_competitions,
            active_competitions=active_competitions,
            total_submissions=total_submissions,
            submissions_last_7_days=recent_submissions,
            total_enrollments=total_enrollments,
        )

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> list[UserSummary]:
        """List users with optional filtering."""
        stmt = select(User)

        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                (User.username.ilike(search_pattern)) |
                (User.email.ilike(search_pattern)) |
                (User.display_name.ilike(search_pattern))
            )

        if role is not None:
            stmt = stmt.where(User.role == role)

        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        stmt = stmt.order_by(User.created_at.desc()).offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        users = result.scalars().all()

        summaries = []
        for user in users:
            # Get competition count
            comp_count_stmt = (
                select(func.count(Enrollment.id))
                .where(Enrollment.user_id == user.id)
            )
            comp_count = (await self.session.execute(comp_count_stmt)).scalar() or 0

            # Get submission count
            sub_count_stmt = (
                select(func.count(Submission.id))
                .where(Submission.user_id == user.id)
            )
            sub_count = (await self.session.execute(sub_count_stmt)).scalar() or 0

            summaries.append(
                UserSummary(
                    id=user.id,
                    email=user.email,
                    username=user.username,
                    display_name=user.display_name,
                    role=user.role,
                    is_active=user.is_active,
                    created_at=user.created_at,
                    last_login=user.last_login,
                    competition_count=comp_count,
                    submission_count=sub_count,
                )
            )

        return summaries

    async def get_user(self, user_id: int) -> UserSummary | None:
        """Get detailed user information."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return None

        # Get competition count
        comp_count_stmt = (
            select(func.count(Enrollment.id))
            .where(Enrollment.user_id == user.id)
        )
        comp_count = (await self.session.execute(comp_count_stmt)).scalar() or 0

        # Get submission count
        sub_count_stmt = (
            select(func.count(Submission.id))
            .where(Submission.user_id == user.id)
        )
        sub_count = (await self.session.execute(sub_count_stmt)).scalar() or 0

        return UserSummary(
            id=user.id,
            email=user.email,
            username=user.username,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
            competition_count=comp_count,
            submission_count=sub_count,
        )

    async def suspend_user(self, user_id: int, admin: User) -> User:
        """Suspend a user account.

        Args:
            user_id: User to suspend
            admin: Admin performing the action

        Returns:
            Updated user

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can suspend users")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.id == admin.id:
            raise ValueError("Cannot suspend yourself")

        if user.role == UserRole.ADMIN:
            raise ValueError("Cannot suspend other admins")

        user.is_active = False
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def reactivate_user(self, user_id: int, admin: User) -> User:
        """Reactivate a suspended user account.

        Args:
            user_id: User to reactivate
            admin: Admin performing the action

        Returns:
            Updated user

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can reactivate users")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        user.is_active = True
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def change_user_role(
        self, user_id: int, new_role: UserRole, admin: User
    ) -> User:
        """Change a user's role.

        Args:
            user_id: User to update
            new_role: New role to assign
            admin: Admin performing the action

        Returns:
            Updated user

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can change user roles")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.id == admin.id:
            raise ValueError("Cannot change your own role")

        user.role = new_role
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def list_all_competitions(
        self,
        skip: int = 0,
        limit: int = 50,
        status: CompetitionStatus | None = None,
    ) -> list[Competition]:
        """List all competitions (including private/draft)."""
        stmt = select(Competition)

        if status is not None:
            stmt = stmt.where(Competition.status == status)

        stmt = stmt.order_by(Competition.created_at.desc()).offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def lock_thread(self, thread_id: int, admin: User) -> DiscussionThread:
        """Lock a discussion thread.

        Args:
            thread_id: Thread to lock
            admin: Admin performing the action

        Returns:
            Updated thread

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can lock threads")

        stmt = select(DiscussionThread).where(DiscussionThread.id == thread_id)
        result = await self.session.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise ValueError("Thread not found")

        thread.is_locked = True
        await self.session.commit()
        await self.session.refresh(thread)
        return thread

    async def unlock_thread(self, thread_id: int, admin: User) -> DiscussionThread:
        """Unlock a discussion thread.

        Args:
            thread_id: Thread to unlock
            admin: Admin performing the action

        Returns:
            Updated thread

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can unlock threads")

        stmt = select(DiscussionThread).where(DiscussionThread.id == thread_id)
        result = await self.session.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise ValueError("Thread not found")

        thread.is_locked = False
        await self.session.commit()
        await self.session.refresh(thread)
        return thread

    async def pin_thread(self, thread_id: int, admin: User) -> DiscussionThread:
        """Pin a discussion thread.

        Args:
            thread_id: Thread to pin
            admin: Admin performing the action

        Returns:
            Updated thread

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can pin threads")

        stmt = select(DiscussionThread).where(DiscussionThread.id == thread_id)
        result = await self.session.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise ValueError("Thread not found")

        thread.is_pinned = True
        await self.session.commit()
        await self.session.refresh(thread)
        return thread

    async def unpin_thread(self, thread_id: int, admin: User) -> DiscussionThread:
        """Unpin a discussion thread.

        Args:
            thread_id: Thread to unpin
            admin: Admin performing the action

        Returns:
            Updated thread

        Raises:
            ValueError: If validation fails
        """
        if admin.role != UserRole.ADMIN:
            raise ValueError("Only admins can unpin threads")

        stmt = select(DiscussionThread).where(DiscussionThread.id == thread_id)
        result = await self.session.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise ValueError("Thread not found")

        thread.is_pinned = False
        await self.session.commit()
        await self.session.refresh(thread)
        return thread
