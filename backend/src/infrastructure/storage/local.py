"""Local filesystem storage backend."""

import aiofiles
from pathlib import Path

from src.config import settings


class LocalStorageBackend:
    """Storage backend using the local filesystem.

    Files are stored under a configurable base directory.
    Keys are treated as relative paths within that directory.
    """

    def __init__(self, base_dir: str | None = None):
        """Initialize the local storage backend.

        Args:
            base_dir: Base directory for storage. Defaults to settings.upload_dir.
        """
        self.base_dir = Path(base_dir or settings.upload_dir)

    def _get_full_path(self, key: str) -> Path:
        """Get the full filesystem path for a key."""
        return self.base_dir / key

    async def save(self, key: str, content: bytes) -> str:
        """Save content to local filesystem.

        Args:
            key: Relative path within the base directory
            content: File content as bytes

        Returns:
            The full path where the file was saved
        """
        full_path = self._get_full_path(key)

        # Ensure parent directories exist
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file asynchronously
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(content)

        return str(full_path)

    async def load(self, key: str) -> bytes:
        """Load content from local filesystem.

        Args:
            key: Relative path within the base directory

        Returns:
            File content as bytes

        Raises:
            FileNotFoundError: If the file doesn't exist
        """
        full_path = self._get_full_path(key)

        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {key}")

        async with aiofiles.open(full_path, "rb") as f:
            return await f.read()

    async def delete(self, key: str) -> bool:
        """Delete a file from local filesystem.

        Args:
            key: Relative path within the base directory

        Returns:
            True if deleted, False if file didn't exist
        """
        full_path = self._get_full_path(key)

        if full_path.exists():
            full_path.unlink()
            return True
        return False

    async def exists(self, key: str) -> bool:
        """Check if a file exists in local filesystem.

        Args:
            key: Relative path within the base directory

        Returns:
            True if file exists
        """
        return self._get_full_path(key).exists()

    def get_url(self, key: str) -> str:
        """Get the filesystem path for a file.

        Args:
            key: Relative path within the base directory

        Returns:
            Full filesystem path
        """
        return str(self._get_full_path(key))
