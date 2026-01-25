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

__all__ = [
    "CompetitionCreate",
    "CompetitionListResponse",
    "CompetitionResponse",
    "CompetitionUpdate",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse",
]
