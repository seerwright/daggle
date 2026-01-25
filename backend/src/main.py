"""Daggle API - Main application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import auth, competitions, discussions, enrollments, health, notifications, profiles, submissions
from src.config import settings

app = FastAPI(
    title=settings.app_name,
    description="Internal competition platform for data science challenges",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
    }
