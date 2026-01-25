"""Integration tests for storage backends."""

import os
import tempfile
from pathlib import Path

import pytest

from src.infrastructure.storage.local import LocalStorageBackend
from src.infrastructure.storage.factory import get_storage_backend, clear_storage_cache


class TestLocalStorageBackend:
    """Tests for local filesystem storage."""

    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir

    @pytest.fixture
    def storage(self, temp_dir):
        """Create a local storage backend with temp directory."""
        return LocalStorageBackend(base_dir=temp_dir)

    @pytest.mark.asyncio
    async def test_save_and_load(self, storage):
        """Test saving and loading content."""
        content = b"Hello, World!"
        key = "test/file.txt"

        # Save content
        path = await storage.save(key, content)
        assert path.endswith(key)

        # Load content
        loaded = await storage.load(key)
        assert loaded == content

    @pytest.mark.asyncio
    async def test_save_creates_directories(self, storage, temp_dir):
        """Test that save creates nested directories."""
        content = b"nested content"
        key = "deeply/nested/path/file.txt"

        await storage.save(key, content)

        # Verify directory structure was created
        full_path = Path(temp_dir) / key
        assert full_path.exists()
        assert full_path.read_bytes() == content

    @pytest.mark.asyncio
    async def test_load_nonexistent_raises(self, storage):
        """Test that loading nonexistent file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            await storage.load("nonexistent/file.txt")

    @pytest.mark.asyncio
    async def test_exists(self, storage):
        """Test exists check."""
        key = "test/exists.txt"

        # File doesn't exist yet
        assert not await storage.exists(key)

        # Create file
        await storage.save(key, b"content")

        # Now it exists
        assert await storage.exists(key)

    @pytest.mark.asyncio
    async def test_delete(self, storage):
        """Test deleting files."""
        key = "test/delete.txt"

        # Create file
        await storage.save(key, b"to be deleted")
        assert await storage.exists(key)

        # Delete file
        result = await storage.delete(key)
        assert result is True
        assert not await storage.exists(key)

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, storage):
        """Test deleting nonexistent file returns False."""
        result = await storage.delete("nonexistent/file.txt")
        assert result is False

    @pytest.mark.asyncio
    async def test_get_url(self, storage, temp_dir):
        """Test get_url returns full path."""
        key = "test/url.txt"
        url = storage.get_url(key)
        expected = str(Path(temp_dir) / key)
        assert url == expected

    @pytest.mark.asyncio
    async def test_binary_content(self, storage):
        """Test handling of binary content."""
        # Create binary content (not valid UTF-8)
        content = bytes(range(256))
        key = "test/binary.bin"

        await storage.save(key, content)
        loaded = await storage.load(key)
        assert loaded == content

    @pytest.mark.asyncio
    async def test_large_file(self, storage):
        """Test handling of larger files."""
        # Create 1MB of content
        content = b"x" * (1024 * 1024)
        key = "test/large.bin"

        await storage.save(key, content)
        loaded = await storage.load(key)
        assert len(loaded) == len(content)
        assert loaded == content


class TestStorageFactory:
    """Tests for the storage factory."""

    def setup_method(self):
        """Clear cache before each test."""
        clear_storage_cache()

    def teardown_method(self):
        """Clear cache after each test."""
        clear_storage_cache()

    def test_default_returns_local(self):
        """Test that factory returns local backend by default."""
        backend = get_storage_backend()
        assert isinstance(backend, LocalStorageBackend)

    def test_factory_caches_instance(self):
        """Test that factory returns same instance."""
        backend1 = get_storage_backend()
        backend2 = get_storage_backend()
        assert backend1 is backend2

    def test_clear_cache(self):
        """Test that clearing cache allows new instance."""
        backend1 = get_storage_backend()
        clear_storage_cache()
        backend2 = get_storage_backend()
        # After clearing, should be a new instance
        # (They'll be equal but not the same object)
        assert backend1 is not backend2


# S3 tests - these require MinIO to be running
# Run with: docker compose --profile s3 up -d
# Then: STORAGE_BACKEND=s3 pytest -k test_s3

def s3_available() -> bool:
    """Check if S3/MinIO is available for testing."""
    import os
    return os.environ.get("STORAGE_BACKEND", "").lower() == "s3"


@pytest.mark.skipif(not s3_available(), reason="S3/MinIO not configured")
class TestS3StorageBackend:
    """Tests for S3 storage backend.

    These tests require MinIO to be running. Start it with:
        docker compose --profile s3 up -d

    Then run tests with:
        STORAGE_BACKEND=s3 S3_ENDPOINT_URL=http://localhost:9000 pytest -k test_s3
    """

    @pytest.fixture
    def storage(self):
        """Create an S3 storage backend."""
        from src.infrastructure.storage.s3 import S3StorageBackend
        return S3StorageBackend(
            bucket=os.environ.get("S3_BUCKET", "daggle"),
            endpoint_url=os.environ.get("S3_ENDPOINT_URL", "http://localhost:9000"),
            access_key=os.environ.get("S3_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("S3_SECRET_KEY", "minioadmin"),
        )

    @pytest.mark.asyncio
    async def test_s3_save_and_load(self, storage):
        """Test saving and loading content from S3."""
        import uuid
        content = b"Hello from S3!"
        key = f"test/{uuid.uuid4()}/file.txt"

        try:
            # Save content
            uri = await storage.save(key, content)
            assert uri.startswith("s3://")
            assert key in uri

            # Load content
            loaded = await storage.load(key)
            assert loaded == content
        finally:
            # Cleanup
            await storage.delete(key)

    @pytest.mark.asyncio
    async def test_s3_exists(self, storage):
        """Test exists check on S3."""
        import uuid
        key = f"test/{uuid.uuid4()}/exists.txt"

        try:
            # File doesn't exist yet
            assert not await storage.exists(key)

            # Create file
            await storage.save(key, b"content")

            # Now it exists
            assert await storage.exists(key)
        finally:
            await storage.delete(key)

    @pytest.mark.asyncio
    async def test_s3_delete(self, storage):
        """Test deleting from S3."""
        import uuid
        key = f"test/{uuid.uuid4()}/delete.txt"

        # Create file
        await storage.save(key, b"to be deleted")
        assert await storage.exists(key)

        # Delete file
        result = await storage.delete(key)
        assert result is True
        assert not await storage.exists(key)

    @pytest.mark.asyncio
    async def test_s3_presigned_url(self, storage):
        """Test generating presigned URLs."""
        import uuid
        key = f"test/{uuid.uuid4()}/presigned.txt"

        try:
            await storage.save(key, b"presigned content")

            url = await storage.get_presigned_url(key, expires_in=60)
            assert "http" in url
            assert key in url or "presigned" in url.lower()
        finally:
            await storage.delete(key)
