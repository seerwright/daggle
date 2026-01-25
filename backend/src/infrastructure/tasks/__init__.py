"""Background task infrastructure using Celery."""

from src.infrastructure.tasks.celery_app import celery_app
from src.infrastructure.tasks.scoring import score_submission_task

__all__ = ["celery_app", "score_submission_task"]
