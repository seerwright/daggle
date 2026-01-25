"""Factory for creating storage backend instances."""

from functools import lru_cache

from src.config import settings
from src.infrastructure.storage.base import StorageBackend
from src.infrastructure.storage.local import LocalStorageBackend


@lru_cache()
def get_storage_backend() -> StorageBackend:
    """Get the configured storage backend.

    Returns a singleton instance based on the STORAGE_BACKEND setting:
    - "local": LocalStorageBackend (default)
    - "s3": S3StorageBackend

    Returns:
        Configured storage backend instance
    """
    backend_type = settings.storage_backend.lower()

    if backend_type == "s3":
        # Import here to avoid requiring boto3 when using local storage
        from src.infrastructure.storage.s3 import S3StorageBackend
        return S3StorageBackend()

    # Default to local storage
    return LocalStorageBackend()


def clear_storage_cache() -> None:
    """Clear the cached storage backend instance.

    Useful for testing or when configuration changes.
    """
    get_storage_backend.cache_clear()
