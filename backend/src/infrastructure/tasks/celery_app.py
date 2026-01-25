"""Celery application configuration."""

from celery import Celery

from src.config import settings

celery_app = Celery(
    "daggle",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["src.infrastructure.tasks.scoring"],
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completion (safer)
    task_reject_on_worker_lost=True,  # Requeue if worker dies

    # Result settings
    result_expires=3600,  # Results expire after 1 hour

    # Worker settings
    worker_prefetch_multiplier=1,  # Only fetch one task at a time
    worker_concurrency=4,  # Number of concurrent workers

    # Retry settings
    task_default_retry_delay=60,  # Wait 60 seconds before retry
    task_max_retries=3,  # Max 3 retries
)
