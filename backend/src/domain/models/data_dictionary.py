"""Data dictionary model."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class DataDictionaryEntry(Base, TimestampMixin):
    """Data dictionary entry for a competition file column."""

    __tablename__ = "data_dictionary_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_id: Mapped[int] = mapped_column(
        ForeignKey("competition_files.id", ondelete="CASCADE"),
        index=True,
    )
    column_name: Mapped[str] = mapped_column(String(255))
    definition: Mapped[str | None] = mapped_column(Text)
    encoding: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    file: Mapped["CompetitionFile"] = relationship(  # noqa: F821
        back_populates="dictionary_entries",
    )

    def __repr__(self) -> str:
        return f"<DataDictionaryEntry(id={self.id}, column={self.column_name})>"
