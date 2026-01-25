"""Storage abstraction for file operations."""

from src.infrastructure.storage.base import StorageBackend
from src.infrastructure.storage.local import LocalStorageBackend
from src.infrastructure.storage.factory import get_storage_backend

__all__ = [
    "StorageBackend",
    "LocalStorageBackend",
    "get_storage_backend",
]
