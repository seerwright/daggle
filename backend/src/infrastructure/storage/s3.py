"""S3/MinIO storage backend."""

import aioboto3
from botocore.exceptions import ClientError

from src.config import settings


class S3StorageBackend:
    """Storage backend using S3-compatible object storage.

    Works with AWS S3, MinIO, and other S3-compatible services.
    """

    def __init__(
        self,
        bucket: str | None = None,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        region: str | None = None,
    ):
        """Initialize the S3 storage backend.

        Args:
            bucket: S3 bucket name. Defaults to settings.s3_bucket.
            endpoint_url: S3 endpoint URL. Defaults to settings.s3_endpoint_url.
            access_key: AWS access key. Defaults to settings.s3_access_key.
            secret_key: AWS secret key. Defaults to settings.s3_secret_key.
            region: AWS region. Defaults to settings.s3_region.
        """
        self.bucket = bucket or settings.s3_bucket
        self.endpoint_url = endpoint_url or settings.s3_endpoint_url
        self.access_key = access_key or settings.s3_access_key
        self.secret_key = secret_key or settings.s3_secret_key
        self.region = region or settings.s3_region

        self._session = aioboto3.Session()

    def _get_client_config(self) -> dict:
        """Get the boto3 client configuration."""
        config = {
            "service_name": "s3",
            "aws_access_key_id": self.access_key,
            "aws_secret_access_key": self.secret_key,
        }
        if self.endpoint_url:
            config["endpoint_url"] = self.endpoint_url
        if self.region:
            config["region_name"] = self.region
        return config

    async def save(self, key: str, content: bytes) -> str:
        """Save content to S3.

        Args:
            key: Object key in the bucket
            content: File content as bytes

        Returns:
            The S3 URI (s3://bucket/key)
        """
        async with self._session.client(**self._get_client_config()) as s3:
            await s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
            )
        return f"s3://{self.bucket}/{key}"

    async def load(self, key: str) -> bytes:
        """Load content from S3.

        Args:
            key: Object key in the bucket

        Returns:
            File content as bytes

        Raises:
            FileNotFoundError: If the object doesn't exist
        """
        async with self._session.client(**self._get_client_config()) as s3:
            try:
                response = await s3.get_object(Bucket=self.bucket, Key=key)
                async with response["Body"] as stream:
                    return await stream.read()
            except ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    raise FileNotFoundError(f"Object not found: {key}")
                raise

    async def delete(self, key: str) -> bool:
        """Delete an object from S3.

        Args:
            key: Object key in the bucket

        Returns:
            True (S3 delete is idempotent)
        """
        async with self._session.client(**self._get_client_config()) as s3:
            await s3.delete_object(Bucket=self.bucket, Key=key)
        return True

    async def exists(self, key: str) -> bool:
        """Check if an object exists in S3.

        Args:
            key: Object key in the bucket

        Returns:
            True if object exists
        """
        async with self._session.client(**self._get_client_config()) as s3:
            try:
                await s3.head_object(Bucket=self.bucket, Key=key)
                return True
            except ClientError:
                return False

    def get_url(self, key: str) -> str:
        """Get the S3 URI for an object.

        Args:
            key: Object key in the bucket

        Returns:
            S3 URI (s3://bucket/key)
        """
        return f"s3://{self.bucket}/{key}"

    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a pre-signed URL for temporary access.

        Args:
            key: Object key in the bucket
            expires_in: URL expiration time in seconds

        Returns:
            Pre-signed URL for the object
        """
        async with self._session.client(**self._get_client_config()) as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
            return url
