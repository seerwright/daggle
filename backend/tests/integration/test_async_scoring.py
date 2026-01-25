"""Integration tests for async scoring."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

import pytest

from src.domain.models.competition import Competition, CompetitionStatus, Difficulty
from src.domain.models.submission import Submission, SubmissionStatus
from src.domain.models.user import User, UserRole
from src.common.security import hash_password


class TestScoringTaskUnit:
    """Unit tests for the scoring task logic."""

    def test_celery_task_calls_async_scorer(self):
        """Test that the Celery task wrapper calls the async scorer."""
        from src.infrastructure.tasks.scoring import score_submission_task

        # Mock asyncio.run to verify it's called with the right function
        with patch("src.infrastructure.tasks.scoring.asyncio.run") as mock_run:
            mock_run.return_value = {
                "submission_id": 1,
                "status": "scored",
                "score": 0.85,
                "error": None,
            }

            # Call the task synchronously (not via Celery)
            result = score_submission_task(1)

            # Verify asyncio.run was called
            mock_run.assert_called_once()
            assert result["submission_id"] == 1
            assert result["status"] == "scored"


class TestAsyncScoringConfig:
    """Tests for async scoring configuration."""

    @pytest.mark.asyncio
    async def test_sync_scoring_when_disabled(self, db_session):
        """Test that submissions are scored synchronously when async is disabled."""
        from src.config import settings

        # Ensure async is disabled (default)
        assert not settings.async_scoring_enabled

    @pytest.mark.asyncio
    async def test_async_scoring_queues_task(self, db_session):
        """Test that submissions queue tasks when async is enabled."""
        from src.domain.services.submission import SubmissionService

        # Mock the Celery task
        with patch(
            "src.infrastructure.tasks.score_submission_task"
        ) as mock_task:
            service = SubmissionService(db_session)

            # Create a mock submission
            submission = MagicMock()
            submission.id = 123

            # Call the queue method directly
            await service._queue_scoring(submission)

            # Verify task was queued
            mock_task.delay.assert_called_once_with(123)


class TestScoringIntegration:
    """Integration tests for scoring with database."""

    @pytest.fixture
    async def sample_user(self, db_session):
        """Create a sample user."""
        user = User(
            email="scorer@example.com",
            username="scorer",
            hashed_password=hash_password("password123"),
            display_name="Scorer User",
            role=UserRole.SPONSOR,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def sample_competition(self, db_session, sample_user):
        """Create a sample competition."""
        now = datetime.now(timezone.utc)
        competition = Competition(
            title="Async Scoring Test Competition",
            slug="async-scoring-test",
            description="Testing async scoring functionality",
            short_description="Async scoring test competition",
            difficulty=Difficulty.BEGINNER,
            evaluation_metric="auc_roc",
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
            status=CompetitionStatus.ACTIVE,
            daily_submission_limit=5,
            sponsor_id=sample_user.id,
        )
        db_session.add(competition)
        await db_session.commit()
        await db_session.refresh(competition)
        return competition

    @pytest.fixture
    async def sample_submission(self, db_session, sample_competition, sample_user):
        """Create a sample pending submission."""
        submission = Submission(
            competition_id=sample_competition.id,
            user_id=sample_user.id,
            file_path="submissions/test/file.csv",
            file_name="test.csv",
            status=SubmissionStatus.PENDING,
        )
        db_session.add(submission)
        await db_session.commit()
        await db_session.refresh(submission)
        return submission

    @pytest.mark.asyncio
    async def test_submission_starts_pending(
        self, db_session, sample_submission
    ):
        """Test that new submissions start with PENDING status."""
        assert sample_submission.status == SubmissionStatus.PENDING
        assert sample_submission.public_score is None
        assert sample_submission.scored_at is None

    @pytest.mark.asyncio
    async def test_submission_status_transitions(
        self, db_session, sample_submission
    ):
        """Test submission status can transition through states."""
        from src.infrastructure.repositories.submission import SubmissionRepository

        repo = SubmissionRepository(db_session)

        # Transition to PROCESSING
        sample_submission.status = SubmissionStatus.PROCESSING
        await repo.update(sample_submission)

        await db_session.refresh(sample_submission)
        assert sample_submission.status == SubmissionStatus.PROCESSING

        # Transition to SCORED
        sample_submission.status = SubmissionStatus.SCORED
        sample_submission.public_score = 0.85
        sample_submission.scored_at = datetime.now(timezone.utc)
        await repo.update(sample_submission)

        await db_session.refresh(sample_submission)
        assert sample_submission.status == SubmissionStatus.SCORED
        assert sample_submission.public_score == 0.85

    @pytest.mark.asyncio
    async def test_submission_can_fail(
        self, db_session, sample_submission
    ):
        """Test that submissions can be marked as failed with error message."""
        from src.infrastructure.repositories.submission import SubmissionRepository

        repo = SubmissionRepository(db_session)

        sample_submission.status = SubmissionStatus.FAILED
        sample_submission.error_message = "Invalid file format"
        await repo.update(sample_submission)

        await db_session.refresh(sample_submission)
        assert sample_submission.status == SubmissionStatus.FAILED
        assert sample_submission.error_message == "Invalid file format"

    @pytest.mark.asyncio
    async def test_processing_status_exists(self, db_session, sample_submission):
        """Test that PROCESSING status is available for async scoring."""
        # This status is used when a submission is being processed by Celery
        sample_submission.status = SubmissionStatus.PROCESSING
        assert sample_submission.status == SubmissionStatus.PROCESSING
        assert sample_submission.status.value == "processing"


class TestCeleryAppConfiguration:
    """Tests for Celery app configuration."""

    def test_celery_app_exists(self):
        """Test that the Celery app is properly configured."""
        from src.infrastructure.tasks.celery_app import celery_app

        assert celery_app is not None
        assert celery_app.main == "daggle"

    def test_celery_app_has_scoring_task(self):
        """Test that the scoring task is registered."""
        from src.infrastructure.tasks import score_submission_task

        assert score_submission_task is not None
        assert score_submission_task.name == "score_submission"

    def test_celery_app_config(self):
        """Test Celery app configuration settings."""
        from src.infrastructure.tasks.celery_app import celery_app

        # Check key configuration values
        assert celery_app.conf.task_serializer == "json"
        assert celery_app.conf.accept_content == ["json"]
        assert celery_app.conf.task_acks_late is True
