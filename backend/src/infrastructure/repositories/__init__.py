"""Repository classes for data access."""

from src.infrastructure.repositories.base import BaseRepository
from src.infrastructure.repositories.competition import CompetitionRepository
from src.infrastructure.repositories.submission import SubmissionRepository
from src.infrastructure.repositories.team import TeamRepository
from src.infrastructure.repositories.user import UserRepository

__all__ = [
    "BaseRepository",
    "CompetitionRepository",
    "SubmissionRepository",
    "TeamRepository",
    "UserRepository",
]
