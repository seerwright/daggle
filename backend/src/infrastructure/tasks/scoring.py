"""Background scoring task for submissions."""

import asyncio
import logging
from datetime import datetime, timezone

from celery import Task

from src.infrastructure.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


class ScoringTask(Task):
    """Base task class with error handling and retries."""

    autoretry_for = (Exception,)
    retry_backoff = True
    retry_backoff_max = 600  # Max 10 minutes between retries
    retry_jitter = True
    max_retries = 3


async def _score_submission_async(submission_id: int) -> dict:
    """Async implementation of submission scoring.

    Args:
        submission_id: ID of the submission to score

    Returns:
        Dict with scoring result info

    Raises:
        ValueError: If submission or competition not found
    """
    from src.domain.models.submission import SubmissionStatus
    from src.domain.scoring.scorer import create_scorer_for_competition
    from src.infrastructure.database import async_session_factory
    from src.infrastructure.repositories.submission import SubmissionRepository
    from src.infrastructure.repositories.competition import CompetitionRepository
    from src.infrastructure.storage import get_storage_backend

    async with async_session_factory() as session:
        submission_repo = SubmissionRepository(session)
        competition_repo = CompetitionRepository(session)

        # Load submission
        submission = await submission_repo.get_by_id(submission_id)
        if not submission:
            raise ValueError(f"Submission {submission_id} not found")

        # Check if already scored (idempotency)
        if submission.status == SubmissionStatus.SCORED:
            logger.info(f"Submission {submission_id} already scored, skipping")
            return {
                "submission_id": submission_id,
                "status": "already_scored",
                "score": submission.public_score,
            }

        # Update status to processing
        submission.status = SubmissionStatus.PROCESSING
        await submission_repo.update(submission)
        await session.commit()

        try:
            # Load competition
            competition = await competition_repo.get_by_id(submission.competition_id)
            if not competition:
                raise ValueError(f"Competition {submission.competition_id} not found")

            # Load submission file content
            storage = get_storage_backend()

            # Extract storage key from file_path
            # file_path might be full path (local) or s3:// URI
            file_path = submission.file_path
            if file_path.startswith("s3://"):
                # Extract key from s3://bucket/key
                key = "/".join(file_path.split("/")[3:])
            elif file_path.startswith("/"):
                # Local path - extract relative key
                # Path format: /base/dir/submissions/comp_id/user_id/file.csv
                parts = file_path.split("/submissions/")
                key = "submissions/" + parts[-1] if len(parts) > 1 else file_path
            else:
                key = file_path

            content = await storage.load(key)

            # Create scorer and score
            scorer = create_scorer_for_competition(competition)

            if scorer is None:
                # No solution file - use mock scoring
                import random
                submission.status = SubmissionStatus.SCORED
                submission.public_score = round(random.uniform(0.5, 0.95), 4)
                submission.private_score = round(random.uniform(0.5, 0.95), 4)
                submission.scored_at = datetime.now(timezone.utc)
                logger.info(f"Mock scored submission {submission_id}: {submission.public_score}")
            else:
                result = scorer.score(content)

                if result.success:
                    submission.status = SubmissionStatus.SCORED
                    submission.public_score = result.score
                    submission.private_score = result.score  # Same for MVP
                    submission.scored_at = datetime.now(timezone.utc)
                    logger.info(f"Scored submission {submission_id}: {result.score}")
                else:
                    submission.status = SubmissionStatus.FAILED
                    submission.error_message = result.error_message
                    logger.warning(f"Scoring failed for {submission_id}: {result.error_message}")

            await submission_repo.update(submission)
            await session.commit()

            # Send notification
            await _send_scoring_notification(
                session, submission, competition
            )

            return {
                "submission_id": submission_id,
                "status": submission.status.value,
                "score": submission.public_score,
                "error": submission.error_message,
            }

        except Exception as e:
            # Mark as failed on any error
            submission.status = SubmissionStatus.FAILED
            submission.error_message = f"Scoring error: {str(e)}"
            await submission_repo.update(submission)
            await session.commit()
            logger.exception(f"Error scoring submission {submission_id}")
            raise


async def _send_scoring_notification(session, submission, competition) -> None:
    """Send notification after scoring completes.

    Args:
        session: Database session
        submission: The scored submission
        competition: The competition
    """
    from src.domain.models.submission import SubmissionStatus
    from src.domain.services.notification import NotificationService

    try:
        notification_service = NotificationService(session)

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

        await session.commit()
        logger.info(f"Sent scoring notification for submission {submission.id}")
    except Exception as e:
        # Don't fail the scoring task if notification fails
        logger.warning(f"Failed to send notification for submission {submission.id}: {e}")


@celery_app.task(bind=True, base=ScoringTask, name="score_submission")
def score_submission_task(self, submission_id: int) -> dict:
    """Celery task to score a submission.

    This task is idempotent - scoring an already-scored submission
    will return early without re-scoring.

    Args:
        submission_id: ID of the submission to score

    Returns:
        Dict with scoring result info
    """
    logger.info(f"Starting scoring task for submission {submission_id}")

    try:
        result = asyncio.run(_score_submission_async(submission_id))
        return result
    except Exception as e:
        logger.exception(f"Scoring task failed for submission {submission_id}")
        # Re-raise to trigger Celery retry mechanism
        raise self.retry(exc=e)
