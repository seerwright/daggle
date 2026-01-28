"""Competition model."""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class CompetitionStatus(enum.Enum):
    """Competition lifecycle status."""

    DRAFT = "draft"
    ACTIVE = "active"
    EVALUATION = "evaluation"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Difficulty(enum.Enum):
    """Competition difficulty level."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Competition(Base, TimestampMixin):
    """Data science competition model."""

    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    short_description: Mapped[str] = mapped_column(String(500))

    # Sponsor
    sponsor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    sponsor: Mapped["User"] = relationship(  # noqa: F821
        back_populates="sponsored_competitions",
    )

    # Status and dates
    status: Mapped[CompetitionStatus] = mapped_column(
        Enum(CompetitionStatus),
        default=CompetitionStatus.DRAFT,
    )
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Competition settings
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty))
    max_team_size: Mapped[int] = mapped_column(Integer, default=1)
    daily_submission_limit: Mapped[int] = mapped_column(Integer, default=5)
    evaluation_metric: Mapped[str] = mapped_column(String(100))
    evaluation_description: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)

    # Data files (paths/references)
    train_data_path: Mapped[str | None] = mapped_column(String(500))
    test_data_path: Mapped[str | None] = mapped_column(String(500))
    sample_submission_path: Mapped[str | None] = mapped_column(String(500))
    solution_path: Mapped[str | None] = mapped_column(String(500))

    # Media
    thumbnail_path: Mapped[str | None] = mapped_column(String(500))

    # Relationships
    submissions: Mapped[list["Submission"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
    )
    teams: Mapped[list["Team"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
    )
    discussion_threads: Mapped[list["DiscussionThread"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
    )
    faqs: Mapped[list["CompetitionFAQ"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
        order_by="CompetitionFAQ.display_order",
    )
    files: Mapped[list["CompetitionFile"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
    )
    rules: Mapped[list["CompetitionRule"]] = relationship(  # noqa: F821
        back_populates="competition",
        lazy="selectin",
        order_by="CompetitionRule.display_order",
    )

    def __repr__(self) -> str:
        return f"<Competition(id={self.id}, title={self.title})>"
