"""FAQ service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.faq import FAQCreate, FAQUpdate
from src.domain.models.faq import CompetitionFAQ


class FAQService:
    """Service for managing competition FAQs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_competition(self, competition_id: int) -> list[CompetitionFAQ]:
        """List all FAQs for a competition, ordered by display_order."""
        result = await self.db.execute(
            select(CompetitionFAQ)
            .where(CompetitionFAQ.competition_id == competition_id)
            .order_by(CompetitionFAQ.display_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, faq_id: int) -> CompetitionFAQ | None:
        """Get a FAQ by ID."""
        result = await self.db.execute(
            select(CompetitionFAQ).where(CompetitionFAQ.id == faq_id)
        )
        return result.scalar_one_or_none()

    async def create(self, competition_id: int, data: FAQCreate) -> CompetitionFAQ:
        """Create a new FAQ entry."""
        faq = CompetitionFAQ(
            competition_id=competition_id,
            question=data.question,
            answer=data.answer,
            display_order=data.display_order,
        )
        self.db.add(faq)
        await self.db.commit()
        await self.db.refresh(faq)
        return faq

    async def update(self, faq: CompetitionFAQ, data: FAQUpdate) -> CompetitionFAQ:
        """Update a FAQ entry."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(faq, field, value)
        await self.db.commit()
        await self.db.refresh(faq)
        return faq

    async def delete(self, faq: CompetitionFAQ) -> None:
        """Delete a FAQ entry."""
        await self.db.delete(faq)
        await self.db.commit()

    async def reorder(self, competition_id: int, faq_ids: list[int]) -> list[CompetitionFAQ]:
        """Reorder FAQ entries by setting their display_order based on the order in faq_ids."""
        for order, faq_id in enumerate(faq_ids):
            result = await self.db.execute(
                select(CompetitionFAQ).where(
                    CompetitionFAQ.id == faq_id,
                    CompetitionFAQ.competition_id == competition_id,
                )
            )
            faq = result.scalar_one_or_none()
            if faq:
                faq.display_order = order

        await self.db.commit()
        return await self.list_by_competition(competition_id)
