"""Submission service."""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.domain.models.competition import Competition, CompetitionStatus
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User
from src.infrastructure.repositories.submission import SubmissionRepository


class SubmissionService:
    """Service for submission operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = SubmissionRepository(session)

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

        # In a real system, we'd queue this for async scoring
        # For now, simulate immediate scoring with a random score
        await self._mock_score(submission)

        return submission

    async def _save_file(
        self, competition_id: int, user_id: int, file: UploadFile
    ) -> str:
        """Save uploaded file and return the path."""
        # Create directory structure
        upload_dir = Path(settings.upload_dir) / str(competition_id) / str(user_id)
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        ext = Path(file.filename or "submission.csv").suffix
        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = upload_dir / unique_name

        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        return str(file_path)

    async def _mock_score(self, submission: Submission) -> None:
        """Mock scoring - in production this would be async."""
        import random

        # Simulate scoring
        submission.status = SubmissionStatus.SCORED
        submission.public_score = round(random.uniform(0.5, 0.95), 4)
        submission.private_score = round(random.uniform(0.5, 0.95), 4)
        submission.scored_at = datetime.now(timezone.utc)
        await self.repo.update(submission)

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
        """Get competition leaderboard."""
        # Query for best scores per user
        stmt = (
            select(
                Submission.user_id,
                func.max(Submission.public_score).label("best_score"),
                func.count(Submission.id).label("submission_count"),
                func.max(Submission.created_at).label("last_submission"),
            )
            .where(Submission.competition_id == competition.id)
            .where(Submission.status == SubmissionStatus.SCORED)
            .group_by(Submission.user_id)
            .order_by(func.max(Submission.public_score).desc())
            .limit(limit)
        )

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
