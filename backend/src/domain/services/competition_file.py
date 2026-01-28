"""Competition file service."""

import mimetypes
import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.competition_file import CompetitionFileUpdate
from src.domain.models.competition import Competition
from src.domain.models.competition_file import CompetitionFile
from src.infrastructure.storage.factory import get_storage_backend


class CompetitionFileService:
    """Service for competition file operations."""

    # Maximum file size: 100MB
    MAX_FILE_SIZE = 100 * 1024 * 1024

    # Allowed file extensions
    ALLOWED_EXTENSIONS = {
        ".csv",
        ".json",
        ".txt",
        ".md",
        ".pdf",
        ".zip",
        ".gz",
        ".tar",
        ".parquet",
        ".pkl",
        ".npy",
        ".npz",
    }

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.storage = get_storage_backend()

    async def list_by_competition(self, competition_id: int) -> list[CompetitionFile]:
        """List all files for a competition."""
        result = await self.session.execute(
            select(CompetitionFile)
            .where(CompetitionFile.competition_id == competition_id)
            .order_by(CompetitionFile.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, file_id: int) -> CompetitionFile | None:
        """Get a competition file by ID."""
        result = await self.session.execute(
            select(CompetitionFile).where(CompetitionFile.id == file_id)
        )
        return result.scalar_one_or_none()

    async def upload(
        self,
        competition: Competition,
        file: UploadFile,
        display_name: str | None = None,
        purpose: str | None = None,
    ) -> CompetitionFile:
        """Upload a file for a competition.

        Args:
            competition: The competition to upload the file for
            file: The uploaded file
            display_name: Optional display name (defaults to filename)
            purpose: Optional description of file purpose

        Returns:
            Created CompetitionFile record

        Raises:
            ValueError: If file validation fails
        """
        filename = file.filename or "unnamed_file"

        # Validate file extension
        ext = self._get_extension(filename).lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            allowed = ", ".join(sorted(self.ALLOWED_EXTENSIONS))
            raise ValueError(
                f"File type '{ext}' not allowed. Allowed types: {allowed}"
            )

        # Read file content
        content = await file.read()

        # Validate file size
        if len(content) > self.MAX_FILE_SIZE:
            max_mb = self.MAX_FILE_SIZE // (1024 * 1024)
            raise ValueError(f"File size exceeds maximum allowed ({max_mb}MB)")

        # Generate unique storage key
        unique_id = uuid.uuid4().hex[:8]
        storage_key = f"competition_files/{competition.id}/{unique_id}_{filename}"

        # Save to storage
        file_path = await self.storage.save(storage_key, content)

        # Detect file type
        file_type, _ = mimetypes.guess_type(filename)

        # Create database record
        competition_file = CompetitionFile(
            competition_id=competition.id,
            filename=filename,
            display_name=display_name or filename,
            purpose=purpose,
            file_path=file_path,
            file_size=len(content),
            file_type=file_type,
        )

        self.session.add(competition_file)
        await self.session.commit()
        await self.session.refresh(competition_file)

        return competition_file

    async def update(
        self, competition_file: CompetitionFile, data: CompetitionFileUpdate
    ) -> CompetitionFile:
        """Update a competition file's metadata."""
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(competition_file, field, value)

        await self.session.commit()
        await self.session.refresh(competition_file)

        return competition_file

    async def delete(self, competition_file: CompetitionFile) -> None:
        """Delete a competition file."""
        # Delete from storage
        storage_key = self._extract_storage_key(competition_file.file_path)
        await self.storage.delete(storage_key)

        # Delete database record
        await self.session.delete(competition_file)
        await self.session.commit()

    async def get_download_content(self, competition_file: CompetitionFile) -> bytes:
        """Get file content for download.

        Args:
            competition_file: The file to download

        Returns:
            File content as bytes
        """
        storage_key = self._extract_storage_key(competition_file.file_path)
        return await self.storage.load(storage_key)

    def _get_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        if "." not in filename:
            return ""
        return "." + filename.rsplit(".", 1)[-1]

    def _extract_storage_key(self, file_path: str) -> str:
        """Extract storage key from full file path.

        The storage key is the relative path used when saving,
        which may differ from the full path returned by the backend.
        """
        # Look for our known path pattern
        markers = ["competition_files/"]
        for marker in markers:
            if marker in file_path:
                idx = file_path.index(marker)
                return file_path[idx:]
        # Fallback: assume the path is already a key
        return file_path
