"""Daggle API - Main application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import admin, auth, competitions, dashboard, discussions, enrollments, health, notifications, profiles, submissions, teams
from src.config import settings
from src.infrastructure.database import async_session_factory
from src.infrastructure.startup import run_startup_tasks

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown tasks."""
    # Startup
    logger.info("Running startup tasks...")
    try:
        async with async_session_factory() as session:
            await run_startup_tasks(session)
        logger.info("Startup tasks completed")
    except Exception as e:
        logger.warning(f"Startup tasks failed (database may not be ready): {e}")

    yield

    # Shutdown (nothing to do currently)
    logger.info("Application shutting down")


app = FastAPI(
    title=settings.app_name,
    description="Internal competition platform for data science challenges",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router)
app.include_router(competitions.router)
app.include_router(discussions.router)
app.include_router(enrollments.router)
app.include_router(submissions.router)
app.include_router(submissions.leaderboard_router)
app.include_router(notifications.router)
app.include_router(profiles.router)
app.include_router(dashboard.router)
app.include_router(teams.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
    }
