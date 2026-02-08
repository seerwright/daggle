"""Site branding model for company customization."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.models.base import Base


class SiteBranding(Base):
    """Site branding configuration.

    This is a single-row table that stores company branding settings.
    The CHECK constraint ensures only one row (id=1) can exist.
    """

    __tablename__ = "site_branding"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row_branding"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    company_name: Mapped[str] = mapped_column(
        String(100),
        default="Your Company",
        server_default="Your Company",
    )
    product_name: Mapped[str] = mapped_column(
        String(100),
        default="Daggle",
        server_default="Daggle",
    )
    tagline: Mapped[str | None] = mapped_column(
        String(255),
        default="Internal Data Science Platform",
        server_default="Internal Data Science Platform",
    )
    logo_full_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_icon_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_full_light_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_icon_light_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    favicon_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    palette_id: Mapped[str] = mapped_column(
        String(50),
        default="amber",
        server_default="amber",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<SiteBranding(product_name={self.product_name}, palette={self.palette_id})>"
