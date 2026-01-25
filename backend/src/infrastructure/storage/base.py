"""Base storage backend protocol."""

from typing import Protocol, BinaryIO
from pathlib import Path


class StorageBackend(Protocol):
    """Protocol defining the storage backend interface.

    All storage implementations must conform to this interface,
    allowing seamless switching between local, S3, and other backends.
    """

    async def save(self, key: str, content: bytes) -> str:
        """Save content to storage.

        Args:
            key: The storage key/path for the file
            content: The file content as bytes

        Returns:
            The storage URI/path where the file was saved
        """
        ...

    async def load(self, key: str) -> bytes:
        """Load content from storage.

        Args:
            key: The storage key/path for the file

        Returns:
            The file content as bytes

        Raises:
            FileNotFoundError: If the file doesn't exist
        """
        ...

    async def delete(self, key: str) -> bool:
        """Delete a file from storage.

        Args:
            key: The storage key/path for the file

        Returns:
            True if deleted, False if file didn't exist
        """
        ...

    async def exists(self, key: str) -> bool:
        """Check if a file exists in storage.

        Args:
            key: The storage key/path for the file

        Returns:
            True if file exists, False otherwise
        """
        ...

    def get_url(self, key: str) -> str:
        """Get a URL/path for accessing the file.

        For local storage, returns the file path.
        For S3, could return a pre-signed URL.

        Args:
            key: The storage key/path for the file

        Returns:
            URL or path to access the file
        """
        ...
