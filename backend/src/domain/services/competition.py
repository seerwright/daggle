"""Competition service."""

import csv
import io

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.competition import CompetitionCreate, CompetitionUpdate
from src.common.utils import slugify
from src.domain.models.competition import Competition
from src.domain.models.user import User
from src.infrastructure.repositories.competition import CompetitionRepository
from src.infrastructure.storage.factory import get_storage_backend


class CompetitionService:
    """Service for competition operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = CompetitionRepository(session)

    async def create(self, data: CompetitionCreate, sponsor: User) -> Competition:
        """Create a new competition."""
        # Generate slug from title
        base_slug = slugify(data.title)
        slug = base_slug

        # Ensure slug is unique
        counter = 1
        while await self.repo.slug_exists(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        competition = Competition(
            title=data.title,
            slug=slug,
            description=data.description,
            short_description=data.short_description,
            sponsor_id=sponsor.id,
            start_date=data.start_date,
            end_date=data.end_date,
            difficulty=data.difficulty,
            max_team_size=data.max_team_size,
            daily_submission_limit=data.daily_submission_limit,
            evaluation_metric=data.evaluation_metric,
            is_public=data.is_public,
        )
        return await self.repo.create(competition)

    async def get_by_id(self, competition_id: int) -> Competition | None:
        """Get competition by ID."""
        return await self.repo.get_by_id(competition_id)

    async def get_by_slug(self, slug: str) -> Competition | None:
        """Get competition by slug."""
        return await self.repo.get_by_slug(slug)

    async def list_active(self, skip: int = 0, limit: int = 20) -> list[Competition]:
        """List active public competitions."""
        return await self.repo.get_active(skip=skip, limit=limit)

    async def list_by_sponsor(
        self, sponsor_id: int, skip: int = 0, limit: int = 20
    ) -> list[Competition]:
        """List competitions by sponsor."""
        return await self.repo.get_by_sponsor(sponsor_id, skip=skip, limit=limit)

    async def update(
        self, competition: Competition, data: CompetitionUpdate
    ) -> Competition:
        """Update a competition."""
        update_data = data.model_dump(exclude_unset=True)

        # If title is being updated, regenerate slug
        if "title" in update_data:
            base_slug = slugify(update_data["title"])
            slug = base_slug
            counter = 1
            while await self.repo.slug_exists(slug) and slug != competition.slug:
                slug = f"{base_slug}-{counter}"
                counter += 1
            competition.slug = slug

        for field, value in update_data.items():
            if field != "title":  # title handled above with slug
                setattr(competition, field, value)
            else:
                competition.title = value

        return await self.repo.update(competition)

    async def delete(self, competition: Competition) -> None:
        """Delete a competition."""
        await self.repo.delete(competition)

    async def upload_truth_set(
        self, competition: Competition, file: UploadFile
    ) -> Competition:
        """Upload a truth set CSV for scoring submissions.

        Args:
            competition: The competition to upload the truth set for
            file: The uploaded CSV file

        Returns:
            Updated competition with solution_path set

        Raises:
            ValueError: If CSV format is invalid (missing required columns)
        """
        # Read and validate file content
        content = await file.read()
        await file.seek(0)  # Reset for potential re-read

        # Validate CSV has required columns
        try:
            text_content = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text_content))
            fieldnames = reader.fieldnames or []

            if "id" not in fieldnames or "target" not in fieldnames:
                raise ValueError(
                    "CSV must have 'id' and 'target' columns. "
                    f"Found columns: {', '.join(fieldnames)}"
                )

            # Verify we can read at least one row
            rows = list(reader)
            if not rows:
                raise ValueError("CSV file is empty (no data rows)")

        except UnicodeDecodeError as e:
            raise ValueError(f"File must be a valid UTF-8 encoded CSV: {e}")

        # Save file using storage backend
        storage = get_storage_backend()
        storage_key = f"truth_sets/{competition.id}/solution.csv"
        solution_path = await storage.save(storage_key, content)

        # Update competition
        competition.solution_path = solution_path
        return await self.repo.update(competition)

    async def upload_thumbnail(
        self, competition: Competition, file: UploadFile
    ) -> Competition:
        """Upload a thumbnail image for the competition.

        Args:
            competition: The competition to upload the thumbnail for
            file: The uploaded image file (PNG, JPG, JPEG, WebP)

        Returns:
            Updated competition with thumbnail_path set

        Raises:
            ValueError: If file format is invalid
        """
        # Read file content
        content = await file.read()
        await file.seek(0)

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if len(content) > max_size:
            raise ValueError("Image file size cannot exceed 5MB")

        # Determine file extension from filename
        filename = file.filename or "image.png"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"

        # Save file using storage backend
        storage = get_storage_backend()
        storage_key = f"thumbnails/{competition.id}/thumbnail.{ext}"
        thumbnail_path = await storage.save(storage_key, content)

        # Update competition
        competition.thumbnail_path = thumbnail_path
        return await self.repo.update(competition)
