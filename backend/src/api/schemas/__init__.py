"""API schemas (Pydantic models) for request/response validation."""

from src.api.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.api.schemas.competition import (
    CompetitionCreate,
    CompetitionListResponse,
    CompetitionResponse,
    CompetitionUpdate,
)
from src.api.schemas.submission import (
    LeaderboardEntry,
    LeaderboardResponse,
    SubmissionListResponse,
    SubmissionResponse,
)

__all__ = [
    "CompetitionCreate",
    "CompetitionListResponse",
    "CompetitionResponse",
    "CompetitionUpdate",
    "LeaderboardEntry",
    "LeaderboardResponse",
    "LoginRequest",
    "RegisterRequest",
    "SubmissionListResponse",
    "SubmissionResponse",
    "TokenResponse",
    "UserResponse",
]
