"""Submission service."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.domain.models.competition import Competition, CompetitionStatus
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User
from src.domain.scoring.scorer import create_scorer_for_competition
from src.domain.scoring.validation import validate_submission
from src.infrastructure.repositories.submission import SubmissionRepository
from src.infrastructure.storage import get_storage_backend, StorageBackend

logger = logging.getLogger(__name__)


class SubmissionService:
    """Service for submission operations."""

    def __init__(
        self,
        session: AsyncSession,
        storage: StorageBackend | None = None,
    ) -> None:
        self.session = session
        self.repo = SubmissionRepository(session)
        self.storage = storage or get_storage_backend()

    async def submit(
        self,
        competition: Competition,
        user: User,
        file: UploadFile,
    ) -> Submission:
        """Submit a file for a competition."""
        # Check competition is active
        if competition.status != CompetitionStatus.ACTIVE:
            raise ValueError("Competition is not accepting submissions")

        # Check submission deadline
        now = datetime.now(timezone.utc)
        if now > competition.end_date:
            raise ValueError("Submission deadline has passed")

        if now < competition.start_date:
            raise ValueError("Competition has not started yet")

        # Check daily submission limit
        today_count = await self.repo.count_today_by_user(user.id, competition.id)
        if today_count >= competition.daily_submission_limit:
            raise ValueError(
                f"Daily submission limit ({competition.daily_submission_limit}) reached"
            )

        # Read file content for validation
        content = await file.read()
        await file.seek(0)  # Reset for saving

        # Pre-validate submission format
        validation = validate_submission(
            content,
            id_column="id",
            prediction_column="prediction",
        )

        if not validation.valid:
            error_msgs = [e.message for e in validation.errors[:3]]
            raise ValueError(f"Invalid submission: {'; '.join(error_msgs)}")

        # Save file
        file_path = await self._save_file(competition.id, user.id, file)

        # Create submission record
        submission = Submission(
            competition_id=competition.id,
            user_id=user.id,
            file_path=file_path,
            file_name=file.filename or "submission.csv",
            status=SubmissionStatus.PENDING,
        )

        submission = await self.repo.create(submission)

        # Score the submission (sync or async based on config)
        if settings.async_scoring_enabled:
            await self._queue_scoring(submission)
        else:
            await self._score_submission(submission, competition, content)

        return submission

    async def _queue_scoring(self, submission: Submission) -> None:
        """Queue submission for async scoring via Celery.

        Args:
            submission: The submission to score
        """
        from src.infrastructure.tasks import score_submission_task

        # Queue the scoring task
        score_submission_task.delay(submission.id)
        logger.info(f"Queued submission {submission.id} for async scoring")

    async def _save_file(
        self, competition_id: int, user_id: int, file: UploadFile
    ) -> str:
        """Save uploaded file using the storage backend.

        Args:
            competition_id: Competition ID for organizing files
            user_id: User ID for organizing files
            file: The uploaded file

        Returns:
            The storage path/URI where the file was saved
        """
        # Generate storage key
        ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "csv"
        unique_name = f"{uuid.uuid4()}.{ext}"
        storage_key = f"submissions/{competition_id}/{user_id}/{unique_name}"

        # Read and save file
        content = await file.read()
        return await self.storage.save(storage_key, content)

    async def _score_submission(
        self,
        submission: Submission,
        competition: Competition,
        content: bytes,
    ) -> None:
        """Score a submission against the competition's solution file."""
        scorer = create_scorer_for_competition(competition)

        if scorer is None:
            # No solution file - fall back to mock scoring for demo
            await self._mock_score(submission, competition)
            return

        try:
            result = scorer.score(content)

            if result.success:
                submission.status = SubmissionStatus.SCORED
                submission.public_score = result.score
                # For MVP, use same score for private (in real system, would be different split)
                submission.private_score = result.score
                submission.scored_at = datetime.now(timezone.utc)
            else:
                submission.status = SubmissionStatus.FAILED
                submission.error_message = result.error_message

        except Exception as e:
            submission.status = SubmissionStatus.FAILED
            submission.error_message = f"Scoring error: {str(e)}"

        await self.repo.update(submission)

        # Send notification
        await self._send_scoring_notification(submission, competition)

    async def _mock_score(self, submission: Submission, competition: Competition) -> None:
        """Mock scoring when no solution file is available."""
        import random

        submission.status = SubmissionStatus.SCORED
        submission.public_score = round(random.uniform(0.5, 0.95), 4)
        submission.private_score = round(random.uniform(0.5, 0.95), 4)
        submission.scored_at = datetime.now(timezone.utc)
        await self.repo.update(submission)

        # Send notification
        await self._send_scoring_notification(submission, competition)

    async def _send_scoring_notification(
        self, submission: Submission, competition: Competition
    ) -> None:
        """Send notification after scoring completes."""
        from src.domain.services.notification import NotificationService

        try:
            notification_service = NotificationService(self.session)

            if submission.status == SubmissionStatus.SCORED:
                await notification_service.notify_submission_scored(
                    user_id=submission.user_id,
                    competition_title=competition.title,
                    competition_slug=competition.slug,
                    score=submission.public_score,
                )
            elif submission.status == SubmissionStatus.FAILED:
                await notification_service.notify_submission_failed(
                    user_id=submission.user_id,
                    competition_title=competition.title,
                    competition_slug=competition.slug,
                    error_message=submission.error_message or "Unknown error",
                )

            logger.info(f"Sent scoring notification for submission {submission.id}")
        except Exception as e:
            # Don't fail the submission if notification fails
            logger.warning(f"Failed to send notification: {e}")

    async def get_by_id(self, submission_id: int) -> Submission | None:
        """Get submission by ID."""
        return await self.repo.get_by_id(submission_id)

    async def list_user_submissions(
        self,
        user_id: int,
        competition_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Submission]:
        """List user's submissions for a competition."""
        return await self.repo.get_by_user(
            user_id, competition_id, skip=skip, limit=limit
        )

    async def get_leaderboard(
        self, competition: Competition, limit: int = 100
    ) -> list[dict]:
        """Get competition leaderboard.

        Rankings are determined by:
        1. Best score (direction depends on metric - lower is better for RMSE/MAE)
        2. Tie-break: earliest submission time wins
        """
        from src.domain.scoring.metrics import is_lower_better

        lower_better = is_lower_better(competition.evaluation_metric)

        # For lower-is-better metrics, use min; otherwise use max
        if lower_better:
            best_score_agg = func.min(Submission.public_score)
        else:
            best_score_agg = func.max(Submission.public_score)

        # Query for best scores per user
        # Include earliest submission time for the best score (for tie-breaking)
        stmt = (
            select(
                Submission.user_id,
                best_score_agg.label("best_score"),
                func.count(Submission.id).label("submission_count"),
                func.max(Submission.created_at).label("last_submission"),
                func.min(Submission.created_at).label("first_submission"),
            )
            .where(Submission.competition_id == competition.id)
            .where(Submission.status == SubmissionStatus.SCORED)
            .group_by(Submission.user_id)
        )

        # Order by score (ascending for lower-is-better, descending otherwise)
        # Tie-break by earliest first submission
        if lower_better:
            stmt = stmt.order_by(
                best_score_agg.asc(),
                func.min(Submission.created_at).asc(),
            )
        else:
            stmt = stmt.order_by(
                best_score_agg.desc(),
                func.min(Submission.created_at).asc(),
            )

        stmt = stmt.limit(limit)

        result = await self.session.execute(stmt)
        rows = result.all()

        # Fetch user details
        from src.infrastructure.repositories.user import UserRepository
        user_repo = UserRepository(self.session)

        leaderboard = []
        for rank, row in enumerate(rows, 1):
            user = await user_repo.get_by_id(row.user_id)
            if user:
                leaderboard.append({
                    "rank": rank,
                    "user_id": row.user_id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "best_score": row.best_score,
                    "submission_count": row.submission_count,
                    "last_submission": row.last_submission,
                })

        return leaderboard
