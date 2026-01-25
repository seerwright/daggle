"""Health check endpoints for container orchestration."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health/live")
async def liveness():
    """Liveness probe - is the process running?"""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness():
    """Readiness probe - is the service ready to accept traffic?

    TODO: Add database connectivity check in feature/02-database-models.
    """
    return {"status": "ok"}
