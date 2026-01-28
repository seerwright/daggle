"""Competition file model."""

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin


class CompetitionFile(Base, TimestampMixin):
    """File associated with a competition (datasets, documentation, etc.)."""

    __tablename__ = "competition_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"),
        index=True,
    )

    # File metadata
    filename: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(255))
    purpose: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    file_type: Mapped[str | None] = mapped_column(String(50))
    variable_notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="files",
    )
    dictionary_entries: Mapped[list["DataDictionaryEntry"]] = relationship(  # noqa: F821
        back_populates="file",
        lazy="selectin",
        order_by="DataDictionaryEntry.display_order",
    )

    def __repr__(self) -> str:
        return f"<CompetitionFile(id={self.id}, filename={self.filename})>"
